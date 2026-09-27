import { prisma } from "./db";

/**
 * Permanently removes rows whose delete timer has run out. Called lazily from
 * admin list endpoints/pages (the orders list polls every 6s, so this runs
 * often enough without a separate cron). Purging an order cascades to its
 * items and payment. Purging a customer or product never destroys order
 * history: orders/items keep their name snapshots and the FK becomes NULL.
 */
export async function purgeExpired() {
  const now = new Date();
  const expired = { scheduledDeleteAt: { lte: now } };
  await prisma.$transaction([
    prisma.order.deleteMany({ where: expired }),
    prisma.customer.deleteMany({ where: expired }),
    prisma.product.deleteMany({ where: expired }),
  ]);
}
