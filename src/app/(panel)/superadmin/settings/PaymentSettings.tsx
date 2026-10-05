"use client";

import { useRef, useState } from "react";
import { QrCode, Upload } from "lucide-react";
import type { PayDefaults } from "@/lib/settings";
import { api, errorMessage } from "@/lib/client-api";
import { ImageThumbs } from "@/components/ImageThumbs";
import { btnPrimary, btnSecondary, card, input, label } from "@/components/ui";

/**
 * The store's default UPI QR / UPI ID / bank details, saved once and
 * auto-attached to every new UPI order from now on — no per-order upload.
 * Any part can be replaced here anytime.
 */
export function PaymentSettings({ initial }: { initial: PayDefaults }) {
  const [pay, setPay] = useState(initial);
  const [upiId, setUpiId] = useState(initial.upiId ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [busy, setBusy] = useState<"qr" | "details" | "remove" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadQr(file: File) {
    setBusy("qr");
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const next = await api<PayDefaults>("/api/superadmin/settings/pay", {
        method: "POST",
        body: fd,
      });
      setPay(next);
      setMessage({
        ok: true,
        text: "QR saved. New UPI orders use it automatically.",
      });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function removeQr() {
    setBusy("remove");
    setMessage(null);
    try {
      const next = await api<PayDefaults>("/api/superadmin/settings/pay", {
        method: "DELETE",
      });
      setPay(next);
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setBusy("details");
    setMessage(null);
    try {
      const next = await api<PayDefaults>("/api/superadmin/settings/pay", {
        method: "PUT",
        json: { upiId, note },
      });
      setPay(next);
      setMessage({
        ok: true,
        text: "Saved. New UPI orders use these automatically.",
      });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`${card} mt-4 space-y-4 p-4`}>
      <div>
        <h2 className="font-bold text-ink">Default payment details</h2>
        <p className="mt-0.5 text-sm text-ink-3">
          Saved once, sent automatically on every new UPI order — no more
          uploading the QR each time. Replace anytime.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-subtle p-2.5">
        {pay.qrImageUrl && (
          <ImageThumbs
            images={[{ id: "qr", url: pay.qrImageUrl }]}
            alt="Default UPI QR"
          />
        )}
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
            <span className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-brand-700">
              <QrCode className="h-4 w-4 shrink-0" aria-hidden />
              {busy === "qr"
                ? "Uploading…"
                : pay.qrImageUrl
                  ? "Tap to replace the QR"
                  : "Tap to upload the default QR"}
            </span>
          </span>
        </button>
        {pay.qrImageUrl && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={removeQr}
            className="shrink-0 text-sm font-bold text-danger-ink disabled:opacity-60"
          >
            {busy === "remove" ? "…" : "Remove"}
          </button>
        )}
      </div>

      <form
        onSubmit={saveDetails}
        className="space-y-3 border-t border-line pt-3"
      >
        <div>
          <label className={label} htmlFor="pay-upi">
            UPI ID
          </label>
          <input
            id="pay-upi"
            className={input}
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="name@bank"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="pay-note">
            Bank or other details (optional)
          </label>
          <textarea
            id="pay-note"
            className={`${input} min-h-24`}
            maxLength={600}
            placeholder={"Account name\nAccount number\nIFSC"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {message && (
          <p
            className={`text-sm ${message.ok ? "text-success-ink" : "text-danger-ink"}`}
          >
            {message.text}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={busy !== null}
            onClick={() => {
              setUpiId(pay.upiId ?? "");
              setNote(pay.note ?? "");
            }}
          >
            Reset
          </button>
          <button type="submit" className={btnPrimary} disabled={busy !== null}>
            {busy === "details" ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
