import { requireAdminPage, isSuperAdmin } from "@/lib/auth";
import { Watermark } from "@/components/Watermark";
import { AdminNav } from "./AdminNav";

/** Shared shell for /admin/* and /superadmin/* (login lives outside this group). */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return (
    <div className="flex min-h-full flex-1 flex-col md:pl-64">
      <AdminNav name={admin.name} isSuper={isSuperAdmin(admin)} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-8 md:py-9">
        {children}
      </main>
      <Watermark text={`${admin.name} · ${admin.email}`} />
    </div>
  );
}
