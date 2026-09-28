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

export function isDelivery(admin: { role: Role }) {
  return admin.role === "DELIVERY";
}

/** Where each role lands after signing in. */
export function homePathFor(role: Role) {
  return role === "DELIVERY" ? "/delivery" : "/admin/orders";
}

type Access = {
  /** Only SUPER_ADMIN. */
  superOnly?: boolean;
  /** Let delivery partners through too (e.g. change own password). Store pages exclude them by default. */
  allowDelivery?: boolean;
  /** Only delivery partners (the /delivery panel). */
  deliveryOnly?: boolean;
};

function denial(admin: SessionAdmin, opts?: Access): { status: 403; error: string; home: string } | null {
  const home = homePathFor(admin.role);
  if (opts?.deliveryOnly) return isDelivery(admin) ? null : { status: 403, error: "Delivery partners only", home };
  if (isDelivery(admin) && !opts?.allowDelivery) return { status: 403, error: "Store staff only", home };
  if (opts?.superOnly && !isSuperAdmin(admin)) return { status: 403, error: "Super admin only", home };
  return null;
}

/** For server components/layouts: redirects instead of returning null. */
export async function requireAdminPage(opts?: Access) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  const denied = denial(admin, opts);
  if (denied) redirect(denied.home);
  return admin;
}

type ApiAuth =
  | { ok: true; admin: SessionAdmin }
  | { ok: false; res: NextResponse };

/** For route handlers: returns a 401/403 response to send back on failure. */
export async function requireAdminApi(opts?: Access): Promise<ApiAuth> {
  const admin = await getSessionAdmin();
  if (!admin) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  const denied = denial(admin, opts);
  if (denied) {
    return { ok: false, res: NextResponse.json({ error: denied.error }, { status: denied.status }) };
  }
  return { ok: true, admin };
}
