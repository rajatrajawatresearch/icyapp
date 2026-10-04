import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { isSuperAdmin, requireAdminPage } from "@/lib/auth";
import { AccountPanel } from "@/components/AccountPanel";
import { ReplaceAccount } from "@/components/ReplaceAccount";
import { pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requireAdminPage();
  // A super admin may delete their own account, as long as the store keeps an owner.
  const otherSupers = isSuperAdmin(me)
    ? await prisma.admin.count({
        where: {
          role: "SUPER_ADMIN",
          isActive: true,
          scheduledDeleteAt: null,
          id: { not: me.id },
        },
      })
    : 0;
  return (
    <div className="max-w-md">
      <h1 className={pageTitle}>My account</h1>
      <AccountPanel me={me} />
      {isSuperAdmin(me) && (
        <ReplaceAccount email={me.email} hasOtherSuper={otherSupers > 0} />
      )}
    </div>
  );
}
