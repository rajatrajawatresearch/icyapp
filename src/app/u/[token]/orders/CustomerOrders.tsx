"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OrderDTO } from "@/lib/dto";
import { FINAL_STATUSES, POLL_INTERVAL_MS } from "@/lib/constants";
import { api } from "@/lib/client-api";
import { formatDateTime, inr } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ThemePicker } from "@/components/ThemePicker";
import { PickupCard, type Pickup } from "@/components/map/PickupCard";

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
  const hasLive = orders.some((o) => !FINAL_STATUSES.includes(o.status));

  // Poll only while something is still in progress.
  useEffect(() => {
    if (!hasLive || linkDead) return;
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        setOrders(
          (await api<{ orders: OrderDTO[] }>(`/api/customer/${token}/orders`))
            .orders,
        );
      } catch (e) {
        if ((e as { status?: number }).status === 404) setLinkDead(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [hasLive, linkDead, token]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 pb-10">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-surface/95 px-4 py-3 backdrop-blur">
        <Link
          href={`/u/${token}`}
          className="text-sm font-medium text-brand-700"
        >
          ← Shop
        </Link>
        <h1 className="font-semibold text-gray-900">My orders</h1>
        <ThemePicker />
      </header>

      {placedNumber !== null &&
        orders.some((o) => o.number === placedNumber) && (
          <div className="m-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            ✅ Order #{placedNumber} placed! This page updates automatically.
          </div>
        )}
      {linkDead && (
        <div className="m-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          This link is no longer active. Please ask the store for your new link.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-gray-500">No orders yet.</p>
          <Link
            href={`/u/${token}`}
            className="mt-3 inline-block text-sm font-medium text-brand-700"
          >
            Start shopping →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3 p-4">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} pickup={pickup} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ order: o, pickup }: { order: OrderDTO; pickup: Pickup }) {
  const pay = o.payment;
  const cancelled = o.status === "CANCELLED";
  const stepIndex = STEPS.indexOf(
    o.status === "PAID" ? "CONFIRMED" : (o.status as (typeof STEPS)[number]),
  );

  return (
    <li className="rounded-xl border border-gray-200 bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">Order #{o.number}</p>
          <p className="text-xs text-gray-500" suppressHydrationWarning>
            {formatDateTime(o.createdAt)} ·{" "}
            {o.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery"}
          </p>
        </div>
        <StatusBadge status={o.status} />
      </div>

      {!cancelled && (
        <ol className="mt-3 flex gap-1" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-brand-600" : "bg-gray-200"}`}
            />
          ))}
        </ol>
      )}

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
        <li className="flex justify-between border-t border-gray-100 pt-1 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{inr(o.total)}</span>
        </li>
      </ul>

      {o.deliveryPartner && o.status === "OUT_FOR_DELIVERY" && (
        <p className="mt-3 rounded-lg bg-indigo-100 p-3 text-sm font-medium text-indigo-800">
          🛵 {o.deliveryPartner.name} is on the way with your order
        </p>
      )}

      {o.fulfilmentType === "PICKUP" && !cancelled && o.status !== "COMPLETED" && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <PickupCard pickup={pickup} showMap={false} />
        </div>
      )}

      {pay && !cancelled && (
        <PaymentPanel payment={pay} fulfilment={o.fulfilmentType} />
      )}
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
      <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
        ✅ Payment confirmed · {pay.method}
      </p>
    );
  }
  if (pay.method === "CASH") {
    return (
      <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        💵 Pay {inr(pay.amount)} in cash on{" "}
        {fulfilment === "PICKUP" ? "pickup" : "delivery"}.
      </p>
    );
  }
  if (!pay.qrImageUrl) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        Waiting for the store to send your UPI QR…
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-center">
      <p className="text-sm font-semibold text-brand-900">
        QR ready — scan to pay {inr(pay.amount)}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pay.qrImageUrl}
        alt="UPI QR code"
        className="mx-auto mt-3 w-full max-w-[260px] rounded-lg bg-surface p-2"
      />
      <p className="mt-2 text-xs text-brand-800">
        After paying, the store will confirm your payment here.
      </p>
    </div>
  );
}
