import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { UserError, jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ADMIN_SETTABLE_STATUSES } from "@/lib/constants";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { syncLinkExpiry } from "@/lib/link-expiry";
import { notifyCustomer, notifyStaff } from "@/lib/notify";

const UpdateStatusSchema = z.object({
  status: z.enum(ADMIN_SETTABLE_STATUSES),
});

/** PATCH /api/admin/orders/:id — change order status. Cancelling returns stock. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi({ module: "orders" });
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, UpdateStatusSchema);
  if (!body.ok) return body.res;
  const { status } = body.data;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findFirst({
        where: { id, scheduledDeleteAt: null },
        include: { items: true, payment: true },
      });
      if (!current) throw new UserError("Order not found", 404);
      // PAID is the status a paid order waits in before dispatch, so a paid
      // order sent back to "confirmed" is stored as PAID, not CONFIRMED.
      const stored =
        status === "CONFIRMED" && current.payment?.status === "PAID"
          ? ("PAID" as const)
          : status;
      if (current.status === stored)
        return { ...current, stored, changed: false };
      if (current.status === "CANCELLED")
        throw new UserError("A cancelled order can't be reopened", 409);

      // Guard against a concurrent status change (e.g. double-cancel restoring stock twice).
      const { count } = await tx.order.updateMany({
        where: { id, status: current.status },
        data: {
          status: stored,
          // The hand-over time follows the status: stamped when the store
          // completes the order itself (the rider's list and "delivered it"
          // read it), cleared when a completed order is reopened.
          ...(status === "COMPLETED" && {
            deliveredAt: current.deliveredAt ?? new Date(),
          }),
          // The delivery clock (tracking, time taken) starts here.
          ...(status === "OUT_FOR_DELIVERY" && { dispatchedAt: new Date() }),
          ...(current.status === "COMPLETED" &&
            status !== "CANCELLED" && { deliveredAt: null }),
        },
      });
      if (count === 0)
        throw new UserError(
          "Order was just updated by someone else — refresh and retry",
          409,
        );

      if (status === "CANCELLED") {
        for (const item of current.items) {
          if (!item.productId) continue;
          // Only products with tracked stock have a count to give back.
          await tx.product.updateMany({
            where: { id: item.productId, stockQty: { not: null } },
            data: { stockQty: { increment: item.qty } },
          });
        }
      }
      return { ...current, stored, changed: true };
    });

    if (order.changed) {
      await syncLinkExpiry(order.customerId);
      await audit(
        auth.admin.id,
        "changed_order_status",
        id,
        `order #${order.number}: ${order.status} → ${order.stored}`,
      );

      const pickup = order.fulfilmentType === "PICKUP";
      const forCustomer = {
        CONFIRMED: {
          title: `Order #${order.number} confirmed`,
          body: "",
        },
        OUT_FOR_DELIVERY: pickup
          ? {
              title: `Order #${order.number} is ready for pickup`,
              body: "",
            }
          : {
              title: `Order #${order.number} is on the way`,
              body: "",
            },
        COMPLETED: {
          title: `Order #${order.number} completed`,
          body: order.receivedAt ? "" : "Tap to confirm you received it.",
        },
        CANCELLED: {
          title: `Order #${order.number} cancelled`,
          body: "",
        },
      }[status];
      await notifyCustomer(order.customerId, {
        type: `order_${status.toLowerCase()}`,
        orderId: id,
        ...forCustomer,
      });
      if (status === "CANCELLED") {
        await notifyStaff(order.deliveryPartnerId, {
          type: "order_cancelled",
          orderId: id,
          title: `Order #${order.number} cancelled`,
          body: "Don't deliver it.",
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
