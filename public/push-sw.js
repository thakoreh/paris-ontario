/* Push only: no fetch interception or page caching. */
function localNotificationUrl(value) {
  try {
    const url = new URL(value || "/today", self.location.origin);
    if (url.origin === self.location.origin &&
        (url.pathname.startsWith("/notice/") || ["/today", "/notifications"].includes(url.pathname))) return url.href;
  } catch { /* Invalid payloads open the public feed. */ }
  return self.location.origin + "/today";
}
self.addEventListener("push", function(event) {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Generic fallback. */ }
  event.waitUntil(self.registration.showNotification(
    typeof payload.title === "string" ? payload.title.slice(0, 120) : "Paris Pulse",
    { body: typeof payload.body === "string" ? payload.body.slice(0, 250) : "A local update is available.",
      tag: typeof payload.tag === "string" ? payload.tag : "paris-pulse",
      data: { url: localNotificationUrl(payload.url) } }
  ));
});
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(localNotificationUrl(event.notification.data && event.notification.data.url)));
});
