import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UserError, jsonError } from "@/lib/api";
import { MAX_PAYMENT_PROOFS } from "@/lib/constants";
import { resolveCustomer } from "@/lib/customer";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { inr } from "@/lib/format";
import { notifyStore } from "@/lib/notify";
import { saveImage } from "@/lib/uploads";

/** Screenshots sent within this window count as one batch: the store is alerted once. */
const BATCH_WINDOW_MS = 2 * 60 * 1000;

/**
 * POST /api/customer/:token/orders/:id/proofs — multipart `file`. The customer
 * attaches a screenshot of their UPI payment. It never marks the order paid:
 * staff look at it and confirm the payment themselves.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const customer = await resolveCustomer(token);
  if (!customer)
    return jsonError("This link is invalid or has been revoked", 404);

  const order = await prisma.order.findFirst({
    where: { id, customerId: customer.id, scheduledDeleteAt: null },
    include: { payment: { include: { proofs: true } } },
  });
  if (!order || !order.payment) return jsonError("Order not found", 404);
  const payment = order.payment;
  if (payment.method !== "UPI")
    return jsonError("Only UPI orders need a payment screenshot");
  if (order.status === "CANCELLED") return jsonError("Order is cancelled", 409);
  if (payment.status !== "PENDING")
    return jsonError("This payment is already confirmed", 409);
  if (payment.proofs.length >= MAX_PAYMENT_PROOFS)
    return jsonError(
      `You can send at most ${MAX_PAYMENT_PROOFS} screenshots for one order`,
      409,
    );

  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || file.size === 0)
      return jsonError("Choose a screenshot to upload");
    const imageUrl = await saveImage(file);
    await prisma.paymentProof.create({
      data: { paymentId: payment.id, imageUrl },
    });
  } catch (e) {
    if (e instanceof UserError) return jsonError(e.message, e.status);
    throw e;
  }

  const batchStart = Date.now() - BATCH_WINDOW_MS;
  if (!payment.proofs.some((p) => p.createdAt.getTime() > batchStart)) {
    await notifyStore({
      type: "payment_proof",
      orderId: id,
      title: `Payment proof, order #${order.number}`,
      body: `${customer.name}, ${inr(Number(payment.amount))}`,
    });
  }

  const fresh = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: orderInclude,
  });
  return NextResponse.json(toOrderDTO(fresh), { status: 201 });
}
