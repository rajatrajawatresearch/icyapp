import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { UserError, jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { saveImage } from "@/lib/uploads";
import { getPayDefaults } from "@/lib/settings";

/** Blank text means "not set". */
const blankToNull = (v: string) => (v.trim() === "" ? null : v.trim());

const DetailsSchema = z.object({
  upiId: z
    .string()
    .max(120)
    .transform(blankToNull)
    .refine(
      (v) => v === null || /^[\w.-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}$/.test(v),
      {
        message: "A UPI ID looks like name@bank",
      },
    ),
  note: z.string().max(600).transform(blankToNull),
});

export async function GET() {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  return NextResponse.json(await getPayDefaults());
}

/**
 * PUT /api/superadmin/settings/pay — save the UPI ID / bank details that are
 * auto-sent on every new UPI order from now on.
 */
export async function PUT(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, DetailsSchema);
  if (!body.ok) return body.res;
  const { upiId, note } = body.data;

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: { payUpiId: upiId, payNote: note },
    create: { id: 1, payUpiId: upiId, payNote: note },
  });
  await audit(
    auth.admin.id,
    "updated_default_pay_details",
    "store",
    [upiId && `UPI ID ${upiId}`, note && "bank/other details"]
      .filter(Boolean)
      .join(" + ") || "removed",
  );
  return NextResponse.json(await getPayDefaults());
}

/** POST /api/superadmin/settings/pay — multipart `file`; saves the default UPI QR. */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;

  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || file.size === 0)
      return jsonError("Choose a QR image to upload");
    const payQrImageUrl = await saveImage(file);
    await prisma.storeSettings.upsert({
      where: { id: 1 },
      update: { payQrImageUrl },
      create: { id: 1, payQrImageUrl },
    });
    await audit(
      auth.admin.id,
      "updated_default_pay_qr",
      "store",
      "QR replaced",
    );
  } catch (e) {
    if (e instanceof UserError) return jsonError(e.message, e.status);
    throw e;
  }
  return NextResponse.json(await getPayDefaults());
}

/** DELETE /api/superadmin/settings/pay — remove the saved default QR. */
export async function DELETE() {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: { payQrImageUrl: null },
    create: { id: 1 },
  });
  await audit(auth.admin.id, "updated_default_pay_qr", "store", "QR removed");
  return NextResponse.json(await getPayDefaults());
}
