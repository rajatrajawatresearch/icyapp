import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { sendPush } from "./push";

// Every order event tells the people who need to act on it: store staff,
// the assigned delivery partner, and the customer. Each notification is a row
// (shown under the bell) and, where the device opted in, a push message.

export type NotificationInput = {
  /** Machine-readable event name, e.g. "new_order". */
  type: string;
  title: string;
  body: string;
  orderId?: string | null;
};

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
};

const LIST_SIZE = 30;

async function deliver(
  to: { adminIds?: string[]; customerId?: string | null },
  n: NotificationInput,
) {
  const adminIds = [...new Set(to.adminIds ?? [])];
  const customerId = to.customerId ?? null;
  const base = {
    type: n.type,
    title: n.title,
    body: n.body,
    orderId: n.orderId ?? null,
  };
  const rows: Prisma.NotificationCreateManyInput[] = [
    ...adminIds.map((adminId) => ({ ...base, adminId })),
    ...(customerId ? [{ ...base, customerId }] : []),
  ];
  if (!rows.length) return;
  await prisma.notification.createMany({ data: rows });
  // Push after the response is sent so the action itself stays fast.
  after(() =>
    sendPush(
      { adminIds, customerId },
      { title: n.title, body: n.body, tag: n.orderId ?? n.type },
    ),
  );
}

/** A failed notification must never fail the order action that caused it. */
async function safely(send: () => Promise<void>) {
  try {
    await send();
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

/** All active admins and super admins. */
export function notifyStore(n: NotificationInput) {
  return safely(async () => {
    const staff = await prisma.admin.findMany({
      where: { isActive: true, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: { id: true },
    });
    await deliver({ adminIds: staff.map((s) => s.id) }, n);
  });
}

/** One staff account — in practice the assigned delivery partner. */
export function notifyStaff(
  adminId: string | null | undefined,
  n: NotificationInput,
) {
  return safely(async () => {
    if (adminId) await deliver({ adminIds: [adminId] }, n);
  });
}

/** The customer who placed the order (no-op once they have been deleted). */
export function notifyCustomer(
  customerId: string | null | undefined,
  n: NotificationInput,
) {
  return safely(async () => {
    if (customerId) await deliver({ customerId }, n);
  });
}

type Owner = { adminId: string } | { customerId: string };

export async function listNotifications(owner: Owner) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: owner,
      orderBy: { createdAt: "desc" },
      take: LIST_SIZE,
    }),
    prisma.notification.count({ where: { ...owner, readAt: null } }),
  ]);
  return {
    unread,
    items: items.map(
      (n): NotificationDTO => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        orderId: n.orderId,
        read: n.readAt !== null,
        createdAt: n.createdAt.toISOString(),
      }),
    ),
  };
}

export async function markNotificationsRead(owner: Owner) {
  await prisma.notification.updateMany({
    where: { ...owner, readAt: null },
    data: { readAt: new Date() },
  });
}
