import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { UserError, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { purgeExpired } from "@/lib/purge";
import { saveImage } from "@/lib/uploads";
import { toProductDTO } from "@/lib/dto";
import { parseProductForm } from "./form";

export async function GET() {
  const auth = await requireAdminApi({ module: "products" });
  if (!auth.ok) return auth.res;
  await purgeExpired();

  const [items, trash] = await Promise.all([
    prisma.product.findMany({
      where: { scheduledDeleteAt: null },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { scheduledDeleteAt: { gt: new Date() } },
      orderBy: { scheduledDeleteAt: "asc" },
    }),
  ]);
  return NextResponse.json({
    items: items.map(toProductDTO),
    trash: trash.map(toProductDTO),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi({ module: "products" });
  if (!auth.ok) return auth.res;

  try {
    const form = await req.formData();
    const fields = parseProductForm(form, { partial: false });
    const image = form.get("image");
    const imageUrl =
      image instanceof File && image.size > 0 ? await saveImage(image) : null;

    const product = await prisma.product.create({
      data: {
        name: fields.name!,
        price: fields.price!,
        stockQty: fields.stockQty ?? null,
        category: fields.category ?? "General",
        isActive: fields.isActive ?? true,
        imageUrl,
        adminId: auth.admin.id,
      },
    });
    await audit(
      auth.admin.id,
      "created_product",
      product.id,
      `product "${product.name}"`,
    );
    return NextResponse.json(toProductDTO(product), { status: 201 });
  } catch (e) {
    if (e instanceof UserError) return jsonError(e.message, e.status);
    throw e;
  }
}
