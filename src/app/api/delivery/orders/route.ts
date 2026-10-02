import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonWithEtag } from "@/lib/api";
import { startOfStoreDay } from "@/lib/time";
import { orderInclude, toOrderDTO } from "@/lib/dto";

/** GET /api/delivery/orders — the signed-in partner's assigned orders (polled). */
export async function GET(req: Request) {
  const auth = await requireAdminApi({ deliveryOnly: true });
  if (!auth.ok) return auth.res;

  const mine = { deliveryPartnerId: auth.admin.id, scheduledDeleteAt: null };
  const [active, doneToday] = await Promise.all([
    prisma.order.findMany({
      where: { ...mine, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "asc" }, // oldest first = deliver first
      include: orderInclude,
    }),
    prisma.order.findMany({
      where: {
        ...mine,
        status: "COMPLETED",
        deliveredAt: { gte: startOfStoreDay() },
      },
      orderBy: { deliveredAt: "desc" },
      include: orderInclude,
    }),
  ]);
  return jsonWithEtag(req, {
    active: active.map(toOrderDTO),
    doneToday: doneToday.map(toOrderDTO),
  });
}
