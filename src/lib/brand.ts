// The product's name and the few brand values needed where CSS variables
// can't reach (web manifest, push notifications). Change the name here only.

export const APP_NAME = "The Zone";
export const APP_TAGLINE = "Orders, payments and deliveries for your store.";

/** Mirrors the dark --surface and light --page in globals.css (manifests can't read CSS). */
export const MANIFEST_COLORS = {
  theme: "#1c1c1e",
  background: "#f4f4f2",
} as const;

/**
 * Icons are cached for a day. Raise this whenever the artwork changes, so
 * every device fetches the new one at once instead of showing the old logo.
 */
const ICON_VERSION = "9";
const v = (path: string) => `${path}?v=${ICON_VERSION}`;

export const ICONS = {
  svg: v("/brand/icon.svg"),
  /** The diamond alone, for coloured backgrounds. */
  cube: v("/brand/cube.svg"),
  png192: v("/icons/icon-192.png"),
  png512: v("/icons/icon-512.png"),
  maskable512: v("/icons/maskable-512.png"),
  apple: v("/icons/apple-touch-icon.png"),
  favicon: v("/icons/favicon-48.png"),
  badge: v("/icons/badge-96.png"),
} as const;
