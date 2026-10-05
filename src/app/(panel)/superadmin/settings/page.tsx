import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import {
  getDeliveryPricing,
  getLinkCloseAfterSec,
  getPayDefaults,
  getPickupLocation,
} from "@/lib/settings";
import { pageTitle } from "@/components/ui";
import { DeliverySettings } from "./DeliverySettings";
import { LinkSettings } from "./LinkSettings";
import { PaymentSettings } from "./PaymentSettings";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage({ superOnly: true });
  const [pickup, delivery, linkCloseAfterSec, pay] = await Promise.all([
    getPickupLocation(),
    getDeliveryPricing(),
    getLinkCloseAfterSec(),
    getPayDefaults(),
  ]);
  return (
    <div className="max-w-xl">
      <h1 className={pageTitle}>Store settings</h1>
      <PaymentSettings initial={pay} />
      <DeliverySettings initial={delivery} />
      <LinkSettings initial={linkCloseAfterSec} />
      <SettingsClient initial={pickup} />
    </div>
  );
}
