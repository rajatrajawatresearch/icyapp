import { NextResponse } from "next/server";
import { requireAdminApi, setSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  accessLinkPath,
  disableAccessLink,
  refreshAccessLink,
} from "@/lib/access-link";

/** POST /api/auth/access-link — refresh my own sign-in link (other devices are signed out). */
export async function POST() {
  const auth = await requireAdminApi({ allowDelivery: true });
  if (!auth.ok) return auth.res;

  const { token, admin } = await refreshAccessLink(auth.admin.id);
  await audit(
    admin.id,
    "refreshed_access_link",
    admin.id,
    `own link (${admin.email})`,
  );

  const res = NextResponse.json({ path: accessLinkPath(token) });
  // Refreshing ended every session of this account — keep this device signed in.
  await setSessionCookie(res, admin);
  return res;
}

/** DELETE /api/auth/access-link — turn my sign-in link off. */
export async function DELETE() {
  const auth = await requireAdminApi({ allowDelivery: true });
  if (!auth.ok) return auth.res;
  await disableAccessLink(auth.admin.id);
  await audit(
    auth.admin.id,
    "disabled_access_link",
    auth.admin.id,
    `own link (${auth.admin.email})`,
  );
  return NextResponse.json({ ok: true });
}
