import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import {
  DEVICE_LOCKED_MESSAGE,
  readDeviceId,
  writeDeviceCookie,
} from "@/lib/device";
import { linkClosed } from "@/lib/link-expiry";
import { randomToken, sha256 } from "@/lib/token";

/**
 * POST /api/customer/:token/device — the first device to call this owns the
 * link; from then on it only renews that device's cookie. It is a POST made
 * by a tap, so link previews and crawlers (which only GET) can never claim a
 * link by accident.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const customer =
    token && token.length <= 64
      ? await prisma.customer.findUnique({ where: { token } })
      : null;
  if (
    !customer ||
    !customer.isActive ||
    customer.scheduledDeleteAt ||
    linkClosed(customer)
  )
    return jsonError("This link is invalid or has been revoked", 404);

  let device = await readDeviceId();
  let owner = customer.deviceHash;
  if (!owner) {
    device ??= randomToken(32);
    // Guarded on "still unclaimed": if two devices tap at once, one wins.
    const { count } = await prisma.customer.updateMany({
      where: { id: customer.id, deviceHash: null },
      data: { deviceHash: sha256(device), deviceBoundAt: new Date() },
    });
    owner = count
      ? sha256(device)
      : ((
          await prisma.customer.findUnique({
            where: { id: customer.id },
            select: { deviceHash: true },
          })
        )?.deviceHash ?? null);
  }
  if (!device || sha256(device) !== owner)
    return jsonError(DEVICE_LOCKED_MESSAGE, 423);

  await writeDeviceCookie(device);
  return NextResponse.json({ ok: true });
}
