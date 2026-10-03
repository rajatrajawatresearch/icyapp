import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { inr } from "@/lib/format";
import { notifyCustomer } from "@/lib/notify";

/** Blank text means "not set". */
const blankToNull = (v: string) => (v.trim() === "" ? null : v.trim());

const PayDetailsSchema = z.object({
  upiId: z
    .string()
    .max(120)
    .transform(blankToNull)
    .refine((v) => v === null || /^[\w.-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}$/.test(v), {
      message: "A UPI ID looks like name@bank",
    }),
  /** Bank account details, or anything else the customer needs in order to pay. */
  note: z.string().max(600).transform(blankToNull),
});

/**
 * POST /api/admin/orders/:id/pay-details — the store sends a UPI ID and/or
 * bank details for a pending UPI order (instead of, or as well as, a QR).
 * Sending both blank takes them back.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, PayDetailsSchema);
  if (!body.ok) return body.res;
  const { upiId, note } = body.data;

  const order = await prisma.order.findFirst({
    where: { id, scheduledDeleteAt: null },
    include: { payment: true },
  });
  if (!order || !order.payment) return jsonError("Order not found", 404);
  if (order.payment.method !== "UPI")
    return jsonError("This order is not a UPI order");
  if (order.payment.status !== "PENDING")
    return jsonError("Payment is already confirmed");
  if (order.status === "CANCELLED") return jsonError("Order is cancelled");

  const changed =
    upiId !== order.payment.upiId || note !== order.payment.payNote;
  if (changed) {
    await prisma.payment.update({
      where: { orderId: id },
      data: { upiId, payNote: note },
    });
    await audit(
      auth.admin.id,
      "sent_pay_details",
      id,
      `order #${order.number}: ${[upiId && `UPI ID ${upiId}`, note && "bank/other details"].filter(Boolean).join(" + ") || "removed"}`,
    );
    if (upiId || note) {
      await notifyCustomer(order.customerId, {
        type: "pay_details_ready",
        orderId: id,
        title: `Pay for order #${order.number}`,
        body: `${inr(Number(order.payment.amount))}. Payment details sent.`,
      });
    }
  }

  const fresh = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: orderInclude,
  });
  return NextResponse.json(toOrderDTO(fresh));
}
