import { prisma } from "./db";

const MIN_INTERVAL_MS = 20_000;
const NOTIFICATION_RETENTION_DAYS = 14;
let lastRun = 0;

/**
 * Permanently removes rows whose delete timer has run out. Called lazily from
 * admin list endpoints/pages (the orders list is polled every few seconds, so
 * no separate cron is needed). Purging an order cascades to its items and
 * payment. Purging a customer or product never destroys order history:
 * orders/items keep their name snapshots and the FK becomes NULL.
 *
 * Throttled per server instance: expired rows are already invisible to every
 * list (they filter on scheduledDeleteAt), so deleting them a few seconds
 * late changes nothing a user can see, and saves three writes per poll.
 */
export async function purgeExpired() {
  const now = Date.now();
  if (now - lastRun < MIN_INTERVAL_MS) return;
  lastRun = now;

  const expired = { scheduledDeleteAt: { lte: new Date(now) } };
  await prisma.$transaction([
    prisma.order.deleteMany({ where: expired }),
    prisma.customer.deleteMany({ where: expired }),
    prisma.product.deleteMany({ where: expired }),
    prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: new Date(now - NOTIFICATION_RETENTION_DAYS * 86_400_000),
        },
      },
    }),
  ]);
}
