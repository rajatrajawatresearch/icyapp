import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AccountPanel } from "@/components/AccountPanel";
import { pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requireAdminPage();
  return (
    <div className="max-w-md">
      <h1 className={pageTitle}>My account</h1>
      <AccountPanel me={me} />
    </div>
  );
}
