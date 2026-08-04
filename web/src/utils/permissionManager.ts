export type PermissionStatus = "granted" | "denied" | "default" | "prompt";

export type PermissionState = PermissionStatus;

export interface AppPermissionsStatus {
  microphone: PermissionStatus;
  camera: PermissionStatus;
  notification: PermissionStatus;
}

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

export const permissionManager = {
  checkNotificationPermission(): PermissionStatus {
    if (!("Notification" in window)) return "denied";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return "default";
  },

  async checkMediaPermission(type: "microphone" | "camera"): Promise<PermissionStatus> {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const res = await navigator.permissions.query({ name: type as PermissionName });
        if (res.state === "granted") return "granted";
        if (res.state === "denied") return "denied";
        return "default";
      } catch {
        // Fallback
      }
    }
    return "default";
  },

  async requestNotificationPermission(vapidPublicKey?: string): Promise<{ status: PermissionStatus; subscription?: any }> {
    if (!("Notification" in window)) {
      throw new Error("مرورگر شما از Notification پشتیبانی نمی‌کند.");
    }
    const result = await Notification.requestPermission();
    const status: PermissionStatus = result === "granted" ? "granted" : result === "denied" ? "denied" : "default";

    let subscription = null;
    if (status === "granted" && "serviceWorker" in navigator && vapidPublicKey) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      } catch (e) {
        console.warn("Push subscription failed during permission request:", e);
      }
    }

    return { status, subscription };
  },

  async requestMediaPermission(type: "microphone" | "camera"): Promise<{ status: PermissionStatus; message: string }> {
    try {
      const constraints = type === "microphone" ? { audio: true } : { video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => track.stop());
      return {
        status: "granted",
        message: `مجوز دسترسی به ${type === "microphone" ? "میکروفون" : "دوربین"} با موفقیت تایید شد.`,
      };
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        return {
          status: "denied",
          message: `دسترسی به ${
            type === "microphone" ? "میکروفون" : "دوربین"
          } مسدود شده است. لطفاً از تنظیمات مرورگر آن را بر روی Allow قرار دهید.`,
        };
      }
      return {
        status: "denied",
        message: `امکان دریافت مجوز وجود ندارد: ${err.message || "خطای ناشناخته"}`,
      };
    }
  },
};

export const checkPermissionStatus = async (): Promise<AppPermissionsStatus> => {
  const notification = permissionManager.checkNotificationPermission();
  const microphone = await permissionManager.checkMediaPermission("microphone");
  const camera = await permissionManager.checkMediaPermission("camera");
  return { microphone, camera, notification };
};

export const requestAppPermission = async (
  type: "microphone" | "camera" | "notification"
): Promise<{ state: PermissionStatus; message: string }> => {
  if (type === "notification") {
    try {
      const res = await permissionManager.requestNotificationPermission();
      return { state: res.status, message: res.status === "granted" ? "مجوز صادر شد." : "دسترسی داده نشد." };
    } catch (e: any) {
      return { state: "denied", message: e.message };
    }
  } else {
    const res = await permissionManager.requestMediaPermission(type);
    return { state: res.status, message: res.message };
  }
};
