import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { inr } from "@/lib/format";
import { getDeliveryPricing } from "@/lib/settings";

const MAX_AMOUNT = 100_000;
const money = z.number().min(0).max(MAX_AMOUNT).transform((n) => Math.round(n * 100) / 100);

const DeliverySchema = z.object({
  fee: money,
  /** Free delivery from this order value; null turns the offer off. */
  freeAbove: money.nullable(),
});

/** PUT /api/superadmin/settings/delivery — the store's delivery charge for new orders. */
export async function PUT(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, DeliverySchema);
  if (!body.ok) return body.res;
  const { fee, freeAbove } = body.data;

  const data = { deliveryFee: fee, freeDeliveryAbove: freeAbove };
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  await audit(
    auth.admin.id,
    "updated_delivery_charge",
    "store",
    fee === 0
      ? "delivery is free"
      : `${inr(fee)} per delivery${freeAbove === null ? "" : `, free from ${inr(freeAbove)}`}`,
  );
  return NextResponse.json({ delivery: await getDeliveryPricing() });
}
