// Custom notification click handler for Unplastica PWA service worker
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let targetUrl = "/";
  try {
    const raw = (event.notification.data && event.notification.data.url) || "/";
    const parsed = new URL(raw, self.location.origin);
    if (parsed.origin === self.location.origin) {
      targetUrl = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (_) {
    targetUrl = "/";
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url && typeof client.navigate === "function") {
            try {
              client.navigate(targetUrl);
            } catch (_) {}
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
