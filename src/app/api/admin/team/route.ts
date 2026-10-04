import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin, requireAdminApi } from "@/lib/auth";
import { toAdminDTO } from "@/lib/dto";
import { purgeExpired } from "@/lib/purge";

/**
 * GET /api/admin/team — the accounts the caller may manage: a super admin
 * sees everyone, an admin sees only delivery partners. `trash` holds the
 * accounts waiting to be deleted (super admin only), so they can be undone.
 */
export async function GET() {
  const auth = await requireAdminApi({ module: "delivery" });
  if (!auth.ok) return auth.res;
  await purgeExpired();
  const superAdmin = isSuperAdmin(auth.admin);
  const role = superAdmin ? {} : { role: "DELIVERY" as const };

  const [accounts, trash] = await Promise.all([
    prisma.admin.findMany({
      where: { ...role, scheduledDeleteAt: null },
      orderBy: { createdAt: "asc" },
    }),
    superAdmin
      ? prisma.admin.findMany({
          where: { scheduledDeleteAt: { gt: new Date() } },
          orderBy: { scheduledDeleteAt: "asc" },
        })
      : [],
  ]);
  return NextResponse.json({
    items: accounts.map(toAdminDTO),
    trash: trash.map(toAdminDTO),
  });
}
