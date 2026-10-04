import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { pageTitle } from "@/components/ui";
import { ResetClient } from "./ResetClient";
import { TrashList } from "./TrashList";

export const metadata: Metadata = { title: "Delete" };

export default async function ResetPage() {
  await requireAdminPage({ superOnly: true });
  return (
    <div className="max-w-xl">
      <h1 className={pageTitle}>Delete</h1>
      <p className="mt-1 text-sm text-ink-3">
        Undo a delete, or clear many things at once.
      </p>
      <TrashList />
      <ResetClient />
    </div>
  );
}
