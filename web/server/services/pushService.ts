// web/server/services/pushService.ts

import webPush from "web-push";
import { dbQuery, dbExecute } from "../db/index.js";
import { PushSubscriptionItem, PushConfig } from "../models/types.js";

let pushConfig: PushConfig = {
  vapidPublicKey: "",
  vapidPrivateKey: "",
  isActive: true,
};

let pushPolicy: "always" | "offline_only" | "mentions_only" | "direct_only" | "disabled" = "always";
let pushSubscriptions: PushSubscriptionItem[] = [];

// ==========================================
// LOAD CONFIG FROM DB
// ==========================================
async function loadConfigFromDB() {
  const settings = await dbQuery(`SELECT * FROM push_settings WHERE id = 1`);
  if (settings && settings.length > 0) {
    const row = settings[0];
    pushConfig.vapidPublicKey = row.vapid_public_key || "";
    pushConfig.vapidPrivateKey = row.vapid_private_key || "";
    pushConfig.isActive = row.is_enabled === 1;
    return true;
  }
  return false;
}

// ==========================================
// SAVE CONFIG TO DB
// ==========================================
async function saveConfigToDB() {
  await dbExecute(
    `UPDATE push_settings SET 
      vapid_public_key = ?, 
      vapid_private_key = ?, 
      is_enabled = ? 
    WHERE id = 1`,
    [
      pushConfig.vapidPublicKey, 
      pushConfig.vapidPrivateKey, 
      pushConfig.isActive ? 1 : 0
    ]
  );
}

// ==========================================
// CREATE NEW CONFIG IN DB
// ==========================================
async function createConfigInDB(publicKey: string, privateKey: string) {
  await dbExecute(
    `INSERT INTO push_settings (id, vapid_public_key, vapid_private_key, is_enabled) 
     VALUES (1, ?, ?, 1)`,
    [publicKey, privateKey]
  );
}

// ==========================================
// GENERATE AND SAVE VAPID KEYS (CORE FUNCTION)
// ==========================================
async function generateAndSaveVapidKeys(clearSubscriptions: boolean = true) {
  const keys = webPush.generateVAPIDKeys();
    
  pushConfig.vapidPublicKey = keys.publicKey;
  pushConfig.vapidPrivateKey = keys.privateKey;
  pushConfig.isActive = true;
  
  // بررسی وجود رکورد در دیتابیس
  const exists = await loadConfigFromDB();
  
  if (exists) {
    await saveConfigToDB();
  } else {
    await createConfigInDB(keys.publicKey, keys.privateKey);
  }
  
  // پاک کردن اشتراک‌های قبلی (اگر درخواست شده باشد)
  if (clearSubscriptions) {
    await clearAllSubscriptions();
  }
  
  return keys;
}

// ==========================================
// CLEAR ALL SUBSCRIPTIONS
// ==========================================
async function clearAllSubscriptions() {
  try {    
    const count = await dbQuery(`SELECT COUNT(*) as count FROM push_subscriptions`);
    
    await dbExecute(`DELETE FROM push_subscriptions`);
    pushSubscriptions = [];
        
  } catch (error: any) {
    console.error("❌ Failed to clear subscriptions:", error);
    throw error;
  }
}

// ==========================================
// INITIALIZE - از دیتابیس میخواند
// ==========================================
export async function initPushService() {
  try {    
    const configExists = await loadConfigFromDB();
    
    if (configExists) {
      console.log("✅ Loaded push settings from DB:");
    } else {
      await generateAndSaveVapidKeys(true);
    }
    
    await syncPushFromDB();
    
  } catch (error: any) {
    console.error("❌ Error initializing push service:", error);
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      pushConfig.vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
      pushConfig.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    }
  }
}

// ==========================================
// SYNC SUBSCRIPTIONS FROM DB
// ==========================================
async function syncPushFromDB() {
  try {
    const rows = await dbQuery(`SELECT * FROM push_subscriptions`);
    pushSubscriptions = [];
    
    if (rows && rows.length > 0) {
      for (const r of rows) {
        try {
          const subObj = JSON.parse(r.subscription_json);
          pushSubscriptions.push({
            id: r.id,
            userId: String(r.user_id || "1"),
            subscription: subObj,
            createdAt: r.created_at || new Date().toISOString(),
          });
        } catch (e) {
          console.error(`❌ Failed to parse subscription ${r.id}:`, e);
        }
      }
    } else {
      console.log("ℹ️ No push subscriptions found in DB");
    }
  } catch (error: any) {
    console.error("❌ Error syncing push subscriptions from DB:", error);
    pushSubscriptions = [];
  }
}

