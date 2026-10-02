// Browser side of Web Push: asks permission, subscribes this device and
// tells the server who owns the subscription.

import { api } from "./client-api";

export type PushState =
  | "unsupported" // browser can't do push here (e.g. iPhone before "Add to Home Screen")
  | "unavailable" // the server has no push keys configured
  | "blocked" // the user denied notifications in the browser
  | "off"
  | "on";

async function registration() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
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

/**
 * Current state for this device. If the browser is already subscribed, the
 * subscription is re-sent so it follows whoever is signed in now (shared
 * phones, a refreshed link, a new password).
 */
export async function getPushState(token?: string): Promise<PushState> {
  const reg = await registration();
  if (!reg) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return "off";
  try {
    await register(sub, token);
    return "on";
  } catch {
    return "off";
  }
}

export async function enablePush(token?: string): Promise<PushState> {
  const reg = await registration();
  if (!reg) return "unsupported";
  const { publicKey } = await api<{ publicKey: string | null }>("/api/push");
  if (!publicKey) return "unavailable";
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return permission === "denied" ? "blocked" : "off";
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }));
  await register(sub, token);
  return "on";
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
