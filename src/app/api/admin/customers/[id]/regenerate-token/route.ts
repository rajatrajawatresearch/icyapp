import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { generateCustomerToken } from "@/lib/customer";
import { customerInclude, toCustomerDTO } from "@/lib/dto";

/** POST /api/admin/customers/:id/regenerate-token — old link stops working, new one is issued. */
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

  // Push notifications link to the customer's page, so devices that subscribed
  // through the old link must be dropped or they would receive the new one.
  const [customer] = await prisma.$transaction([
    prisma.customer.update({
      where: { id },
      // A new link starts fresh: whoever opens it first becomes its device.
      data: {
        token: generateCustomerToken(),
        isActive: true,
        deviceHash: null,
        deviceBoundAt: null,
        linkExpiresAt: null,
        linkSince: new Date(),
      },
      include: customerInclude,
    }),
    prisma.pushSubscription.deleteMany({ where: { customerId: id } }),
  ]);
  await audit(
    auth.admin.id,
    "regenerated_token",
    id,
    `customer ${customer.name} (${customer.phone})`,
  );
  return NextResponse.json(toCustomerDTO(customer));
}
