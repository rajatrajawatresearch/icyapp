"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Bike,
  Check,
  CircleCheck,
  Clock,
  Copy,
  ExternalLink,
  QrCode,
  ReceiptText,
  Upload,
} from "lucide-react";
import type { OrderDTO } from "@/lib/dto";
import {
  FINAL_STATUSES,
  MAX_PAYMENT_PROOFS,
  POLL_INTERVAL_MS,
} from "@/lib/constants";
import { APP_NAME } from "@/lib/brand";
import {
  api,
  copyText,
  createPoller,
  errorMessage,
  type WriteGuard,
} from "@/lib/client-api";
import { formatDateTime, inr } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { ImageThumbs } from "@/components/ImageThumbs";
import { OrderLines } from "@/components/OrderLines";
import { StatusBadge } from "@/components/StatusBadge";
import { PickupCard, type Pickup } from "@/components/map/PickupCard";
import { btnPrimary, btnSecondary, btnSuccess, card } from "@/components/ui";
import { CustomerHeader, CustomerTabs } from "../CustomerChrome";

const STEPS = ["PLACED", "CONFIRMED", "OUT_FOR_DELIVERY", "COMPLETED"] as const;

export function CustomerOrders({
  token,
  initialOrders,
  initialClosesAt,
  placedNumber,
  pickup,
}: {
  token: string;
  initialOrders: OrderDTO[];
  /** When this link stops working because the order is finished (null = it stays open). */
  initialClosesAt: string | null;
  placedNumber: number | null;
  pickup: Pickup;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [closesAt, setClosesAt] = useState(initialClosesAt);
  const [linkDead, setLinkDead] = useState(false);
  const poll = useMemo(
    () =>
      createPoller<{ orders: OrderDTO[]; linkClosesAt: string | null }>(
        `/api/customer/${token}/orders`,
      ),
    [token],
  );
  const hasLive = orders.some((o) => !FINAL_STATUSES.includes(o.status));

  const refresh = useCallback(async () => {
    try {
      const result = await poll();
      if (!result.changed) return;
      setOrders(result.data.orders);
      setClosesAt(result.data.linkClosesAt);
    } catch (e) {
      if ((e as { status?: number }).status === 404) setLinkDead(true);
    }
  }, [poll]);

  // Poll while something is in progress. Once everything is finished, look
  // one more time: that answer says when the link closes.
  useEffect(() => {
    if (linkDead) return;
    if (!hasLive) {
      const t = setTimeout(refresh, 2500);
      return () => clearTimeout(t);
    }
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [hasLive, linkDead, refresh]);

  // The link closes on the dot, without waiting for the next request to fail.
  useEffect(() => {
    if (!closesAt || linkDead) return;
    const t = setTimeout(
      () => setLinkDead(true),
      Math.max(0, new Date(closesAt).getTime() - Date.now()),
    );
    return () => clearTimeout(t);
  }, [closesAt, linkDead]);

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
      {linkDead ? (
        <div className="m-4 rounded-2xl border border-danger-line bg-danger-soft p-4 text-sm text-danger-ink">
          This link is no longer active. Ask the store for your new link.
        </div>
      ) : (
        closesAt && (
          <div
            className="m-4 flex items-start gap-3 rounded-2xl border border-warning-line bg-warning-soft p-4 text-sm text-warning-ink"
            suppressHydrationWarning
          >
            <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              <span className="font-bold">Your order is complete.</span> This
              link closes at {formatDateTime(closesAt)}. To order again, ask
              the store for a new link.
            </p>
          </div>
        )
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
              guard={poll.during}
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
  guard,
}: {
  token: string;
  order: OrderDTO;
  pickup: Pickup;
  onUpdated: (o: OrderDTO) => void;
  guard: WriteGuard;
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
        await guard(() =>
          api<OrderDTO>(`/api/customer/${token}/orders/${o.id}/received`, {
            method: "POST",
          }),
        ),
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

      {pay && !cancelled && (
        <PaymentPanel token={token} order={o} payment={pay} onUpdated={onUpdated} guard={guard} />
      )}

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
  token,
  order,
  payment: pay,
  onUpdated,
  guard,
}: {
  token: string;
  order: OrderDTO;
  payment: NonNullable<OrderDTO["payment"]>;
  onUpdated: (o: OrderDTO) => void;
  guard: WriteGuard;
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
        {order.fulfilmentType === "PICKUP" ? "pickup" : "delivery"}.
      </p>
    );
  }
  /** The store has told the customer where to pay, in at least one way. */
  const sent = Boolean(pay.qrImageUrl || pay.upiId || pay.payNote);
  return (
    <>
      {pay.qrImageUrl ? (
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
          {/* Paying from the same phone: the QR has to be saved and picked in the UPI app. */}
          <a
            href={pay.qrImageUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Open the QR to save it
          </a>
          <p className="mt-1 text-xs text-brand-800">
            Paying from this phone? Save the QR and choose it in your UPI app.
          </p>
        </div>
      ) : null}
      {(pay.upiId || pay.payNote) && (
        <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-base font-extrabold text-brand-900">
            {pay.qrImageUrl ? "Or pay with these details" : `Pay ${inr(pay.amount)}`}
          </p>
          {pay.upiId && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-brand-800">UPI ID</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-2.5 font-mono text-sm break-all text-ink">
                  {pay.upiId}
                </p>
                <CopyButton text={pay.upiId} what="UPI ID" />
              </div>
              {/* Opens the phone's UPI app with the ID and amount filled in. */}
              <a
                href={`upi://pay?pa=${encodeURIComponent(pay.upiId)}&pn=${encodeURIComponent(APP_NAME)}&am=${pay.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${order.number}`)}`}
                className={`${btnPrimary} mt-2 w-full py-3`}
              >
                Pay {inr(pay.amount)} in my UPI app
              </a>
              <p className="mt-1.5 text-xs text-brand-800">
                If your UPI app doesn&apos;t open, copy the UPI ID and pay to it.
              </p>
            </div>
          )}
          {pay.payNote && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-brand-800">
                Bank / other details
              </p>
              <div className="mt-1 flex items-start gap-2">
                <p className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-2.5 text-sm whitespace-pre-line text-ink">
                  {pay.payNote}
                </p>
                <CopyButton text={pay.payNote} what="details" />
              </div>
            </div>
          )}
        </div>
      )}
      {!sent && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-warning-soft p-3 text-sm text-warning-ink">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-warning border-t-transparent" />
          Waiting for the store to send payment details…
        </div>
      )}
      {(sent || pay.proofs.length > 0) && (
        <PaymentProofs
          token={token}
          orderId={order.id}
          proofs={pay.proofs}
          onUpdated={onUpdated}
          guard={guard}
        />
      )}
    </>
  );
}

function CopyButton({ text, what }: { text: string; what: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${what}`}
      className={`${btnSecondary} shrink-0 px-3`}
      onClick={async () => {
        setCopied(await copyText(text));
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** After paying, the customer sends one or more screenshots; the store checks them and confirms. */
function PaymentProofs({
  token,
  orderId,
  proofs,
  onUpdated,
  guard,
}: {
  token: string;
  orderId: string;
  proofs: NonNullable<OrderDTO["payment"]>["proofs"];
  onUpdated: (o: OrderDTO) => void;
  guard: WriteGuard;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  /** While uploading: which file of how many. */
  const [progress, setProgress] = useState<{ at: number; of: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const room = MAX_PAYMENT_PROOFS - proofs.length;

  async function upload(files: File[]) {
    const batch = files.slice(0, room);
    setError(
      files.length > room
        ? `You can send ${MAX_PAYMENT_PROOFS} screenshots for one order, so only the first ${room} ${room === 1 ? "was" : "were"} sent.`
        : null,
    );
    try {
      await guard(async () => {
        for (const [i, file] of batch.entries()) {
          setProgress({ at: i + 1, of: batch.length });
          const fd = new FormData();
          // Keep the amount and reference number readable, but small enough for mobile data.
          fd.set("file", await compressImage(file, { maxSide: 1600, quality: 0.85 }));
          onUpdated(
            await api<OrderDTO>(`/api/customer/${token}/orders/${orderId}/proofs`, {
              method: "POST",
              body: fd,
            }),
          );
        }
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-line bg-subtle p-4">
      <p className="text-sm font-bold text-ink">
        {proofs.length ? "Payment screenshots sent" : "Paid? Send a screenshot"}
      </p>
      <p className="mt-0.5 text-xs text-ink-3">
        {proofs.length
          ? "The store is checking them and will confirm your payment here."
          : "Upload the payment screenshot from your UPI app. The store checks it and confirms your payment."}
      </p>
      {proofs.length > 0 && (
        <ImageThumbs images={proofs} alt="Payment screenshot" className="mt-3" />
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) upload(files);
        }}
      />
      {room > 0 && (
        <button
          type="button"
          className={`${proofs.length ? btnSecondary : btnPrimary} mt-3 w-full py-3`}
          disabled={progress !== null}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden />
          {progress
            ? `Uploading ${progress.at} of ${progress.of}…`
            : proofs.length
              ? "Add another screenshot"
              : "Upload payment screenshot"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-danger-ink">{error}</p>}
    </div>
  );
}
