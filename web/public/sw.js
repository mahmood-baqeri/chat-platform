// web/public/sw.js

// Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activated");
  event.waitUntil(self.clients.claim());
});

// دریافت Push Notification
self.addEventListener("push", (event) => {
  console.log("📨 Push notification received:", event);

  let data = {
    title: "پیام جدید",
    body: "شما یک پیام جدید دریافت کردید",
    url: "/",
    icon: "/logo.png",
    chatId: null
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
    badge: data.icon || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100",
    data: {
      url: data.url || "/",
      chatId: data.chatId
    },
    vibrate: [100, 50, 100],
    dir: "rtl",
    lang: "fa-IR",
    tag: data.chatId ? `chat-${data.chatId}` : "general-notification",
    renotify: true,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// کلیک روی نوتیفیکیشن
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked:", event);

  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";
  const chatId = event.notification.data?.chatId;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if (chatId) {
            client.postMessage({
              type: "OPEN_CHAT",
              chatId: chatId
            });
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