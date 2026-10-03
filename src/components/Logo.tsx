"use client";

import { useState } from "react";
import { APP_NAME, ICONS } from "@/lib/brand";

/**
 * The diamond mark. One SVG (public/brand/icon.svg) is the source for every
 * size. With `refresh`, tapping it reloads the app, the way pulling down does
 * in a native one.
 */
export function Logo({
  className = "h-10 w-10",
  refresh = false,
}: {
  className?: string;
  refresh?: boolean;
}) {
  const [reloading, setReloading] = useState(false);
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing for next/image to optimise
    <img
      src={ICONS.svg}
      alt=""
      draggable={false}
      className={`shrink-0 select-none ${className} ${reloading ? "animate-spin" : ""}`}
    />
  );
  if (!refresh) return mark;
  return (
    <button
      type="button"
      aria-label="Refresh"
      title="Refresh"
      className="shrink-0 rounded-xl transition active:scale-90"
      onClick={() => {
        setReloading(true);
        window.location.reload();
      }}
    >
      {mark}
    </button>
  );
}

/** Mark + name, for headers. */
export function Brand({ sub, refresh }: { sub?: string; refresh?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Logo refresh={refresh} />
      <div className="min-w-0">
        <p className="truncate text-[17px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
          {APP_NAME}
        </p>
        {sub && <p className="truncate text-xs text-ink-3">{sub}</p>}
      </div>
    </div>
  );
}
