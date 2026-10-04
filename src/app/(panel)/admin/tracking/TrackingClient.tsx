"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { createPoller, errorMessage } from "@/lib/client-api";
import { formatTime, timeAgo } from "@/lib/format";
import { googleMapsUrl } from "@/lib/maps";
import { formatDuration, type RiderTrack } from "@/lib/tracking";
import { TrackingMap } from "@/components/map/TrackingMap";
import { ListSkeleton } from "@/components/Skeleton";
import { useNow } from "@/components/useNow";
import { btnSecondary, card, emptyState, pageTitle, pill } from "@/components/ui";

const REFRESH_MS = 10_000;
/** A partner whose last position is newer than this is "live". */
const LIVE_MS = 90_000;

const ms = (iso: string) => new Date(iso).getTime();

export function TrackingClient() {
  const [riders, setRiders] = useState<RiderTrack[] | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const poll = useMemo(
    () => createPoller<{ riders: RiderTrack[] }>("/api/admin/tracking"),
    [],
  );
  const now = useNow(5000);

  const load = useCallback(async () => {
    try {
      const result = await poll();
      setError(null);
      if (result.changed) setRiders(result.data.riders);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [poll]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first fetch, then polling
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div>
      <h1 className={pageTitle}>Live tracking</h1>
      {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}

      {riders === null ? (
        <ListSkeleton rows={2} className="h-40" />
      ) : riders.length === 0 ? (
        <p className={`${emptyState} mt-5`}>No delivery partners yet.</p>
      ) : (
        <>
          <TrackingMap
            riders={riders}
            focus={focus}
            className="mt-4 h-80 sm:h-[26rem]"
          />
          <ul className="mt-4 space-y-3">
            {riders.map((r) => (
              <RiderCard
                key={r.id}
                rider={r}
                now={now}
                focused={focus === r.id}
                onFocus={() => setFocus(focus === r.id ? null : r.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RiderCard({
  rider: r,
  now,
  focused,
  onFocus,
}: {
  rider: RiderTrack;
  now: number;
  focused: boolean;
  onFocus: () => void;
}) {
  const live = r.last !== null && now - ms(r.last.at) < LIVE_MS;
  // Still standing where the last stop began: the stop is going on now.
  const lastStop = r.stops.at(-1);
  const stoppedNow =
    live && lastStop && r.last && ms(lastStop.to) >= ms(r.last.at) - 1000
      ? lastStop
      : null;
  const s = r.summary;

  return (
    <li className={`${card} p-4 ${focused ? "border-brand-400 ring-2 ring-brand-200" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg leading-tight font-extrabold tracking-tight text-ink">
            {r.name}
          </p>
          {stoppedNow && (
            <p className="mt-0.5 text-sm font-semibold text-warning-ink">
              Stopped for {formatDuration(now - ms(stoppedNow.from))}
            </p>
          )}
        </div>
        <span
          className={`${pill} ${
            live
              ? "bg-success-soft text-success-ink"
              : r.last
                ? "bg-warning-soft text-warning-ink"
                : "bg-muted text-ink-3"
          }`}
        >
          {live
            ? "Live"
            : r.last
              ? `Last seen ${timeAgo(r.last.at, now)}`
              : "No location yet"}
        </span>
      </div>

      {r.deliveries.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {r.deliveries.map((d) => {
            const from = d.dispatchedAt ? ms(d.dispatchedAt) : null;
            const took =
              from === null
                ? null
                : (d.delivered && d.deliveredAt ? ms(d.deliveredAt) : now) - from;
            return (
              <li key={d.id} className="rounded-xl bg-subtle px-3 py-2">
                <p className="font-semibold text-ink">
                  #{d.number} {d.customerName}
                  <span
                    className={`${pill} ml-2 ${
                      d.delivered
                        ? "bg-muted text-ink-2"
                        : "bg-info-soft text-info-ink"
                    }`}
                  >
                    {d.delivered ? "Delivered" : "On the way"}
                  </span>
                </p>
                <p className="text-ink-2" suppressHydrationWarning>
                  {d.dispatchedAt && `Left ${formatTime(d.dispatchedAt)}`}
                  {d.delivered && d.deliveredAt && `, delivered ${formatTime(d.deliveredAt)}`}
                  {took !== null && `, ${formatDuration(took)}`}
                  {d.waitingMs !== null &&
                    d.waitingMs > 0 &&
                    `, waited ${formatDuration(d.waitingMs)} at the customer`}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {r.last && (
        <p className="mt-3 text-sm text-ink-2">
          Last 12 hours: {(s.distanceM / 1000).toFixed(1)} km, moving{" "}
          {formatDuration(s.movingMs)}, stopped {formatDuration(s.stoppedMs)}
          {s.unknownMs > 0 && `, no signal ${formatDuration(s.unknownMs)}`}
        </p>
      )}

      {r.stops.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {r.stops.map((stop) => (
            <li key={stop.from}>
              <a
                href={googleMapsUrl(stop)}
                target="_blank"
                rel="noreferrer"
                className={`${pill} bg-warning-soft text-warning-ink`}
                suppressHydrationWarning
              >
                <MapPin className="h-3 w-3" aria-hidden />
                {formatTime(stop.from)}, {formatDuration(ms(stop.to) - ms(stop.from))}
              </a>
            </li>
          ))}
        </ul>
      )}

      {r.last && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={onFocus}>
            <Crosshair className="h-4 w-4" aria-hidden />
            {focused ? "Show everyone" : "Show on map"}
          </button>
          <a
            href={googleMapsUrl(r.last)}
            target="_blank"
            rel="noreferrer"
            className={btnSecondary}
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Open in Maps
          </a>
        </div>
      )}
    </li>
  );
}
