import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { UserError, jsonError, parseJson } from "@/lib/api";
import { resolveCustomer } from "@/lib/customer";

const CreateOrderSchema = z
  .object({
    token: z.string().min(1),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          qty: z.number().int().min(1).max(999),
        }),
      )
      .min(1, "Your cart is empty")
      .max(100),
    fulfilmentType: z.enum(["DELIVERY", "PICKUP"]),
    deliveryAddress: z.string().trim().max(500).optional(),
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
        // Conditional decrement: never oversell even with concurrent orders.
        const { count } = await tx.product.updateMany({
          where: { id: p.id, stockQty: { gte: qty } },
          data: { stockQty: { decrement: qty } },
        });
        if (count === 0) {
          throw new UserError(
            `Only ${p.stockQty} left of "${p.name}". Please reduce the quantity.`,
            409,
          );
        }
        total = total.add(p.price.mul(qty));
      }

      return tx.order.create({
        data: {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          fulfilmentType,
          deliveryAddress:
            fulfilmentType === "DELIVERY" ? body.data.deliveryAddress : null,
          items: {
            create: products.map((p) => ({
              productId: p.id,
              productName: p.name,
              qty: qtyByProduct.get(p.id)!,
              priceAtOrder: p.price,
            })),
          },
          payment: { create: { method: paymentMethod, amount: total } },
        },
        select: { id: true, number: true },
      });
    });
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    if (e instanceof UserError) return jsonError(e.message, e.status);
    throw e;
  }
}
