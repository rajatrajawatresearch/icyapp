import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { UserError, jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ADMIN_SETTABLE_STATUSES } from "@/lib/constants";
import { orderInclude, toOrderDTO } from "@/lib/dto";

const UpdateStatusSchema = z.object({
  status: z.enum(ADMIN_SETTABLE_STATUSES),
});

/** PATCH /api/admin/orders/:id — change order status. Cancelling returns stock. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, UpdateStatusSchema);
  if (!body.ok) return body.res;
  const { status } = body.data;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findFirst({
        where: { id, scheduledDeleteAt: null },
        include: { items: true },
      });
      if (!current) throw new UserError("Order not found", 404);
      if (current.status === status) return current;
      if (current.status === "CANCELLED")
        throw new UserError("A cancelled order can't be reopened", 409);

      // Guard against a concurrent status change (e.g. double-cancel restoring stock twice).
      const { count } = await tx.order.updateMany({
        where: { id, status: current.status },
        data: { status },
      });
      if (count === 0)
        throw new UserError(
          "Order was just updated by someone else — refresh and retry",
          409,
        );

      if (status === "CANCELLED") {
        for (const item of current.items) {
          if (!item.productId) continue;
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stockQty: { increment: item.qty } },
          });
        }
      }
      return current;
    });

    if (order.status !== status) {
      await audit(
        auth.admin.id,
        "changed_order_status",
        id,
        `order #${order.number}: ${order.status} → ${status}`,
      );
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
