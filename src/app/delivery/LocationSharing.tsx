"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, MapPinOff } from "lucide-react";
import { metresBetween } from "@/lib/tracking";

type Fix = "asking" | "on" | "denied" | "unsupported";

/** Send at least this often while moving or standing… */
const SEND_EVERY_MS = 15_000;
/** …and sooner when the phone has moved this far. */
const SEND_AFTER_M = 40;

/**
 * While this partner has an order out for delivery, sends the phone's
 * position to the store. A web page can only do this while it is open on the
 * screen, so the screen is kept awake; the server keeps nothing outside a
 * delivery.
 */
export function LocationSharing({ active }: { active: boolean }) {
  const [fix, setFix] = useState<Fix>("asking");
  const sent = useRef<{ lat: number; lng: number; at: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!("geolocation" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- only known in the browser
      setFix("unsupported");
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        setFix("on");
        const here = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          at: Date.now(),
        };
        const last = sent.current;
        if (
          last &&
          here.at - last.at < SEND_EVERY_MS &&
          metresBetween(last, here) < SEND_AFTER_M
        )
          return;
        sent.current = here;
        fetch("/api/delivery/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: here.lat,
            lng: here.lng,
            accuracy: pos.coords.accuracy,
          }),
          keepalive: true,
        }).catch(() => {
          // No signal for a moment: the next fix is sent instead.
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setFix("denied");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );

    // Keep the screen on: with the screen off the phone stops reporting.
    let lock: WakeLockSentinel | null = null;
    const keepAwake = async () => {
      try {
        if (document.visibilityState === "visible")
          lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // Low battery mode can refuse; tracking still runs while the screen is on.
      }
    };
    keepAwake();
    document.addEventListener("visibilitychange", keepAwake);
    return () => {
      navigator.geolocation.clearWatch(watch);
      document.removeEventListener("visibilitychange", keepAwake);
      lock?.release().catch(() => {});
    };
  }, [active]);

  if (!active) return null;
  const ok = fix === "on" || fix === "asking";
  const Icon = ok ? MapPin : MapPinOff;
  return (
    <p
      className={`mb-3 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
        ok ? "bg-info-soft text-info-ink" : "bg-danger-soft text-danger-ink"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {fix === "on" && "Location shared with the store. Keep this screen open."}
      {fix === "asking" && "Allow location so the store can follow this delivery."}
      {fix === "denied" &&
        "Location is blocked. Allow it for this app in your phone settings."}
      {fix === "unsupported" && "This phone can't share its location."}
    </p>
  );
}
