import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";

/** GET /api/admin/delivery-partners — active partners for the "Assign" dropdown. */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const partners = await prisma.admin.findMany({
    where: { role: "DELIVERY", isActive: true, scheduledDeleteAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ items: partners });
}
