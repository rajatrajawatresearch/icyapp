import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, parseJson } from "@/lib/api";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await parseJson(req, LoginSchema);
  if (!body.ok) return body.res;

  const admin = await prisma.admin.findUnique({
    where: { email: body.data.email },
  });
  const valid = admin
    ? await bcrypt.compare(body.data.password, admin.passwordHash)
    : false;
  if (!admin || !valid) return jsonError("Wrong email or password", 401);
  if (!admin.isActive)
    return jsonError("This account has been deactivated", 403);

  const res = NextResponse.json({ role: admin.role, name: admin.name });
  res.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(admin.id),
    sessionCookieOptions(),
  );
  return res;
}
