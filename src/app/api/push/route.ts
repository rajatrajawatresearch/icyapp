import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { resolveCustomer } from "@/lib/customer";
import { isPushServiceEndpoint, vapidPublicKey } from "@/lib/push";

const MAX_DEVICES_PER_OWNER = 8;

/** GET /api/push — the public key a browser needs to subscribe (null = push is off). */
export function GET() {
  return NextResponse.json({ publicKey: vapidPublicKey() });
}

const SubscribeSchema = z.object({
  /** Present when the subscriber is a customer (their private link token). */
  token: z.string().min(1).max(64).optional(),
  subscription: z.object({
    endpoint: z.string().min(1).max(1000),
    keys: z.object({
      p256dh: z.string().min(1).max(200),
      auth: z.string().min(1).max(100),
    }),
  }),
});

/**
 * POST /api/push — register this browser for push. The owner is the customer
 * behind `token`, otherwise the signed-in staff member. Re-registering the
 * same browser moves it to the current owner (shared phones, re-logins).
 */
export async function POST(req: Request) {
  if (!vapidPublicKey())
    return jsonError("Phone notifications aren't set up on this server", 503);
  const body = await parseJson(req, SubscribeSchema);
  if (!body.ok) return body.res;
  const { token, subscription } = body.data;
  if (!isPushServiceEndpoint(subscription.endpoint))
    return jsonError("Unsupported push service");

  let owner:
    | { adminId: string; customerId: null }
    | { adminId: null; customerId: string };
  if (token) {
    const customer = await resolveCustomer(token);
    if (!customer)
      return jsonError("This link is invalid or has been revoked", 404);
    owner = { adminId: null, customerId: customer.id };
  } else {
    const admin = await getSessionAdmin();
    if (!admin) return jsonError("Not signed in", 401);
    owner = { adminId: admin.id, customerId: null };
  }

  const keys = {
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  };
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { ...keys, ...owner },
    create: { endpoint: subscription.endpoint, ...keys, ...owner },
  });

  // Keep only the newest few devices per person.
  const where = owner.adminId
    ? { adminId: owner.adminId }
    : { customerId: owner.customerId };
  const stale = await prisma.pushSubscription.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: MAX_DEVICES_PER_OWNER,
    select: { id: true },
  });
  if (stale.length) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: stale.map((s) => s.id) } },
    });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/push — forget this browser (turned off, or signing out). */
export async function DELETE(req: Request) {
  const body = await parseJson(
    req,
    z.object({ endpoint: z.string().min(1).max(1000) }),
  );
  if (!body.ok) return body.res;
  // Knowing the endpoint (a long unguessable URL) is the proof of ownership.
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.data.endpoint },
  });
  return NextResponse.json({ ok: true });
}
