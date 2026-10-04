import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, requireAdminApi, setSessionCookie } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { keepActorName } from "@/lib/trash";

const ReplaceSchema = z.object({
  /** The password of the account being deleted: a borrowed phone can't do this. */
  currentPassword: z.string().min(1, "Enter your current password"),
  /** The account that takes its place. Left out when another super admin already exists. */
  replacement: z
    .object({
      name: z.string().trim().min(1, "Name is required").max(100),
      email: z.string().trim().toLowerCase().email("Enter a valid email"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(200),
    })
    .optional(),
});

/**
 * POST /api/superadmin/replace-account — a super admin deletes their OWN
 * account, the original one included. The store must never be left without
 * an owner, so either another super admin already exists (the caller is then
 * signed out), or the account that takes its place is created in the same
 * step (the caller carries on signed in as it).
 */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, ReplaceSchema);
  if (!body.ok) return body.res;
  const { currentPassword, replacement } = body.data;

  const old = await prisma.admin.findUniqueOrThrow({
    where: { id: auth.admin.id },
  });
  if (!(await bcrypt.compare(currentPassword, old.passwordHash)))
    return jsonError("Your current password is wrong", 403);
  // What the old account did stays in the log under its own name.
  await keepActorName(old.id, old);

  if (!replacement) {
    const others = await prisma.admin.count({
      where: {
        role: "SUPER_ADMIN",
        isActive: true,
        scheduledDeleteAt: null,
        id: { not: old.id },
      },
    });
    if (!others)
      return jsonError(
        "You are the only super admin. Create the account that takes your place.",
        409,
      );
    await prisma.admin.delete({ where: { id: old.id } });
    const res = NextResponse.json({ ok: true, signedOut: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const taken = await prisma.admin.findUnique({
    where: { email: replacement.email },
  });
  if (taken && taken.id !== old.id)
    return jsonError("An account with this email already exists", 409);
  const passwordHash = await bcrypt.hash(replacement.password, 10);
  const [, fresh] = await prisma.$transaction([
    // Old first, so the new account may reuse its email.
    prisma.admin.delete({ where: { id: old.id } }),
    prisma.admin.create({
      data: {
        name: replacement.name,
        email: replacement.email,
        role: "SUPER_ADMIN",
        passwordHash,
      },
    }),
  ]);
  await audit(
    fresh.id,
    "replaced_account",
    fresh.id,
    `${old.name} (${old.email}) deleted, replaced by ${fresh.name} (${fresh.email})`,
  );
  const res = NextResponse.json({ ok: true, signedOut: false });
  await setSessionCookie(res, fresh);
  return res;
}
