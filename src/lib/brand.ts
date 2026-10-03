// The product's name and the few brand values needed where CSS variables
// can't reach (web manifest, push notifications). Change the name here only.

export const APP_NAME = "Bazzzar";
export const APP_TAGLINE = "Orders, payments and deliveries for your store.";

/** Mirrors the dark --surface and light --page in globals.css (manifests can't read CSS). */
export const MANIFEST_COLORS = {
  theme: "#1c1c1e",
  background: "#f4f4f2",
} as const;

export const ICONS = {
  svg: "/brand/icon.svg",
  /** The cube alone, for coloured backgrounds. */
  cube: "/brand/cube.svg",
  png192: "/icons/icon-192.png",
  png512: "/icons/icon-512.png",
  maskable512: "/icons/maskable-512.png",
  apple: "/icons/apple-touch-icon.png",
  favicon: "/icons/favicon-48.png",
  badge: "/icons/badge-96.png",
} as const;
