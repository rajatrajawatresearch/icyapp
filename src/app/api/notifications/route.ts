import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { jsonWithEtag } from "@/lib/api";
import { listNotifications, markNotificationsRead } from "@/lib/notify";

/** GET /api/notifications — the signed-in staff member's notifications (polled by the bell). */
export async function GET(req: Request) {
  const auth = await requireAdminApi({ allowDelivery: true });
  if (!auth.ok) return auth.res;
  return jsonWithEtag(req, await listNotifications({ adminId: auth.admin.id }));
}

/** POST /api/notifications — mark everything read (the bell was opened). */
export async function POST() {
  const auth = await requireAdminApi({ allowDelivery: true });
  if (!auth.ok) return auth.res;
  await markNotificationsRead({ adminId: auth.admin.id });
  return NextResponse.json({ ok: true });
}
