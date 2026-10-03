import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getLinkCloseAfterSec } from "@/lib/settings";

const LinkSchema = z.object({
  /** Seconds after a finished order; 0 = at once, null = never close. */
  closeAfterSec: z.number().int().min(0).max(7 * 24 * 60 * 60).nullable(),
});

/**
 * PUT /api/superadmin/settings/link — how long a customer's link stays open
 * after their order is finished. It applies to orders finished from now on;
 * links already counting down keep their time, unless closing is turned off.
 */
export async function PUT(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, LinkSchema);
  if (!body.ok) return body.res;
  const { closeAfterSec } = body.data;

  const data = { linkCloseAfterSec: closeAfterSec };
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  if (closeAfterSec === null) {
    // "Never" also stops the links that were about to close.
    await prisma.customer.updateMany({
      where: { linkExpiresAt: { gt: new Date() } },
      data: { linkExpiresAt: null },
    });
  }
  await audit(
    auth.admin.id,
    "updated_link_closing",
    "store",
    closeAfterSec === null
      ? "customer links stay open"
      : closeAfterSec === 0
        ? "customer links close as soon as the order is finished"
        : `customer links close ${closeAfterSec}s after the order is finished`,
  );
  return NextResponse.json({ closeAfterSec: await getLinkCloseAfterSec() });
}
