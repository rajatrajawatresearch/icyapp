import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getPickupLocation } from "@/lib/settings";
import { parseLatLng } from "@/lib/maps";
import { resolveGoogleMapsLink } from "@/lib/geocode";

export async function GET() {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  return NextResponse.json({ pickup: await getPickupLocation() });
}

const PickupSchema = z
  .object({
    address: z.string().trim().min(3, "Enter the pickup address").max(500),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
  })
  .refine((d) => (d.lat === null) === (d.lng === null), {
    message: "Pick a point on the map",
    path: ["lat"],
  });

/** PUT /api/superadmin/settings — set the store's pickup location. */
export async function PUT(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, PickupSchema);
  if (!body.ok) return body.res;
  const { address, lat, lng } = body.data;

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: { pickupAddress: address, pickupLat: lat, pickupLng: lng },
    create: { id: 1, pickupAddress: address, pickupLat: lat, pickupLng: lng },
  });
  await audit(auth.admin.id, "updated_pickup_location", "store", address);
  return NextResponse.json({ pickup: await getPickupLocation() });
}

/** POST /api/superadmin/settings — resolve a pasted Google Maps link to coordinates. */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(
    req,
    z.object({ link: z.string().trim().min(3).max(2000) }),
  );
  if (!body.ok) return body.res;

  const direct = parseLatLng(body.data.link);
  if (direct) return NextResponse.json(direct);
  try {
    const full = await resolveGoogleMapsLink(body.data.link);
    const point = full ? parseLatLng(full) : null;
    if (point) return NextResponse.json(point);
  } catch {
    // fall through to the friendly error
  }
  return jsonError(
    "Couldn't read a location from that link. In Google Maps: tap the place → Share → Copy link.",
  );
}
