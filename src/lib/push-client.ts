// Browser side of Web Push: asks permission, subscribes this device and
// tells the server who owns the subscription.

import { api } from "./client-api";

export type PushState =
  | "unsupported" // this browser can't do push at all
  | "needs-install" // iPhone / iPad: push only works once the app is on the Home Screen
  | "unavailable" // the server has no push keys configured
  | "blocked" // the user denied notifications in the browser
  | "off"
  | "on";

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac, but a Mac has no touch screen.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/** Why push can't work here: an iPhone that hasn't installed the app, or a browser without it. */
function missing(): PushState {
  return isIos() && !isInstalled() ? "needs-install" : "unsupported";
}

async function registration() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;
  // First visit: the service worker is still installing. Give it a moment
  // instead of reporting "unsupported" (there is none at all in local dev).
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
  ]);
}

function keyBytes(base64Url: string) {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function register(sub: PushSubscription, token?: string) {
  await api("/api/push", {
    method: "POST",
    json: { token, subscription: sub.toJSON() },
  });
}

/** Subscribes this device. Notification permission must already be granted. */
async function subscribe(
  reg: ServiceWorkerRegistration,
  token?: string,
): Promise<PushState> {
  const { publicKey } = await api<{ publicKey: string | null }>("/api/push");
  if (!publicKey) return "unavailable";
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }));
  await register(sub, token);
  return "on";
}

/**
 * Current state for this device. If the browser is already subscribed, the
 * subscription is re-sent so it follows whoever is signed in now (shared
 * phones, a refreshed link, a new password). If notifications are allowed but
 * the subscription is gone (it expires, browsers drop it), it is made again
 * without asking.
 */
export async function getPushState(token?: string): Promise<PushState> {
  const reg = await registration();
  if (!reg) return missing();
  if (Notification.permission === "denied") return "blocked";
  try {
    const sub = await reg.pushManager.getSubscription();
    if (!sub)
      return Notification.permission === "granted"
        ? await subscribe(reg, token)
        : "off";
    await register(sub, token);
    return "on";
  } catch {
    return "off";
  }
}

/** Asks for permission (must be called from a tap) and subscribes this device. */
export async function enablePush(token?: string): Promise<PushState> {
  const reg = await registration();
  if (!reg) return missing();
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return permission === "denied" ? "blocked" : "off";
  return subscribe(reg, token);
}

/** Stops push on this device (also called when signing out). */
export async function disablePush() {
  try {
    const sub = await (await registration())?.pushManager.getSubscription();
    if (!sub) return;
    await api("/api/push", { method: "DELETE", json: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  } catch {
    // Best effort — the server also drops subscriptions that stop responding.
  }
}
