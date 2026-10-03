// Service worker: makes the app installable, shows a friendly page when
// offline, and displays push notifications. It never caches data — orders
// and stock must always be live.

// Standalone page (the app's CSS isn't available offline); colours mirror
// the theme in globals.css.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;background:#f4f4f2;color:#18181a}
@media (prefers-color-scheme:dark){body{background:#131314;color:#f4f4f5}}
h1{font-size:20px;margin:16px 0 4px}p{margin:0;opacity:.75}
button{margin-top:20px;padding:12px 22px;border:0;border-radius:12px;background:#7a4a2b;color:#fff;font-size:16px;font-weight:600}</style>
</head><body><div><h1>You're offline</h1>
<p>Check your internet connection, then try again.</p>
<button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // let the browser handle everything else
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(OFFLINE_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    ),
  );
});

// Push: the server sends { title, body, url, tag }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Not JSON — show a generic notification below.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Bazar", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag, // one notification per order, updated in place
      renotify: Boolean(data.tag),
      vibrate: [120, 60, 120],
      data: { url: data.url || "/" },
    }),
  );
});

// Tapping a notification opens (or focuses) that person's own screen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (!client.url.startsWith(self.location.origin)) continue;
        await client.focus();
        if (client.url !== target) await client.navigate(target).catch(() => {});
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
