import { Router } from "express";
import {
  getPushConfig,
  updatePushConfig,
  generateNewVapidKeys,
  getPushPolicy,
  setPushPolicy,
  getPushSubscriptions,
  addPushSubscription,
  removePushSubscription,
  sendNotificationToTargets,
} from "../services/pushService.js";
import { dbExecute } from "../db/index.js";
import { LogoPhoto } from "@/src/types.js";

const router = Router();

// Public route to get VAPID Public Key for client push subscriptions
router.get("/push-public-key", (req, res) => {
  const config = getPushConfig();
  res.json({
    vapidPublicKey: config.vapidPublicKey,
    isActive: config.isActive,
  });
});

// Get Push Settings
router.get("/admin/push-settings", (req, res) => {
  const config = getPushConfig();
  const subs = getPushSubscriptions();
  res.json({
    ...config,
    subscriptionCount: subs.length,
    subscriptions: subs.map((s) => ({ id: s.id, userId: s.userId, createdAt: s.createdAt })),
  });
});

// Update Push Settings
router.post("/admin/push-settings", (req, res) => {
  const config = updatePushConfig(req.body);
  res.json({ message: "تنظیمات Push Notification با موفقیت ذخیره شد.", config });
});

// Generate new VAPID keys
router.post("/admin/push-generate-vapid", (req, res) => {
  try {
    const keys = generateNewVapidKeys();
    res.json({
      success: true,
      message: "کلیدهای جدید VAPID با موفقیت تولید شدند.",
      vapidPublicKey: keys.publicKey,
      vapidPrivateKey: keys.privateKey,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || "خطا در تولید کلید VAPID" });
  }
});

// Subscribe browser/device
router.post("/subscribe", async (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, error: "ساختار Push Subscription نامعتبر است." });
  }

  const count = await addPushSubscription(subscription, userId);
  res.json({
    success: true,
    message: "اشتراک Push Notification با موفقیت ثبت گردید.",
    totalSubscriptions: count,
  });
});

// Unsubscribe
router.delete("/subscribe", async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ success: false, error: "آدرس Endpoint ارسال نشده است." });
  }

  const count = await removePushSubscription(endpoint);
  res.json({ success: true, message: "اشتراک مرورگر با موفقیت حذف گردید.", totalSubscriptions: count });
});

// Get push policy
router.get("/admin/push-policy", (req, res) => {
  res.json({ policy: getPushPolicy() });
});

// Update push policy
router.post("/admin/push-policy", async (req, res) => {
  const { policy } = req.body;
  if (["always", "offline_only", "mentions_only", "direct_only", "disabled"].includes(policy)) {
    setPushPolicy(policy);
    try {
      await dbExecute(`UPDATE system_settings SET push_policy = ? WHERE id = 1`, [policy]);
    } catch (e) {}
    return res.json({ success: true, message: "سیاست ارسال Push Notification با موفقیت به‌روزرسانی و ذخیره شد.", policy });
  }
  res.status(400).json({ success: false, error: "سیاست انتخاب شده معتبر نیست." });
});

// Send Test Push
router.post("/admin/push-test", async (req, res) => {
  const { title, message, iconUrl, imageUrl, targetUser, link } = req.body;
  const subs = getPushSubscriptions();

  if (subs.length === 0) {
    return res.status(400).json({
      success: false,
      error: "هیچ دستگاه فعال و مشترکی برای دریافت Push یافت نشد. ابتدا در دستگاه یا مرورگر دکمه دریافت مجوز Push را بزنید.",
    });
  }

  let targets = [...subs];
  if (targetUser && targetUser !== "all") {
    targets = subs.filter((s) => s.userId === targetUser || s.id === targetUser);
  }

  try {
    const payload = {
      title: title || "تست واقعی Push Notification",
      body: message || "این یک اعلان Push واقعی ارسال‌شده از سرور می‌باشد.",
      icon: iconUrl || LogoPhoto,
      image: imageUrl || "",
      url: link || "/",
    };

    const result = await sendNotificationToTargets(targets, payload);
    res.json({
      success: true,
      message: `اعلان Push آزمایشی با موفقیت به ${result.sentCount} دستگاه ارسال شد.${result.failCount > 0 ? ` (${result.failCount} خطا)` : ""}`,
      sentCount: result.sentCount,
      failCount: result.failCount,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "خطا در ارسال تست Push" });
  }
});

export default router;
