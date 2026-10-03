import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { UserError, jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { inr } from "@/lib/format";
import { notifyCustomer, notifyStaff } from "@/lib/notify";

const FeeSchema = z.object({
  fee: z.number().min(0).max(100_000).transform((n) => Math.round(n * 100) / 100),
});

/**
 * PATCH /api/admin/orders/:id/delivery-fee — set a custom delivery charge on
 * one order (a far address, a favour for a regular). Only while the payment
 * is still pending: the amount to pay changes with it, and a UPI QR made for
 * the old amount is dropped so nobody pays the wrong sum.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, FeeSchema);
  if (!body.ok) return body.res;
  const fee = new Prisma.Decimal(body.data.fee);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, scheduledDeleteAt: null },
        include: { items: true, payment: true },
      });
      if (!order || !order.payment) throw new UserError("Order not found", 404);
      if (order.fulfilmentType !== "DELIVERY")
        throw new UserError("Pickup orders have no delivery charge");
      if (order.status === "CANCELLED" || order.status === "COMPLETED")
        throw new UserError("This order is already closed", 409);
      if (order.payment.status !== "PENDING")
        throw new UserError("This order is already paid, so the charge can't change", 409);
      if (order.deliveryFee.equals(fee)) return { order, changed: false, amount: order.payment.amount };

      const itemsTotal = order.items.reduce(
        (sum, i) => sum.add(i.priceAtOrder.mul(i.qty)),
        new Prisma.Decimal(0),
      );
      const amount = itemsTotal.add(fee);
      await tx.order.update({ where: { id }, data: { deliveryFee: fee } });
      // Guarded on PENDING so a payment confirmed in the same moment keeps its amount.
      const { count } = await tx.payment.updateMany({
        where: { orderId: id, status: "PENDING" },
        data: { amount, qrImageUrl: null },
      });
      if (count === 0)
        throw new UserError("This order was just paid — the charge can't change", 409);
      return { order, changed: true, amount };
    });

    if (result.changed) {
      const { order } = result;
      const total = inr(Number(result.amount));
      await audit(
        auth.admin.id,
        "changed_delivery_charge",
        id,
        `order #${order.number}: ${inr(Number(order.deliveryFee))} → ${inr(Number(fee))}, total ${total}`,
      );
      const hadQr = order.payment?.method === "UPI" && order.payment.qrImageUrl;
      await notifyCustomer(order.customerId, {
        type: "delivery_charge_changed",
        orderId: id,
        title: `Order #${order.number}: new total ${total}`,
        body: `Delivery charge ${inr(Number(fee))}.${hadQr ? " New QR coming." : ""}`,
      });
      if (order.payment?.method === "CASH") {
        await notifyStaff(order.deliveryPartnerId, {
          type: "delivery_charge_changed",
          orderId: id,
          title: `Order #${order.number}: collect ${total}`,
          body: "",
        });
      }
    }
    const fresh = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });
    return NextResponse.json(toOrderDTO(fresh));
  } catch (e) {
    if (e instanceof UserError) return jsonError(e.message, e.status);
    throw e;
  }
}
