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
export async function purgeExpired({ force = false } = {}) {
  const now = Date.now();
  // `force`: an instant reset must be gone before the request returns.
  if (!force && now - lastRun < MIN_INTERVAL_MS) return;
  lastRun = now;

  const expired = { scheduledDeleteAt: { lte: new Date(now) } };
  await prisma.$transaction([
    prisma.order.deleteMany({ where: expired }),
    prisma.customer.deleteMany({ where: expired }),
    prisma.product.deleteMany({ where: expired }),
    // A deleted account takes its sessions, links and alerts with it; what it
    // did (orders, payments, audit entries) stays, without the link to it.
    prisma.admin.deleteMany({ where: expired }),
    prisma.auditLog.deleteMany({ where: expired }),
    prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: new Date(now - NOTIFICATION_RETENTION_DAYS * 86_400_000),
        },
      },
    }),
  ]);
}
