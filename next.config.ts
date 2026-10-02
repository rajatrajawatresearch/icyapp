import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi load the dev server (e.g. http://<LAN-IP>:3210/u/<token>).
  allowedDevOrigins: ["192.168.0.2", "192.168.0.3", "*.local"],
  poweredByHeader: false,

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
