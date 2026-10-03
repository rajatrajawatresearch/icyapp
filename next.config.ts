import type { NextConfig } from "next";

// The app's first address said "icyapp"; it is now "bazzzar". Staff pages on
// the old address move to the new one. Customer pages (/u/…) are left out:
// they have their own address and send themselves there (lib/device.ts).
const OLD_HOST = "icyapp.vercel.app";
const APP_ORIGIN = "https://bazzzar.vercel.app";
const STAFF_PATHS = ["/", "/admin/:path*", "/superadmin/:path*", "/delivery/:path*", "/a/:path*"];

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi load the dev server (e.g. http://<LAN-IP>:3210/u/<token>).
  allowedDevOrigins: ["192.168.0.2", "192.168.0.3", "*.local"],
  poweredByHeader: false,

  async redirects() {
    return STAFF_PATHS.map((source) => ({
      source,
      has: [{ type: "host" as const, value: OLD_HOST }],
      destination: `${APP_ORIGIN}${source === "/" ? "/" : source}`,
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
