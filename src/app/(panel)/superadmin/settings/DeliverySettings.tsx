"use client";

import { useState } from "react";
import type { DeliveryPricing } from "@/lib/pricing";
import { api, errorMessage } from "@/lib/client-api";
import { inr } from "@/lib/format";
import { btnPrimary, card, input, label } from "@/components/ui";

/** Blank means "not set"; otherwise a whole-or-decimal amount of 0 or more. */
function parseAmount(text: string): number | null | "invalid" {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

export function DeliverySettings({ initial }: { initial: DeliveryPricing }) {
  const [fee, setFee] = useState(String(initial.fee));
  const [freeAbove, setFreeAbove] = useState(
    initial.freeAbove === null ? "" : String(initial.freeAbove),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const feeValue = parseAmount(fee);
  const freeValue = parseAmount(freeAbove);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (feeValue === "invalid" || freeValue === "invalid") {
      setMessage({ ok: false, text: "Enter amounts as numbers, 0 or more" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/superadmin/settings/delivery", {
        method: "PUT",
        json: { fee: feeValue ?? 0, freeAbove: freeValue },
      });
      setMessage({ ok: true, text: "Delivery charge saved. New orders use it." });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const summary =
    feeValue === "invalid" || freeValue === "invalid"
      ? null
      : !feeValue
        ? "Delivery is free for every order."
        : freeValue === null
          ? `Every delivery order pays ${inr(feeValue)}.`
          : `Delivery costs ${inr(feeValue)}, and is free when the items are worth ${inr(freeValue)} or more.`;

  return (
    <form onSubmit={save} className={`${card} mt-5 space-y-4 p-4`}>
      <div>
        <h2 className="font-bold text-ink">Delivery charge</h2>
        <p className="mt-0.5 text-sm text-ink-3">
          Added to every delivery order.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="delivery-fee">
            Charge per delivery (₹)
          </label>
          <input
            id="delivery-fee"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            className={input}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="free-above">
            Free delivery from (₹, optional)
          </label>
          <input
            id="free-above"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            placeholder="No free delivery"
            className={input}
            value={freeAbove}
            onChange={(e) => setFreeAbove(e.target.value)}
          />
        </div>
      </div>
      {summary && <p className="rounded-xl bg-subtle p-3 text-sm text-ink-2">{summary}</p>}
      {message && (
        <p className={`text-sm ${message.ok ? "text-success-ink" : "text-danger-ink"}`}>
          {message.text}
        </p>
      )}
      <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={busy}>
        {busy ? "Saving…" : "Save delivery charge"}
      </button>
    </form>
  );
}
