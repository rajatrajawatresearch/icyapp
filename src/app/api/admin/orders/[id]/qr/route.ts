import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { UserError, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { saveImage } from "@/lib/uploads";
import { orderInclude, toOrderDTO } from "@/lib/dto";

/** POST /api/admin/orders/:id/qr — multipart `file`; attaches a UPI QR to a pending UPI payment. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const { id } = await params;

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

  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || file.size === 0)
      return jsonError("Choose a QR image to upload");
    const qrImageUrl = await saveImage(file);
    await prisma.payment.update({
      where: { orderId: id },
      data: { qrImageUrl },
    });
  } catch (e) {
    if (e instanceof UserError) return jsonError(e.message, e.status);
    throw e;
  }

  await audit(auth.admin.id, "uploaded_qr", id, `order #${order.number}`);
  const fresh = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: orderInclude,
  });
  return NextResponse.json(toOrderDTO(fresh));
}
