// Shared between server and client code — keep free of server-only imports.

/**
 * The address customer links are shared under and opened on, e.g.
 * "https://x7k2m9q4tb.vercel.app" — a name that says nothing about the app.
 * Empty (local dev, previews) means "whatever address the app is open on".
 */
export const LINK_ORIGIN = (process.env.NEXT_PUBLIC_LINK_ORIGIN ?? "").replace(
  /\/+$/,
  "",
);
