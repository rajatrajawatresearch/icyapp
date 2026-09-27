// Client-safe map helpers. Navigation uses plain Google Maps URLs (free, no
// API key); the in-app map/search uses OpenStreetMap data (also free).

export type LatLng = { lat: number; lng: number };

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Opens the spot in Google Maps (app on phones, web elsewhere). */
export function googleMapsUrl(point: LatLng | null, address?: string | null) {
  const query = point ? `${point.lat},${point.lng}` : (address ?? "");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Turn-by-turn directions from the user's current position. */
export function googleDirectionsUrl(
  point: LatLng | null,
  address?: string | null,
) {
  const destination = point ? `${point.lat},${point.lng}` : (address ?? "");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * Extracts coordinates from "12.97, 77.59" or a full Google Maps URL
 * (…/@12.97,77.59,17z, …!3d12.97!4d77.59, ?q=12.97,77.59, ?ll=…).
 * Short links (maps.app.goo.gl) need the server to follow the redirect first.
 */
export function parseLatLng(text: string): LatLng | null {
  const s = decodeURIComponent(text.trim());
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // place pin (most precise)
    /[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // map viewport centre
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/, // plain "lat, lng"
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (isValidLatLng(lat, lng)) return { lat, lng };
    }
  }
  return null;
}
