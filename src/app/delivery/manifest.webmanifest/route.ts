import { manifestResponse } from "@/lib/pwa";

/** Delivery partner app — opens straight to their assigned orders. */
export function GET() {
  return manifestResponse({
    id: "/delivery",
    name: "Mini Marketplace — Delivery",
    shortName: "Delivery",
    startUrl: "/delivery",
    scope: "/",
  });
}
