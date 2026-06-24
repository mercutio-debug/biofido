/* Service worker BioFido — installabilità PWA, cache offline e notifiche Push. */

// Nome cache: cambiare la versione invalida la vecchia cache al prossimo deploy.
const CACHE = "biofido-cache-v3";
// Cartella base dell'app (gestisce il basePath /biofido/ di GitHub Pages).
const BASE = new URL("./", self.location).pathname;
// Risorse minime dell'"app shell" da avere subito disponibili offline.
const PRECACHE = [
  BASE,
  BASE + "manifest.webmanifest",
  BASE + "brand/icon-192.png",
  BASE + "brand/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // elimina le cache di versioni precedenti
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Strategia: pagine = network-first (sempre l'ultima versione quando online, la
// copia in cache quando offline); asset statici = cache-first con aggiornamento
// in background. version.json e le chiamate a Supabase NON vengono mai messe in
// cache (auto-aggiornamento e dati sempre freschi).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST/PUT ecc.: gestiti dal browser
  // I media (audio/video) usano richieste "Range": vanno serviti dalla rete,
  // altrimenti una risposta intera dalla cache rompe la riproduzione (il bau!).
  if (req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e altri host: niente cache
  if (url.pathname.endsWith("/version.json")) return; // serve sempre fresco
  if (url.pathname.endsWith("/sw.js")) return;
  if (/\.(mp3|wav|ogg|m4a|mp4|webm)$/i.test(url.pathname)) return; // media: sempre rete

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    // non mettere in cache i redirect (romperebbero la navigazione offline)
    if (res && res.ok && !res.redirected) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = (await cache.match(req)) || (await cache.match(BASE));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><body style='font-family:sans-serif;text-align:center;padding:3rem;color:#33414a'><h1>🐾 Sei offline</h1><p>BioFido non è raggiungibile. Riprova quando torni online.</p></body>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) {
    // stale-while-revalidate: restituisco la cache e aggiorno in background
    fetch(req)
      .then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return Response.error();
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "BioFido", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "BioFido";
  const options = {
    body: data.body || "",
    icon: data.icon || "/brand/icon-192.png",
    badge: data.icon || "/brand/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((wins) => {
      for (const w of wins) {
        if (w.url === url && "focus" in w) return w.focus();
      }
      return clients.openWindow(url);
    })
  );
});
