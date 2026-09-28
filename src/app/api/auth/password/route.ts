import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(200),
});

/** POST /api/auth/password — signed-in admin changes their own password. */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ allowDelivery: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, ChangePasswordSchema);
  if (!body.ok) return body.res;

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: auth.admin.id },
  });
  if (!(await bcrypt.compare(body.data.currentPassword, admin.passwordHash))) {
    return jsonError("Current password is wrong", 403);
  }
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(body.data.newPassword, 10) },
  });
  await audit(admin.id, "changed_password", admin.id, admin.email);
  return NextResponse.json({ ok: true });
}
