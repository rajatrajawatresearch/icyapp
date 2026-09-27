"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/lib/dto";
import { api, errorMessage } from "@/lib/client-api";
import { inr } from "@/lib/format";
import { btnPrimary, input, label } from "@/components/ui";
import { InstallButton } from "@/components/InstallButton";
import { ThemePicker } from "@/components/ThemePicker";
import { LocationPicker } from "@/components/map/LocationPicker";
import { PickupCard, type Pickup } from "@/components/map/PickupCard";
import type { LatLng } from "@/lib/maps";

type Cart = Record<string, number>; // productId -> qty

function cartKey(token: string) {
  return `cart:${token}`;
}

export function Shop({
  token,
  customerName,
  pickup,
  products,
}: {
  token: string;
  customerName: string;
  products: ProductDTO[];
  pickup: Pickup;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({});
  const [category, setCategory] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [fulfilment, setFulfilment] = useState<"DELIVERY" | "PICKUP">(
    "DELIVERY",
  );
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<LatLng | null>(null);
  const [payment, setPayment] = useState<"CASH" | "UPI">("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  // Restore the cart for this link, dropping items that vanished or went out of stock.
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(cartKey(token)) ?? "{}",
      ) as Cart;
      const clean: Cart = {};
      for (const [id, qty] of Object.entries(saved)) {
        const p = byId.get(id);
        if (p && p.stockQty > 0) clean[id] = Math.min(qty, p.stockQty);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
      setCart(clean);
      setAddress(localStorage.getItem(`addr:${token}`) ?? "");
    } catch {
      // Ignore corrupt/blocked storage — start with an empty cart.
    }
  }, [token, byId]);

  function updateCart(next: Cart) {
    setCart(next);
    try {
      localStorage.setItem(cartKey(token), JSON.stringify(next));
    } catch {}
  }

  function setQty(id: string, qty: number) {
    const p = byId.get(id);
    if (!p) return;
    const next = { ...cart };
    const clamped = Math.max(0, Math.min(qty, p.stockQty));
    if (clamped === 0) delete next[id];
    else next[id] = clamped;
    updateCart(next);
  }

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products],
  );
  const visible = category
    ? products.filter((p) => p.category === category)
    : products;
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: byId.get(id)!, qty }))
    .filter((l) => l.product);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.product.price, 0);

  async function placeOrder() {
    setBusy(true);
    setError(null);
    try {
      const order = await api<{ id: string; number: number }>("/api/orders", {
        method: "POST",
        json: {
          token,
          items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
          fulfilmentType: fulfilment,
          deliveryAddress: fulfilment === "DELIVERY" ? address : undefined,
          deliveryLat: fulfilment === "DELIVERY" ? pin?.lat : undefined,
          deliveryLng: fulfilment === "DELIVERY" ? pin?.lng : undefined,
          paymentMethod: payment,
        },
      });
      try {
        localStorage.removeItem(cartKey(token));
        if (fulfilment === "DELIVERY")
          localStorage.setItem(`addr:${token}`, address);
      } catch {}
      router.push(`/u/${token}/orders?placed=${order.number}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      router.refresh(); // pick up fresh stock levels
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 pb-28">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Welcome back</p>
            <p className="truncate font-semibold text-gray-900">
              {customerName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemePicker />
            <Link
              href={`/u/${token}/orders`}
              className="inline-flex h-9 items-center rounded-full border border-gray-300 bg-surface px-3 text-sm font-medium text-gray-800"
            >
              My orders
            </Link>
          </div>
        </div>
        <InstallButton className="mt-3 w-full justify-center" />
        {categories.length > 1 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm ${
                  category === c
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {c ?? "All"}
              </button>
            ))}
          </div>
        )}
      </header>

      {products.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-gray-500">
          No products available right now. Please check back soon.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {visible.map((p) => {
            const qty = cart[p.id] ?? 0;
            const soldOut = p.stockQty === 0;
            return (
              <li
                key={p.id}
                className={`flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-surface ${soldOut ? "opacity-60" : ""}`}
              >
                <div className="aspect-square bg-gray-100">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-4xl text-gray-300">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-900">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">
                    {inr(p.price)}
                  </p>
                  <p
                    className={`text-xs ${soldOut ? "text-red-600" : p.stockQty <= 5 ? "text-orange-600" : "text-gray-500"}`}
                  >
                    {soldOut
                      ? "Out of stock"
                      : p.stockQty <= 5
                        ? `Only ${p.stockQty} left`
                        : `${p.stockQty} in stock`}
                  </p>
                  <div className="mt-auto pt-2">
                    {qty === 0 ? (
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => setQty(p.id, 1)}
                        className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white disabled:bg-gray-300"
                      >
                        {soldOut ? "Sold out" : "Add"}
                      </button>
                    ) : (
                      <Stepper
                        qty={qty}
                        max={p.stockQty}
                        onChange={(n) => setQty(p.id, n)}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {itemCount > 0 && !checkoutOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCheckoutOpen(true);
            }}
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-2xl bg-brand-600 px-5 py-4 text-white shadow-lg"
          >
            <span className="text-sm font-medium">
              {itemCount} item{itemCount === 1 ? "" : "s"} · {inr(total)}
            </span>
            <span className="font-semibold">Checkout →</span>
          </button>
        </div>
      )}

      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !busy && setCheckoutOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Your order
              </h2>
              <button
                type="button"
                className="text-sm text-gray-500"
                onClick={() => setCheckoutOpen(false)}
                disabled={busy}
              >
                Close
              </button>
            </div>

            <ul className="mt-3 divide-y divide-gray-100">
              {lines.map(({ product: p, qty }) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {inr(p.price)} × {qty} = {inr(p.price * qty)}
                    </p>
                  </div>
                  <div className="w-28 shrink-0">
                    <Stepper
                      qty={qty}
                      max={p.stockQty}
                      onChange={(n) => setQty(p.id, n)}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {lines.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500">
                Your cart is empty.
              </p>
            )}

            <fieldset className="mt-4">
              <legend className={label}>How do you want it?</legend>
              <div className="grid grid-cols-2 gap-2">
                <Choice
                  checked={fulfilment === "DELIVERY"}
                  onClick={() => setFulfilment("DELIVERY")}
                  title="🚚 Delivery"
                />
                <Choice
                  checked={fulfilment === "PICKUP"}
                  onClick={() => setFulfilment("PICKUP")}
                  title="🏬 Pickup"
                />
              </div>
            </fieldset>
            {fulfilment === "PICKUP" && (
              <div className="mt-3">
                <PickupCard pickup={pickup} />
              </div>
            )}
            {fulfilment === "DELIVERY" && (
              <div className="mt-3 space-y-3">
                <LocationPicker
                  value={pin}
                  onChange={setPin}
                  onAddress={(a) => setAddress((cur) => (cur.trim() ? cur : a))}
                  near={pickup.lat !== null && pickup.lng !== null ? { lat: pickup.lat, lng: pickup.lng } : null}
                />
                <label className={label} htmlFor="address">
                  Delivery address
                </label>
                <textarea
                  id="address"
                  rows={3}
                  className={input}
                  placeholder="Flat / house no, building, street, landmark"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            )}

            <fieldset className="mt-4">
              <legend className={label}>Payment</legend>
              <div className="grid grid-cols-2 gap-2">
                <Choice
                  checked={payment === "CASH"}
                  onClick={() => setPayment("CASH")}
                  title="💵 Cash"
                  sub="Pay on delivery/pickup"
                />
                <Choice
                  checked={payment === "UPI"}
                  onClick={() => setPayment("UPI")}
                  title="📱 UPI"
                  sub="Store sends a QR"
                />
              </div>
            </fieldset>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              className={`${btnPrimary} mt-5 w-full py-3.5 text-base`}
              onClick={placeOrder}
              disabled={
                busy ||
                lines.length === 0 ||
                (fulfilment === "DELIVERY" && address.trim().length < 5)
              }
            >
              {busy ? "Placing order…" : `Place order · ${inr(total)}`}
            </button>
            {fulfilment === "DELIVERY" && address.trim().length < 5 && (
              <p className="mt-2 text-center text-xs text-gray-500">
                Enter your delivery address to continue
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({
  qty,
  max,
  onChange,
}: {
  qty: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-brand-600 text-brand-700">
      <button
        type="button"
        aria-label="Decrease"
        className="px-3 py-1.5 text-lg leading-none"
        onClick={() => onChange(qty - 1)}
      >
        −
      </button>
      <span className="text-sm font-semibold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label="Increase"
        className="px-3 py-1.5 text-lg leading-none disabled:opacity-30"
        disabled={qty >= max}
        onClick={() => onChange(qty + 1)}
      >
        +
      </button>
    </div>
  );
}

function Choice({
  checked,
  onClick,
  title,
  sub,
}: {
  checked: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`rounded-xl border p-3 text-left ${checked ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-gray-300 bg-surface"}`}
    >
      <span className="block text-sm font-medium text-gray-900">{title}</span>
      {sub && <span className="block text-xs text-gray-500">{sub}</span>}
    </button>
  );
}
