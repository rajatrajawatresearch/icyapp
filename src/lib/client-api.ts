// Browser-side fetch wrapper: JSON in/out, throws ApiError with the server's message.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
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
  const data = await res.json().catch(() => ({}));
  if (
    res.status === 401 &&
    (url.startsWith("/api/admin") ||
      url.startsWith("/api/superadmin") ||
      url.startsWith("/api/delivery"))
  ) {
    // Hard navigation on purpose: session expired, drop all client state.
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
