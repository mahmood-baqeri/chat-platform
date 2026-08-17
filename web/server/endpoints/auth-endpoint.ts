// web/server/endpoints/auth-endpoint.ts

import express, { Request, Response } from "express";
import {
  users,
  sessions,
  otpStore,
  auditLogs,
  systemSettings,
  chats,
  messages,
  messageSeens
} from "../store/dataStore.js";
import {
  User,
  UserSession,
  Chat,
  AvatarPhoto
} from "../models/types.js";
import { saveBase64ToFile } from "../config.js";
import { dbExecute } from "../db/index.js";
import { broadcastWSEvent } from "../websocket/wsServer.js";
import { sendVerificationCode } from "../sms/smsService.js";

const router = express.Router();

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getUserIdFromReq(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token.includes("jwt-token-")) {
      const tokenContent = token.split("jwt-token-")[1];
      if (tokenContent) {
        const lastHyphenIndex = tokenContent.lastIndexOf("-");
        const userId = lastHyphenIndex > 0 ? tokenContent.substring(0, lastHyphenIndex) : tokenContent;
        if (userId) return userId;
      }
    }
  }
  if (req.query?.userId) {
    return req.query.userId as string;
  }
  return null;
}

export function formatChatForUser(chat: Chat, currentUserId: string): Chat {
  if (!chat) return chat;

  const chatMsgs = messages.filter(
    (m) =>
      String(m.chatId) === String(chat.id) ||
      String(m.chatId).replace(/^chat-/, "") === String(chat.id).replace(/^chat-/, "")
  );

  const userUnreadCount = chatMsgs.filter((m) => {
    if (String(m.senderId) === String(currentUserId)) return false;
    const isSeenByMe =
      (m.seenBy && m.seenBy.some((s) => String(s.userId) === String(currentUserId))) ||
      messageSeens.some(
        (s) => String(s.messageId) === String(m.id) && String(s.userId) === String(currentUserId)
      );
    return !isSeenByMe;
  }).length;

  let formatted: Chat = {
    ...chat,
    unreadCount: userUnreadCount,
  };

  // ✅ اضافه کردن وضعیت آنلاین و آخرین ورود
  let contactStatus = "offline";
  let contactLastSeen = null;
  let contactUser = null;
  let onlineCount = 0;

  if (chat.type === "direct") {
    const otherMember =
      (chat.members || []).find((m) => String(m.userId) !== String(currentUserId)) ||
      (chat.members || []).find((m) => String(m.userId) === String(currentUserId));
    
    if (otherMember) {
      const targetUser = users.find((u) => String(u.id) === String(otherMember.userId));
      if (targetUser) {
        contactStatus = targetUser.status || "offline";
        contactLastSeen = targetUser.lastSeen || null;
        contactUser = targetUser;

        const displayName =
          targetUser.displayName ||
          `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
          targetUser.personCode ||
          chat.title;
        
        formatted = {
          ...formatted,
          title: displayName,
          avatarUrl: targetUser.avatarUrl || chat.avatarUrl,
          username: targetUser.personCode || chat.username,
         contactStatus: contactStatus as "online" | "offline" | "away",
          contactLastSeen,
          contactUser,
        };
      }
    }
  } else {
    // چت گروهی - تعداد آنلاین‌ها
    const memberIds = (chat.members || []).map(m => String(m.userId));
    onlineCount = users.filter(u => 
      memberIds.includes(String(u.id)) && 
      u.status === "online"
    ).length;
    
    formatted = {
      ...formatted,
      onlineCount,
    };
  }

  return formatted;
}

// export function formatChatForUser(chat: Chat, currentUserId: string): Chat {
//   if (!chat) return chat;

//   const chatMsgs = messages.filter(
//     (m) =>
//       String(m.chatId) === String(chat.id) ||
//       String(m.chatId).replace(/^chat-/, "") === String(chat.id).replace(/^chat-/, "")
//   );

//   const userUnreadCount = chatMsgs.filter((m) => {
//     if (String(m.senderId) === String(currentUserId)) return false;
//     const isSeenByMe =
//       (m.seenBy && m.seenBy.some((s) => String(s.userId) === String(currentUserId))) ||
//       messageSeens.some(
//         (s) => String(s.messageId) === String(m.id) && String(s.userId) === String(currentUserId)
//       );
//     return !isSeenByMe;
//   }).length;

//   let formatted: Chat = {
//     ...chat,
//     unreadCount: userUnreadCount,
//   };

//   if (chat.type === "direct") {
//     const otherMember =
//       (chat.members || []).find((m) => String(m.userId) !== String(currentUserId)) ||
//       (chat.members || []).find((m) => String(m.userId) === String(currentUserId));
//     if (otherMember) {
//       const targetUser = users.find((u) => String(u.id) === String(otherMember.userId));
//       if (targetUser) {
//         const displayName =
//           targetUser.displayName ||
//           `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
//           targetUser.personCode ||
//           chat.title;
//         formatted = {
//           ...formatted,
//           title: displayName,
//           avatarUrl: targetUser.avatarUrl || chat.avatarUrl,
//           username: targetUser.personCode || chat.username,
//         };
//       }
//     }
//   }

//   return formatted;
// }

// ============================================
// HEALTH CHECK
// ============================================
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// 1. SEND OTP (بدون ساخت کاربر جدید)
// ============================================
router.post("/auth/otp/send", async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;

    // 1. اعتبارسنجی
    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: "شناسه (شماره موبایل / کد پرسنلی / کد ملی) الزامی است"
      });
    }

    // 2. جستجوی کاربر با identifier در هر سه فیلد
    const user = users.find(u =>
      u.phone === identifier ||
      u.nationalCode === identifier ||
      u.personCode === identifier
    );

    // 3. اگر کاربر وجود نداشت، خطا برگردان (نه ساخت کاربر جدید!)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "کاربری با این شناسه یافت نشد"
      });
    }

    // 4. بررسی مسدود بودن کاربر
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: "حساب کاربری شما مسدود شده است"
      });
    }

    // 5. تولید کد 5 رقمی
    // const code = Math.floor(10000 + Math.random() * 90000).toString();
    const code = "12345";

    // 6. ارسال کد از طریق SMS.IR (فقط اگر شماره موبایل وجود داشته باشد)
    let smsSent = false;
    if (user.phone) {
      // try {
      //   const smsResult = await sendVerificationCode(user.phone, code);
      //   if (smsResult.success) {
      //     smsSent = true;
      //   } else {
      //     console.error("❌ خطا:", smsResult.message)
      //   }
      // } catch (smsError) {
      //   console.error('خطا در ارسال پیامک:', smsError);
      // }
    }

    // 7. ذخیره کد در حافظه موقت
    otpStore[identifier] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      userId: user.id,
      phone: user.phone,
      nationalCode: user.nationalCode,
      personCode: user.personCode
    };

    // 8. ثبت لاگ
    auditLogs.unshift({
      id: "log-" + Date.now(),
      actorName: identifier,
      action: "OTP_REQUESTED",
      details: `کد یکبارمصرف برای ${identifier} ارسال شد${smsSent ? '' : ' (پیامک ارسال نشد)'}`,
      timestamp: new Date().toISOString(),
      level: smsSent ? "info" : "warning"
    });

    // 9. پاسخ موفق
    res.json({
      success: true,
      message: smsSent ? "کد تأیید برای شما ارسال شد" : "کد تأیید ایجاد شد (ارسال پیامک با خطا مواجه شد)",
      otp: systemSettings.otpEnabled ? code : undefined,
      identifier,
      user: {
        id: user.id,
        phone: user.phone,
        nationalCode: user.nationalCode,
        personCode: user.personCode,
        displayName: user.displayName
      }
    });

  } catch (error: any) {
    console.error('خطا در ارسال OTP:', error);
    res.status(500).json({
      success: false,
      error: "خطای داخلی سرور"
    });
  }
});

