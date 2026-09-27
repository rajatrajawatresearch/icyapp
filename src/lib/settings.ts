import { prisma } from "./db";

export type PickupLocation = {
  address: string | null;
  lat: number | null;
  lng: number | null;
};

/** Store-wide settings live in a single row (id = 1). */
export async function getPickupLocation(): Promise<PickupLocation> {
  const s = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  return {
    address: s?.pickupAddress ?? null,
    lat: s?.pickupLat ?? null,
    lng: s?.pickupLng ?? null,
  };
}
