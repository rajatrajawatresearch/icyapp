import type { NextConfig } from "next";

// The app has one address, set in NEXT_PUBLIC_LINK_ORIGIN (a neutral name
// that says nothing about the app or its host). Staff pages opened on any
// other address forward to it. Customer pages (/u/…) are left out: they send
// themselves there (lib/device.ts). Unset (local dev) means no forwarding.
const LINK_ORIGIN = (process.env.NEXT_PUBLIC_LINK_ORIGIN ?? "").replace(/\/+$/, "");
const STAFF_PATHS = ["/", "/admin/:path*", "/superadmin/:path*", "/delivery/:path*", "/a/:path*"];

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi load the dev server (e.g. http://<LAN-IP>:3210/u/<token>).
  allowedDevOrigins: ["192.168.0.2", "192.168.0.3", "*.local"],
  poweredByHeader: false,

  async redirects() {
    if (!LINK_ORIGIN) return [];
    return STAFF_PATHS.map((source) => ({
      source,
      missing: [{ type: "host" as const, value: new URL(LINK_ORIGIN).host }],
      destination: `${LINK_ORIGIN}${source === "/" ? "/" : source}`,
      // Temporary on purpose: browsers cache a permanent redirect for good.
      permanent: false,
    }));
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Never framed: the admin panel must not be embeddable in another site.
          { key: "X-Frame-Options", value: "DENY" },
          // Customer pages tighten this further to no-referrer (their URL is a credential).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Always re-checked, so a new service worker reaches phones on the next visit.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        // Logo and app icons: served from cache instead of re-checked on every page.
        source: "/:dir(icons|brand)/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
