"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderDTO } from "@/lib/dto";
import {
  ADMIN_SETTABLE_STATUSES,
  FINAL_STATUSES,
  ORDER_STATUS_LABEL,
  POLL_INTERVAL_MS,
} from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import { inr, timeAgo } from "@/lib/format";
import { googleDirectionsUrl } from "@/lib/maps";
import { DeleteButton } from "@/components/DeleteButton";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";
import { PaymentBadge, StatusBadge } from "@/components/StatusBadge";
import { useNow } from "@/components/useNow";
import {
  btnSecondary,
  btnSuccess,
  card,
  input,
  pageTitle,
} from "@/components/ui";

type Filter = "open" | "upi" | "all";

/** Short two-tone chime via WebAudio — no asset needed. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.15 + 0.3,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch {
    // Autoplay policies may block audio until the user interacts — the visual badge still shows.
  }
}

export function OrdersClient({ isSuper }: { isSuper: boolean }) {
  const [items, setItems] = useState<OrderDTO[] | null>(null);
  const [trash, setTrash] = useState<OrderDTO[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastSync, setLastSync] = useState<number | null>(null);
  const seenIds = useRef<Set<string> | null>(null);
  const now = useNow(5000);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: OrderDTO[]; trash: OrderDTO[] }>(
        "/api/admin/orders",
      );
      // First load establishes the baseline; later loads flag anything unseen as new.
      if (seenIds.current) {
        const arrived = data.items
          .filter((o) => !seenIds.current!.has(o.id))
          .map((o) => o.id);
        if (arrived.length) {
          setNewIds((prev) => new Set([...prev, ...arrived]));
          chime();
        }
      }
      seenIds.current = new Set([
        ...(seenIds.current ?? []),
        ...data.items.map((o) => o.id),
      ]);
      setItems(data.items);
      setTrash(data.trash);
      setLastSync(Date.now());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
     
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  const newCount = newIds.size;
  useEffect(() => {
    document.title = newCount
      ? `(${newCount}) New orders · Mini Marketplace`
      : "Orders · Mini Marketplace";
  }, [newCount]);

  function acknowledge(id: string) {
    setNewIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function replaceOrder(updated: OrderDTO) {
    setItems(
      (prev) => prev?.map((o) => (o.id === updated.id ? updated : o)) ?? null,
    );
    acknowledge(updated.id);
  }

  const list = (items ?? []).filter((o) => {
    if (filter === "open") return !FINAL_STATUSES.includes(o.status);
    if (filter === "upi")
      return (
        o.payment?.method === "UPI" &&
        o.payment.status === "PENDING" &&
        o.status !== "CANCELLED"
      );
    return true;
  });
  const pendingUpi = (items ?? []).filter(
    (o) =>
      o.payment?.method === "UPI" &&
      o.payment.status === "PENDING" &&
      o.status !== "CANCELLED",
  ).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>
          Orders{" "}
          {newCount > 0 && (
            <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 align-middle text-xs font-semibold text-white">
              {newCount} new
            </span>
          )}
        </h1>
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live ·{" "}
          {lastSync
            ? `updated ${timeAgo(new Date(lastSync).toISOString(), now)}`
            : "connecting…"}
        </p>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {(
          [
            ["open", "Open"],
            ["upi", `UPI pending${pendingUpi ? ` (${pendingUpi})` : ""}`],
            ["all", "All"],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
              filter === key
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-gray-300 bg-surface text-gray-700"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {items === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          {filter === "all" ? "No orders yet." : "Nothing here right now."} New
          orders appear automatically.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              isNew={newIds.has(o.id)}
              isSuper={isSuper}
              now={now}
              onUpdated={replaceOrder}
              onAcknowledge={() => acknowledge(o.id)}
              onDeleted={load}
            />
          ))}
        </ul>
      )}

      {isSuper && (
        <RecentlyDeleted
          entity="order"
          rows={trash.map((o) => ({
            id: o.id,
            label: `#${o.number} · ${o.customer.name} · ${inr(o.total)}`,
            scheduledDeleteAt: o.scheduledDeleteAt,
          }))}
          onChange={load}
        />
      )}
    </div>
  );
}

function OrderCard({
  order: o,
  isNew,
  isSuper,
  now,
  onUpdated,
  onAcknowledge,
  onDeleted,
}: {
  order: OrderDTO;
  isNew: boolean;
  isSuper: boolean;
  now: number;
  onUpdated: (o: OrderDTO) => void;
  onAcknowledge: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pay = o.payment;
  const closed = o.status === "CANCELLED";
  const upiPending =
    pay?.method === "UPI" && pay.status === "PENDING" && !closed;

  async function run(key: string, fn: () => Promise<OrderDTO>) {
    setBusy(key);
    setError(null);
    try {
      onUpdated(await fn());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function changeStatus(status: string) {
    if (
      status === "CANCELLED" &&
      !window.confirm(`Cancel order #${o.number}? Stock will be returned.`)
    )
      return;
    run("status", () =>
      api<OrderDTO>(`/api/admin/orders/${o.id}`, {
        method: "PATCH",
        json: { status },
      }),
    );
  }

  function uploadQr(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    run("qr", () =>
      api<OrderDTO>(`/api/admin/orders/${o.id}/qr`, {
        method: "POST",
        body: fd,
      }),
    );
  }

  function markPaid() {
    if (
      !window.confirm(
        `Confirm ${inr(o.total)} received for order #${o.number}?`,
      )
    )
      return;
    run("paid", () =>
      api<OrderDTO>(`/api/admin/orders/${o.id}/mark-paid`, { method: "POST" }),
    );
  }

  const highlight = isNew
    ? "border-red-400 ring-2 ring-red-300 bg-red-50/40"
    : o.status === "PLACED"
      ? "border-amber-300 bg-amber-50/50"
      : "";

  return (
    <li
      className={`${card} p-4 ${highlight}`}
      onClick={isNew ? onAcknowledge : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            #{o.number}
            {isNew && (
              <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                New
              </span>
            )}
          </p>
          <p className="text-sm text-gray-700">
            {o.customer.name} ·{" "}
            <a
              href={`tel:${o.customer.phone}`}
              className="text-brand-700 underline"
            >
              {o.customer.phone}
            </a>
          </p>
          <p className="text-xs text-gray-500">{timeAgo(o.createdAt, now)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={o.status} />
          {pay && <PaymentBadge method={pay.method} status={pay.status} />}
        </div>
      </div>

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

      <p className="mt-2 text-sm text-gray-700">
        {o.fulfilmentType === "PICKUP" ? (
          <span className="font-medium">🏬 Pickup</span>
        ) : (
          <>
            <span className="font-medium">🚚 Delivery:</span>{" "}
            {o.deliveryAddress}{" "}
            <a
              href={googleDirectionsUrl(
                o.deliveryLat !== null && o.deliveryLng !== null ? { lat: o.deliveryLat, lng: o.deliveryLng } : null,
                o.deliveryAddress,
              )}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap font-medium text-brand-700 underline"
            >
              📍 Open in Maps{o.deliveryLat !== null ? "" : " (address)"}
            </a>
          </>
        )}
      </p>

      {pay?.method === "UPI" && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-gray-50 p-2">
          {pay.qrImageUrl ? (
            <a
              href={pay.qrImageUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pay.qrImageUrl}
                alt="UPI QR"
                className="h-16 w-16 rounded border border-gray-200 object-contain"
              />
            </a>
          ) : (
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded border border-dashed border-gray-300 text-[10px] text-gray-400">
              No QR
            </div>
          )}
          <p className="text-xs text-gray-600">
            {pay.status === "PAID"
              ? `Paid · confirmed by ${pay.confirmedByName ?? "admin"}`
              : pay.qrImageUrl
                ? "QR sent — waiting for customer to pay"
                : "Customer is waiting for a QR"}
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="Order status"
          className={`${input} w-auto py-1.5`}
          value=""
          disabled={closed || busy !== null}
          onChange={(e) => e.target.value && changeStatus(e.target.value)}
        >
          <option value="">{closed ? "Cancelled" : "Update status…"}</option>
          {ADMIN_SETTABLE_STATUSES.filter((s) => s !== o.status).map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        {upiPending && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadQr(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className={btnSecondary}
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
            >
              {busy === "qr"
                ? "Uploading…"
                : pay?.qrImageUrl
                  ? "Replace QR"
                  : "Upload QR"}
            </button>
          </>
        )}

        {pay?.status === "PENDING" && !closed && (
          <button
            type="button"
            className={btnSuccess}
            disabled={busy !== null}
            onClick={markPaid}
          >
            {busy === "paid" ? "Saving…" : "Mark paid"}
          </button>
        )}

        {isSuper && (
          <DeleteButton
            entity="order"
            id={o.id}
            name={`Order #${o.number}`}
            onScheduled={onDeleted}
          />
        )}
      </div>
    </li>
  );
}
