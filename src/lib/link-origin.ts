// Shared between server and client code — keep free of server-only imports.

/**
 * The one address the app is used and shared under, e.g.
 * "https://x7k2m9q4tb.vercel.app" — a name that says nothing about the app.
 * Customer links, staff sign-in links and the staff pages all live here, and
 * every other address of the app forwards to it (next.config.ts, lib/device.ts).
 * To move to a bought domain, add it to the hosting project and change this
 * one value. Empty (local dev, previews) means "whatever address the app is
 * open on".
 */
export const LINK_ORIGIN = (process.env.NEXT_PUBLIC_LINK_ORIGIN ?? "").replace(
  /\/+$/,
  "",
);
