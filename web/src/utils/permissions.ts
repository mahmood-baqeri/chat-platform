/**
 * Permissions Utility
 * Requests Camera, Microphone, and Push Notification permissions after login
 */

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestAllPermissionsAfterLogin(userId?: string) {
  if (typeof window === "undefined" || !navigator) return;

  const currentUserId = userId || localStorage.getItem("app_user_id");

  // 1. Microphone & Camera Permissions Check & Request
  try {
    let needMedia = true;
    if (navigator.permissions && navigator.permissions.query) {
      const micStatus = await navigator.permissions.query({ name: "microphone" as any }).catch(() => null);
      const camStatus = await navigator.permissions.query({ name: "camera" as any }).catch(() => null);

      if (micStatus?.state === "granted" && camStatus?.state === "granted") {
        needMedia = false;
      }
    }

    if (needMedia && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Media permissions not granted or partially declined:", e);
      }
    }
  } catch (e) {
    console.warn("Error requesting media permissions:", e);
  }

  // 2. Push Notification Permission Check & Push Subscription
  try {
    if ("Notification" in window) {
      let notifPermission = Notification.permission;
      if (notifPermission !== "granted" && notifPermission !== "denied") {
        notifPermission = await Notification.requestPermission();
      }

      if (notifPermission === "granted" && "serviceWorker" in navigator) {
        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
        }

        if (reg) {
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            const settingsRes = await fetch("/api/admin/push-settings").then((r) => r.json()).catch(() => null);
            if (settingsRes && settingsRes.vapidPublicKey) {
              const convertedKey = urlBase64ToUint8Array(settingsRes.vapidPublicKey);
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey,
              }).catch(() => null);
            }
          }

          if (sub && currentUserId) {
            await fetch("/api/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription: sub,
                userId: currentUserId,
              }),
            }).catch(() => null);
          }
        }
      }
    }
  } catch (e) {
    console.warn("Error subscribing for Push Notifications:", e);
  }
}
