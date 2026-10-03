import { DEFAULT_LINK_CLOSE_SEC } from "./constants";
import { prisma } from "./db";
import type { DeliveryPricing } from "./pricing";

export type PickupLocation = {
  address: string | null;
  lat: number | null;
  lng: number | null;
};

// Store-wide settings live in a single row (id = 1).
const row = () => prisma.storeSettings.findUnique({ where: { id: 1 } });

export async function getPickupLocation(): Promise<PickupLocation> {
  const s = await row();
  return {
    address: s?.pickupAddress ?? null,
    lat: s?.pickupLat ?? null,
    lng: s?.pickupLng ?? null,
  };
}

export async function getDeliveryPricing(): Promise<DeliveryPricing> {
  const s = await row();
  return {
    fee: Number(s?.deliveryFee ?? 0),
    freeAbove: s?.freeDeliveryAbove == null ? null : Number(s.freeDeliveryAbove),
  };
}

/**
 * Seconds a customer's link stays open after their order is finished
 * (0 = closes at once, null = never closes).
 */
export async function getLinkCloseAfterSec(): Promise<number | null> {
  const s = await row();
  return s ? s.linkCloseAfterSec : DEFAULT_LINK_CLOSE_SEC;
}
