// Shared by the pre-paint script (layout.tsx) and the ThemePicker component.
// Colours live in globals.css; this file only knows the accents' names.

export type ThemeMode = "light" | "dark" | "system";

/** Accent choices, named after ice-candy flavours. Ids match [data-accent] in globals.css. */
export const ACCENTS = [
  { id: "blue", label: "Ice" },
  { id: "green", label: "Pista" },
  { id: "purple", label: "Kala khatta" },
  { id: "pink", label: "Rose" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "blue";

export const THEME_STORAGE_KEY = "mm-theme";
export const ACCENT_STORAGE_KEY = "mm-accent";

/**
 * Inline script run in <head> before first paint so there is no flash of the
 * wrong theme. Kept dependency-free and wrapped in try/catch (storage can throw).
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";
var dark=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
d.dataset.theme=dark?"dark":"light";
d.dataset.accent=localStorage.getItem("${ACCENT_STORAGE_KEY}")||"${DEFAULT_ACCENT}";
}catch(e){document.documentElement.dataset.theme="light";}})();`;
