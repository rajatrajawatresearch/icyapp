import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { UserError, jsonError, parseJson } from "@/lib/api";
import { MAX_LINE_QTY } from "@/lib/constants";
import { resolveCustomer } from "@/lib/customer";
import { inr } from "@/lib/format";
import { syncLinkExpiry } from "@/lib/link-expiry";
import { pickRoundRobinPartner } from "@/lib/delivery";
import { notifyStaff, notifyStore } from "@/lib/notify";
import { deliveryFeeFor } from "@/lib/pricing";
import { getPayDefaults } from "@/lib/settings";

const CreateOrderSchema = z
  .object({
    token: z.string().min(1),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          qty: z.number().int().min(1).max(MAX_LINE_QTY),
        }),
      )
      .min(1, "Your cart is empty")
      .max(100),
    fulfilmentType: z.enum(["DELIVERY", "PICKUP"]),
    deliveryAddress: z.string().trim().max(500).optional(),
    deliveryLat: z.number().min(-90).max(90).optional(),
    deliveryLng: z.number().min(-180).max(180).optional(),
    paymentMethod: z.enum(["CASH", "UPI"]),
  })
  .refine(
    (d) =>
      d.fulfilmentType === "PICKUP" ||
      (d.deliveryAddress && d.deliveryAddress.length >= 5),
    {
      message: "Please enter a delivery address",
      path: ["deliveryAddress"],
    },
  );

/** POST /api/orders — customer places an order; identity comes from their private token. */
export async function POST(req: Request) {
  const body = await parseJson(req, CreateOrderSchema);
  if (!body.ok) return body.res;
  const { token, fulfilmentType, paymentMethod } = body.data;

  const customer = await resolveCustomer(token);
  if (!customer)
    return jsonError("This link is invalid or has been revoked", 404);

  // Merge duplicate lines for the same product.
  const qtyByProduct = new Map<string, number>();
  for (const item of body.data.items) {
    qtyByProduct.set(
      item.productId,
      (qtyByProduct.get(item.productId) ?? 0) + item.qty,
    );
  }

  const payDefaults =
    paymentMethod === "UPI"
      ? await getPayDefaults()
      : { qrImageUrl: null, upiId: null, note: null };

  try {
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: { in: [...qtyByProduct.keys()] },
          isActive: true,
          scheduledDeleteAt: null,
        },
      });
      if (products.length !== qtyByProduct.size) {
        throw new UserError(
          "Some items in your cart are no longer available. Please refresh.",
          409,
        );
      }

      let total = new Prisma.Decimal(0);
      for (const p of products) {
        const qty = qtyByProduct.get(p.id)!;
        if (qty > MAX_LINE_QTY)
          throw new UserError(
            `Please order at most ${MAX_LINE_QTY} of "${p.name}".`,
          );
        // Stock is only counted for products the store tracks (stockQty set).
        if (p.stockQty !== null) {
          // Conditional decrement: never oversell even with concurrent orders.
          const { count } = await tx.product.updateMany({
            where: { id: p.id, stockQty: { gte: qty } },
            data: { stockQty: { decrement: qty } },
          });
          if (count === 0) {
            throw new UserError(
              p.stockQty === 0
                ? `"${p.name}" is sold out. Please remove it from your cart.`
                : `Only ${p.stockQty} left of "${p.name}". Please reduce the quantity.`,
              409,
            );
          }
        }
        total = total.add(p.price.mul(qty));
      }

      // The server decides the delivery charge; the checkout only previews it.
      const settings = await tx.storeSettings.findUnique({ where: { id: 1 } });
      const deliveryFee = new Prisma.Decimal(
        deliveryFeeFor(
          {
            fee: Number(settings?.deliveryFee ?? 0),
            freeAbove:
              settings?.freeDeliveryAbove == null
                ? null
                : Number(settings.freeDeliveryAbove),
          },
          fulfilmentType,
          Number(total),
        ),
      );
      total = total.add(deliveryFee);

      // New delivery orders go straight to the next partner in rotation —
      // no manual assignment step for the store.
      const deliveryPartnerId =
        fulfilmentType === "DELIVERY" ? await pickRoundRobinPartner(tx) : null;

      const created = await tx.order.create({
        data: {
          deliveryFee,
          deliveryPartnerId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          fulfilmentType,
          deliveryAddress:
            fulfilmentType === "DELIVERY" ? body.data.deliveryAddress : null,
          // Pin is optional (GPS/map); only kept when both coords are present.
          ...(fulfilmentType === "DELIVERY" &&
            body.data.deliveryLat !== undefined &&
            body.data.deliveryLng !== undefined && {
              deliveryLat: body.data.deliveryLat,
              deliveryLng: body.data.deliveryLng,
            }),
          items: {
            create: products.map((p) => ({
              productId: p.id,
              productName: p.name,
              qty: qtyByProduct.get(p.id)!,
              priceAtOrder: p.price,
            })),
          },
          payment: {
            create: {
              method: paymentMethod,
              amount: total,
              ...(paymentMethod === "UPI"
                ? {
                    qrImageUrl: payDefaults.qrImageUrl,
                    upiId: payDefaults.upiId,
                    payNote: payDefaults.note,
                  }
                : {}),
            },
          },
        },
        select: { id: true, number: true },
      });
      return { ...created, total: Number(total), deliveryPartnerId };
    });

    // A new order keeps the link open, even if it was about to close.
    await syncLinkExpiry(customer.id);
    await notifyStore({
      type: "new_order",
      orderId: order.id,
      title: `New order #${order.number}`,
      body: `${customer.name}, ${inr(order.total)}, ${paymentMethod === "UPI" ? "UPI" : "cash"}, ${fulfilmentType === "DELIVERY" ? "delivery" : "pickup"}`,
    });
    if (order.deliveryPartnerId) {
      await notifyStaff(order.deliveryPartnerId, {
        type: "delivery_assigned",
        orderId: order.id,
        title: `New delivery #${order.number}`,
        body: `${customer.name}, ${fulfilmentType === "DELIVERY" ? (body.data.deliveryAddress ?? "address in the order") : ""}`,
      });
    }
    return NextResponse.json(
      { id: order.id, number: order.number },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof UserError) return jsonError(e.message, e.status);
    throw e;
  }
}