// ============================================
// 2. VERIFY OTP (بدون ساخت کاربر جدید)
// ============================================
router.post("/auth/otp/verify", async (req: Request, res: Response) => {
  try {
    const { identifier, code } = req.body;

    // 1. اعتبارسنجی
    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: "شناسه (شماره موبایل / کد پرسنلی / کد ملی) الزامی است"
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "کد تأیید الزامی است"
      });
    }

    // 2. بررسی کد در otpStore
    if (systemSettings.otpEnabled) {
      const stored = otpStore[identifier];
      if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
        return res.status(400).json({
          success: false,
          error: "کد تأیید اشتباه یا منقضی شده است"
        });
      }
    }

    // 3. جستجوی کاربر با identifier در هر سه فیلد
    const user = users.find(u =>
      u.phone === identifier ||
      u.nationalCode === identifier ||
      u.personCode === identifier
    );

    // 4. اگر کاربر وجود نداشت، خطا برگردان (نه ساخت کاربر جدید!)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "کاربری با این شناسه یافت نشد"
      });
    }

    // 5. بررسی مسدود بودن کاربر
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: "حساب کاربری شما مسدود شده است"
      });
    }
    
      // ✅ بروزرسانی status و last_seen در دیتابیس
    user.status = 'online';
    user.lastSeen = new Date().toISOString();

    // بروزرسانی در دیتابیس
    await dbExecute(
      `UPDATE users SET status = 'online', last_seen = NOW() WHERE id = ?`,
      [user.id]
    );

    // 6. حذف کد از حافظه بعد از استفاده موفق
    delete otpStore[identifier];

    // 7. ایجاد توکن و نشست جدید
    const token = `jwt-token-${user.id}-${Date.now()}`;
    const sessId = sessions.length > 0 ? Math.max(...sessions.map(s => Number(s.id) || 0)) + 1 : 1;
    const newSession: UserSession = {
      id: sessId,
      userId: user.id,
      deviceName: "مرورگر وب (جلسه فعال)",
      ipAddress: req.ip || "127.0.0.1",
      browser: "Chrome Client",
      lastActive: "هم‌اکنون",
      isCurrent: true
    };
    sessions.push(newSession);

    // 8. ثبت لاگ
    auditLogs.unshift({
      id: "log-" + Date.now(),
      actorName: identifier,
      action: "LOGIN_SUCCESS",
      details: `ورود موفق کاربر ${user.displayName || user.personCode}`,
      timestamp: new Date().toISOString(),
      level: "info"
    });

    // 9. پاسخ موفق
    res.json({
      success: true,
      token,
      user,
      session: newSession
    });

  } catch (error: any) {
    console.error('خطا در تأیید OTP:', error);
    res.status(500).json({
      success: false,
      error: "خطای داخلی سرور"
    });
  }
});
// ============================================
// 3. CURRENT USER (ME)
// ============================================
router.get("/auth/me", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes("jwt-token-")) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است" });
  }

  const tokenContent = authHeader.split("jwt-token-")[1];
  if (!tokenContent) {
    return res.status(401).json({ error: "توکن نامعتبر است" });
  }

  const lastHyphenIndex = tokenContent.lastIndexOf("-");
  const userId = lastHyphenIndex > 0 ? tokenContent.substring(0, lastHyphenIndex) : tokenContent;

  const user = users.find(u => String(u.id) === String(userId));
  if (!user) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: "حساب کاربری شما مسدود شده است" });
  }

  const userSessions = sessions.filter(s => String(s.userId) === String(user.id));
  res.json({ user, sessions: userSessions });
});

