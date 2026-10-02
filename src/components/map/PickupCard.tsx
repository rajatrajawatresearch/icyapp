"use client";

import dynamic from "next/dynamic";
import { Navigation } from "lucide-react";
import { googleDirectionsUrl } from "@/lib/maps";

const LeafletMap = dynamic(
  () => import("./LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-36 w-full animate-pulse rounded-xl bg-muted" />
    ),
  },
);

export type Pickup = {
  address: string | null;
  lat: number | null;
  lng: number | null;
};

/** Store pickup address with a small map and a Google Maps directions button. */
export function PickupCard({
  pickup,
  showMap = true,
}: {
  pickup: Pickup;
  showMap?: boolean;
}) {
  if (!pickup.address) {
    return (
      <p className="text-sm text-ink-2">
        The store will share pickup details after confirming your order.
      </p>
    );
  }
  const point =
    pickup.lat !== null && pickup.lng !== null
      ? { lat: pickup.lat, lng: pickup.lng }
      : null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink">
        <span className="font-semibold">Pickup from:</span> {pickup.address}
      </p>
      {showMap && point && <LeafletMap point={point} className="h-36" />}
      <a
        href={googleDirectionsUrl(point, pickup.address)}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-on-solid shadow-brand transition active:scale-[0.98]"
      >
        <Navigation className="h-4 w-4" aria-hidden />
        Directions in Google Maps
      </a>
    </div>
  );
}
