import { NextResponse } from "next/server";

/**
 * Web app manifests. Customers and admins install different "apps": a
 * customer's start_url must be their own private link, otherwise the
 * installed app would open a page that doesn't know who they are.
 */
export function manifestResponse(opts: {
  id: string;
  name: string;
  shortName: string;
  startUrl: string;
  scope: string;
}) {
  const manifest = {
    id: opts.id,
    name: opts.name,
    short_name: opts.shortName,
    start_url: opts.startUrl,
    scope: opts.scope,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f7fb",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512?maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache",
    },
  });
}
