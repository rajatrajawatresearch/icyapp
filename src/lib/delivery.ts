import type { Prisma } from "@prisma/client";

/**
 * Round-robin: the active delivery partner who has gone longest without a
 * new order (never-assigned partners go first). Returns null if nobody is
 * available to assign.
 */
export async function pickRoundRobinPartner(
  tx: Prisma.TransactionClient,
): Promise<string | null> {
  const partners = await tx.admin.findMany({
    where: { role: "DELIVERY", isActive: true, scheduledDeleteAt: null },
    select: { id: true },
  });
  if (partners.length === 0) return null;
  if (partners.length === 1) return partners[0].id;

  const lastAssigned = await tx.order.groupBy({
    by: ["deliveryPartnerId"],
    where: { deliveryPartnerId: { not: null } },
    _max: { createdAt: true },
  });
  const lastByPartner = new Map(
    lastAssigned.map((r) => [r.deliveryPartnerId as string, r._max.createdAt!]),
  );

  partners.sort((a, b) => {
    const at = lastByPartner.get(a.id)?.getTime() ?? -Infinity;
    const bt = lastByPartner.get(b.id)?.getTime() ?? -Infinity;
    return at - bt;
  });
  return partners[0].id;
}
