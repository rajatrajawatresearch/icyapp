import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { getPickupLocation } from "@/lib/settings";
import { pageTitle } from "@/components/ui";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage({ superOnly: true });
  return (
    <div className="max-w-xl">
      <h1 className={pageTitle}>Store settings</h1>
      <p className="text-sm text-ink-3">
        Customers who choose Pickup see this address with Google Maps
        directions.
      </p>
      <SettingsClient initial={await getPickupLocation()} />
    </div>
  );
}
