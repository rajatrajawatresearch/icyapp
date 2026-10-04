import type { Metadata } from "next";
import { requireAdminPage, isSuperAdmin } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { PushPrompt } from "@/components/PushPrompt";
import { Watermark } from "@/components/Watermark";
import { AdminNav } from "./AdminNav";

// Only the store's own panel can be installed as an app. Customers and
// delivery partners use the app in the browser: their pages carry no
// manifest, so no browser offers to install them.
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

/** Shared shell for /admin/* and /superadmin/* (login lives outside this group). */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return (
    <div className="flex min-h-full flex-1 flex-col md:pl-64">
      <AdminNav
        name={admin.name}
        isSuper={isSuperAdmin(admin)}
        modules={admin.modules}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-8 md:py-9">
        <PushPrompt audience="staff" className="mb-5" />
        {children}
      </main>
      <Watermark text={`${admin.name} · ${admin.email}`} />
    </div>
  );
}
