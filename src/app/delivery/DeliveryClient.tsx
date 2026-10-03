"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Bike,
  CircleAlert,
  CircleCheck,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
} from "lucide-react";
import type { OrderDTO } from "@/lib/dto";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import {
  api,
  createPoller,
  errorMessage,
  type WriteGuard,
} from "@/lib/client-api";
import { inr, timeAgo } from "@/lib/format";
import { googleDirectionsUrl } from "@/lib/maps";
import { confirmDialog } from "@/components/ConfirmDialog";
import { ListSkeleton } from "@/components/Skeleton";
import { OrderLines } from "@/components/OrderLines";
import { PaymentBadge, StatusBadge } from "@/components/StatusBadge";
import { useNow } from "@/components/useNow";
import {
  btnPrimary,
  btnSecondary,
  btnSuccess,
  card,
  emptyState,
  pill,
} from "@/components/ui";

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
  const poll = useMemo(() => createPoller<Data>("/api/delivery/orders"), []);
  const seen = useRef<Set<string> | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const now = useNow(15000);

  const load = useCallback(async () => {
    try {
      const result = await poll();
      setError(null);
      if (!result.changed) return;
      const d = result.data;
      if (seen.current) {
        const arrived = d.active
          .filter((o) => !seen.current!.has(o.id))
          .map((o) => o.id);
        if (arrived.length) setNewIds((prev) => new Set([...prev, ...arrived]));
      }
      seen.current = new Set([...(seen.current ?? []), ...d.active.map((o) => o.id)]);
      setData(d);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [poll]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first fetch, then polling
    load();
    const t = setInterval(
      () => document.visibilityState === "visible" && load(),
      POLL_INTERVAL_MS,
    );
    return () => clearInterval(t);
  }, [load]);

  const list = tab === "active" ? (data?.active ?? []) : (data?.doneToday ?? []);
  const cashToday = (data?.doneToday ?? [])
    .filter((o) => o.payment?.method === "CASH" && o.payment.status === "PAID")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ["active", `To deliver${data ? ` (${data.active.length})` : ""}`],
            ["done", `Done today${data ? ` (${data.doneToday.length})` : ""}`],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg py-2.5 text-sm font-bold transition ${
              tab === key ? "bg-surface text-ink shadow-xs" : "text-ink-3"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "done" && cashToday > 0 && (
        <p className="mt-3 flex items-center gap-2.5 rounded-2xl bg-success-soft p-4 text-sm font-semibold text-success-ink">
          <Banknote className="h-5 w-5 shrink-0" aria-hidden />
          You collected {inr(cashToday)} in cash today. Hand it over to the store.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}

      {data === null ? (
        <ListSkeleton rows={2} className="h-72" />
      ) : list.length === 0 ? (
        <p className={`${emptyState} mt-4`}>
          {tab === "active"
            ? "No deliveries for you right now. New ones appear here by themselves."
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
              guard={poll.during}
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
  guard,
}: {
  order: OrderDTO;
  isNew: boolean;
  now: number;
  onUpdated: () => void;
  guard: WriteGuard;
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
      await guard(() =>
        api(`/api/delivery/orders/${o.id}`, { method: "POST", json }),
      );
      onUpdated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function deliver() {
    if (cashDue) {
      if (
        !(await confirmDialog({
          title: `Collected ${inr(o.total)} in cash?`,
          body: `From ${o.customer.name}, for order #${o.number}.`,
          confirm: "Yes, collected",
        }))
      )
        return;
      return act({ action: "delivered", collectCash: true });
    }
    if (
      upiDue &&
      !(await confirmDialog({
        title: "Payment is not confirmed yet",
        body: "The store has not confirmed this payment. Mark delivered anyway?",
        confirm: "Mark delivered",
      }))
    )
      return;
    act({ action: "delivered", collectCash: false });
  }

  return (
    <li className={`${card} p-4 ${isNew ? "border-brand-400 ring-2 ring-brand-200" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl leading-tight font-extrabold tracking-tight text-ink">
            #{o.number}
            {isNew && (
              <span className={`${pill} ml-2 bg-brand-600 align-middle text-on-solid`}>
                New
              </span>
            )}
          </p>
          <p className="text-xs text-ink-3">
            Ordered {timeAgo(o.createdAt, now)}
            {done && o.deliveredAt && `, delivered ${timeAgo(o.deliveredAt, now)}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={o.status} fulfilment={o.fulfilmentType} />
          {pay && <PaymentBadge method={pay.method} status={pay.status} />}
        </div>
      </div>

      {/* Who to hand it to, and how to reach them */}
      <div className="mt-3 rounded-xl bg-subtle p-3">
        <p className="font-bold text-ink">{o.customer.name}</p>
        <p className="text-sm text-ink-2">{o.customer.phone}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <a href={`tel:${o.customer.phone.replace(/\s/g, "")}`} className={btnSecondary}>
            <Phone className="h-4 w-4" aria-hidden />
            Call
          </a>
          <a
            href={whatsappUrl(o.customer.phone)}
            target="_blank"
            rel="noreferrer"
            className={btnSecondary}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            WhatsApp
          </a>
        </div>
      </div>

      {/* Where */}
      <div className="mt-3">
        <p className="flex items-start gap-2 text-sm text-ink">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          {o.deliveryAddress}
        </p>
        <a
          href={googleDirectionsUrl(point, o.deliveryAddress)}
          target="_blank"
          rel="noreferrer"
          className={`${btnPrimary} mt-2.5 w-full py-3`}
        >
          <Navigation className="h-4 w-4" aria-hidden />
          {point ? "Navigate in Google Maps" : "Find the address in Google Maps"}
        </a>
      </div>

      {/* What */}
      <OrderLines order={o} />

      {/* What to do about money */}
      {!done && pay && (
        <p
          className={`mt-3 flex items-center gap-2.5 rounded-xl p-3 text-sm font-semibold ${
            cashDue
              ? "bg-warning-soft text-warning-ink"
              : upiDue
                ? "bg-warning-soft text-warning-ink"
                : "bg-success-soft text-success-ink"
          }`}
        >
          {cashDue ? (
            <Banknote className="h-5 w-5 shrink-0" aria-hidden />
          ) : upiDue ? (
            <CircleAlert className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <CircleCheck className="h-5 w-5 shrink-0" aria-hidden />
          )}
          {cashDue
            ? `Collect ${inr(o.total)} in cash`
            : upiDue
              ? "UPI not confirmed yet. Check with the store before handing over."
              : "Already paid. Just hand it over."}
        </p>
      )}
      {done && o.receivedAt && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success-ink">
          <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
          The customer confirmed they received it
        </p>
      )}

      {error && <p className="mt-2 text-sm text-danger-ink">{error}</p>}

      {!done && (
        <div className="mt-3 grid gap-2">
          {o.status !== "OUT_FOR_DELIVERY" && (
            <button
              type="button"
              className={`${btnSecondary} py-3`}
              disabled={busy}
              onClick={() => act({ action: "start" })}
            >
              <Bike className="h-4 w-4" aria-hidden />
              Start delivery
            </button>
          )}
          <button
            type="button"
            className={`${btnSuccess} py-3.5 text-base`}
            disabled={busy}
            onClick={deliver}
          >
            <CircleCheck className="h-5 w-5" aria-hidden />
            {busy
              ? "Saving…"
              : cashDue
                ? `Collected ${inr(o.total)} and delivered`
                : "Mark delivered"}
          </button>
        </div>
      )}
    </li>
  );
}
