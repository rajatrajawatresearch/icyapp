"use client";

import { useEffect } from "react";

/** Registers the service worker (production only, so it never fights dev HMR). */
export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: the site works without it, it just can't show the offline page.
    });
  }, []);
  return null;
}
