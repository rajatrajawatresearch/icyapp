import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { UserError, jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { inr } from "@/lib/format";
import { syncLinkExpiry } from "@/lib/link-expiry";
import { notifyCustomer, notifyStore } from "@/lib/notify";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  // collectCash: the partner took cash at the door — marks the CASH payment paid in the same step.
  z.object({
    action: z.literal("delivered"),
    collectCash: z.boolean().default(false),
  }),
]);

/** POST /api/delivery/orders/:id — partner starts a delivery or marks it delivered. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi({ deliveryOnly: true });
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, ActionSchema);
  if (!body.ok) return body.res;
  const me = auth.admin;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, deliveryPartnerId: me.id, scheduledDeleteAt: null },
        include: { payment: true },
      });
      if (!order) throw new UserError("This order isn't assigned to you", 404);
      if (order.status === "CANCELLED")
        throw new UserError("This order was cancelled by the store", 409);
      if (order.status === "COMPLETED")
        throw new UserError("Already delivered", 409);

      if (body.data.action === "start") {
        if (order.status === "OUT_FOR_DELIVERY") return { order, action: null };
        await tx.order.update({
          where: { id },
          data: { status: "OUT_FOR_DELIVERY", dispatchedAt: new Date() },
        });
        return { order, action: "delivery_started" as const };
      }

      const pay = order.payment;
      let cashCollected = false;
      if (pay?.status === "PENDING" && pay.method === "CASH") {
        if (!body.data.collectCash)
          throw new UserError(
            "Collect the cash first, then mark delivered",
            409,
          );
        await tx.payment.update({
          where: { orderId: id },
          data: {
            status: "PAID",
            confirmedByAdminId: me.id,
            confirmedAt: new Date(),
          },
        });
        cashCollected = true;
      }
      // Guarded on the status we read, so a concurrent admin change isn't overwritten.
      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status: "COMPLETED", deliveredAt: new Date() },
      });
      if (count === 0)
        throw new UserError(
          "The store just updated this order — refresh and retry",
          409,
        );
      return { order, action: "delivered" as const, cashCollected };
    });

    if (result.action) {
      await syncLinkExpiry(result.order.customerId);
      const amount = result.order.payment
        ? ` · ₹${Number(result.order.payment.amount)}`
        : "";
      const details =
        result.action === "delivered" &&
        "cashCollected" in result &&
        result.cashCollected
          ? `order #${result.order.number} · cash collected${amount}`
          : `order #${result.order.number}`;
      await audit(me.id, result.action, id, details);

      const { order } = result;
      if (result.action === "delivery_started") {
        await notifyCustomer(order.customerId, {
          type: "delivery_started",
          orderId: id,
          title: `${me.name} is on the way`,
          body: `Order #${order.number}`,
        });
        await notifyStore({
          type: "delivery_started",
          orderId: id,
          title: `Order #${order.number} out for delivery`,
          body: me.name,
        });
      } else {
        const cash =
          result.cashCollected && order.payment
            ? `, ${inr(Number(order.payment.amount))} cash collected`
            : "";
        await notifyCustomer(order.customerId, {
          type: "delivered",
          orderId: id,
          title: `Order #${order.number} delivered`,
          body: order.receivedAt ? "" : "Tap to confirm you received it.",
        });
        await notifyStore({
          type: "delivered",
          orderId: id,
          title: `Order #${order.number} delivered`,
          body: `${me.name}${cash}`,
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
