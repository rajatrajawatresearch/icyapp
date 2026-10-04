import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { toAdminDTO } from "@/lib/dto";
import { MODULE_IDS } from "@/lib/modules";

const UpdateAdminSchema = z.union([
  z.object({ isActive: z.boolean() }),
  /** Which sections of the panel this admin may use. */
  z.object({ modules: z.array(z.enum(MODULE_IDS)).max(MODULE_IDS.length) }),
]);

/** PATCH /api/superadmin/admins/:id — deactivate/reactivate an account, or set an admin's sections. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await parseJson(req, UpdateAdminSchema);
  if (!body.ok) return body.res;

  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) return jsonError("Admin not found", 404);

  if ("modules" in body.data) {
    if (existing.role !== "ADMIN")
      return jsonError("Sections are set for admins only");
    const modules = [...new Set(body.data.modules)];
    const updated = await prisma.admin.update({ where: { id }, data: { modules } });
    await audit(
      auth.admin.id,
      "changed_access",
      id,
      `${updated.email}: ${modules.join(", ") || "no sections"}`,
    );
    return NextResponse.json(toAdminDTO(updated));
  }

  if (id === auth.admin.id)
    return jsonError("You can't deactivate your own account");

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
