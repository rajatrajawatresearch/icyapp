import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { purgeExpired } from "@/lib/purge";
import { generateCustomerToken } from "@/lib/customer";
import { customerInclude, toCustomerDTO } from "@/lib/dto";

export async function GET() {
  const auth = await requireAdminApi();
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
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number"),
});

/** POST /api/admin/customers — add a customer and generate their private link token. */
export async function POST(req: Request) {
  const auth = await requireAdminApi();
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
