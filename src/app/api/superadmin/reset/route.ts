import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { RESET_DELAY_SECONDS, TRASH_ENTITIES } from "@/lib/constants";
import { purgeExpired } from "@/lib/purge";

const UNIT_MS = {
  seconds: 1_000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
} as const;

const ResetSchema = z.object({
  entities: z.array(z.enum(TRASH_ENTITIES)).min(1, "Pick what to reset"),
  /** null = all time; otherwise rows created in the last `amount` `unit`. */
  range: z
    .object({
      amount: z.number().int().min(1).max(100_000),
      unit: z.enum(["seconds", "minutes", "hours", "days"]),
    })
    .nullable(),
  dryRun: z.boolean().default(false),
  /** Seconds until the rows are deleted for good; 0 deletes at once. */
  delaySeconds: z
    .number()
    .int()
    .refine(
      (s) => (RESET_DELAY_SECONDS as readonly number[]).includes(s),
      "Invalid delay",
    )
    .optional(),
  confirm: z.string().optional(),
});

type Ids = { order: string[]; customer: string[]; product: string[] };

/**
 * POST /api/superadmin/reset — bulk "reset" of business data created in a
 * time window. Uses the same safety window as single deletes: rows are hidden
 * now and purged when the timer ends, so it can be undone, unless the delay
 * is 0, which deletes at once. Admin accounts, settings and the audit log are
 * never touched.
 */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, ResetSchema);
  if (!body.ok) return body.res;
  const { entities, range, dryRun, delaySeconds, confirm } = body.data;

  const since = range
    ? new Date(Date.now() - range.amount * UNIT_MS[range.unit])
    : null;
  const where = {
    scheduledDeleteAt: null,
    ...(since && { createdAt: { gte: since } }),
  };
  const want = new Set(entities);
  const pick = { select: { id: true } };
  const none = Promise.resolve([] as { id: string }[]);

  const [orders, customers, products] = await Promise.all([
    want.has("order") ? prisma.order.findMany({ where, ...pick }) : none,
    want.has("customer") ? prisma.customer.findMany({ where, ...pick }) : none,
    want.has("product") ? prisma.product.findMany({ where, ...pick }) : none,
  ]);
  const ids: Ids = {
    order: orders.map((r) => r.id),
    customer: customers.map((r) => r.id),
    product: products.map((r) => r.id),
  };
  const counts = {
    order: ids.order.length,
    customer: ids.customer.length,
    product: ids.product.length,
  };
  if (dryRun) return NextResponse.json({ counts });

  if (confirm !== "RESET") return jsonError("Type RESET to confirm");
  if (delaySeconds === undefined) return jsonError("Choose when to delete");
  if (counts.order + counts.customer + counts.product === 0)
    return jsonError("Nothing matches this filter");

  const deleteAt = new Date(Date.now() + delaySeconds * 1000);
  const data = { scheduledDeleteAt: deleteAt };
  await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: { in: ids.order }, scheduledDeleteAt: null },
      data,
    }),
    prisma.customer.updateMany({
      where: { id: { in: ids.customer }, scheduledDeleteAt: null },
      data,
    }),
    prisma.product.updateMany({
      where: { id: { in: ids.product }, scheduledDeleteAt: null },
      data,
    }),
  ]);

  // "At once" means gone before this answer is sent, not at the next list load.
  if (delaySeconds === 0) await purgeExpired({ force: true });

  const window = range ? `last ${range.amount} ${range.unit}` : "all time";
  await audit(
    auth.admin.id,
    delaySeconds === 0 ? "bulk_reset" : "scheduled_bulk_reset",
    "reset",
    `${counts.order} orders, ${counts.customer} customers, ${counts.product} products · ${window} · ${
      delaySeconds === 0 ? "deleted at once" : `deletes in ${delaySeconds}s`
    }`,
  );
  return NextResponse.json({
    counts,
    ids,
    scheduledDeleteAt: deleteAt.toISOString(),
  });
}

const UndoSchema = z.object({
  ids: z.object({
    order: z.array(z.string()),
    customer: z.array(z.string()),
    product: z.array(z.string()),
  }),
});

/** DELETE /api/superadmin/reset — undo a reset while its timer is still running. */
export async function DELETE(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, UndoSchema);
  if (!body.ok) return body.res;
  const { ids } = body.data;

  const pending = { scheduledDeleteAt: { gt: new Date() } };
  const data = { scheduledDeleteAt: null };
  const [o, c, p] = await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: { in: ids.order }, ...pending },
      data,
    }),
    prisma.customer.updateMany({
      where: { id: { in: ids.customer }, ...pending },
      data,
    }),
    prisma.product.updateMany({
      where: { id: { in: ids.product }, ...pending },
      data,
    }),
  ]);
  const restored = o.count + c.count + p.count;
  if (restored === 0)
    return jsonError("Too late — the reset has already been applied", 410);
  await audit(
    auth.admin.id,
    "undo_bulk_reset",
    "reset",
    `${o.count} orders, ${c.count} customers, ${p.count} products restored`,
  );
  return NextResponse.json({ restored });
}
