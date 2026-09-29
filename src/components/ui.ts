// Shared Tailwind class recipes so pages stay visually consistent.

export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary = `${btn} bg-brand-600 text-white hover:bg-brand-700`;
export const btnSecondary = `${btn} border border-gray-300 bg-surface text-gray-800 hover:bg-gray-50`;
export const btnDanger = `${btn} border border-red-200 bg-surface text-red-600 hover:bg-red-50`;
export const btnSuccess = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;
export const input =
  "w-full rounded-xl border border-gray-300 bg-surface px-3 py-2 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
export const label = "mb-1 block text-xs font-medium text-gray-600";
export const card =
  "rounded-2xl border border-gray-200/80 bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.04),0_1px_2px_rgb(0_0_0/0.03)]";
export const pageTitle = "text-2xl font-bold tracking-tight text-gray-900";
