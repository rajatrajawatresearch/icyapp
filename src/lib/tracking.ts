// Shared between server and client code — keep free of server-only imports.
// Turns a delivery partner's location pings into what the store wants to
// know: where they are, the route, where they stopped and for how long.

export type Ping = { lat: number; lng: number; at: number };
export type Stop = { lat: number; lng: number; from: number; to: number };

/** A phone standing still wanders about this far on GPS. */
const STOP_RADIUS_M = 60;
/** Shorter pauses are traffic lights, not stops. */
const STOP_MIN_MS = 2 * 60_000;
/**
 * No ping for this long means the rider's screen was off or the app was in
 * the background. That time is unknown: it is not counted as a stop.
 */
const GAP_MS = 3 * 60_000;
/** A stop this close to the customer's pin is time spent waiting there. */
const AT_CUSTOMER_M = 150;

export function metresBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export type TrackSummary = {
  /** Time covered by pings. */
  trackedMs: number;
  stoppedMs: number;
  movingMs: number;
  /** Time with no pings in between (screen off, app closed). */
  unknownMs: number;
  distanceM: number;
  stops: Stop[];
};

/** `pings` must be in time order. */
export function analyseTrack(pings: Ping[]): TrackSummary {
  const stops: Stop[] = [];
  let trackedMs = 0;
  let unknownMs = 0;
  let distanceM = 0;
  /** Index of the ping the rider has stayed near since. */
  let anchor = 0;

  const closeStay = (last: number) => {
    const from = pings[anchor].at;
    const to = pings[last].at;
    if (to - from < STOP_MIN_MS) return;
    const stay = pings.slice(anchor, last + 1);
    stops.push({
      lat: stay.reduce((s, p) => s + p.lat, 0) / stay.length,
      lng: stay.reduce((s, p) => s + p.lng, 0) / stay.length,
      from,
      to,
    });
  };

  for (let i = 1; i < pings.length; i++) {
    const gap = pings[i].at - pings[i - 1].at;
    if (gap > GAP_MS) {
      unknownMs += gap;
      closeStay(i - 1);
      anchor = i;
      continue;
    }
    trackedMs += gap;
    const moved = metresBetween(pings[anchor], pings[i]);
    if (moved <= STOP_RADIUS_M) continue; // still in the same place
    closeStay(i - 1);
    distanceM += moved;
    anchor = i;
  }
  if (pings.length) closeStay(pings.length - 1);

  const stoppedMs = stops.reduce((s, x) => s + (x.to - x.from), 0);
  return {
    trackedMs,
    stoppedMs,
    movingMs: Math.max(0, trackedMs - stoppedMs),
    unknownMs,
    distanceM,
    stops,
  };
}

/**
 * How long the rider waited at the customer's place during one delivery
 * (`from`–`to`). Null when the order has no map pin to measure against.
 */
export function waitingAtCustomerMs(
  stops: Stop[],
  pin: { lat: number; lng: number } | null,
  from: number,
  to: number,
): number | null {
  if (!pin) return null;
  return stops
    .filter((s) => metresBetween(s, pin) <= AT_CUSTOMER_M)
    .reduce(
      (sum, s) => sum + Math.max(0, Math.min(s.to, to) - Math.max(s.from, from)),
      0,
    );
}

/** "45s", "7m", "1h 20m". */
export function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// What the admin tracking screen receives.
export type RiderTrack = {
  id: string;
  name: string;
  last: { lat: number; lng: number; accuracy: number; at: string } | null;
  /** The route over the last 12 hours, thinned for drawing. */
  path: [number, number][];
  summary: Omit<TrackSummary, "stops">;
  stops: { lat: number; lng: number; from: string; to: string }[];
  deliveries: {
    id: string;
    number: number;
    customerName: string;
    address: string | null;
    pin: { lat: number; lng: number } | null;
    delivered: boolean;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    waitingMs: number | null;
  }[];
};
