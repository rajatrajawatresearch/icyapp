"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Share } from "lucide-react";
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
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 ${className}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
      <div className="min-w-0 flex-1">
        {state === "off" && (
          <>
            <p className="text-sm font-bold text-ink">
              {audience === "staff"
                ? "Get every order on this phone"
                : "Get order updates on this phone"}
            </p>
            <p className="mt-0.5 text-sm text-ink-2">
              A notification with sound, even when {APP_NAME} is closed.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={btnPrimary}
                onClick={turnOn}
                disabled={busy}
              >
                {busy ? "Turning on…" : "Turn on notifications"}
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-ink-3"
                onClick={notNow}
              >
                Later
              </button>
            </div>
          </>
        )}
        {state === "needs-install" && (
          <>
            <p className="text-sm font-bold text-ink">
              To get notifications on this iPhone, add {APP_NAME} to your Home
              Screen
            </p>
            <p className="mt-1 text-sm text-ink-2">
              Tap the Share button{" "}
              <Share className="inline h-4 w-4 align-text-bottom" aria-label="Share" />
              , choose “Add to Home Screen”, then open {APP_NAME} from its new
              icon and turn notifications on there.
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-ink-3"
              onClick={notNow}
            >
              Later
            </button>
          </>
        )}
        {state === "blocked" && (
          <>
            <p className="text-sm font-bold text-ink">
              Notifications are blocked for {APP_NAME} on this device
            </p>
            <p className="mt-1 text-sm text-ink-2">
              Open your browser&apos;s site settings, allow notifications, then
              reopen the app.
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-ink-3"
              onClick={notNow}
            >
              Later
            </button>
          </>
        )}
        {error && <p className="mt-2 text-sm text-danger-ink">{error}</p>}
      </div>
    </div>
  );
}
