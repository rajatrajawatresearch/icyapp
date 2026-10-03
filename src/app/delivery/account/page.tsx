import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { AccountPanel } from "@/components/AccountPanel";
import { LogoutButton } from "@/components/LogoutButton";
import { pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "My account" };

export default async function DeliveryAccountPage() {
  const me = await requireAdminPage({ deliveryOnly: true });
  return (
    <div>
      <Link
        href="/delivery"
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        My deliveries
      </Link>
      <h1 className={`${pageTitle} mt-3`}>My account</h1>
      <AccountPanel me={me} />
      <div className="mt-4 space-y-3">
        <LogoutButton className="w-full py-3" />
      </div>
    </div>
  );
}
