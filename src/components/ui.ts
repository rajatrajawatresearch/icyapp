// Shared Tailwind class recipes so pages stay visually consistent. Radii
// follow the hierarchy: controls 12px, cards 16px, sheets 24px, chips round.

export const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";
export const btnPrimary = `${btn} bg-brand-600 text-on-solid shadow-brand hover:bg-brand-700`;
export const btnSecondary = `${btn} border border-line-strong bg-surface text-ink hover:bg-subtle`;
export const btnDanger = `${btn} border border-danger-line bg-surface text-danger-ink hover:bg-danger-soft`;
export const btnDangerSolid = `${btn} bg-danger text-on-solid hover:bg-danger-strong`;
export const btnSuccess = `${btn} bg-success text-on-solid hover:bg-success-strong`;

/** Square icon-only button (theme, bell, account). */
export const iconBtn =
  "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:bg-subtle hover:text-ink active:scale-[0.96]";

/** A text field / select without a width — add w-full, w-24, w-auto… */
export const field =
  "rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink shadow-xs transition placeholder:text-ink-4 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 sm:text-sm";
export const input = `w-full ${field}`;
export const label = "mb-1.5 block text-[13px] font-semibold text-ink-2";

export const card = "rounded-2xl border border-line bg-surface shadow-card";
export const pageTitle =
  "text-[1.7rem] leading-tight font-extrabold tracking-[-0.03em] text-ink";
export const pageLead = "mt-1 text-sm text-ink-3";

/** Small rounded status pill; add a colour pair (e.g. bg-success-soft text-success-ink). */
export const pill =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";

/** Dashed placeholder for "nothing here yet" states. */
export const emptyState =
  "rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center text-sm text-ink-3";

/** Dimmed backdrop + bottom sheet (phone) / centred dialog (desktop). */
export const scrim =
  "fixed inset-0 z-50 flex items-end justify-center bg-scrim animate-fade sm:items-center sm:p-4";
export const sheet =
  "w-full max-w-lg rounded-t-3xl bg-raised shadow-pop animate-sheet sm:rounded-3xl";
