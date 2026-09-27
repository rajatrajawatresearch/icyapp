// Minimal service worker: makes the app installable and shows a friendly page
// when offline. It never caches data — orders and stock must always be live.

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;background:#f5f7fb;color:#0f172a}
@media (prefers-color-scheme:dark){body{background:#0a0f1a;color:#f1f4f9}}
button{margin-top:16px;padding:12px 20px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:16px}</style>
</head><body><div><div style="font-size:40px">📶</div><h1 style="font-size:20px">You're offline</h1>
<p>Check your internet connection and try again.</p>
<button onclick="location.reload()">Retry</button></div></body></html>`;

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
