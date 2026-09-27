import { prisma } from "./db";

/**
 * Permanently removes rows whose delete timer has run out. Called lazily from
 * admin list endpoints/pages (the orders list polls every 6s, so this runs
 * often enough without a separate cron). FK cascades remove order items,
 * payments and a deleted customer's orders; order items keep their snapshot
 * when a product is removed (productId -> NULL).
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
