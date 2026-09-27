import { requireAdminPage, isSuperAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

/** Shared shell for /admin/* and /superadmin/* (login lives outside this group). */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AdminNav name={admin.name} isSuper={isSuperAdmin(admin)} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6">
        {children}
      </main>
    </div>
  );
}
