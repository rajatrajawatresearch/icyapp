import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { parseJson } from "@/lib/api";

const PingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000),
});

/** A fix worse than this says little about where the rider is. */
const MAX_ACCURACY_M = 200;
/** Phones can report several fixes a second; one every few seconds is plenty. */
const MIN_INTERVAL_MS = 8_000;
const KEEP_DAYS = 3;

/**
 * POST /api/delivery/location — the delivery partner's app reports where it
 * is. Stored only while that partner has an order out for delivery: outside a
 * delivery nothing is kept, whatever the app sends. `tracking: false` tells
 * the app to stop asking the phone for its position.
 */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ deliveryOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, PingSchema);
  if (!body.ok) return body.res;
  const adminId = auth.admin.id;

  const delivering = await prisma.order.count({
    where: {
      deliveryPartnerId: adminId,
      status: "OUT_FOR_DELIVERY",
      scheduledDeleteAt: null,
    },
  });
  if (!delivering) return NextResponse.json({ tracking: false });

  const last = await prisma.locationPing.findFirst({
    where: { adminId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const tooSoon = last && Date.now() - last.createdAt.getTime() < MIN_INTERVAL_MS;
  if (!tooSoon && body.data.accuracy <= MAX_ACCURACY_M) {
    await prisma.locationPing.create({ data: { adminId, ...body.data } });
    // Old routes are of no use to anyone: clear them out now and then.
    if (Math.random() < 0.02) {
      await prisma.locationPing.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } },
      });
    }
  }
  return NextResponse.json({ tracking: true });
}
