import { APP_NAME } from "@/lib/brand";
import { manifestResponse } from "@/lib/pwa";

/** Store staff app — opens straight to the live orders screen. */
export function GET() {
  return manifestResponse({
    id: "/admin",
    name: `${APP_NAME} Store Admin`,
    shortName: `${APP_NAME} Admin`,
    startUrl: "/admin/orders",
    scope: "/",
  });
}
