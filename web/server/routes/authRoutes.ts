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

const router = express.Router();

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

  if (chat.type === "direct") {
    const otherMember =
      (chat.members || []).find((m) => String(m.userId) !== String(currentUserId)) ||
      (chat.members || []).find((m) => String(m.userId) === String(currentUserId));
    if (otherMember) {
      const targetUser = users.find((u) => String(u.id) === String(otherMember.userId));
      if (targetUser) {
        const displayName =
          targetUser.displayName ||
          `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
          targetUser.username ||
          chat.title;
        formatted = {
          ...formatted,
          title: displayName,
          avatarUrl: targetUser.avatarUrl || chat.avatarUrl,
          username: targetUser.username || chat.username,
        };
      }
    }
  }

  return formatted;
}

// Health Check
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Send OTP
router.post("/auth/otp/send", (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "شماره تلفن الزامی است" });
  }

  const code = "123456";
  otpStore[phone] = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000
  };

  auditLogs.unshift({
    id: "log-" + Date.now(),
    actorName: phone,
    action: "OTP_REQUESTED",
    details: `کد یکبارمصرف ارسال شد: ${code}`,
    timestamp: new Date().toISOString(),
    level: "info"
  });

  res.json({
    message: "کد تأیید برای شما ارسال شد",
    otp: systemSettings.otpEnabled ? code : "123456",
    phone
  });
});

// Verify OTP
router.post("/auth/otp/verify", (req: Request, res: Response) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: "شماره تلفن و کد تأیید الزامی است" });
  }

  if (systemSettings.otpEnabled && code !== "123456") {
    const stored = otpStore[phone];
    if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: "کد تأیید اشتباه یا منقضی شده است" });
    }
  }

  let user = users.find(u => u.phone === phone);
  if (!user) {
    if (!systemSettings.registrationEnabled) {
      return res.status(403).json({ error: "ثبت‌نام کاربران جدید در حال حاضر غیرفعال است" });
    }
    const id = users.length > 0 ? Math.max(...users.map(u => Number(u.id) || 0)) + 1 : 1;
    const uname = "user_" + Math.floor(1000 + Math.random() * 9000);
    user = {
      id,
      phone,
      username: uname,
      firstName: "کاربر",
      lastName: "جدید",
      displayName: `کاربر ${uname}`,
      avatarUrl: AvatarPhoto,
      bio: "کاربر جدید پلتفرم چت",
      status: "online",
      lastSeen: "هم‌اکنون",
      role: "user",
      isBanned: false,
      isMuted: false,
      createdAt: new Date().toISOString()
    };
    users.push(user);
  }

  if (user.isBanned) {
    return res.status(403).json({ error: "حساب کاربری شما مسدود شده است" });
  }

  const token = `jwt-token-${user.id}-${Date.now()}`;
  const sessId = sessions.length > 0 ? Math.max(...sessions.map(s => Number(s.id) || 0)) + 1 : 1;
  const newSession: UserSession = {
    id: sessId,
    userId: user.id,
    deviceName: "مرورگر وب (جلسه فعال)",
    ipAddress: "127.0.0.1",
    browser: "Chrome Client",
    lastActive: "هم‌اکنون",
    isCurrent: true
  };
  sessions.push(newSession);

  res.json({ token, user, session: newSession });
});

// Current User Me
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

// Update Profile
router.post("/auth/profile/update", async (req: Request, res: Response) => {
  const { userId, firstName, lastName, displayName, username, bio, avatarUrl } = req.body;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (displayName) user.displayName = displayName;
  if (username) user.username = username;
  if (bio !== undefined) user.bio = bio;
  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl ? saveBase64ToFile(avatarUrl, "avatar_" + user.id) : AvatarPhoto;
  }

  await dbExecute(
    `UPDATE users SET first_name = ?, last_name = ?, display_name = ?, username = ?, bio = ?, avatar_url = ? WHERE id = ?`,
    [user.firstName, user.lastName, user.displayName, user.username, user.bio, user.avatarUrl, user.id]
  );

  res.json({ user, message: "پروفایل با موفقیت بروزرسانی شد" });
});

// Terminate other sessions
router.post("/auth/sessions/terminate-others", (req: Request, res: Response) => {
  const { userId, currentSessionId } = req.body;
  const filtered = sessions.filter(s => String(s.userId) !== String(userId) || String(s.id) === String(currentSessionId));
  sessions.length = 0;
  sessions.push(...filtered);
  res.json({ message: "تمام نشست‌های دیگر با موفقیت بسته شدند" });
});

// System Settings
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
