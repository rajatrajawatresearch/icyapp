import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import {
  getDeliveryPricing,
  getLinkCloseAfterSec,
  getPickupLocation,
} from "@/lib/settings";
import { pageLead, pageTitle } from "@/components/ui";
import { DeliverySettings } from "./DeliverySettings";
import { LinkSettings } from "./LinkSettings";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage({ superOnly: true });
  const [pickup, delivery, linkCloseAfterSec] = await Promise.all([
    getPickupLocation(),
    getDeliveryPricing(),
    getLinkCloseAfterSec(),
  ]);
  return (
    <div className="max-w-xl">
      <h1 className={pageTitle}>Store settings</h1>
      <p className={pageLead}>
        What customers are charged for delivery, when their link closes, and
        where they collect pickup orders.
      </p>
      <DeliverySettings initial={delivery} />
      <LinkSettings initial={linkCloseAfterSec} />
      <SettingsClient initial={pickup} />
    </div>
  );
}
