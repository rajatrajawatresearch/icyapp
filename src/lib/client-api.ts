// Browser-side fetch helpers: JSON in/out, errors carry the server's message.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const STAFF_API = [
  "/api/admin",
  "/api/superadmin",
  "/api/delivery",
  "/api/notifications",
];

async function readJson<T>(url: string, res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && STAFF_API.some((p) => url.startsWith(p))) {
    // Hard navigation on purpose: the session ended, drop all client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/admin/login";
  }
  if (!res.ok)
    throw new ApiError(
      data?.error ?? `Request failed (${res.status})`,
      res.status,
    );
  return data as T;
}

export async function api<T = unknown>(
  url: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    cache: "no-store",
    headers:
      json !== undefined
        ? { "Content-Type": "application/json", ...rest.headers }
        : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  return readJson<T>(url, res);
}

export type Polled<T> = { changed: true; data: T } | { changed: false };

/**
 * A fetcher for lists that are polled every few seconds. It remembers the
 * ETag of the last answer, so when nothing changed the server replies with an
 * empty 304 — no download, no JSON parse, no re-render.
 */
export function createPoller<T>(url: string) {
  let etag: string | null = null;
  /** Bumped when a write starts and when it ends. */
  let epoch = 0;

  async function poll(): Promise<Polled<T>> {
    const started = epoch;
    const res = await fetch(url, {
      cache: "no-store",
      headers: etag ? { "If-None-Match": etag } : undefined,
    });
    if (res.status === 304) return { changed: false };
    const data = await readJson<T>(url, res);
    // This answer overlapped a write, so it may show the list as it was
    // before the write. Drop it; the next poll fetches the list in full.
    if (started !== epoch) return { changed: false };
    etag = res.headers.get("ETag");
    return { changed: true, data };
  }

  /**
   * Wrap every write to the polled list in this. Without it, a poll already
   * in flight can land after the write's own answer and put the old values
   * back on screen for a few seconds, which looks like the change was lost.
   */
  poll.during = async function during<R>(write: () => Promise<R>): Promise<R> {
    epoch++;
    try {
      return await write();
    } finally {
      epoch++;
      etag = null;
    }
  };
  return poll;
}

/** The `during` of a poller, for components that only need to wrap writes. */
export type WriteGuard = <R>(write: () => Promise<R>) => Promise<R>;

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Clipboard with a fallback for non-secure contexts (e.g. phone on http://LAN-IP). */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
