import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { notifyStaff } from "@/lib/notify";

const AssignSchema = z.object({
  deliveryPartnerId: z.string().min(1).nullable(),
});

/** POST /api/admin/orders/:id/assign — give a delivery order to a partner (null = unassign). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi({ module: "orders" });
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, AssignSchema);
  if (!body.ok) return body.res;
  const { deliveryPartnerId } = body.data;

  const order = await prisma.order.findFirst({
    where: { id, scheduledDeleteAt: null },
  });
  if (!order) return jsonError("Order not found", 404);
  if (order.fulfilmentType !== "DELIVERY")
    return jsonError("Only delivery orders can be assigned");
  if (order.status === "COMPLETED" || order.status === "CANCELLED")
    return jsonError("This order is already closed");

  let partnerName = "nobody";
  if (deliveryPartnerId) {
    const partner = await prisma.admin.findFirst({
      where: {
        id: deliveryPartnerId,
        role: "DELIVERY",
        isActive: true,
        scheduledDeleteAt: null,
      },
    });
    if (!partner)
      return jsonError("That delivery partner isn't available", 404);
    partnerName = partner.name;
  }

  if (deliveryPartnerId === order.deliveryPartnerId) {
    // Nothing changed — don't write an audit row or ping the rider again.
    const same = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });
    return NextResponse.json(toOrderDTO(same));
  }

  await prisma.order.update({ where: { id }, data: { deliveryPartnerId } });
  await audit(
    auth.admin.id,
    deliveryPartnerId ? "assigned_delivery" : "unassigned_delivery",
    id,
    `order #${order.number} → ${partnerName}`,
  );
  await notifyStaff(deliveryPartnerId, {
    type: "delivery_assigned",
    orderId: id,
    title: `New delivery #${order.number}`,
    body: `${order.customerName}, ${order.deliveryAddress ?? "address in the order"}`,
  });
  await notifyStaff(order.deliveryPartnerId, {
    type: "delivery_unassigned",
    orderId: id,
    title: `Order #${order.number} taken off your list`,
    body: "",
  });
  const fresh = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: orderInclude,
  });
  return NextResponse.json(toOrderDTO(fresh));
}
