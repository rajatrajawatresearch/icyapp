import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  isSuperAdmin,
  requireAdminApi,
  setSessionCookie,
  type SessionAdmin,
} from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import {
  accessLinkPath,
  disableAccessLink,
  refreshAccessLink,
} from "@/lib/access-link";

/**
 * Who may manage whose link: a super admin, anyone's; an admin, only a
 * delivery partner's. (An admin holding another admin's link would be able
 * to sign in as them, so that is never allowed.)
 */
async function manageableAccount(caller: SessionAdmin, id: string) {
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) return { error: jsonError("Account not found", 404) };
  if (!isSuperAdmin(caller) && target.role !== "DELIVERY") {
    return {
      error: jsonError(
        "Only a super admin can manage this account's link",
        403,
      ),
    };
  }
  return { target };
}

/** POST /api/admin/team/:id/access-link — issue a fresh sign-in link; the old one stops working. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const found = await manageableAccount(auth.admin, id);
  if (found.error) return found.error;
  if (!found.target.isActive)
    return jsonError("Reactivate this account before giving it a link");

  const { token, admin } = await refreshAccessLink(id);
  await audit(
    auth.admin.id,
    "refreshed_access_link",
    id,
    `${admin.name} (${admin.email})`,
  );

  const res = NextResponse.json({ path: accessLinkPath(token) });
  // Refreshing my own link from the team list must not sign me out here.
  if (id === auth.admin.id) await setSessionCookie(res, admin);
  return res;
}

/** DELETE /api/admin/team/:id/access-link — turn the link off (password sign-in still works). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const found = await manageableAccount(auth.admin, id);
  if (found.error) return found.error;

  await disableAccessLink(id);
  await audit(
    auth.admin.id,
    "disabled_access_link",
    id,
    `${found.target.name} (${found.target.email})`,
  );
  return NextResponse.json({ ok: true });
}
