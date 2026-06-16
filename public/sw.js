/* Service worker BioFido — gestione notifiche Web Push. */
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
