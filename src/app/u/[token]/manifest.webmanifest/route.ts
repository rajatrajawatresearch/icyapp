import { resolveCustomer } from "@/lib/customer";
import { APP_NAME } from "@/lib/brand";
import { manifestResponse } from "@/lib/pwa";

/** Per-customer app — the installed icon always opens their own private link. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!(await resolveCustomer(token)))
    return new Response("Not found", { status: 404 });
  return manifestResponse({
    id: `/u/${token}`,
    name: APP_NAME,
    shortName: APP_NAME,
    startUrl: `/u/${token}`,
    scope: `/u/${token}`,
  });
}
