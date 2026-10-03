import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LINK_ORIGIN } from "./link-origin";

// A customer's link opens on one device only. A browser can't see a MAC
// address, and a phone's IP address changes all day, so the "device" is a
// random secret kept in a cookie: the first browser to open the link gets the
// secret, the customer row stores its hash, and every later request has to
// present the same cookie.

export const DEVICE_COOKIE = "mm_device";
/** Browsers cap cookies at 400 days; the app renews it while it is in use. */
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export const DEVICE_LOCKED_MESSAGE =
  "This link is already in use on another device. Ask the store to reset it.";

export async function readDeviceId(): Promise<string | null> {
  const value = (await cookies()).get(DEVICE_COOKIE)?.value;
  return value && /^[A-Za-z0-9]{32}$/.test(value) ? value : null;
}

export async function writeDeviceCookie(deviceId: string) {
  (await cookies()).set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

/**
 * Customer pages live on one address (LINK_ORIGIN). The device cookie belongs
 * to that address, so a link opened on any other address of the app is sent
 * there first; otherwise the same phone would look like a second device.
 */
export async function redirectToLinkHost(path: string) {
  if (!LINK_ORIGIN) return;
  const host = (await headers()).get("host");
  if (host && host !== new URL(LINK_ORIGIN).host) redirect(LINK_ORIGIN + path);
}
