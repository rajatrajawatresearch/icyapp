"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Check,
  CircleCheck,
  Images,
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
import {
  api,
  createPoller,
  errorMessage,
  type WriteGuard,
} from "@/lib/client-api";
import { inr, timeAgo } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { googleDirectionsUrl } from "@/lib/maps";
import { DeleteButton } from "@/components/DeleteButton";
import { ImageThumbs } from "@/components/ImageThumbs";
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
  input,
  label,
  pageTitle,
  pill,
} from "@/components/ui";

type Filter = "open" | "upi" | "all";
type Partner = { id: string; name: string };
type Orders = { items: OrderDTO[]; trash: OrderDTO[] };

const SETTABLE: readonly string[] = ADMIN_SETTABLE_STATUSES;

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
              guard={poll.during}
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
  guard,
}: {
  order: OrderDTO;
  isNew: boolean;
  isSuper: boolean;
  now: number;
  onUpdated: (o: OrderDTO) => void;
  onAcknowledge: () => void;
  onDeleted: () => void;
  partners: Partner[];
  guard: WriteGuard;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** What the last save did, shown for a moment so it is clear it went through. */
  const [saved, setSaved] = useState<string | null>(null);
  /** The value just picked in a dropdown, shown while it is being saved. */
  const [picked, setPicked] = useState<{ status?: string; partner?: string }>({});
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** The delivery-charge editor: null when closed, otherwise the typed amount. */
  const [feeDraft, setFeeDraft] = useState<string | null>(null);
  const pay = o.payment;
  const closed = o.status === "CANCELLED";
  const upiPending = pay?.method === "UPI" && pay.status === "PENDING" && !closed;
  const pin =
    o.deliveryLat !== null && o.deliveryLng !== null
      ? { lat: o.deliveryLat, lng: o.deliveryLng }
      : null;

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  // Every control on the card saves by itself; `done` is what to say once it has.
  async function run(key: string, done: string, fn: () => Promise<OrderDTO>) {
    setBusy(key);
    setError(null);
    setSaved(null);
    clearTimeout(savedTimer.current);
    try {
      onUpdated(await guard(fn));
      setSaved(done);
      savedTimer.current = setTimeout(() => setSaved(null), 4000);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
      setPicked({});
    }
  }

  function assign(deliveryPartnerId: string) {
    if (deliveryPartnerId === (o.deliveryPartner?.id ?? "")) return;
    const partner = partners.find((p) => p.id === deliveryPartnerId);
    setPicked({ partner: deliveryPartnerId });
    run(
      "assign",
      partner
        ? `Saved. ${partner.name} has been told.`
        : "Saved. Nobody is assigned now.",
      () =>
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
    run("fee", "Saved. The customer has been told the new total.", () =>
      api<OrderDTO>(`/api/admin/orders/${o.id}/delivery-fee`, {
        method: "PATCH",
        json: { fee },
      }),
    );
  }

  function changeStatus(status: string) {
    if (status === o.status) return;
    if (
      status === "CANCELLED" &&
      !window.confirm(
        `Cancel order #${o.number}? This can't be undone. Counted stock goes back.`,
      )
    )
      return;
    // A completed order leaves the Open list, so an unpaid one is easy to forget.
    if (
      status === "COMPLETED" &&
      pay?.status === "PENDING" &&
      !window.confirm(
        `Order #${o.number} is not paid yet (${inr(o.total)} by ${pay.method === "UPI" ? "UPI" : "cash"}). Complete it anyway? You can still mark it paid afterwards.`,
      )
    )
      return;
    setPicked({ status });
    run("status", "Saved. The customer has been told.", () =>
      api<OrderDTO>(`/api/admin/orders/${o.id}`, {
        method: "PATCH",
        json: { status },
      }),
    );
  }

  function uploadQr(file: File) {
    run("qr", "QR sent to the customer.", async () => {
      const fd = new FormData();
      // Screenshots are large; keep the QR sharp but small enough to upload fast.
      fd.set("file", await compressImage(file, { maxSide: 1600, quality: 0.9 }));
      return api<OrderDTO>(`/api/admin/orders/${o.id}/qr`, {
        method: "POST",
        body: fd,
      });
    });
  }

  function sendDetails(upiId: string, note: string) {
    run(
      "details",
      upiId || note
        ? "Payment details sent to the customer."
        : "Payment details removed.",
      () =>
        api<OrderDTO>(`/api/admin/orders/${o.id}/pay-details`, {
          method: "POST",
          json: { upiId, note },
        }),
    );
  }

  function markPaid() {
    if (!window.confirm(`Confirm ${inr(o.total)} received for order #${o.number}?`))
      return;
    run("paid", "Payment marked as received.", () =>
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
          {upiPending && pay.proofs.length > 0 && (
            <span className={`${pill} bg-warning-soft text-warning-ink`}>
              <Images className="h-3.5 w-3.5" aria-hidden />
              Proof sent
            </span>
          )}
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
        <UpiPanel
          order={o}
          pending={upiPending}
          busy={busy}
          onUploadQr={uploadQr}
          onSendDetails={sendDetails}
        />
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

      {/* The dropdowns show the saved value and save the moment one is picked. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`status-${o.id}`}>
            Order status
          </label>
          <select
            id={`status-${o.id}`}
            className={input}
            value={picked.status ?? o.status}
            disabled={closed || busy !== null}
            onChange={(e) => changeStatus(e.target.value)}
          >
            {/* Placed and Paid are set by the app, not picked: listed only to show where the order is. */}
            {!SETTABLE.includes(o.status) && (
              <option value={o.status} disabled>
                {ORDER_STATUS_LABEL[o.status]}
              </option>
            )}
            {ADMIN_SETTABLE_STATUSES.filter(
              // A paid order is already past "confirmed".
              (s) => !(s === "CONFIRMED" && o.status === "PAID"),
            ).map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {o.fulfilmentType === "DELIVERY" && !closed && o.status !== "COMPLETED" && (
          <div>
            <label className={label} htmlFor={`partner-${o.id}`}>
              Delivery partner
            </label>
            <select
              id={`partner-${o.id}`}
              className={input}
              value={picked.partner ?? o.deliveryPartner?.id ?? ""}
              disabled={busy !== null}
              onChange={(e) => assign(e.target.value)}
            >
              <option value="">
                {partners.length ? "Not assigned" : "No delivery partners yet"}
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
          </div>
        )}
      </div>
      <p
        aria-live="polite"
        className={`mt-2 flex items-center gap-1.5 text-xs ${
          saved && !busy ? "font-semibold text-success-ink" : "text-ink-3"
        }`}
      >
        {busy ? (
          <>
            <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-ink-4 border-t-transparent" />
            Saving…
          </>
        ) : saved ? (
          <>
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
            {saved}
          </>
        ) : closed ? (
          "This order is cancelled and can't be changed."
        ) : (
          "Changes save by themselves as soon as you pick them. No save button needed."
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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

const LAST_DETAILS_KEY = "pay-details-last";

/**
 * How the store tells the customer where to pay a UPI order: a QR image, a
 * UPI ID, bank details, or any mix. While the payment is pending the box
 * itself is the upload button, so there is nothing else to look for.
 */
function UpiPanel({
  order: o,
  pending,
  busy,
  onUploadQr,
  onSendDetails,
}: {
  order: OrderDTO;
  pending: boolean;
  busy: string | null;
  onUploadQr: (file: File) => void;
  onSendDetails: (upiId: string, note: string) => void;
}) {
  const pay = o.payment!;
  const fileRef = useRef<HTMLInputElement>(null);
  /** The UPI ID / bank details form: null when closed. */
  const [draft, setDraft] = useState<{ upiId: string; note: string } | null>(null);
  const sent = Boolean(pay.qrImageUrl || pay.upiId || pay.payNote);

  const status =
    pay.status === "PAID"
      ? `Paid, confirmed by ${pay.confirmedByName ?? "the store"}.`
      : pay.proofs.length
        ? "The customer says they have paid. Check the proof below."
        : sent
          ? "Payment details sent. Waiting for the customer to pay."
          : "The customer is waiting for payment details.";

  function openDraft() {
    let last = { upiId: "", note: "" };
    try {
      // The store's UPI ID rarely changes: start from what was sent last time.
      last = { ...last, ...JSON.parse(localStorage.getItem(LAST_DETAILS_KEY) ?? "{}") };
    } catch {}
    setDraft({
      upiId: pay.upiId ?? (pay.payNote ? "" : last.upiId),
      note: pay.payNote ?? (pay.upiId ? "" : last.note),
    });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const details = { upiId: draft.upiId.trim(), note: draft.note.trim() };
    try {
      if (details.upiId || details.note)
        localStorage.setItem(LAST_DETAILS_KEY, JSON.stringify(details));
    } catch {}
    setDraft(null);
    onSendDetails(details.upiId, details.note);
  }

  return (
    <div className="mt-3 rounded-xl bg-subtle p-2.5">
      <div className="flex items-center gap-3">
        {pay.qrImageUrl && (
          <ImageThumbs images={[{ id: "qr", url: pay.qrImageUrl }]} alt="UPI QR" />
        )}
        {pending ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadQr(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition hover:bg-muted active:scale-[0.99] disabled:opacity-60"
            >
              {!pay.qrImageUrl && (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-brand-400 text-brand-700">
                  <Upload className="h-6 w-6" aria-hidden />
                </span>
              )}
              <span className="min-w-0 py-1">
                <span className="block text-sm text-ink-2">{status}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-brand-700">
                  <QrCode className="h-4 w-4 shrink-0" aria-hidden />
                  {busy === "qr"
                    ? "Uploading…"
                    : pay.qrImageUrl
                      ? "Tap here to replace the QR"
                      : "Tap here to upload a QR"}
                </span>
              </span>
            </button>
          </>
        ) : (
          <p className="text-sm text-ink-2">{status}</p>
        )}
      </div>

      {(pay.upiId || pay.payNote) && draft === null && (
        <dl className="mt-2.5 space-y-1 border-t border-line pt-2.5 text-sm">
          {pay.upiId && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-ink-3">UPI ID</dt>
              <dd className="font-semibold break-all text-ink">{pay.upiId}</dd>
            </div>
          )}
          {pay.payNote && (
            <div>
              <dt className="text-ink-3">Bank / other details</dt>
              <dd className="whitespace-pre-line text-ink">{pay.payNote}</dd>
            </div>
          )}
        </dl>
      )}

      {pending && draft === null && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={openDraft}
          className="mt-2.5 text-sm font-bold text-brand-700 disabled:opacity-60"
        >
          {busy === "details"
            ? "Sending…"
            : pay.upiId || pay.payNote
              ? "Change the UPI ID or bank details"
              : "Or send a UPI ID or bank details"}
        </button>
      )}

      {draft !== null && (
        <form onSubmit={send} className="mt-2.5 space-y-3 border-t border-line pt-2.5">
          <div>
            <label className={label} htmlFor={`upi-${o.id}`}>
              UPI ID
            </label>
            <input
              id={`upi-${o.id}`}
              className={input}
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="name@bank"
              value={draft.upiId}
              onChange={(e) => setDraft({ ...draft, upiId: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor={`note-${o.id}`}>
              Bank or other details (optional)
            </label>
            <textarea
              id={`note-${o.id}`}
              className={`${input} min-h-24`}
              maxLength={600}
              placeholder={"Account name\nAccount number\nIFSC"}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary}>
              Send to the customer
            </button>
            <button type="button" className={btnSecondary} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
          <p className="text-xs text-ink-3">
            The customer sees these under their order and gets a notification.
            Clear both boxes and send to take them back.
          </p>
        </form>
      )}

      {pay.proofs.length > 0 && (
        <div className="mt-2.5 border-t border-line pt-2.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Images className="h-4 w-4 text-ink-3" aria-hidden />
            Payment proof from the customer ({pay.proofs.length})
          </p>
          <ImageThumbs images={pay.proofs} alt="Payment screenshot" className="mt-2" />
          {pending && (
            <p className="mt-2 text-xs text-ink-3">
              Tap a screenshot to open it. If the amount ({inr(o.total)}) has
              reached you, press Mark paid.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
