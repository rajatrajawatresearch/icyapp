import { UserError } from "@/lib/api";

type ProductFields = {
  name?: string;
  price?: number;
  stockQty?: number;
  category?: string;
  isActive?: boolean;
};

/**
 * Reads product fields from multipart form data (multipart so an image can
 * ride along). With partial=true, absent fields are left undefined (PATCH).
 */
export function parseProductForm(
  form: FormData,
  { partial }: { partial: boolean },
): ProductFields {
  const str = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v.trim() : undefined;
  };
  const out: ProductFields = {};

  const name = str("name");
  if (name !== undefined) {
    if (!name || name.length > 120)
      throw new UserError("Name is required (max 120 chars)");
    out.name = name;
  } else if (!partial) throw new UserError("Name is required");

  const price = str("price");
  if (price !== undefined) {
    const n = Number(price);
    if (!price || !Number.isFinite(n) || n < 0 || n > 10_000_000)
      throw new UserError("Enter a valid price");
    out.price = Math.round(n * 100) / 100;
  } else if (!partial) throw new UserError("Price is required");

  const stock = str("stockQty");
  if (stock !== undefined) {
    const n = Number(stock);
    if (!stock || !Number.isInteger(n) || n < 0 || n > 1_000_000)
      throw new UserError("Stock must be a whole number ≥ 0");
    out.stockQty = n;
  } else if (!partial) throw new UserError("Stock is required");

  const category = str("category");
  if (category !== undefined) out.category = category.slice(0, 60) || "General";

  const isActive = str("isActive");
  if (isActive !== undefined) out.isActive = isActive === "true";

  return out;
}
