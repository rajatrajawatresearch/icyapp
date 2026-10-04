import { prisma } from "./db";
import type { TrashEntity } from "./constants";

type Transition =
  | { from: "none"; to: Date } // schedule: only rows not already scheduled
  | { from: "pending"; to: null }; // undo: only rows whose timer hasn't run out

/**
 * Atomically sets/clears scheduledDeleteAt for one row. Returns a short
 * human label for the audit log, or null if the row wasn't in the expected state.
 */
export async function setScheduledDelete(
  entity: TrashEntity,
  id: string,
  t: Transition,
): Promise<string | null> {
  const where = {
    id,
    scheduledDeleteAt: t.from === "none" ? null : { gt: new Date() },
  };
  const data = { scheduledDeleteAt: t.to };

  switch (entity) {
    case "product": {
      const { count } = await prisma.product.updateMany({ where, data });
      if (!count) return null;
      const p = await prisma.product.findUnique({
        where: { id },
        select: { name: true },
      });
      return `product "${p?.name}"`;
    }
    case "customer": {
      const { count } = await prisma.customer.updateMany({ where, data });
      if (!count) return null;
      const c = await prisma.customer.findUnique({
        where: { id },
        select: { name: true, phone: true },
      });
      return `customer ${c?.name} (${c?.phone})`;
    }
    case "account": {
      const { count } = await prisma.admin.updateMany({ where, data });
      if (!count) return null;
      const a = await prisma.admin.findUnique({
        where: { id },
        select: { name: true, email: true },
      });
      if (a && t.to) await keepActorName(id, a);
      return `account ${a?.name} (${a?.email})`;
    }
    case "order": {
      const { count } = await prisma.order.updateMany({ where, data });
      if (!count) return null;
      const o = await prisma.order.findUnique({
        where: { id },
        select: { number: true },
      });
      return `order #${o?.number}`;
    }
  }
}

/**
 * A deleted account's past actions stay in the audit log, but the row that
 * named the person will be gone. Write the name onto those entries now.
 */
export async function keepActorName(
  adminId: string,
  account: { name: string; email: string },
) {
  await prisma.auditLog.updateMany({
    where: { actorAdminId: adminId },
    data: { actorName: `${account.name} (${account.email})` },
  });
}
