// Shared by the pre-paint script (layout.tsx) and the ThemePicker component.

export type ThemeMode = "light" | "dark" | "system";

export const ACCENTS = [
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "green", label: "Green", color: "#059669" },
  { id: "purple", label: "Purple", color: "#7c3aed" },
  { id: "pink", label: "Pink", color: "#db2777" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];

export const THEME_STORAGE_KEY = "mm-theme";
export const ACCENT_STORAGE_KEY = "mm-accent";

/** Header/status-bar colours per mode (match --surface in globals.css). */
export const SURFACE_COLOR = { light: "#ffffff", dark: "#131b2b" } as const;

/**
 * Inline script run in <head> before first paint so there is no flash of the
 * wrong theme. Kept dependency-free and wrapped in try/catch (storage can throw).
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";
var dark=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
d.dataset.theme=dark?"dark":"light";
d.dataset.accent=localStorage.getItem("${ACCENT_STORAGE_KEY}")||"blue";
}catch(e){document.documentElement.dataset.theme="light";}})();`;
