"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, X } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { errorMessage } from "@/lib/client-api";
import { enablePush, getPushState, type PushState } from "@/lib/push-client";
import { btnPrimary } from "./ui";

const LATER_KEY = "push-prompt-later";
const LATER_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Asks, in plain sight, to turn on phone notifications for this device. A
 * browser only shows its permission question after a tap, so nothing reaches
 * the phone until someone presses this. It disappears once notifications are
 * on, and explains what to do when the phone can't do it yet.
 */
export function PushPrompt({
  audience,
  token,
  className = "",
}: {
  audience: "staff" | "customer";
  /** The customer's link token; staff are known by their session. */
  token?: string;
  className?: string;
}) {
  const [state, setState] = useState<PushState | null>(null);
  const [later, setLater] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(LATER_KEY) ?? 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read storage after mount
      if (Date.now() - at < LATER_MS) setLater(true);
    } catch {}
    getPushState(token)
      .then(setState)
      .catch(() => setState("unsupported"));
  }, [token]);

  if (later || !state) return null;
  if (state === "on" || state === "unsupported" || state === "unavailable")
    return null;

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      setState(await enablePush(token));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function notNow() {
    setLater(true);
    try {
      localStorage.setItem(LATER_KEY, String(Date.now()));
    } catch {}
  }

  const Icon = state === "blocked" ? BellOff : BellRing;
  const text =
    state === "off"
      ? audience === "staff"
        ? "Get order alerts on this phone"
        : "Get order updates on this phone"
      : state === "needs-install"
        ? `iPhone: tap Share, “Add to Home Screen”, then open ${APP_NAME} from there for alerts`
        : `Alerts are blocked for ${APP_NAME}. Allow them in browser settings.`;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 ${className}`}
    >
      <Icon className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-semibold text-ink">
        {text}
        {error && <span className="block font-normal text-danger-ink">{error}</span>}
      </p>
      {state === "off" && (
        <button
          type="button"
          className={`${btnPrimary} shrink-0 px-3.5 py-2`}
          onClick={turnOn}
          disabled={busy}
        >
          {busy ? "…" : "Turn on"}
        </button>
      )}
      <button
        type="button"
        aria-label="Later"
        onClick={notNow}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-muted"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
