"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing } from "lucide-react";
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
import { chime } from "@/lib/sound";
import { useNow } from "./useNow";
import { btnPrimary, iconBtn } from "./ui";

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
  align = "right",
}: {
  endpoint: string;
  href: string;
  pushToken?: string;
  align?: "left" | "right";
}) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [open, setOpen] = useState(false);
  const poll = useMemo(() => createPoller<Feed>(endpoint), [endpoint]);
  const lastUnread = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const now = useNow(30_000);

  const load = useCallback(async () => {
    try {
      const result = await poll();
      if (!result.changed) return;
      if (lastUnread.current !== null && result.data.unread > lastUnread.current)
        chime();
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
    // An existing push subscription follows whoever is using this device now.
    getPushState(pushToken).catch(() => {});
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
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
    if (opening && feed?.unread) {
      // Seen: clear the badge now; the dots stay until the list is reloaded.
      lastUnread.current = 0;
      setFeed({ ...feed, unread: 0 });
      api(endpoint, { method: "POST" }).catch(() => {});
    }
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
          <p className="px-4 pt-4 pb-2 text-base font-bold text-ink">
            Notifications
          </p>
          {feed === null ? (
            <p className="px-4 pb-4 text-sm text-ink-3">Loading…</p>
          ) : feed.items.length === 0 ? (
            <p className="px-4 pb-5 text-sm text-ink-3">
              Nothing yet. Order updates will show up here.
            </p>
          ) : (
            <ul className="max-h-[55dvh] divide-y divide-line overflow-y-auto">
              {feed.items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-subtle"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.read ? "bg-transparent" : "bg-brand-600"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">
                        {n.title}
                      </span>
                      <span className="block text-sm text-ink-2">{n.body}</span>
                      <span className="mt-0.5 block text-xs text-ink-3">
                        {timeAgo(n.createdAt, now)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <PushToggle token={pushToken} />
        </div>
      )}
    </div>
  );
}

/** Opt this device in or out of push notifications (alerts with the app closed). */
function PushToggle({ token }: { token?: string }) {
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
    <div className="border-t border-line bg-subtle px-4 py-3 text-sm">
      {state === "on" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-2">Phone notifications are on for this device.</p>
          <button
            type="button"
            disabled={busy}
            className="shrink-0 font-semibold text-brand-700"
            onClick={() =>
              run(async () => {
                await disablePush();
                return "off";
              })
            }
          >
            Turn off
          </button>
        </div>
      )}
      {state === "off" && (
        <>
          <button
            type="button"
            disabled={busy}
            className={`${btnPrimary} w-full`}
            onClick={() => run(() => enablePush(token))}
          >
            {busy ? "Turning on…" : "Turn on phone notifications"}
          </button>
          <p className="mt-2 text-xs text-ink-3">
            Get alerts on this device even when the app is closed.
          </p>
        </>
      )}
      {state === "blocked" && (
        <p className="text-ink-2">
          Notifications are blocked for this site. Allow them in your browser
          settings, then reopen this panel.
        </p>
      )}
      {state === "unsupported" && (
        <p className="text-ink-2">
          To get alerts with the app closed, install it first (browser menu,
          then “Add to Home Screen”) and open it from there.
        </p>
      )}
      {error && <p className="mt-2 text-danger-ink">{error}</p>}
    </div>
  );
}
