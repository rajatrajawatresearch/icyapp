import { NextResponse } from "next/server";
import { homePathFor, setSessionCookie } from "@/lib/auth";
import { resolveAccessLink } from "@/lib/access-link";

/**
 * GET /a/:token — a staff member's private sign-in link. Signs them in and
 * sends them to their own panel; an unknown, refreshed or deactivated link
 * lands on the login page with an explanation.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = await resolveAccessLink(token);

  const res = NextResponse.redirect(
    new URL(
      admin ? homePathFor(admin.role) : "/admin/login?link=invalid",
      req.url,
    ),
  );
  // The URL is a credential: keep it out of caches and Referer headers.
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Robots-Tag", "noindex");
  if (admin) await setSessionCookie(res, admin);
  return res;
}
