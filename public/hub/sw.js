/* Conrad Hub service worker: push + notification click only. No fetch caching (avoids stale-app bugs). */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Hub", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Hub";
  const options = {
    body: data.body || "",
    icon: "/hub/icons/icon-192.png",
    badge: "/hub/icons/badge-72.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/hub" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/hub";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) return client.navigate(url);
          return undefined;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
