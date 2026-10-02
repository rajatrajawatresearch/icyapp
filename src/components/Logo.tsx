import { APP_NAME, ICONS } from "@/lib/brand";

/** The ice-cube mark. One SVG (public/brand/icon.svg) is the source for every size. */
export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing for next/image to optimise
    <img
      src={ICONS.svg}
      alt=""
      draggable={false}
      className={`shrink-0 select-none ${className}`}
    />
  );
}

/** Mark + name, for headers. */
export function Brand({ sub }: { sub?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Logo />
      <div className="min-w-0">
        <p className="truncate text-[17px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
          {APP_NAME}
        </p>
        {sub && <p className="truncate text-xs text-ink-3">{sub}</p>}
      </div>
    </div>
  );
}
