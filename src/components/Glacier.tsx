import { APP_NAME, ICONS } from "@/lib/brand";

/**
 * The brand panel: a block of ice on a glacier gradient. Used on the sign-in
 * screen and the landing page — the one place the design is allowed to be loud.
 */
export function Glacier({
  headline,
  children,
  className = "",
}: {
  headline: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative isolate flex flex-col overflow-hidden bg-linear-to-br from-hero-1 via-hero-2 to-hero-3 text-on-solid ${className}`}
    >
      {/* Shards of ice catching the light. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-20 h-80 w-80 rotate-12 rounded-[3rem] bg-on-solid/10" />
        <div className="absolute top-1/3 -right-24 h-72 w-72 -rotate-[18deg] rounded-[3rem] bg-on-solid/[0.07]" />
        <div className="absolute -bottom-28 left-1/4 h-64 w-96 rotate-6 rounded-[3rem] bg-on-solid/[0.06]" />
      </div>

      <p className="text-xl font-extrabold tracking-[-0.03em]">{APP_NAME}</p>

      <div className="flex flex-1 items-center justify-center py-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
        <img
          src={ICONS.cube}
          alt=""
          draggable={false}
          className="h-40 w-40 animate-float select-none sm:h-56 sm:w-56 lg:h-80 lg:w-80"
        />
      </div>

      <div className="max-w-md">
        <h2 className="text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.035em] text-balance lg:text-[2.6rem]">
          {headline}
        </h2>
        {children}
      </div>
    </section>
  );
}