// ============================================
// 4. UPDATE PROFILE
// ============================================
router.post("/auth/profile/update", async (req: Request, res: Response) => {
  const { userId, firstName, lastName, displayName, avatarUrl } = req.body;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  // if (firstName) user.firstName = firstName;
  // if (lastName) user.lastName = lastName;
  // if (displayName) user.displayName = displayName;
  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl ? saveBase64ToFile(avatarUrl, "avatar_" + user.id) : AvatarPhoto;
  }

  await dbExecute(
    `UPDATE users SET first_name = ?, last_name = ?, display_name = ?, avatar_url = ? WHERE id = ?`,
    [user.firstName, user.lastName, user.displayName, user.avatarUrl, user.id]
  );

  res.json({ user, message: "پروفایل با موفقیت بروزرسانی شد" });
});

// ============================================
// 4. UPDATE PROFILE
// ============================================
router.post("/auth/updateUserStatus", async (req: Request, res: Response) => {
  const { userId, status} = req.body;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  user.status = status;

  await dbExecute(
    `UPDATE users SET status = ? WHERE id = ?`,
    [user.status, user.id]
  );

  res.json({ user, message: "خروج از حساب کاربری" });
});

// ============================================
// 5. TERMINATE OTHER SESSIONS
// ============================================
router.post("/auth/sessions/terminate-others", (req: Request, res: Response) => {
  const { userId, currentSessionId } = req.body;
  const filtered = sessions.filter(s => String(s.userId) !== String(userId) || String(s.id) === String(currentSessionId));
  sessions.length = 0;
  sessions.push(...filtered);
  res.json({ message: "تمام نشست‌های دیگر با موفقیت بسته شدند" });
});

// ============================================
// 6. SYSTEM SETTINGS
// ============================================
router.get("/settings", (req: Request, res: Response) => {
  res.json(systemSettings);
});

router.put("/settings", async (req: Request, res: Response) => {
  Object.assign(systemSettings, req.body);

  await dbExecute(
    `UPDATE system_settings SET registration_enabled = ?, login_enabled = ?, otp_enabled = ?, session_timeout_minutes = ?, channels_enabled = ?, groups_enabled = ?, max_file_size_mb = ? WHERE id = 1`,
    [
      systemSettings.registrationEnabled ? 1 : 0,
      systemSettings.loginEnabled ? 1 : 0,
      systemSettings.otpEnabled ? 1 : 0,
      systemSettings.sessionTimeoutMinutes || 1440,
      systemSettings.channelsEnabled ? 1 : 0,
      systemSettings.groupsEnabled ? 1 : 0,
      systemSettings.maxFileSizeMB
    ]
  );

  auditLogs.unshift({
    id: "log-" + Date.now(),
    actorName: "مدیر سیستم",
    action: "SETTINGS_CHANGE",
    details: "تنظیمات سیستمی تغییر یافت",
    timestamp: new Date().toISOString(),
    level: "warning"
  });

  broadcastWSEvent("settings:updated", systemSettings);

  res.json({ settings: systemSettings, message: "تنظیمات سیستم با موفقیت بروزرسانی شد" });
});

export default router;