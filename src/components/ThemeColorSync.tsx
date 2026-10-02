"use client";

import { useEffect } from "react";

/**
 * Keeps the browser / installed-app status bar the same colour as the app's
 * top bar. The colour is read from the theme tokens, so it follows light and
 * dark without being written down a second time.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const color = getComputedStyle(root).getPropertyValue("--surface").trim();
      if (!color) return;
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = color;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return null;
}
