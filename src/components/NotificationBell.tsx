"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Bell, BellRing, X } from "lucide-react";
import type { NotificationDTO } from "@/lib/notify";
import { NOTIFICATION_POLL_MS } from "@/lib/constants";
import { api, createPoller, errorMessage } from "@/lib/client-api";
import { timeAgo } from "@/lib/format";
import {
  disablePush,
  enablePush,
  getPushState,
  type PushState,
} from "@/lib/push-client";
import { chime, unlockSound } from "@/lib/sound";
import { useNow } from "./useNow";
import { iconBtn } from "./ui";

type Feed = { unread: number; items: NotificationDTO[] };

/**
 * Bell with an unread count and a list. `endpoint` is the person's own feed
 * (staff or customer), `href` is where a notification takes them, and
 * `pushToken` is set for customers so their device can be subscribed.
 */
export function NotificationBell({
  endpoint,
  href,
  pushToken,
  installable = true,
  align = "right",
}: {
  endpoint: string;
  href: string;
  pushToken?: string;
  /** False where the app must stay in the browser (customers, delivery partners). */
  installable?: boolean;
  align?: "left" | "right";
}) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [open, setOpen] = useState(false);
  /** The notification that just arrived, shown across the top for a few seconds. */
  const [toast, setToast] = useState<NotificationDTO | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const poll = useMemo(() => createPoller<Feed>(endpoint), [endpoint]);
  const lastUnread = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const now = useNow(30_000);

  const load = useCallback(async () => {
    try {
      const result = await poll();
      if (!result.changed) return;
      // Something new while the app is open: ring, and show it on screen.
      if (lastUnread.current !== null && result.data.unread > lastUnread.current) {
        chime();
        setToast(result.data.items[0] ?? null);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 7000);
      }
      lastUnread.current = result.data.unread;
      setFeed(result.data);
    } catch {
      // Keep showing the last list; the next poll tries again.
    }
  }, [poll]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first fetch, then polling
    load();
    const tick = () => document.visibilityState === "visible" && load();
    const timer = setInterval(tick, NOTIFICATION_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    // A push that reaches the phone while the app is open rings the bell at
    // once (the service worker passes it on) instead of at the next check.
    const onPush = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === "push") load();
    };
    navigator.serviceWorker?.addEventListener("message", onPush);
    const lockSound = unlockSound();
    // An existing push subscription follows whoever is using this device now.
    getPushState(pushToken).catch(() => {});
    return () => {
      clearInterval(timer);
      clearTimeout(toastTimer.current);
      document.removeEventListener("visibilitychange", tick);
      navigator.serviceWorker?.removeEventListener("message", onPush);
      lockSound();
    };
  }, [load, pushToken]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const opening = !open;
    setOpen(opening);
    setToast(null);
    if (opening && feed?.unread) {
      // Seen: clear the badge now; the dots stay until the list is reloaded.
      lastUnread.current = 0;
      setFeed({ ...feed, unread: 0 });
      api(endpoint, { method: "POST" }).catch(() => {});
    }
  }

  function clearAll() {
    if (!feed) return;
    lastUnread.current = 0;
    setFeed({ unread: 0, items: [] });
    // Through the poller, so a check already under way can't bring them back.
    poll.during(() => api(endpoint, { method: "DELETE" })).catch(() => {});
  }

  const unread = feed?.unread ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={toggle}
        className={iconBtn}
      >
        {unread ? (
          <BellRing className="h-[18px] w-[18px] text-brand-700" aria-hidden />
        ) : (
          <Bell className="h-[18px] w-[18px]" aria-hidden />
        )}
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-on-solid">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`fixed inset-x-3 top-16 z-50 animate-pop overflow-hidden rounded-2xl border border-line bg-raised shadow-pop sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-96 ${
            align === "right" ? "sm:right-0" : "sm:left-0"
          }`}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1.5">
            <p className="text-sm font-bold text-ink">Notifications</p>
            {feed !== null && feed.items.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-sm font-semibold text-brand-700"
              >
                Clear
              </button>
            )}
          </div>
          {feed === null ? (
            <p className="px-4 pb-3 text-sm text-ink-3">Loading…</p>
          ) : feed.items.length === 0 ? (
            <p className="px-4 pb-3 text-sm text-ink-3">No notifications.</p>
          ) : (
            <ul className="max-h-[55dvh] divide-y divide-line overflow-y-auto">
              {feed.items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-baseline gap-2 px-4 py-2 hover:bg-subtle"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 -translate-y-0.5 rounded-full ${
                        n.read ? "bg-transparent" : "bg-brand-600"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="block truncate text-xs text-ink-3">
                          {n.body}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-4">
                      {timeAgo(n.createdAt, now)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <PushToggle token={pushToken} installable={installable} />
        </div>
      )}

      {/* In the page body, not the header: the header's blur would trap a fixed box. */}
      {toast &&
        createPortal(
          <div
            role="status"
            className="fixed inset-x-3 top-3 z-60 flex animate-pop items-start gap-3 rounded-2xl border border-brand-200 bg-raised p-3.5 shadow-pop sm:inset-x-auto sm:right-4 sm:w-96"
          >
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
            <Link
              href={href}
              onClick={() => setToast(null)}
              className="min-w-0 flex-1"
            >
              <span className="block truncate text-sm font-bold text-ink">
                {toast.title}
              </span>
              {toast.body && (
                <span className="block truncate text-xs text-ink-2">{toast.body}</span>
              )}
            </Link>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToast(null)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Opt this device in or out of push notifications (alerts with the app closed). */
function PushToggle({
  token,
  installable,
}: {
  token?: string;
  installable: boolean;
}) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPushState(token)
      .then(setState)
      .catch(() => setState("unsupported"));
  }, [token]);

  async function run(action: () => Promise<PushState>) {
    setBusy(true);
    setError(null);
    try {
      setState(await action());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (state === null || state === "unavailable") return null;

  return (
    <div className="border-t border-line bg-subtle px-4 py-2.5 text-sm">
      {(state === "on" || state === "off") && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-2">
            Phone alerts {state === "on" ? "on" : "off"}
          </p>
          <button
            type="button"
            disabled={busy}
            className="shrink-0 font-semibold text-brand-700"
            onClick={() =>
              run(
                state === "on"
                  ? async () => {
                      await disablePush();
                      return "off";
                    }
                  : () => enablePush(token),
              )
            }
          >
            {busy ? "…" : state === "on" ? "Turn off" : "Turn on"}
          </button>
        </div>
      )}
      {state === "blocked" && (
        <p className="text-ink-2">Alerts are blocked. Allow them in browser settings.</p>
      )}
      {state === "needs-install" && (
        <p className="text-ink-2">
          {installable
            ? "iPhone: Share, “Add to Home Screen”, then open the app from there."
            : "Phone alerts don't work on iPhone here. The bell still rings in the app."}
        </p>
      )}
      {state === "unsupported" && (
        <p className="text-ink-2">This browser can&apos;t show phone alerts.</p>
      )}
      {error && <p className="mt-2 text-danger-ink">{error}</p>}
    </div>
  );
}
