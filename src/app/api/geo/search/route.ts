import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { searchPlaces } from "@/lib/geocode";
import { isValidLatLng } from "@/lib/maps";

/** GET /api/geo/search?q=…&lat=…&lng=… — place search for the location pickers. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  if (q.length < 3 || q.length > 200)
    return jsonError("Type at least 3 characters");
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const near =
    params.has("lat") && isValidLatLng(lat, lng) ? { lat, lng } : undefined;

  try {
    return NextResponse.json({ results: await searchPlaces(q, near) });
  } catch {
    return jsonError(
      "Location search is unavailable right now — type the address instead",
      502,
    );
  }
}
