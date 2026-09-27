"use client";

import dynamic from "next/dynamic";
import { googleDirectionsUrl } from "@/lib/maps";

const LeafletMap = dynamic(
  () => import("./LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-36 w-full animate-pulse rounded-xl bg-gray-100" />
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
      <p className="text-sm text-gray-600">
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
      <p className="text-sm text-gray-800">
        <span className="font-semibold">Pickup from:</span> {pickup.address}
      </p>
      {showMap && point && <LeafletMap point={point} className="h-36" />}
      <a
        href={googleDirectionsUrl(point, pickup.address)}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white active:opacity-80"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
        Directions in Google Maps
      </a>
    </div>
  );
}
