import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { orderInclude, toOrderDTO } from "@/lib/dto";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** GET /api/delivery/orders — the signed-in partner's assigned orders (polled). */
export async function GET() {
  const auth = await requireAdminApi({ deliveryOnly: true });
  if (!auth.ok) return auth.res;

  const mine = { deliveryPartnerId: auth.admin.id, scheduledDeleteAt: null };
  const [active, doneToday] = await Promise.all([
    prisma.order.findMany({
      where: { ...mine, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "asc" }, // oldest first = deliver first
      include: orderInclude,
    }),
    prisma.order.findMany({
      where: {
        ...mine,
        status: "COMPLETED",
        deliveredAt: { gte: startOfToday() },
      },
      orderBy: { deliveredAt: "desc" },
      include: orderInclude,
    }),
  ]);
  return NextResponse.json({
    active: active.map(toOrderDTO),
    doneToday: doneToday.map(toOrderDTO),
  });
}
