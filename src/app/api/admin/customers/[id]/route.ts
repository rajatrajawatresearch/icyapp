import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { customerInclude, toCustomerDTO } from "@/lib/dto";

const UpdateCustomerSchema = z.object({ isActive: z.boolean() });

/** PATCH /api/admin/customers/:id — revoke (isActive=false) or restore a customer's link. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi({ module: "customers" });
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, UpdateCustomerSchema);
  if (!body.ok) return body.res;

  const existing = await prisma.customer.findFirst({
    where: { id, scheduledDeleteAt: null },
  });
  if (!existing) return jsonError("Customer not found", 404);

  const customer = await prisma.customer.update({
    where: { id },
    // Restoring also reopens a link that closed after an order was finished.
    data: body.data.isActive
      ? { isActive: true, linkExpiresAt: null, linkSince: new Date() }
      : { isActive: false },
    include: customerInclude,
  });
  await audit(
    auth.admin.id,
    body.data.isActive ? "restored_link" : "revoked_link",
    id,
    `customer ${customer.name} (${customer.phone})`,
  );
  return NextResponse.json(toCustomerDTO(customer));
}
