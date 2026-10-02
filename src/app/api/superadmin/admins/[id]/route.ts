import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { toAdminDTO } from "@/lib/dto";

const UpdateAdminSchema = z.object({ isActive: z.boolean() });

/** PATCH /api/superadmin/admins/:id — deactivate/reactivate an admin account. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, UpdateAdminSchema);
  if (!body.ok) return body.res;

  if (id === auth.admin.id)
    return jsonError("You can't deactivate your own account");
  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) return jsonError("Admin not found", 404);

  // Deactivating cuts every way in for good: sessions end, the sign-in link is
  // cleared and push stops. Reactivating later must not revive a leaked link
  // or an old cookie — the person signs in again with their password.
  const [admin] = body.data.isActive
    ? [await prisma.admin.update({ where: { id }, data: { isActive: true } })]
    : await prisma.$transaction([
        prisma.admin.update({
          where: { id },
          data: {
            isActive: false,
            sessionVersion: { increment: 1 },
            accessTokenHash: null,
            accessTokenAt: null,
          },
        }),
        prisma.pushSubscription.deleteMany({ where: { adminId: id } }),
      ]);
  await audit(
    auth.admin.id,
    body.data.isActive ? "reactivated_admin" : "deactivated_admin",
    id,
    admin.email,
  );
  return NextResponse.json(toAdminDTO(admin));
}
