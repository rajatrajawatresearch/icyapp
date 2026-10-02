import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonWithEtag } from "@/lib/api";
import { purgeExpired } from "@/lib/purge";
import { orderInclude, toOrderDTO } from "@/lib/dto";

/** GET /api/admin/orders — polled every 6s by the admin orders page. */
export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  await purgeExpired();

  const [items, trash] = await Promise.all([
    prisma.order.findMany({
      where: { scheduledDeleteAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: orderInclude,
    }),
    prisma.order.findMany({
      where: { scheduledDeleteAt: { gt: new Date() } },
      orderBy: { scheduledDeleteAt: "asc" },
      include: orderInclude,
    }),
  ]);
  return jsonWithEtag(req, {
    items: items.map(toOrderDTO),
    trash: trash.map(toOrderDTO),
  });
}
