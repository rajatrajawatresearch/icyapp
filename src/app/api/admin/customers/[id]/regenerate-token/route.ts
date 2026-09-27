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

  const customer = await prisma.customer.update({
    where: { id },
    data: { token: generateCustomerToken(), isActive: true },
    include: customerInclude,
  });
  await audit(
    auth.admin.id,
    "regenerated_token",
    id,
    `customer ${customer.name} (${customer.phone})`,
  );
  return NextResponse.json(toCustomerDTO(customer));
}
