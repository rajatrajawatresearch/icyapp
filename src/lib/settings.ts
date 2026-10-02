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
