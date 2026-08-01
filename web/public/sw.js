// Service Worker for Push Notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "پیام جدید", body: "شما یک پیام جدید دریافت کردید", url: "/" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
    badge: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100",
    data: { url: data.url || "/", chatId: data.chatId },
    vibrate: [100, 50, 100],
    dir: "rtl",
    lang: "fa-IR",
    tag: data.chatId ? `chat-${data.chatId}` : "general-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if (event.notification.data?.chatId) {
            client.postMessage({ type: "OPEN_CHAT", chatId: event.notification.data.chatId });
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
