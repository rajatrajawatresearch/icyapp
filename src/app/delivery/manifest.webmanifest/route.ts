import { APP_NAME } from "@/lib/brand";
import { manifestResponse } from "@/lib/pwa";

/** Delivery partner app — opens straight to their assigned orders. */
export function GET() {
  return manifestResponse({
    id: "/delivery",
    name: `${APP_NAME} Delivery`,
    shortName: `${APP_NAME} Delivery`,
    startUrl: "/delivery",
    scope: "/",
  });
}
