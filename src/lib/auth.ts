import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "./db";

export const SESSION_COOKIE = "mm_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionAdmin = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(adminId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

/**
 * Resolves the signed-in admin from the session cookie. The DB is checked on
 * every call so deactivating an admin takes effect immediately.
 */
export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let adminId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    adminId = payload.sub;
  } catch {
    return null;
  }
  if (!adminId) return null;
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!admin || !admin.isActive) return null;
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
}

export function isSuperAdmin(admin: SessionAdmin) {
  return admin.role === "SUPER_ADMIN";
}

/** For server components/layouts: redirects instead of returning null. */
export async function requireAdminPage(opts?: { superOnly?: boolean }) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (opts?.superOnly && !isSuperAdmin(admin)) redirect("/admin/orders");
  return admin;
}

type ApiAuth =
  | { ok: true; admin: SessionAdmin }
  | { ok: false; res: NextResponse };

/** For route handlers: returns a 401/403 response to send back on failure. */
export async function requireAdminApi(opts?: {
  superOnly?: boolean;
}): Promise<ApiAuth> {
  const admin = await getSessionAdmin();
  if (!admin) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  if (opts?.superOnly && !isSuperAdmin(admin)) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Super admin only" }, { status: 403 }),
    };
  }
  return { ok: true, admin };
}
