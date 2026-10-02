import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin, requireAdminApi } from "@/lib/auth";
import { toAdminDTO } from "@/lib/dto";

/**
 * GET /api/admin/team — the accounts the caller may manage: a super admin
 * sees everyone, an admin sees only delivery partners.
 */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;

  const accounts = await prisma.admin.findMany({
    where: isSuperAdmin(auth.admin) ? {} : { role: "DELIVERY" },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ items: accounts.map(toAdminDTO) });
}
