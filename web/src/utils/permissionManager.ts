// web/src/utils/permissionManager.ts

export type PermissionStatus = "default" | "granted" | "denied";

export interface PermissionRequestResult {
  status: PermissionStatus;
  message?: string;
  subscription?: PushSubscription;
}

export const permissionManager = {
  /**
   * بررسی وضعیت مجوز اعلان
   */
  checkNotificationPermission(): PermissionStatus {
    if (!('Notification' in window)) {
      return "denied";
    }
    return Notification.permission as PermissionStatus;
  },

  /**
   * درخواست مجوز اعلان و ثبت اشتراک Push
   */
  async requestNotificationPermission(vapidPublicKey?: string): Promise<PermissionRequestResult> {
    try {
      // 1. بررسی پشتیبانی مرورگر
      if (!('Notification' in window)) {
        return {
          status: "denied",
          message: "مرورگر شما از اعلان‌های Push پشتیبانی نمی‌کند",
        };
      }

      if (!('serviceWorker' in navigator)) {
        return {
          status: "denied",
          message: "مرورگر شما از Service Worker پشتیبانی نمی‌کند",
        };
      }

      if (!('PushManager' in window)) {
        return {
          status: "denied",
          message: "مرورگر شما از Push Manager پشتیبانی نمی‌کند",
        };
      }

      // 2. درخواست مجوز
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        return {
          status: "denied",
          message: "مجوز اعلان‌ها در مرورگر مسدود شده است",
        };
      }

      if (permission === "default") {
        return {
          status: "default",
          message: "درخواست مجوز اعلان لغو شد",
        };
      }

      // 3. مجوز granted - ثبت اشتراک
      if (!vapidPublicKey) {
        return {
          status: "granted",
          message: "مجوز اعلان داده شد اما کلید VAPID موجود نیست",
        };
      }

      // 4. آماده کردن Service Worker
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch {
        // اگر SW آماده نبود، ثبت کن
        await navigator.serviceWorker.register('/sw.js');
        registration = await navigator.serviceWorker.ready;
      }

      // 5. ایجاد اشتراک Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      return {
        status: "granted",
        message: "مجوز اعلان با موفقیت دریافت شد",
        subscription,
      };

    } catch (error: any) {
      console.error("Error in requestNotificationPermission:", error);
      return {
        status: "denied",
        message: error.message || "خطا در دریافت مجوز اعلان",
      };
    }
  },

  /**
   * بررسی مجوز رسانه (میکروفون/دوربین)
   */
  async checkMediaPermission(type: "microphone" | "camera"): Promise<PermissionStatus> {
    try {
      const result = await navigator.permissions.query({ name: type as any });
      return result.state as PermissionStatus;
    } catch {
      // اگر Permission API پشتیبانی نشد
      return "default";
    }
  },

  /**
   * درخواست مجوز رسانه (میکروفون/دوربین)
   */
  async requestMediaPermission(type: "microphone" | "camera"): Promise<PermissionRequestResult> {
    try {
      const constraints = type === "microphone"
        ? { audio: true }
        : { video: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // برای آزاد کردن منابع
      stream.getTracks().forEach(track => track.stop());

      return {
        status: "granted",
        message: `مجوز ${type === "microphone" ? "میکروفون" : "دوربین"} با موفقیت دریافت شد`,
      };
    } catch (error: any) {
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        return {
          status: "denied",
          message: `مجوز ${type === "microphone" ? "میکروفون" : "دوربین"} در مرورگر مسدود شده است`,
        };
      }
      return {
        status: "default",
        message: error.message || `خطا در دریافت مجوز ${type === "microphone" ? "میکروفون" : "دوربین"}`,
      };
    }
  },
};