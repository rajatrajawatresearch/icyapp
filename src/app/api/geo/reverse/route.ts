import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { reverseGeocode } from "@/lib/geocode";
import { isValidLatLng } from "@/lib/maps";

/** GET /api/geo/reverse?lat=…&lng=… — nearest address for a dropped pin / GPS fix. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!isValidLatLng(lat, lng)) return jsonError("Invalid coordinates");

  try {
    return NextResponse.json({ result: await reverseGeocode(lat, lng) });
  } catch {
    return jsonError("Couldn't look up this location", 502);
  }
}
