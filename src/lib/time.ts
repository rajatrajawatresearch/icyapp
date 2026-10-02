// The store runs on India time; servers (Vercel) run in UTC. Anything that
// means "today" or prints a clock time must say which zone it means.

export const STORE_TIME_ZONE = "Asia/Kolkata";
const STORE_UTC_OFFSET = "+05:30"; // India has no daylight saving

/** Midnight at the start of the store's current day, as an absolute Date. */
export function startOfStoreDay(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${day}T00:00:00${STORE_UTC_OFFSET}`);
}
