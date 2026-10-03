import { prisma } from "./db";
import { getLinkCloseAfterSec } from "./settings";

// A customer's link is meant for the order in hand. Once their orders are all
// finished, the link closes after a delay the owner chooses in Settings (at
// once, 30 seconds, 2 minutes… or never). A closed link shows "this link
// doesn't work any more"; the store restores or regenerates it for the next
// order. Nothing is deleted: the customer and their orders stay.

/** Has this link's closing time passed? */
export function linkClosed(
  customer: { linkExpiresAt: Date | null },
  now = new Date(),
) {
  return customer.linkExpiresAt !== null && customer.linkExpiresAt <= now;
}

/**
 * Works out when the customer's link should close and stores it. Call it
 * after anything that changes an order's status or payment: it is computed
 * from scratch each time, so every route gets the same answer.
 *
 * - An order still in progress (or delivered but not yet paid) keeps the link open.
 * - Otherwise it closes `delay` after the latest order that was completed and
 *   paid since the link was issued. Cancelled orders never close a link.
 */
export async function syncLinkExpiry(customerId: string | null | undefined) {
  if (!customerId) return;
  // Like a notification, this must never fail the order action that caused it.
  try {
    const [closeAfterSec, customer] = await Promise.all([
      getLinkCloseAfterSec(),
      prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          linkSince: true,
          linkExpiresAt: true,
          orders: {
            where: { scheduledDeleteAt: null },
            select: {
              status: true,
              createdAt: true,
              deliveredAt: true,
              payment: { select: { status: true, confirmedAt: true } },
            },
          },
        },
      }),
    ]);
    if (!customer) return;

    let expiresAt: Date | null = null;
    if (closeAfterSec !== null) {
      const done = customer.orders.filter(
        (o) =>
          o.status === "COMPLETED" &&
          (!o.payment || o.payment.status === "PAID"),
      );
      const inProgress = customer.orders.some(
        (o) => o.status !== "CANCELLED" && !done.includes(o),
      );
      if (!inProgress) {
        const since = customer.linkSince.getTime();
        const finishedAt = done
          .map((o) =>
            Math.max(
              (o.deliveredAt ?? o.createdAt).getTime(),
              o.payment?.confirmedAt?.getTime() ?? 0,
            ),
          )
          .filter((t) => t >= since);
        if (finishedAt.length)
          expiresAt = new Date(Math.max(...finishedAt) + closeAfterSec * 1000);
      }
    }

    if (expiresAt?.getTime() !== customer.linkExpiresAt?.getTime()) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { linkExpiresAt: expiresAt },
      });
    }
  } catch (e) {
    console.error("[link-expiry] failed", e);
  }
}
