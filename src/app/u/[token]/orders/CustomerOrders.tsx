"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, Bike, CircleCheck, QrCode, ReceiptText } from "lucide-react";
import type { OrderDTO } from "@/lib/dto";
import { FINAL_STATUSES, POLL_INTERVAL_MS } from "@/lib/constants";
import { api, createPoller, errorMessage } from "@/lib/client-api";
import { formatDateTime, inr } from "@/lib/format";
import { OrderLines } from "@/components/OrderLines";
import { StatusBadge } from "@/components/StatusBadge";
import { PickupCard, type Pickup } from "@/components/map/PickupCard";
import { btnPrimary, btnSuccess, card } from "@/components/ui";
import { CustomerHeader, CustomerTabs } from "../CustomerChrome";

const STEPS = ["PLACED", "CONFIRMED", "OUT_FOR_DELIVERY", "COMPLETED"] as const;

export function CustomerOrders({
  token,
  initialOrders,
  placedNumber,
  pickup,
}: {
  token: string;
  initialOrders: OrderDTO[];
  placedNumber: number | null;
  pickup: Pickup;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [linkDead, setLinkDead] = useState(false);
  const poll = useMemo(
    () => createPoller<{ orders: OrderDTO[] }>(`/api/customer/${token}/orders`),
    [token],
  );
  const hasLive = orders.some((o) => !FINAL_STATUSES.includes(o.status));

  // Poll only while something is still in progress.
  useEffect(() => {
    if (!hasLive || linkDead) return;
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const result = await poll();
        if (result.changed) setOrders(result.data.orders);
      } catch (e) {
        if ((e as { status?: number }).status === 404) setLinkDead(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [hasLive, linkDead, poll]);

  function replaceOrder(updated: OrderDTO) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 pb-28">
      <CustomerHeader
        token={token}
        title="My orders"
        subtitle={hasLive ? "Updates by itself" : undefined}
      />

      {placedNumber !== null &&
        orders.some((o) => o.number === placedNumber) && (
          <div className="m-4 flex items-start gap-3 rounded-2xl border border-success-line bg-success-soft p-4 text-sm text-success-ink">
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              <span className="font-bold">Order #{placedNumber} placed.</span>{" "}
              You can follow it here; this page updates by itself.
            </p>
          </div>
        )}
      {linkDead && (
        <div className="m-4 rounded-2xl border border-danger-line bg-danger-soft p-4 text-sm text-danger-ink">
          This link is no longer active. Ask the store for your new link.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <ReceiptText className="mx-auto h-10 w-10 text-ink-4" aria-hidden />
          <p className="mt-3 font-semibold text-ink">No orders yet</p>
          <p className="mt-1 text-sm text-ink-3">
            Your orders and their progress will show up here.
          </p>
          <Link href={`/u/${token}`} className={`${btnPrimary} mt-5`}>
            Go to the shop
          </Link>
        </div>
      ) : (
        <ul className="space-y-3 p-4">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              token={token}
              order={o}
              pickup={pickup}
              onUpdated={replaceOrder}
            />
          ))}
        </ul>
      )}

      <CustomerTabs token={token} />
    </div>
  );
}

