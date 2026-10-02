"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  CircleCheck,
  MapPin,
  QrCode,
  Store,
  Truck,
  Upload,
} from "lucide-react";
import type { OrderDTO } from "@/lib/dto";
import { APP_NAME } from "@/lib/brand";
import {
  ADMIN_SETTABLE_STATUSES,
  FINAL_STATUSES,
  ORDER_STATUS_LABEL,
  POLL_INTERVAL_MS,
} from "@/lib/constants";
import { api, createPoller, errorMessage } from "@/lib/client-api";
import { inr, timeAgo } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { googleDirectionsUrl } from "@/lib/maps";
import { DeleteButton } from "@/components/DeleteButton";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";
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
  field,
  label,
  pageTitle,
  pill,
} from "@/components/ui";

type Filter = "open" | "upi" | "all";
type Partner = { id: string; name: string };
type Orders = { items: OrderDTO[]; trash: OrderDTO[] };

const isUpiPending = (o: OrderDTO) =>
  o.payment?.method === "UPI" &&
  o.payment.status === "PENDING" &&
  o.status !== "CANCELLED";

export function OrdersClient({ isSuper }: { isSuper: boolean }) {
  const [items, setItems] = useState<OrderDTO[] | null>(null);
  const [trash, setTrash] = useState<OrderDTO[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const poll = useMemo(() => createPoller<Orders>("/api/admin/orders"), []);
  const seenIds = useRef<Set<string> | null>(null);
  const now = useNow(5000);

  const load = useCallback(async () => {
    try {
      const result = await poll();
      setLastSync(Date.now());
      setError(null);
      if (!result.changed) return; // nothing new since the last poll
      const data = result.data;
      // The first load is the baseline; later loads flag anything unseen as new.
      // (The bell plays the sound — it gets the same "new order" notification.)
      if (seenIds.current) {
        const arrived = data.items
          .filter((o) => !seenIds.current!.has(o.id))
          .map((o) => o.id);
        if (arrived.length) setNewIds((prev) => new Set([...prev, ...arrived]));
      }
      seenIds.current = new Set([
        ...(seenIds.current ?? []),
        ...data.items.map((o) => o.id),
      ]);
      setItems(data.items);
      setTrash(data.trash);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [poll]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first fetch, then polling
    load();
    api<{ items: Partner[] }>("/api/admin/delivery-partners")
      .then((d) => setPartners(d.items))
      .catch(() => {});
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  const newCount = newIds.size;
  useEffect(() => {
    document.title = newCount
      ? `(${newCount}) New orders | ${APP_NAME}`
      : `Orders | ${APP_NAME}`;
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
    if (filter === "upi") return isUpiPending(o);
    return true;
  });
  const pendingUpi = (items ?? []).filter(isUpiPending).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className={pageTitle}>
          Orders
          {newCount > 0 && (
            <span className={`${pill} ml-2 bg-danger align-middle text-on-solid`}>
              {newCount} new
            </span>
          )}
        </h1>
        <p className="flex items-center gap-2 text-xs text-ink-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          {lastSync
            ? `Live, checked ${timeAgo(new Date(lastSync).toISOString(), now)}`
            : "Connecting…"}
        </p>
      </div>

      <div className="mt-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {(
          [
            ["open", "Open"],
            ["upi", `UPI to confirm${pendingUpi ? ` (${pendingUpi})` : ""}`],
            ["all", "All"],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === key
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}

      {items === null ? (
        <ListSkeleton rows={3} className="h-44" />
      ) : list.length === 0 ? (
        <p className={`${emptyState} mt-5`}>
          {filter === "all"
            ? "No orders yet. When a customer orders, it appears here by itself."
            : "Nothing waiting here right now. New orders appear by themselves."}
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
              partners={partners}
            />
          ))}
        </ul>
      )}

      {isSuper && (
        <RecentlyDeleted
          entity="order"
          rows={trash.map((o) => ({
            id: o.id,
            label: `#${o.number}, ${o.customer.name}, ${inr(o.total)}`,
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
  partners,
}: {
  order: OrderDTO;
  isNew: boolean;
  isSuper: boolean;
  now: number;
  onUpdated: (o: OrderDTO) => void;
  onAcknowledge: () => void;
  onDeleted: () => void;
  partners: Partner[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** The delivery-charge editor: null when closed, otherwise the typed amount. */
  const [feeDraft, setFeeDraft] = useState<string | null>(null);
  const pay = o.payment;
  const closed = o.status === "CANCELLED";
  const upiPending = pay?.method === "UPI" && pay.status === "PENDING" && !closed;
  const pin =
    o.deliveryLat !== null && o.deliveryLng !== null
      ? { lat: o.deliveryLat, lng: o.deliveryLng }
      : null;

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

  function assign(deliveryPartnerId: string) {
    run("assign", () =>
      api<OrderDTO>(`/api/admin/orders/${o.id}/assign`, {
        method: "POST",
        json: { deliveryPartnerId: deliveryPartnerId || null },
      }),
    );
  }

  // A custom charge is possible until the order is paid or closed.
  const canChangeFee =
    o.fulfilmentType === "DELIVERY" &&
    !closed &&
    o.status !== "COMPLETED" &&
    pay?.status === "PENDING";

  function saveFee(e: React.FormEvent) {
    e.preventDefault();
    const fee = Number(feeDraft);
    if (feeDraft === null || feeDraft.trim() === "" || !Number.isFinite(fee) || fee < 0) {
      setError("Enter the delivery charge as a number, 0 or more");
      return;
    }
    setFeeDraft(null);
    run("fee", () =>
      api<OrderDTO>(`/api/admin/orders/${o.id}/delivery-fee`, {
        method: "PATCH",
        json: { fee },
      }),
    );
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
    run("qr", async () => {
      const fd = new FormData();
      // Screenshots are large; keep the QR sharp but small enough to upload fast.
      fd.set("file", await compressImage(file, { maxSide: 1600, quality: 0.9 }));
      return api<OrderDTO>(`/api/admin/orders/${o.id}/qr`, {
        method: "POST",
        body: fd,
      });
    });
  }

  function markPaid() {
    if (!window.confirm(`Confirm ${inr(o.total)} received for order #${o.number}?`))
      return;
    run("paid", () =>
      api<OrderDTO>(`/api/admin/orders/${o.id}/mark-paid`, { method: "POST" }),
    );
  }

  const highlight = isNew
    ? "border-brand-400 ring-2 ring-brand-200"
    : o.status === "PLACED"
      ? "border-warning-line"
      : "";

  return (
    <li
      className={`${card} p-4 sm:p-5 ${highlight}`}
      onClick={isNew ? onAcknowledge : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xl leading-tight font-extrabold tracking-tight text-ink">
            #{o.number}
            {isNew && (
              <span className={`${pill} ml-2 bg-brand-600 align-middle text-on-solid`}>
                New
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-ink-2">
            {o.customer.name},{" "}
            <a
              href={`tel:${o.customer.phone.replace(/\s/g, "")}`}
              className="font-semibold text-brand-700"
            >
              {o.customer.phone}
            </a>
          </p>
          <p className="text-xs text-ink-3">{timeAgo(o.createdAt, now)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={o.status} />
          {pay && <PaymentBadge method={pay.method} status={pay.status} />}
        </div>
      </div>

      <OrderLines order={o} />

      <div className="mt-3 space-y-1.5 text-sm text-ink-2">
        {o.fulfilmentType === "PICKUP" ? (
          <p className="flex items-center gap-2">
            <Store className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
            <span className="font-semibold text-ink">Pickup at the store</span>
          </p>
        ) : (
          <p className="flex items-start gap-2">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
            <span>
              <span className="font-semibold text-ink">Deliver to</span>{" "}
              {o.deliveryAddress}{" "}
              <a
                href={googleDirectionsUrl(pin, o.deliveryAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-brand-700"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {pin ? "Open in Maps" : "Find in Maps"}
              </a>
            </span>
          </p>
        )}
        {o.deliveryPartner && (
          <p className="flex items-center gap-2">
            <Bike className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
            <span>
              <span className="font-semibold text-ink">{o.deliveryPartner.name}</span>{" "}
              {o.deliveredAt ? "delivered it" : "is delivering"}
            </span>
          </p>
        )}
        {o.receivedAt && (
          <p className="flex items-center gap-2 font-semibold text-success-ink">
            <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
            Customer confirmed they received it
          </p>
        )}
      </div>

      {pay?.method === "UPI" && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-subtle p-2.5">
          {pay.qrImageUrl ? (
            <a href={pay.qrImageUrl} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pay.qrImageUrl}
                alt="UPI QR"
                className="h-16 w-16 rounded-lg border border-line bg-on-solid object-contain"
              />
            </a>
          ) : (
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-line-strong text-ink-4">
              <QrCode className="h-6 w-6" aria-hidden />
            </div>
          )}
          <p className="text-sm text-ink-2">
            {pay.status === "PAID"
              ? `Paid, confirmed by ${pay.confirmedByName ?? "the store"}.`
              : pay.qrImageUrl
                ? "QR sent. Waiting for the customer to pay."
                : "The customer is waiting for a QR."}
          </p>
        </div>
      )}

      {feeDraft !== null && (
        <form onSubmit={saveFee} className="mt-3 rounded-xl bg-subtle p-3">
          <label className={label} htmlFor={`fee-${o.id}`}>
            Delivery charge for this order (₹)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`fee-${o.id}`}
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              autoFocus
              className={`${field} w-32`}
              value={feeDraft}
              onChange={(e) => setFeeDraft(e.target.value)}
            />
            <button type="submit" className={btnPrimary}>
              Save charge
            </button>
            <button type="button" className={btnSecondary} onClick={() => setFeeDraft(null)}>
              Keep {o.deliveryFee > 0 ? inr(o.deliveryFee) : "free"}
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-3">
            The total changes and the customer is told.
            {pay?.method === "UPI" && pay.qrImageUrl
              ? " The QR you sent is removed, so upload a new one for the new amount."
              : ""}
          </p>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          aria-label="Order status"
          className={`${field} max-w-full`}
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

        {o.fulfilmentType === "DELIVERY" && !closed && o.status !== "COMPLETED" && (
          <select
            aria-label="Delivery partner"
            className={`${field} max-w-full`}
            value={o.deliveryPartner?.id ?? ""}
            disabled={busy !== null}
            onChange={(e) => assign(e.target.value)}
          >
            <option value="">
              {partners.length ? "Assign delivery…" : "No delivery partners yet"}
            </option>
            {/* Keep a deactivated-but-assigned partner visible so the select shows the truth. */}
            {o.deliveryPartner &&
              !partners.some((p) => p.id === o.deliveryPartner!.id) && (
                <option value={o.deliveryPartner.id}>{o.deliveryPartner.name}</option>
              )}
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {canChangeFee && feeDraft === null && (
          <button
            type="button"
            className={btnSecondary}
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setFeeDraft(String(o.deliveryFee));
            }}
          >
            <Truck className="h-4 w-4" aria-hidden />
            {busy === "fee" ? "Saving…" : "Delivery charge"}
          </button>
        )}

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
              <Upload className="h-4 w-4" aria-hidden />
              {busy === "qr" ? "Uploading…" : pay?.qrImageUrl ? "Replace QR" : "Upload QR"}
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
            <CircleCheck className="h-4 w-4" aria-hidden />
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
