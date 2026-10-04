import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { SectionTabs } from "@/components/SectionTabs";
import { TrackingClient } from "./TrackingClient";

export const metadata: Metadata = { title: "Live tracking" };

/** Admins and the super admin only: delivery partners never see this. */
export default async function TrackingPage() {
  await requireAdminPage({ module: "delivery" });
  return (
    <>
      <SectionTabs section="delivery" />
      <TrackingClient />
    </>
  );
}
