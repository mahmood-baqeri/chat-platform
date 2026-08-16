// web/server/services/pushService.ts

import webPush from "web-push";
import { dbQuery, dbExecute } from "../db/index.js";
import { PushSubscriptionItem, PushConfig } from "../models/types.js";

let pushConfig: PushConfig = {
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
  isActive: true,
};

let pushPolicy: "always" | "offline_only" | "mentions_only" | "direct_only" | "disabled" = "always";
let pushSubscriptions: PushSubscriptionItem[] = [];

// Initialize VAPID keys if empty
export function initPushService() {
  if (!pushConfig.vapidPublicKey || !pushConfig.vapidPrivateKey) {
    try {
      const keys = webPush.generateVAPIDKeys();
      pushConfig.vapidPublicKey = keys.publicKey;
      pushConfig.vapidPrivateKey = keys.privateKey;
    } catch (e) {
      console.error("Failed to generate VAPID keys:", e);
    }
  }

  // Sync from DB
  syncPushFromDB();
}

async function syncPushFromDB() {
  try {
    const rows = await dbQuery(`SELECT * FROM push_subscriptions`);
    if (rows && rows.length > 0) {
      for (const r of rows) {
        try {
          const subObj = JSON.parse(r.subscription_json);
          if (!pushSubscriptions.some((s) => s.subscription?.endpoint === subObj.endpoint)) {
            pushSubscriptions.push({
              id: r.id,
              userId: r.user_id,
              subscription: subObj,
              createdAt: r.created_at,
            });
          }
        } catch (e) { }
      }
      console.log(`✅ Loaded ${pushSubscriptions.length} push subscriptions from DB`);
    }
  } catch (e) {
    console.error("Error syncing push subscriptions from DB:", e);
  }
}

export function getPushConfig() {
  return pushConfig;
}

export function updatePushConfig(config: Partial<PushConfig>) {
  if (config.vapidPublicKey) pushConfig.vapidPublicKey = config.vapidPublicKey.trim();
  if (config.vapidPrivateKey) pushConfig.vapidPrivateKey = config.vapidPrivateKey.trim();
  if (config.isActive !== undefined) pushConfig.isActive = config.isActive;
  return pushConfig;
}

export function generateNewVapidKeys() {
  const keys = webPush.generateVAPIDKeys();
  pushConfig.vapidPublicKey = keys.publicKey;
  pushConfig.vapidPrivateKey = keys.privateKey;
  return keys;
}

export function getPushPolicy() {
  return pushPolicy;
}

export function setPushPolicy(policy: any) {
  pushPolicy = policy;
}

export function getPushSubscriptions() {
  return pushSubscriptions;
}


// ==========================================
// add Push Subscription
// ==========================================
export async function addPushSubscription(subscription: any, userId: number | string) {
  console.log("📥 addPushSubscription called");
  console.log("📥 userId:", userId);
  console.log("📥 endpoint:", subscription?.endpoint);

  const numericUserId = typeof userId === "number" ? userId : (parseInt(String(userId).replace(/\D/g, ""), 10) || 1);
  const uId = String(userId || "1");
  const subJson = JSON.stringify(subscription);

  // بررسی وجود اشتراک
  const existingIdx = pushSubscriptions.findIndex(
    (s) => s.subscription?.endpoint === subscription.endpoint
  );

  console.log(`📥 Existing index: ${existingIdx}`);
  console.log(`📥 Current subscriptions: ${pushSubscriptions.length}`);

  if (existingIdx >= 0) {
    pushSubscriptions[existingIdx] = {
      id: pushSubscriptions[existingIdx].id,
      userId: uId,
      subscription,
      createdAt: new Date().toISOString(),
    };
  } else {
    pushSubscriptions.push({
      id: pushSubscriptions.length + 1,
      userId: uId,
      subscription,
      createdAt: new Date().toISOString(),
    });
  }

  console.log(`✅ pushSubscriptions after add: ${pushSubscriptions.length}`);

  // ذخیره در دیتابیس
  try {
    const existing = await dbQuery(`SELECT id FROM push_subscriptions WHERE endpoint = ?`, [subscription.endpoint]);
    if (existing && existing.length > 0) {
      await dbExecute(
        `UPDATE push_subscriptions SET user_id = ?, subscription_json = ? WHERE endpoint = ?`,
        [numericUserId, subJson, subscription.endpoint]
      );
    } else {
      await dbExecute(
        `INSERT INTO push_subscriptions (user_id, endpoint, subscription_json) VALUES (?, ?, ?)`,
        [numericUserId, subscription.endpoint, subJson]
      );
    }
  } catch (e) {
    console.error("Failed to persist push sub to DB:", e);
  }

  return pushSubscriptions.length;
}

// ==========================================
// remove Push ubscription
// ==========================================
export async function removePushSubscription(endpoint: string) {
  const idx = pushSubscriptions.findIndex((s) => s.subscription?.endpoint === endpoint);
  if (idx >= 0) {
    pushSubscriptions.splice(idx, 1);
  }

  try {
    await dbExecute(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [endpoint]);
  } catch (e) { }

  return pushSubscriptions.length;
}

// ==========================================
// SEND Notification To Targets
// ==========================================
export async function sendNotificationToTargets(targets: PushSubscriptionItem[], payloadObj: any) {
  if (!pushConfig.vapidPublicKey || !pushConfig.vapidPrivateKey) {
    throw new Error("کلیدهای VAPID در سیستم تنظیم نشده‌اند.");
  }

  webPush.setVapidDetails(
    "mailto:azaranvalveco@gmail.com",
    pushConfig.vapidPublicKey,
    pushConfig.vapidPrivateKey
  );

  const payload = JSON.stringify(payloadObj);
  let sentCount = 0;
  let failCount = 0;

  for (const item of targets) {
    try {
      await webPush.sendNotification(item.subscription, payload);
      sentCount++;
      console.log(`✅ Sent to ${item.id} (${item.userId})`);
    } catch (err: any) {
      failCount++;
      console.error(`❌ Failed to send to ${item.id} (${item.userId}):`, {
        statusCode: err.statusCode,
        message: err.message,
        endpoint: item.subscription?.endpoint?.substring(0, 50) + "..."
      });
      if (err.statusCode === 410 || err.statusCode === 404) {
        await removePushSubscription(item.subscription?.endpoint);
      }
    }
  }

  console.log(`📊 Push result: ${sentCount} sent, ${failCount} failed`);
  return { sentCount, failCount };
}