import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { UserError, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { saveImage } from "@/lib/uploads";
import { toProductDTO } from "@/lib/dto";
import { parseProductForm } from "../form";

/** PATCH /api/admin/products/:id — multipart; any subset of fields, optional new image. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.res;
  const { id } = await params;

  const existing = await prisma.product.findFirst({
    where: { id, scheduledDeleteAt: null },
  });
  if (!existing) return jsonError("Product not found", 404);

  try {
    const form = await req.formData();
    const fields = parseProductForm(form, { partial: true });
    const image = form.get("image");
    const imageUrl =
      image instanceof File && image.size > 0
        ? await saveImage(image)
        : undefined;

    const product = await prisma.product.update({
      where: { id },
      data: { ...fields, imageUrl },
    });
    const action =
      Object.keys(fields).length === 1 && fields.isActive !== undefined
        ? fields.isActive
          ? "activated_product"
          : "deactivated_product"
        : "updated_product";
    await audit(auth.admin.id, action, id, `product "${product.name}"`);
    return NextResponse.json(toProductDTO(product));
  } catch (e) {
    if (e instanceof UserError) return jsonError(e.message, e.status);
    throw e;
  }
}
