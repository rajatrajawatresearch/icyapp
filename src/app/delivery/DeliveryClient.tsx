"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderDTO } from "@/lib/dto";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import { inr, timeAgo } from "@/lib/format";
import { googleDirectionsUrl } from "@/lib/maps";
import { PaymentBadge, StatusBadge } from "@/components/StatusBadge";
import { useNow } from "@/components/useNow";
import { btnPrimary, btnSecondary, btnSuccess, card } from "@/components/ui";

type Data = { active: OrderDTO[]; doneToday: OrderDTO[] };

/** WhatsApp wants digits only, with country code; assume India for 10-digit numbers. */
function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

export function DeliveryClient() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const now = useNow(15000);

  const load = useCallback(async () => {
    try {
      const d = await api<Data>("/api/delivery/orders");
      if (seen.current) {
        const arrived = d.active
          .filter((o) => !seen.current!.has(o.id))
          .map((o) => o.id);
        if (arrived.length) setNewIds((prev) => new Set([...prev, ...arrived]));
      }
      seen.current = new Set([
        ...(seen.current ?? []),
        ...d.active.map((o) => o.id),
      ]);
      setData(d);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
     
    load();
    const t = setInterval(
      () => document.visibilityState === "visible" && load(),
      POLL_INTERVAL_MS,
    );
    return () => clearInterval(t);
  }, [load]);

  const list =
    tab === "active" ? (data?.active ?? []) : (data?.doneToday ?? []);
  const cashToday = (data?.doneToday ?? [])
    .filter((o) => o.payment?.method === "CASH" && o.payment.status === "PAID")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        {(
          [
            ["active", `To deliver${data ? ` (${data.active.length})` : ""}`],
            ["done", `Done today${data ? ` (${data.doneToday.length})` : ""}`],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg py-2 text-sm font-semibold ${tab === key ? "bg-surface text-gray-900 shadow-sm" : "text-gray-600"}`}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "done" && cashToday > 0 && (
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          💵 Cash collected today: {inr(cashToday)} — hand this over to the
          store.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {data === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          {tab === "active"
            ? "No deliveries assigned right now. New ones appear here automatically."
            : "Nothing delivered yet today."}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((o) => (
            <DeliveryCard
              key={o.id}
              order={o}
              isNew={newIds.has(o.id)}
              now={now}
              onUpdated={() => {
                setNewIds((prev) => {
                  const next = new Set(prev);
                  next.delete(o.id);
                  return next;
                });
                load();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DeliveryCard({
  order: o,
  isNew,
  now,
  onUpdated,
}: {
  order: OrderDTO;
  isNew: boolean;
  now: number;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = o.payment;
  const done = o.status === "COMPLETED";
  const cashDue = pay?.method === "CASH" && pay.status === "PENDING";
  const upiDue = pay?.method === "UPI" && pay.status === "PENDING";
  const point =
    o.deliveryLat !== null && o.deliveryLng !== null
      ? { lat: o.deliveryLat, lng: o.deliveryLng }
      : null;

  async function act(
    json: { action: "start" } | { action: "delivered"; collectCash: boolean },
  ) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/delivery/orders/${o.id}`, { method: "POST", json });
      onUpdated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function deliver() {
    if (cashDue) {
      if (
        !window.confirm(
          `Collected ${inr(o.total)} cash from ${o.customer.name}?`,
        )
      )
        return;
      return act({ action: "delivered", collectCash: true });
    }
    if (
      upiDue &&
      !window.confirm(
        "UPI payment is not confirmed by the store yet. Mark delivered anyway?",
      )
    )
      return;
    act({ action: "delivered", collectCash: false });
  }

  return (
    <li
      className={`${card} p-4 ${isNew ? "border-brand-600 ring-2 ring-brand-200" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-gray-900">
            #{o.number}
            {isNew && (
              <span className="ml-2 rounded bg-brand-600 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase text-white">
                New
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            Ordered {timeAgo(o.createdAt, now)}
            {done &&
              o.deliveredAt &&
              ` · delivered ${timeAgo(o.deliveredAt, now)}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={o.status} />
          {pay && <PaymentBadge method={pay.method} status={pay.status} />}
        </div>
      </div>

      {/* Customer + contact */}
      <div className="mt-3 rounded-xl bg-gray-50 p-3">
        <p className="font-semibold text-gray-900">{o.customer.name}</p>
        <p className="text-sm text-gray-600">{o.customer.phone}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <a
            href={`tel:${o.customer.phone.replace(/\s/g, "")}`}
            className={`${btnSecondary} py-2.5`}
          >
            📞 Call
          </a>
          <a
            href={whatsappUrl(o.customer.phone)}
            target="_blank"
            rel="noreferrer"
            className={`${btnSecondary} py-2.5`}
          >
            💬 WhatsApp
          </a>
        </div>
      </div>

      {/* Location */}
      <div className="mt-3">
        <p className="text-sm text-gray-800">
          <span className="font-semibold">📍 Address:</span> {o.deliveryAddress}
        </p>
        <a
          href={googleDirectionsUrl(point, o.deliveryAddress)}
          target="_blank"
          rel="noreferrer"
          className={`${btnPrimary} mt-2 w-full py-3`}
        >
          🧭 Navigate in Google Maps{point ? "" : " (by address)"}
        </a>
      </div>

      {/* Items */}
      <ul className="mt-3 space-y-0.5 text-sm text-gray-800">
        {o.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span>
              {i.qty} × {i.productName}
            </span>
            <span className="tabular-nums text-gray-600">
              {inr(i.qty * i.priceAtOrder)}
            </span>
          </li>
        ))}
        <li className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{inr(o.total)}</span>
        </li>
      </ul>

      {/* Payment instruction */}
      {!done && pay && (
        <p
          className={`mt-3 rounded-xl p-3 text-sm font-medium ${
            cashDue
              ? "bg-orange-50 text-orange-800"
              : upiDue
                ? "bg-amber-50 text-amber-800"
                : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {cashDue
            ? `💵 Collect ${inr(o.total)} in cash`
            : upiDue
              ? "📱 UPI payment not confirmed yet — check with the store before handing over"
              : "✅ Already paid — just hand over"}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!done && (
        <div className="mt-3 grid gap-2">
          {o.status !== "OUT_FOR_DELIVERY" && (
            <button
              type="button"
              className={`${btnSecondary} py-3`}
              disabled={busy}
              onClick={() => act({ action: "start" })}
            >
              🛵 Start delivery (picked up)
            </button>
          )}
          <button
            type="button"
            className={`${btnSuccess} py-3 text-base`}
            disabled={busy}
            onClick={deliver}
          >
            {busy
              ? "Saving…"
              : cashDue
                ? `✅ Cash ${inr(o.total)} collected · Delivered`
                : "✅ Mark delivered"}
          </button>
        </div>
      )}
    </li>
  );
}
