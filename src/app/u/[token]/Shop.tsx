"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Minus,
  Package,
  Plus,
  QrCode,
  ShoppingBag,
  Store,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ProductDTO } from "@/lib/dto";
import { MAX_LINE_QTY } from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import { inr } from "@/lib/format";
import type { LatLng } from "@/lib/maps";
import { deliveryFeeFor, type DeliveryPricing } from "@/lib/pricing";
import { LocationPicker } from "@/components/map/LocationPicker";
import { PickupCard, type Pickup } from "@/components/map/PickupCard";
import { btnPrimary, input, label, scrim, sheet } from "@/components/ui";
import { CustomerHeader, CustomerTabs } from "./CustomerChrome";

type Cart = Record<string, number>; // productId -> qty

function cartKey(token: string) {
  return `cart:${token}`;
}

export function Shop({
  token,
  customerName,
  pickup,
  delivery,
  products,
}: {
  token: string;
  customerName: string;
  products: ProductDTO[];
  pickup: Pickup;
  delivery: DeliveryPricing;
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
  const [payment, setPayment] = useState<"CASH" | "UPI">("UPI");
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
        if (p && p.stockQty !== 0) clean[id] = Math.min(qty, maxQty(p));
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
    const clamped = Math.max(0, Math.min(qty, maxQty(p)));
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
  const needsAddress = fulfilment === "DELIVERY" && address.trim().length < 5;
  // A preview only: the server works out the charge again when the order is placed.
  const deliveryFee = deliveryFeeFor(delivery, fulfilment, total);
  const toPay = total + deliveryFee;

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
    <div className="mx-auto w-full max-w-2xl flex-1 pb-40">
      <CustomerHeader
        token={token}
        title={`Hi ${customerName.split(" ")[0]}`}
        subtitle="What would you like today?"
      >
        {categories.length > 1 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  category === c
                    ? "bg-ink text-surface"
                    : "bg-muted text-ink-2 hover:text-ink"
                }`}
              >
                {c ?? "All"}
              </button>
            ))}
          </div>
        )}
      </CustomerHeader>

      {products.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <Package className="mx-auto h-10 w-10 text-ink-4" aria-hidden />
          <p className="mt-3 font-semibold text-ink">
            Nothing on the shelf yet
          </p>
          <p className="mt-1 text-sm text-ink-3">
            The store hasn&apos;t added products. Check back soon.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {visible.map((p) => {
            const qty = cart[p.id] ?? 0;
            const soldOut = p.stockQty === 0;
            return (
              <li
                key={p.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
              >
                <div className="relative aspect-square bg-muted">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className={`h-full w-full object-cover ${soldOut ? "opacity-50 grayscale" : ""}`}
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <Package className="h-10 w-10 text-ink-4" aria-hidden />
                    </div>
                  )}
                  {soldOut && (
                    <span className="absolute top-2 left-2 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-danger-ink shadow-xs">
                      Sold out
                    </span>
                  )}
                  {p.stockQty !== null && !soldOut && p.stockQty <= 5 && (
                    <span className="absolute top-2 left-2 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-warning-ink shadow-xs">
                      Only {p.stockQty} left
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 text-[15px] leading-snug font-semibold text-ink">
                    {p.name}
                  </p>
                  <p className="mt-1 text-lg leading-none font-extrabold tracking-tight text-ink tabular-nums">
                    {inr(p.price)}
                  </p>
                  <div className="mt-auto pt-3">
                    {qty === 0 ? (
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => setQty(p.id, 1)}
                        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 text-sm font-bold text-brand-700 transition hover:bg-brand-100 active:scale-[0.97] disabled:bg-muted disabled:text-ink-4"
                      >
                        <Plus
                          className="h-4 w-4"
                          strokeWidth={2.6}
                          aria-hidden
                        />
                        Add
                      </button>
                    ) : (
                      <Stepper
                        qty={qty}
                        max={maxQty(p)}
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
        <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-40 px-3 pb-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCheckoutOpen(true);
            }}
            className="mx-auto flex w-full max-w-2xl animate-sheet items-center justify-between rounded-2xl bg-brand-600 py-3.5 pr-5 pl-4 text-on-solid shadow-brand transition active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-on-solid/20">
                <ShoppingBag className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-left">
                <span className="block text-xs text-on-solid/80">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>
                <span className="block text-base leading-tight font-extrabold tabular-nums">
                  {inr(total)}
                </span>
              </span>
            </span>
            <span className="text-base font-bold">Checkout</span>
          </button>
        </div>
      )}

      {checkoutOpen && (
        <div className={scrim} onClick={() => !busy && setCheckoutOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            className={`${sheet} max-h-[94dvh] overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 -mx-5 bg-raised px-5 pt-3 pb-3">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold tracking-tight text-ink">
                  Your order
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full bg-muted text-ink-2"
                  onClick={() => setCheckoutOpen(false)}
                  disabled={busy}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <ul className="divide-y divide-line">
              {lines.map(({ product: p, qty }) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {p.name}
                    </p>
                    <p className="text-xs text-ink-3 tabular-nums">
                      {inr(p.price)} each, {inr(p.price * qty)} total
                    </p>
                  </div>
                  <div className="w-28 shrink-0">
                    <Stepper
                      qty={qty}
                      max={maxQty(p)}
                      onChange={(n) => setQty(p.id, n)}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {lines.length === 0 && (
              <p className="py-4 text-center text-sm text-ink-3">
                Your cart is empty. Close this and add something first.
              </p>
            )}

            <fieldset className="mt-5">
              <legend className={label}>How do you want it?</legend>
              <div className="grid grid-cols-2 gap-2">
                <Choice
                  checked={fulfilment === "DELIVERY"}
                  onClick={() => setFulfilment("DELIVERY")}
                  Icon={Truck}
                  title="Delivery"
                  sub="To your door"
                />
                <Choice
                  checked={fulfilment === "PICKUP"}
                  onClick={() => setFulfilment("PICKUP")}
                  Icon={Store}
                  title="Pickup"
                  sub="Collect at the store"
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
                  near={
                    pickup.lat !== null && pickup.lng !== null
                      ? { lat: pickup.lat, lng: pickup.lng }
                      : null
                  }
                />
                <div>
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
              </div>
            )}

            <fieldset className="mt-5">
              <legend className={label}>How will you pay?</legend>
              <div className="grid grid-cols-2 gap-2">
                <Choice
                  checked={payment === "CASH"}
                  onClick={() => setPayment("CASH")}
                  Icon={Banknote}
                  title="Cash"
                  sub={
                    fulfilment === "PICKUP"
                      ? "Pay at pickup"
                      : "Pay at the door"
                  }
                />
                <Choice
                  checked={payment === "UPI"}
                  onClick={() => setPayment("UPI")}
                  Icon={QrCode}
                  title="UPI"
                  sub="The store sends a QR"
                />
              </div>
            </fieldset>

            <dl className="mt-5 space-y-1.5 rounded-xl bg-subtle p-3 text-sm text-ink">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">Items</dt>
                <dd className="tabular-nums">{inr(total)}</dd>
              </div>
              {fulfilment === "DELIVERY" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-2">Delivery charge</dt>
                  <dd className="tabular-nums">
                    {deliveryFee > 0 ? inr(deliveryFee) : "Free"}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-line pt-1.5 text-base font-extrabold">
                <dt>To pay</dt>
                <dd className="tabular-nums">{inr(toPay)}</dd>
              </div>
            </dl>
            {deliveryFee > 0 && delivery.freeAbove !== null && (
              <p className="mt-2 text-xs text-ink-3">
                Add {inr(delivery.freeAbove - total)} more and delivery is free.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger-ink"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              className={`${btnPrimary} mt-5 w-full justify-between px-5 py-4 text-base`}
              onClick={placeOrder}
              disabled={busy || lines.length === 0 || needsAddress}
            >
              <span>{busy ? "Placing order…" : "Place order"}</span>
              <span className="font-extrabold tabular-nums">{inr(toPay)}</span>
            </button>
            {needsAddress && (
              <p className="mt-2 text-center text-xs text-ink-3">
                Enter your delivery address to place the order.
              </p>
            )}
          </div>
        </div>
      )}

      <CustomerTabs token={token} />
    </div>
  );
}

/** Most of one product a cart can hold: what is left, or the order cap when stock isn't tracked. */
function maxQty(p: ProductDTO) {
  return p.stockQty ?? MAX_LINE_QTY;
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
    <div className="flex h-10 items-center justify-between rounded-xl bg-brand-600 text-on-solid">
      <button
        type="button"
        aria-label="One less"
        className="grid h-10 w-10 place-items-center rounded-xl active:bg-brand-700"
        onClick={() => onChange(qty - 1)}
      >
        <Minus className="h-4 w-4" strokeWidth={2.6} aria-hidden />
      </button>
      <span className="text-sm font-extrabold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label="One more"
        className="grid h-10 w-10 place-items-center rounded-xl active:bg-brand-700 disabled:opacity-40"
        disabled={qty >= max}
        onClick={() => onChange(qty + 1)}
      >
        <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}

function Choice({
  checked,
  onClick,
  Icon,
  title,
  sub,
}: {
  checked: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
        checked
          ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
          : "border-line-strong bg-surface hover:bg-subtle"
      }`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${checked ? "text-brand-700" : "text-ink-3"}`}
        aria-hidden
      />
      <span>
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="block text-xs text-ink-3">{sub}</span>
      </span>
    </button>
  );
}
