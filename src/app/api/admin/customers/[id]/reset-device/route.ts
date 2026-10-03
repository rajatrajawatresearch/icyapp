import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { customerInclude, toCustomerDTO } from "@/lib/dto";

/**
 * POST /api/admin/customers/:id/reset-device — the link stays the same, but
 * the next device to open it becomes its only device (new phone, cleared
 * browser). The old device stops getting the customer's push notifications.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const { id } = await params;

  const existing = await prisma.customer.findFirst({
    where: { id, scheduledDeleteAt: null },
  });
  if (!existing) return jsonError("Customer not found", 404);

  const [customer] = await prisma.$transaction([
    prisma.customer.update({
      where: { id },
      data: { deviceHash: null, deviceBoundAt: null },
      include: customerInclude,
    }),
    prisma.pushSubscription.deleteMany({ where: { customerId: id } }),
  ]);
  await audit(
    auth.admin.id,
    "reset_device",
    id,
    `customer ${customer.name} (${customer.phone})`,
  );
  return NextResponse.json(toCustomerDTO(customer));
}
