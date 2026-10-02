// Client-safe formatting helpers.

import { STORE_TIME_ZONE } from "./time";

export function inr(amount: number | string) {
  return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Always store time — server-rendered pages would otherwise print UTC. */
export function formatDateTime(iso: string | Date) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: STORE_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: STORE_TIME_ZONE,
    dateStyle: "medium",
  });
}

export function timeAgo(iso: string, now = Date.now()) {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDateTime(iso);
}

export function countdown(targetIso: string, now = Date.now()) {
  const secs = Math.max(
    0,
    Math.round((new Date(targetIso).getTime() - now) / 1000),
  );
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
