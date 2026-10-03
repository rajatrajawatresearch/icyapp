import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { PushPrompt } from "@/components/PushPrompt";
import { Watermark } from "@/components/Watermark";
import { DeliveryHeader } from "./DeliveryHeader";

export const metadata: Metadata = {
  title: "Deliveries",
  manifest: "/delivery/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Delivery", statusBarStyle: "default" },
};

/** Delivery partner panel: only role DELIVERY gets in; others go to their own home. */
export default async function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireAdminPage({ deliveryOnly: true });
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DeliveryHeader name={me.name} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
        <PushPrompt audience="staff" className="mb-4" />
        {children}
      </main>
      <Watermark text={`${me.name} · ${me.email}`} />
    </div>
  );
}
