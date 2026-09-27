// Server-side geocoding via Photon (OpenStreetMap data, free, no API key).
// Proxied through our API so we can send a proper User-Agent and keep the
// provider swappable (e.g. for Google Places later) without touching the UI.

const PHOTON = "https://photon.komoot.io";
const USER_AGENT = "MiniMarketplace/1.0 (order delivery location lookup)";

export type GeoResult = { label: string; lat: number; lng: number };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
};

function labelFor(p: PhotonFeature["properties"]) {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const parts = [
    p.name,
    street,
    p.locality ?? p.district,
    p.city ?? p.county,
    p.state,
    p.postcode,
  ];
  // Drop empties and repeats (Photon often repeats name == street/city).
  return [
    ...new Set(parts.filter((x): x is string => Boolean(x && x.trim()))),
  ].join(", ");
}

async function photon(path: string): Promise<GeoResult[]> {
  const res = await fetch(`${PHOTON}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map((f) => ({
    label: labelFor(f.properties),
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

export function searchPlaces(q: string, near?: { lat: number; lng: number }) {
  const params = new URLSearchParams({ q, limit: "6" });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lng));
  }
  return photon(`/api/?${params}`);
}

export async function reverseGeocode(lat: number, lng: number) {
  const [first] = await photon(`/reverse?lat=${lat}&lon=${lng}&limit=1`);
  return first ?? null;
}

const GOOGLE_MAPS_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "www.google.co.in",
  "google.co.in",
]);

/**
 * Follows a Google Maps share link (e.g. maps.app.goo.gl/…) to its full URL.
 * Only Google Maps hosts are ever fetched, hop by hop, so this can't be used
 * to make the server request arbitrary URLs.
 */
export async function resolveGoogleMapsLink(
  input: string,
): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== "https:" || !GOOGLE_MAPS_HOSTS.has(url.hostname))
      return null;
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      continue;
    }
    return url.toString();
  }
  return url.toString();
}
