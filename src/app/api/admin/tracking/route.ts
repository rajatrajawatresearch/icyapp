import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonWithEtag } from "@/lib/api";
import {
  analyseTrack,
  waitingAtCustomerMs,
  type Ping,
  type RiderTrack,
} from "@/lib/tracking";

/**
 * How far back the screen looks. A rolling window, not "today": a store that
 * delivers late would otherwise lose the evening's routes at midnight.
 */
const WINDOW_MS = 12 * 60 * 60 * 1000;
/** The drawn route never needs more points than this. */
const MAX_PATH_POINTS = 400;

/**
 * GET /api/admin/tracking — where each delivery partner is, their route over
 * the last 12 hours, stops and waiting times. Admins and the super admin only: delivery
 * partners and customers never see this.
 */
export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const since = new Date(Date.now() - WINDOW_MS);

  const riders = await prisma.admin.findMany({
    where: { role: "DELIVERY", isActive: true, scheduledDeleteAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const riderIds = riders.map((r) => r.id);
  const [pings, orders] = await Promise.all([
    prisma.locationPing.findMany({
      where: { adminId: { in: riderIds }, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: {
        deliveryPartnerId: { in: riderIds },
        scheduledDeleteAt: null,
        OR: [
          { status: "OUT_FOR_DELIVERY" },
          { status: "COMPLETED", deliveredAt: { gte: since } },
        ],
      },
      orderBy: { dispatchedAt: "desc" },
    }),
  ]);

  const now = Date.now();
  const tracks: RiderTrack[] = riders.map((rider) => {
    const mine = pings.filter((p) => p.adminId === rider.id);
    const route: Ping[] = mine.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      at: p.createdAt.getTime(),
    }));
    const { stops, ...summary } = analyseTrack(route);
    const step = Math.ceil(route.length / MAX_PATH_POINTS) || 1;
    const lastPing = mine.at(-1);
    return {
      id: rider.id,
      name: rider.name,
      last: lastPing
        ? {
            lat: lastPing.lat,
            lng: lastPing.lng,
            accuracy: lastPing.accuracy,
            at: lastPing.createdAt.toISOString(),
          }
        : null,
      path: route
        .filter((_, i) => i % step === 0 || i === route.length - 1)
        .map((p) => [p.lat, p.lng]),
      summary,
      stops: stops.map((s) => ({
        lat: s.lat,
        lng: s.lng,
        from: new Date(s.from).toISOString(),
        to: new Date(s.to).toISOString(),
      })),
      deliveries: orders
        .filter((o) => o.deliveryPartnerId === rider.id)
        .map((o) => {
          const pin =
            o.deliveryLat !== null && o.deliveryLng !== null
              ? { lat: o.deliveryLat, lng: o.deliveryLng }
              : null;
          return {
            id: o.id,
            number: o.number,
            customerName: o.customerName,
            address: o.deliveryAddress,
            pin,
            delivered: o.status === "COMPLETED",
            dispatchedAt: o.dispatchedAt?.toISOString() ?? null,
            deliveredAt: o.deliveredAt?.toISOString() ?? null,
            waitingMs: waitingAtCustomerMs(
              stops,
              pin,
              (o.dispatchedAt ?? since).getTime(),
              (o.status === "COMPLETED" ? o.deliveredAt : null)?.getTime() ?? now,
            ),
          };
        }),
    };
  });
  return jsonWithEtag(req, { riders: tracks });
}
