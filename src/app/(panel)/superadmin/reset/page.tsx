import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { pageTitle } from "@/components/ui";
import { ResetClient } from "./ResetClient";

export const metadata: Metadata = { title: "Data reset" };

export default async function ResetPage() {
  await requireAdminPage({ superOnly: true });
  return (
    <div className="max-w-xl">
      <h1 className={pageTitle}>Data reset</h1>
      <p className="mt-1 text-sm text-gray-500">
        Clear test or wrong data created in a time window. Admin accounts,
        settings and the audit log are never touched.
      </p>
      <ResetClient />
    </div>
  );
}
