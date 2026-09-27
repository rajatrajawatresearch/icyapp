import { manifestResponse } from "@/lib/pwa";

/** Store staff app — opens straight to the live orders screen. */
export function GET() {
  return manifestResponse({
    id: "/admin",
    name: "Mini Marketplace — Store Admin",
    shortName: "Store Admin",
    startUrl: "/admin/orders",
    scope: "/",
  });
}
