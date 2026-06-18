/* Service worker BioFido — installabilità PWA + notifiche Web Push. */

// Attiva subito il nuovo service worker senza attendere la chiusura delle schede.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Handler fetch "passthrough": non intercetta nulla (lascia gestire al browser),
// ma la sua sola presenza soddisfa il requisito di installabilità della PWA su
// Android/Chrome, così compare "Installa app" / "Aggiungi a schermata Home".
self.addEventListener("fetch", () => {});

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
