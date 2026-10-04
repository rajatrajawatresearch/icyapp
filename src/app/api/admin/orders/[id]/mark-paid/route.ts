import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { inr } from "@/lib/format";
import { syncLinkExpiry } from "@/lib/link-expiry";
import { notifyCustomer, notifyStaff } from "@/lib/notify";

/** POST /api/admin/orders/:id/mark-paid — manual payment confirmation (cash or UPI). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi({ module: "orders" });
  if (!auth.ok) return auth.res;
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, scheduledDeleteAt: null },
    include: { payment: true },
  });
  if (!order || !order.payment) return jsonError("Order not found", 404);
  if (order.status === "CANCELLED") return jsonError("Order is cancelled");

  const { count } = await prisma.payment.updateMany({
    where: { orderId: id, status: "PENDING" },
    data: {
      status: "PAID",
      confirmedByAdminId: auth.admin.id,
      confirmedAt: new Date(),
    },
  });
  if (count === 0) return jsonError("Payment is already marked paid", 409);

  // Paid before dispatch (typical UPI) moves the order along; later stages keep their status.
  if (order.status === "PLACED" || order.status === "CONFIRMED") {
    await prisma.order.update({ where: { id }, data: { status: "PAID" } });
  }

  // A delivered order that is now paid is finished: its link may start closing.
  await syncLinkExpiry(order.customerId);
  await audit(
    auth.admin.id,
    "marked_paid",
    id,
    `order #${order.number} · ${order.payment.method} ₹${Number(order.payment.amount)}`,
  );
  const amount = inr(Number(order.payment.amount));
  await notifyCustomer(order.customerId, {
    type: "payment_confirmed",
    orderId: id,
    title: "Payment received",
    body: `${amount}, order #${order.number}`,
  });
  if (order.status !== "COMPLETED") {
    await notifyStaff(order.deliveryPartnerId, {
      type: "payment_confirmed",
      orderId: id,
      title: `Order #${order.number} is paid`,
      body: "Nothing to collect.",
    });
  }

  const fresh = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: orderInclude,
  });
  return NextResponse.json(toOrderDTO(fresh));
}
