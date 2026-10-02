import { NextResponse } from "next/server";
import { jsonError, jsonWithEtag } from "@/lib/api";
import { resolveCustomer } from "@/lib/customer";
import { listNotifications, markNotificationsRead } from "@/lib/notify";

const INVALID = "This link is invalid or has been revoked";

/** GET /api/customer/:token/notifications — the customer's own notifications. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const customer = await resolveCustomer((await params).token);
  if (!customer) return jsonError(INVALID, 404);
  return jsonWithEtag(
    req,
    await listNotifications({ customerId: customer.id }),
  );
}

/** POST /api/customer/:token/notifications — mark everything read. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const customer = await resolveCustomer((await params).token);
  if (!customer) return jsonError(INVALID, 404);
  await markNotificationsRead({ customerId: customer.id });
  return NextResponse.json({ ok: true });
}
