import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { DELETE_DELAY_SECONDS, TRASH_ENTITIES } from "@/lib/constants";
import { purgeExpired } from "@/lib/purge";
import { setScheduledDelete } from "@/lib/trash";

const ScheduleSchema = z.object({
  entity: z.enum(TRASH_ENTITIES),
  id: z.string().min(1),
  /** Seconds until it is gone for good; 0 deletes at once, with no undo. */
  seconds: z
    .number()
    .int()
    .refine(
      (s) => (DELETE_DELAY_SECONDS as readonly number[]).includes(s),
      "Invalid delay",
    ),
});

/** POST /api/admin/trash — SUPER_ADMIN deletes a row: at once, or after a delay during which it can be undone. */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, ScheduleSchema);
  if (!body.ok) return body.res;
  const { entity, id, seconds } = body.data;
  if (entity === "account" && id === auth.admin.id)
    return jsonError("You can't delete your own account");

  const deleteAt = new Date(Date.now() + seconds * 1000);
  const label = await setScheduledDelete(entity, id, {
    from: "none",
    to: deleteAt,
  });
  if (!label)
    return jsonError(
      `That ${entity} doesn't exist or is already being deleted`,
      404,
    );

  // "Instantly" means gone before this answer is sent.
  if (seconds === 0) await purgeExpired({ force: true });

  await audit(
    auth.admin.id,
    seconds === 0 ? `deleted_${entity}` : `scheduled_delete_${entity}`,
    id,
    seconds === 0 ? `${label} · deleted at once` : `${label} · deletes in ${seconds}s`,
  );
  return NextResponse.json({
    ok: true,
    scheduledDeleteAt: deleteAt.toISOString(),
  });
}

/**
 * GET /api/admin/trash — everything waiting to be deleted, of every kind, so
 * one screen (Settings → Delete) can undo any of it.
 */
export async function GET() {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  await purgeExpired();
  const where = { scheduledDeleteAt: { gt: new Date() } };
  const [orders, customers, products, accounts] = await Promise.all([
    prisma.order.findMany({ where, select: { id: true, number: true, customerName: true, scheduledDeleteAt: true } }),
    prisma.customer.findMany({ where, select: { id: true, name: true, phone: true, scheduledDeleteAt: true } }),
    prisma.product.findMany({ where, select: { id: true, name: true, scheduledDeleteAt: true } }),
    prisma.admin.findMany({ where, select: { id: true, name: true, email: true, scheduledDeleteAt: true } }),
  ]);
  const at = (d: Date | null) => d!.toISOString();
  const items = [
    ...orders.map((o) => ({ entity: "order" as const, id: o.id, label: `Order #${o.number}, ${o.customerName}`, scheduledDeleteAt: at(o.scheduledDeleteAt) })),
    ...customers.map((c) => ({ entity: "customer" as const, id: c.id, label: `Customer ${c.name}, ${c.phone}`, scheduledDeleteAt: at(c.scheduledDeleteAt) })),
    ...products.map((p) => ({ entity: "product" as const, id: p.id, label: `Product ${p.name}`, scheduledDeleteAt: at(p.scheduledDeleteAt) })),
    ...accounts.map((a) => ({ entity: "account" as const, id: a.id, label: `Account ${a.name}, ${a.email}`, scheduledDeleteAt: at(a.scheduledDeleteAt) })),
  ].sort((a, b) => a.scheduledDeleteAt.localeCompare(b.scheduledDeleteAt));
  return NextResponse.json({ items });
}
