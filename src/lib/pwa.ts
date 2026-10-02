import { NextResponse } from "next/server";
import { ICONS, MANIFEST_COLORS } from "./brand";

/**
 * Web app manifests. Customers, store staff and riders install different
 * "apps": a customer's start_url must be their own private link, otherwise
 * the installed app would open a page that doesn't know who they are.
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
    background_color: MANIFEST_COLORS.background,
    theme_color: MANIFEST_COLORS.theme,
    icons: [
      { src: ICONS.png192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: ICONS.png512, sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: ICONS.maskable512,
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