// ==========================================
// GETTERS
// ==========================================
export function getPushConfig() {
  return pushConfig;
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

export function getActiveSubscriptionsCount() {
  return pushSubscriptions.length;
}

export function getSubscriptionsByUser(userId: string | number) {
  const uid = String(userId);
  return pushSubscriptions.filter(s => String(s.userId) === uid);
}

// ==========================================
// UPDATE CONFIG
// ==========================================
export async function updatePushConfig(config: Partial<PushConfig>) {
  try {
    if (config.vapidPublicKey) pushConfig.vapidPublicKey = config.vapidPublicKey.trim();
    if (config.vapidPrivateKey) pushConfig.vapidPrivateKey = config.vapidPrivateKey.trim();
    if (config.isActive !== undefined) pushConfig.isActive = config.isActive;
    
    await saveConfigToDB();
    return pushConfig;
    
  } catch (error: any) {
    console.error("❌ Failed to update push settings:", error);
    throw new Error("خطا در ذخیره تنظیمات Push: " + error.message);
  }
}

// ==========================================
// GENERATE NEW VAPID KEYS (EXPORTED - FOR ADMIN)
// ==========================================
export async function generateNewVapidKeys() {
  try {
    // تولید کلید جدید و پاک کردن اشتراک‌ها
    const keys = await generateAndSaveVapidKeys(true);
    return keys;
  } catch (error: any) {
    console.error("❌ Failed to generate VAPID keys:", error);
    throw new Error("خطا در تولید کلیدهای VAPID: " + error.message);
  }
}

// ==========================================
// ADD SUBSCRIPTION
// ==========================================
export async function addPushSubscription(subscription: any, userId: number | string) {
  try {    
    const numericUserId = typeof userId === "number" ? userId : (parseInt(String(userId), 10) || 1);
    const uId = String(numericUserId);
    const subJson = JSON.stringify(subscription);
    
    // بروزرسانی در حافظه
    const existingIdx = pushSubscriptions.findIndex(
      (s) => s.subscription?.endpoint === subscription.endpoint
    );
    
    if (existingIdx >= 0) {
      pushSubscriptions[existingIdx] = {
        id: pushSubscriptions[existingIdx].id,
        userId: uId,
        subscription: subscription,
        createdAt: new Date().toISOString(),
      };
    } else {
      pushSubscriptions.push({
        id: pushSubscriptions.length + 1,
        userId: uId,
        subscription: subscription,
        createdAt: new Date().toISOString(),
      });
    }
    
    // ذخیره در دیتابیس
    const existing = await dbQuery(
      `SELECT id FROM push_subscriptions WHERE endpoint = ?`,
      [subscription.endpoint]
    );
    
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
    
    return pushSubscriptions.length;
    
  } catch (error: any) {
    console.error("❌ Failed to add push subscription:", error);
    throw new Error("خطا در ثبت اشتراک: " + error.message);
  }
}

// ==========================================
// REMOVE SUBSCRIPTION
// ==========================================
export async function removePushSubscription(endpoint: string) {
  try {
    if (!endpoint) {
      return pushSubscriptions.length;
    }
    
    // حذف از حافظه
    const idx = pushSubscriptions.findIndex((s) => s.subscription?.endpoint === endpoint);
    if (idx >= 0) {
      pushSubscriptions.splice(idx, 1);
    }
    
    // حذف از دیتابیس
    await dbExecute(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [endpoint]);
    
    return pushSubscriptions.length;
    
  } catch (error: any) {
    console.error("❌ Failed to remove push subscription:", error);
    return pushSubscriptions.length;
  }
}

// ==========================================
// SEND NOTIFICATION
// ==========================================
export async function sendNotificationToTargets(targets: PushSubscriptionItem[], payloadObj: any) {
  try {    
    if (!pushConfig.vapidPublicKey || !pushConfig.vapidPrivateKey) {
      throw new Error("کلیدهای VAPID در سیستم تنظیم نشده‌اند.");
    }
    
    webPush.setVapidDetails(
      "mailto:azaranvalveco@gmail.com",
      pushConfig.vapidPublicKey.trim(),
      pushConfig.vapidPrivateKey.trim()
    );
    
    const payload = JSON.stringify(payloadObj);
    let sentCount = 0;
    let failCount = 0;
    
    for (const item of targets) {
      try {
        if (!item.subscription || !item.subscription.endpoint) {
          failCount++;
          continue;
        }
        
        await webPush.sendNotification(item.subscription, payload);
        sentCount++;        
      } catch (err: any) {
        failCount++;
        console.error(`❌ Failed to send to ${item.id}:`, {
          statusCode: err.statusCode || "unknown",
          message: err.message || "unknown error",
        });
        
        if (err.statusCode === 410 || err.statusCode === 404) {
          await removePushSubscription(item.subscription?.endpoint);
        }
      }
    }
    
    return { sentCount, failCount };
    
  } catch (error: any) {
    console.error("❌ Error in sendNotificationToTargets:", error);
    throw new Error("خطا در ارسال اعلان: " + error.message);
  }
}

// ==========================================
// RELOAD DATA
// ==========================================
export async function reloadPushData() {
  await loadConfigFromDB();
  await syncPushFromDB();
  return { config: pushConfig, subscriptions: pushSubscriptions.length };
}