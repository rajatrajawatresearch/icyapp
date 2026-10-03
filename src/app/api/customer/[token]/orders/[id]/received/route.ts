import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { resolveCustomer } from "@/lib/customer";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { syncLinkExpiry } from "@/lib/link-expiry";
import { notifyStaff, notifyStore } from "@/lib/notify";

/**
 * POST /api/customer/:token/orders/:id/received — the customer confirms the
 * order reached them. Allowed once the order is on its way / ready or
 * completed. If it was still "out for delivery" and already paid, this also
 * completes it; with payment pending the store is told to check instead.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const customer = await resolveCustomer(token);
  if (!customer)
    return jsonError("This link is invalid or has been revoked", 404);

  const order = await prisma.order.findFirst({
    where: { id, customerId: customer.id, scheduledDeleteAt: null },
    include: { payment: true },
  });
  if (!order) return jsonError("Order not found", 404);
  if (order.status !== "OUT_FOR_DELIVERY" && order.status !== "COMPLETED") {
    return jsonError(
      "You can confirm once your order is on its way or ready",
      409,
    );
  }

  if (!order.receivedAt) {
    const now = new Date();
    const paid = order.payment?.status === "PAID";
    const completes = order.status === "OUT_FOR_DELIVERY" && paid;
    // Guarded twice: on receivedAt so a double tap confirms and notifies only
    // once, and on the status we read so a cancellation that lands in between
    // is never overwritten with "completed".
    const { count } = await prisma.order.updateMany({
      where: { id, receivedAt: null, status: order.status },
      data: {
        receivedAt: now,
        ...(completes && {
          status: "COMPLETED",
          deliveredAt: order.deliveredAt ?? now,
        }),
      },
    });
    if (count) {
      if (completes) await syncLinkExpiry(customer.id);
      const message = {
        type: "received",
        orderId: id,
        title: `Order #${order.number} received`,
        body: paid ? customer.name : `${customer.name}. Payment still pending.`,
      };
      await notifyStore(message);
      await notifyStaff(order.deliveryPartnerId, message);
    }
  }

  const fresh = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: orderInclude,
  });
  return NextResponse.json(toOrderDTO(fresh));
}
