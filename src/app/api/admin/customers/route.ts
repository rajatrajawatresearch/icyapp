import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { purgeExpired } from "@/lib/purge";
import { generateCustomerToken } from "@/lib/customer";
import { customerInclude, toCustomerDTO } from "@/lib/dto";
import {
  PHONE_ERROR,
  formatIndianMobile,
  indianMobileDigits,
} from "@/lib/phone";

export async function GET() {
  const auth = await requireAdminApi({ module: "customers" });
  if (!auth.ok) return auth.res;
  await purgeExpired();

  const [items, trash] = await Promise.all([
    prisma.customer.findMany({
      where: { scheduledDeleteAt: null },
      orderBy: { createdAt: "desc" },
      include: customerInclude,
    }),
    prisma.customer.findMany({
      where: { scheduledDeleteAt: { gt: new Date() } },
      orderBy: { scheduledDeleteAt: "asc" },
      include: customerInclude,
    }),
  ]);
  return NextResponse.json({
    items: items.map(toCustomerDTO),
    trash: trash.map(toCustomerDTO),
  });
}

const CreateCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  // Indian mobiles only, stored one way ("+91 98765 43210") however it was typed.
  phone: z.string().transform((value, ctx) => {
    const digits = indianMobileDigits(value);
    if (digits) return formatIndianMobile(digits);
    ctx.addIssue({ code: "custom", message: PHONE_ERROR });
    return z.NEVER;
  }),
});

/** POST /api/admin/customers — add a customer and generate their private link token. */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ module: "customers" });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, CreateCustomerSchema);
  if (!body.ok) return body.res;

  const customer = await prisma.customer.create({
    data: { ...body.data, token: generateCustomerToken() },
    include: customerInclude,
  });
  await audit(
    auth.admin.id,
    "generated_link",
    customer.id,
    `customer ${customer.name} (${customer.phone})`,
  );
  return NextResponse.json(toCustomerDTO(customer), { status: 201 });
}
