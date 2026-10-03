"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Package } from "lucide-react";
import type { ProductDTO } from "@/lib/dto";
import { api, errorMessage } from "@/lib/client-api";
import { inr } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { DeleteButton } from "@/components/DeleteButton";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";
import { ListSkeleton } from "@/components/Skeleton";
import {
  btnPrimary,
  btnSecondary,
  card,
  emptyState,
  input,
  label,
  pageTitle,
} from "@/components/ui";

type Form = {
  name: string;
  price: string;
  /** Off by default: the product is always available and no count is kept. */
  limitStock: boolean;
  stockQty: string;
  category: string;
  isActive: boolean;
};
const EMPTY: Form = {
  name: "",
  price: "",
  limitStock: false,
  stockQty: "",
  category: "",
  isActive: true,
};

export function ProductsClient({ isSuper }: { isSuper: boolean }) {
  const [items, setItems] = useState<ProductDTO[] | null>(null);
  const [trash, setTrash] = useState<ProductDTO[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: ProductDTO[]; trash: ProductDTO[] }>(
        "/api/admin/products",
      );
      setItems(data.items);
      setTrash(data.trash);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set((items ?? []).map((p) => p.category))].sort(),
    [items],
  );

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setShowForm(true);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(p: ProductDTO) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: String(p.price),
      limitStock: p.stockQty !== null,
      stockQty: p.stockQty === null ? "" : String(p.stockQty),
      category: p.category,
      isActive: p.isActive,
    });
    setShowForm(true);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("price", form.price);
    // Blank tells the server not to track stock for this product.
    fd.set("stockQty", form.limitStock ? form.stockQty.trim() || "0" : "");
    fd.set("category", form.category);
    fd.set("isActive", String(form.isActive));
    const file = fileRef.current?.files?.[0];
    try {
      // Phone photos are several MB: shrink before upload (faster, and lighter for customers).
      if (file) fd.set("image", await compressImage(file));
      await api(
        editingId ? `/api/admin/products/${editingId}` : "/api/admin/products",
        {
          method: editingId ? "PATCH" : "POST",
          body: fd,
        },
      );
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: ProductDTO) {
    const fd = new FormData();
    fd.set("isActive", String(!p.isActive));
    setItems(
      (prev) =>
        prev?.map((x) =>
          x.id === p.id ? { ...x, isActive: !p.isActive } : x,
        ) ?? null,
    );
    try {
      await api(`/api/admin/products/${p.id}`, { method: "PATCH", body: fd });
    } catch (err) {
      setError(errorMessage(err));
    }
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className={pageTitle}>Products</h1>
        {!showForm && (
          <button type="button" className={btnPrimary} onClick={startAdd}>
            + Add product
          </button>
        )}
      </div>

      {error && !showForm && (
        <p className="mt-3 text-sm text-danger-ink">{error}</p>
      )}

      {showForm && (
        <form
          ref={formRef}
          onSubmit={save}
          className={`${card} mt-4 space-y-3 p-4`}
        >
          <h2 className="font-medium text-ink">
            {editingId ? "Edit product" : "New product"}
          </h2>
          <div>
            <label className={label} htmlFor="p-name">
              Name
            </label>
            <input
              id="p-name"
              className={input}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="p-price">
              Price (₹)
            </label>
            <input
              id="p-price"
              className={input}
              required
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="p-cat">
              Category
            </label>
            <input
              id="p-cat"
              className={input}
              list="categories"
              placeholder="e.g. Ice cream"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <datalist id="categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={label} htmlFor="p-image">
              Photo {editingId && "(leave empty to keep current)"}
            </label>
            <input
              id="p-image"
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="block w-full text-sm text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active (visible to customers)
          </label>
          {/* Stock is optional: the count only appears when the store asks for it. */}
          <div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={form.limitStock}
                onChange={(e) =>
                  setForm({ ...form, limitStock: e.target.checked })
                }
              />
              Limit stock (optional)
            </label>
            {form.limitStock ? (
              <div className="mt-2 max-w-40">
                <label className={label} htmlFor="p-stock">
                  Units in stock
                </label>
                <input
                  id="p-stock"
                  className={input}
                  required
                  inputMode="numeric"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockQty}
                  onChange={(e) =>
                    setForm({ ...form, stockQty: e.target.value })
                  }
                />
              </div>
            ) : (
              <p className="mt-1 pl-6 text-xs text-ink-3">
                Off: customers can always order it. Deactivate the product when
                you run out.
              </p>
            )}
          </div>
          {error && <p className="text-sm text-danger-ink">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setShowForm(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Add product"}
            </button>
          </div>
        </form>
      )}

      {items === null ? (
        <ListSkeleton rows={3} className="h-28" />
      ) : items.length === 0 ? (
        <p className={`${emptyState} mt-5`}>
          No products yet. Add your first one and it shows up in every
          customer&apos;s shop.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li
              key={p.id}
              className={`${card} flex gap-3 p-3 ${p.isActive ? "" : "opacity-60"}`}
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <Package className="h-7 w-7 text-ink-4" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {p.name}
                    </p>
                    <p className="text-xs text-ink-3">{p.category}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-ink">
                    {inr(p.price)}
                  </p>
                </div>
                <p
                  className={`mt-1 text-xs ${p.stockQty === 0 ? "text-danger-ink" : "text-ink-2"}`}
                >
                  {p.stockQty === null
                    ? "Always available"
                    : p.stockQty === 0
                      ? "Out of stock"
                      : `${p.stockQty} in stock`}
                  {!p.isActive && ", hidden from customers"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => startEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => toggleActive(p)}
                  >
                    {p.isActive ? "Deactivate" : "Activate"}
                  </button>
                  {isSuper && (
                    <DeleteButton
                      entity="product"
                      id={p.id}
                      name={p.name}
                      onScheduled={load}
                    />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isSuper && (
        <RecentlyDeleted
          entity="product"
          rows={trash.map((p) => ({
            id: p.id,
            label: `${p.name}, ${inr(p.price)}`,
            scheduledDeleteAt: p.scheduledDeleteAt,
          }))}
          onChange={load}
        />
      )}
    </div>
  );
}