function OrderCard({
  token,
  order: o,
  pickup,
  onUpdated,
}: {
  token: string;
  order: OrderDTO;
  pickup: Pickup;
  onUpdated: (o: OrderDTO) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = o.payment;
  const cancelled = o.status === "CANCELLED";
  const isPickup = o.fulfilmentType === "PICKUP";
  const stepIndex = STEPS.indexOf(
    o.status === "PAID" ? "CONFIRMED" : (o.status as (typeof STEPS)[number]),
  );
  const stepLabels = ["Placed", "Confirmed", isPickup ? "Ready" : "On the way", "Done"];
  // The customer can confirm once the order is on its way / ready, or completed.
  const canConfirm =
    !o.receivedAt &&
    (o.status === "OUT_FOR_DELIVERY" || o.status === "COMPLETED");

  async function confirmReceived() {
    if (!window.confirm(`Confirm that you have received order #${o.number}?`)) return;
    setBusy(true);
    setError(null);
    try {
      onUpdated(
        await api<OrderDTO>(`/api/customer/${token}/orders/${o.id}/received`, {
          method: "POST",
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`${card} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg leading-tight font-extrabold tracking-tight text-ink">
            Order #{o.number}
          </p>
          <p className="text-xs text-ink-3" suppressHydrationWarning>
            {isPickup ? "Pickup" : "Delivery"}, {formatDateTime(o.createdAt)}
          </p>
        </div>
        <StatusBadge status={o.status} />
      </div>

      {!cancelled && (
        <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === stepIndex ? "step" : undefined}>
              <span
                className={`block h-1.5 rounded-full ${i <= stepIndex ? "bg-brand-600" : "bg-muted"}`}
              />
              <span
                className={`mt-1 block text-[11px] font-semibold ${
                  i <= stepIndex ? "text-ink" : "text-ink-4"
                }`}
              >
                {stepLabels[i]}
              </span>
            </li>
          ))}
        </ol>
      )}

      <OrderLines order={o} />

      {o.deliveryPartner && o.status === "OUT_FOR_DELIVERY" && (
        <p className="mt-3 flex items-center gap-2.5 rounded-xl bg-info-soft p-3 text-sm font-semibold text-info-ink">
          <Bike className="h-5 w-5 shrink-0" aria-hidden />
          {o.deliveryPartner.name} is on the way with your order
        </p>
      )}

      {isPickup && !cancelled && o.status !== "COMPLETED" && (
        <div className="mt-3 rounded-xl bg-subtle p-3">
          <PickupCard pickup={pickup} showMap={false} />
        </div>
      )}

      {pay && !cancelled && <PaymentPanel payment={pay} fulfilment={o.fulfilmentType} />}

      {canConfirm && (
        <button
          type="button"
          className={`${btnSuccess} mt-3 w-full py-3.5 text-base`}
          onClick={confirmReceived}
          disabled={busy}
        >
          <CircleCheck className="h-5 w-5" aria-hidden />
          {busy ? "Saving…" : "I’ve received my order"}
        </button>
      )}
      {o.receivedAt && (
        <p
          className="mt-3 flex items-center gap-2 text-sm font-semibold text-success-ink"
          suppressHydrationWarning
        >
          <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
          You confirmed you received this, {formatDateTime(o.receivedAt)}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-danger-ink">{error}</p>}
    </li>
  );
}

function PaymentPanel({
  payment: pay,
  fulfilment,
}: {
  payment: NonNullable<OrderDTO["payment"]>;
  fulfilment: OrderDTO["fulfilmentType"];
}) {
  if (pay.status === "PAID") {
    return (
      <p className="mt-3 flex items-center gap-2.5 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success-ink">
        <CircleCheck className="h-5 w-5 shrink-0" aria-hidden />
        Payment received ({pay.method === "CASH" ? "cash" : "UPI"})
      </p>
    );
  }
  if (pay.method === "CASH") {
    return (
      <p className="mt-3 flex items-center gap-2.5 rounded-xl bg-subtle p-3 text-sm text-ink-2">
        <Banknote className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
        Pay {inr(pay.amount)} in cash at{" "}
        {fulfilment === "PICKUP" ? "pickup" : "delivery"}.
      </p>
    );
  }
  if (!pay.qrImageUrl) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-warning-soft p-3 text-sm text-warning-ink">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-warning border-t-transparent" />
        Waiting for the store to send your UPI QR…
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-center">
      <p className="flex items-center justify-center gap-2 text-base font-extrabold text-brand-900">
        <QrCode className="h-5 w-5" aria-hidden />
        Scan to pay {inr(pay.amount)}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pay.qrImageUrl}
        alt="UPI QR code"
        className="mx-auto mt-3 w-full max-w-[260px] rounded-xl bg-on-solid p-2"
      />
      <p className="mt-2 text-xs text-brand-800">
        Once you have paid, the store confirms it here.
      </p>
    </div>
  );
}
