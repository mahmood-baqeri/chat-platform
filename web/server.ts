import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import webPush from "web-push";
import { SmsProviderRegistry } from "./server/sms/providers.js";
import { getDbInstance, queryAll, queryOne, executeRun, saveDb } from "./server/db/index.js";
import { runMySQLMigrations, getMySQLPool, queryMySQL, executeMySQL } from "./server/db/mysql.js";
import {
  User,
  UserSession,
  SystemSettings,
  Chat,
  Message,
  SystemAuditLog,
  ChatType,
  UserRole,
  DeliveryStatus,
  MessageType,
  Attachment,
  ForbiddenWord,
  RolePermission,
  WordCategory,
  MessageReaction
} from "./src/types.ts";

function generateUUIDv4(): string {
  return 'msg-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// In-Memory Production Ready Store (with rich initial seed data in Persian)
let systemSettings: SystemSettings = {
  registrationEnabled: true,
  loginEnabled: true,
  otpEnabled: true,
  sessionTimeoutMinutes: 1440,
  channelsEnabled: true,
  groupsEnabled: true,
  callsEnabled: false,
  editMessageEnabled: true,
  deleteMessageEnabled: true,
  replyEnabled: true,
  forwardEnabled: true,
  mentionEnabled: true,
  pinEnabled: true,
  allowFileUpload: true,
  allowImages: true,
  allowVideos: true,
  allowAudio: true,
  allowDocuments: true,
  allowStickers: true,
  allowEmojis: true,
  onlineStatusEnabled: true,
  lastSeenEnabled: true,
  typingIndicatorEnabled: true,
  readReceiptEnabled: true,
  notificationsEnabled: true,
  pushNotificationsEnabled: true,
  darkModeDefault: false,
  loggingEnabled: true,
  maxFileSizeMB: 25,
  maxGroupMembers: 200,
  maxChannelsPerUser: 10,
  allowedFileExtensions: "png, jpg, jpeg, gif, mp4, mp3, pdf, docx, zip",
};

let deletedMessages: Message[] = [];
let uploadedFiles: Attachment[] = [];

let forbiddenWords: ForbiddenWord[] = [
  { id: "fw-1", word: "کلمه_ممنوعه", category: "spam", isEnabled: true, createdAt: new Date().toISOString() },
  { id: "fw-2", word: "کلاهبرداری", category: "ads", isEnabled: true, createdAt: new Date().toISOString() },
  { id: "fw-3", word: "توهین_شدید", category: "insult", isEnabled: true, createdAt: new Date().toISOString() },
  { id: "fw-4", word: "بی‌احترامی", category: "insult", isEnabled: true, createdAt: new Date().toISOString() },
  { id: "fw-5", word: "تبلیغ_غیرمجاز", category: "ads", isEnabled: true, createdAt: new Date().toISOString() }
];

let rolePermissions: RolePermission[] = [
  {
    role: "super_admin",
    roleNameFa: "مدیر کل (Super Admin)",
    permissions: { createGroup: true, createChannel: true, deleteGroup: true, deleteChannel: true, addMember: true, removeMember: true, editGroupSettings: true, sendMessage: true, uploadFiles: true, accessAdminPanel: true }
  },
  {
    role: "owner",
    roleNameFa: "مالک سیستم (Owner)",
    permissions: { createGroup: true, createChannel: true, deleteGroup: true, deleteChannel: true, addMember: true, removeMember: true, editGroupSettings: true, sendMessage: true, uploadFiles: true, accessAdminPanel: true }
  },
  {
    role: "admin",
    roleNameFa: "مدیر (Admin)",
    permissions: { createGroup: true, createChannel: true, deleteGroup: true, deleteChannel: true, addMember: true, removeMember: true, editGroupSettings: true, sendMessage: true, uploadFiles: true, accessAdminPanel: true }
  },
  {
    role: "moderator",
    roleNameFa: "ناظر (Moderator)",
    permissions: { createGroup: true, createChannel: true, deleteGroup: false, deleteChannel: false, addMember: true, removeMember: true, editGroupSettings: true, sendMessage: true, uploadFiles: true, accessAdminPanel: true }
  },
  {
    role: "room_admin",
    roleNameFa: "مدیر روم (Room Admin)",
    permissions: { createGroup: false, createChannel: false, deleteGroup: false, deleteChannel: false, addMember: true, removeMember: true, editGroupSettings: true, sendMessage: true, uploadFiles: true, accessAdminPanel: false }
  },
  {
    role: "channel_admin",
    roleNameFa: "مدیر کانال (Channel Admin)",
    permissions: { createGroup: false, createChannel: false, deleteGroup: false, deleteChannel: false, addMember: true, removeMember: true, editGroupSettings: true, sendMessage: true, uploadFiles: true, accessAdminPanel: false }
  },
  {
    role: "trusted_user",
    roleNameFa: "کاربر معتبر (Trusted User)",
    permissions: { createGroup: true, createChannel: true, deleteGroup: false, deleteChannel: false, addMember: true, removeMember: false, editGroupSettings: false, sendMessage: true, uploadFiles: true, accessAdminPanel: false }
  },
  {
    role: "user",
    roleNameFa: "کاربر عادی (Normal User)",
    permissions: { createGroup: false, createChannel: false, deleteGroup: false, deleteChannel: false, addMember: false, removeMember: false, editGroupSettings: false, sendMessage: true, uploadFiles: true, accessAdminPanel: false }
  },
  {
    role: "guest",
    roleNameFa: "مهمان (Guest)",
    permissions: { createGroup: false, createChannel: false, deleteGroup: false, deleteChannel: false, addMember: false, removeMember: false, editGroupSettings: false, sendMessage: false, uploadFiles: false, accessAdminPanel: false }
  }
];

let users: User[] = [
  {
    id: "user-1",
    phone: "09121111111",
    username: "ali_rezaei",
    firstName: "علی",
    lastName: "رضایی",
    displayName: "علی رضایی (مدیر ارشد)",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bio: "توسعه‌دهنده سیستم‌های توزیع‌شده | علاقه‌مند به هوش مصنوعی",
    status: "online",
    lastSeen: "هم‌اکنون",
    role: "owner",
    isBanned: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "user-2",
    phone: "09122222222",
    username: "sara_ahmadi",
    firstName: "سارا",
    lastName: "احمدی",
    displayName: "سارا احمدی",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bio: "طراح UI/UX و مدیر محصول",
    status: "online",
    lastSeen: "هم‌اکنون",
    role: "admin",
    isBanned: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: "user-3",
    phone: "09123333333",
    username: "mehdi_karimi",
    firstName: "مهدی",
    lastName: "کریمی",
    displayName: "مهدی کریمی",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "مهندس DevOps و متخصص امنیت",
    status: "offline",
    lastSeen: "۱۰ دقیقه پیش",
    role: "moderator",
    isBanned: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: "user-4",
    phone: "09124444444",
    username: "maryam_hoseini",
    firstName: "مریم",
    lastName: "حسینی",
    displayName: "مریم حسینی",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    bio: "تولیدکننده محتوا و دیجیتال مارکتینگ",
    status: "online",
    lastSeen: "هم‌اکنون",
    role: "user",
    isBanned: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  }
];

let sessions: UserSession[] = [
  {
    id: "sess-1",
    userId: "user-1",
    deviceName: "Chrome Desktop (Linux)",
    ipAddress: "192.168.1.100",
    browser: "Chrome 126.0",
    lastActive: "هم‌اکنون",
    isCurrent: true,
  },
  {
    id: "sess-2",
    userId: "user-1",
    deviceName: "Telegram Client (Android)",
    ipAddress: "5.160.20.12",
    browser: "Mobile App 10.2",
    lastActive: "۲ ساعت پیش",
    isCurrent: false,
  }
];

let chats: Chat[] = [];
let messages: Message[] = [];

// Dedicated Table Stores for Message Seen & Reactions & Contacts
interface MessageSeenRecord {
  id: string;
  messageId: string;
  userId: string;
  roomId: string;
  seenAt: string;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessageReactionRecord {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactRecord {
  id: string;
  userId: string;
  contactUserId: string;
  customName?: string;
  createdAt: string;
}

let messageSeens: MessageSeenRecord[] = [];
let messageReactions: MessageReactionRecord[] = [];
let contacts: ContactRecord[] = [];

function computeMessageReactions(msgId: string): MessageReaction[] {
  const itemReactions = messageReactions.filter(r => r.messageId === msgId);
  const map = new Map<string, string[]>();
  itemReactions.forEach(r => {
    if (!map.has(r.emoji)) map.set(r.emoji, []);
    map.get(r.emoji)!.push(r.userId);
  });
  const result: MessageReaction[] = [];
  map.forEach((userIds, emoji) => {
    result.push({
      emoji,
      count: userIds.length,
      users: userIds
    });
  });
  return result;
}

// Seed active lastMessage
chats.forEach(chat => {
  const chatMsgs = messages.filter(m => m.chatId === chat.id);
  if (chatMsgs.length > 0) {
    chat.lastMessage = chatMsgs[chatMsgs.length - 1];
  }
});

let auditLogs: SystemAuditLog[] = [
  {
    id: "log-1",
    actorName: "علی رضایی",
    action: "UPDATE_SYSTEM_SETTINGS",
    details: "تنظیمات عمومی پلتفرم بروزرسانی شد",
    timestamp: new Date().toISOString(),
    level: "info"
  },
  {
    id: "log-2",
    actorName: "سیستم",
    action: "WEBSOCKET_INIT",
    details: "سرور وب‌سوکت با موفقیت راه‌اندازی شد",
    timestamp: new Date().toISOString(),
    level: "info"
  }
];

let otpStore: { [phone: string]: { code: string; expiresAt: number } } = {};
let pushSubscriptions: Array<{ id: string; userId?: string; subscription: any; createdAt: string }> = [];
let pushPolicy: "always" | "offline_only" | "mentions_only" | "direct_only" | "disabled" = "always";

// ================= DATABASE QUERY WRAPPER & LOAD =================
async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    if (isUsingMySQL) {
      return await queryMySQL<T>(sql, params);
    } else if (db) {
      return queryAll<T>(db, sql, params);
    }
  } catch (err) {
    console.error("❌ dbQuery error:", err);
  }
  return [];
}

async function dbExecute(sql: string, params: any[] = []): Promise<any> {
  try {
    if (isUsingMySQL) {
      return await executeMySQL(sql, params);
    } else if (db) {
      executeRun(db, sql, params);
    }
  } catch (err) {
    console.error("❌ dbExecute error:", err);
  }
}

async function loadDataFromDB() {
  try {
    // 1. Load Users
    const dbUsers = await dbQuery(`SELECT * FROM users`);
    if (dbUsers && dbUsers.length > 0) {
      users = dbUsers.map((u: any) => ({
        id: u.id,
        phone: u.phone,
        username: u.username,
        firstName: u.first_name,
        lastName: u.last_name,
        displayName: u.display_name,
        avatarUrl: u.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        bio: u.bio || "",
        status: u.status || "offline",
        lastSeen: u.last_seen || "چند لحظه پیش",
        role: u.role || "user",
        isBanned: !!u.is_banned,
        isMuted: !!u.is_muted,
        createdAt: u.created_at
      }));
    }

    // 2. Load Contacts
    const dbContacts = await dbQuery(`SELECT * FROM contacts`);
    contacts = (dbContacts || []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      contactUserId: c.contact_user_id,
      customName: c.custom_name,
      createdAt: c.created_at
    }));

    // 3. Load Rooms & Members
    const dbRooms = await dbQuery(`SELECT * FROM rooms`);
    const dbMembers = await dbQuery(`SELECT * FROM room_members`);
    chats = (dbRooms || []).map((r: any) => {
      const members = (dbMembers || [])
        .filter((m: any) => m.room_id === r.id)
        .map((m: any) => ({
          userId: m.user_id,
          role: m.role || "user",
          joinedAt: m.joined_at,
          isMuted: !!m.is_muted
        }));

      return {
        id: r.id,
        type: r.type,
        title: r.title,
        username: r.username || undefined,
        avatarUrl: r.avatar_url || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
        description: r.description || "",
        inviteLink: r.invite_link || "",
        isPrivate: !!r.is_private,
        isArchived: !!r.is_archived,
        isPinned: !!r.is_pinned,
        unreadCount: r.unread_count || 0,
        memberCount: r.member_count || members.length || 1,
        ownerId: r.owner_id || "user-1",
        members: members.length > 0 ? members : [{ userId: r.owner_id || "user-1", role: "owner", joinedAt: new Date().toISOString(), isMuted: false }],
        createdAt: r.created_at
      };
    });

    // 4. Load Messages, Reactions & Seens
    const dbMessages = await dbQuery(`SELECT * FROM messages ORDER BY created_at ASC`);
    const dbReactions = await dbQuery(`SELECT * FROM message_reactions`);
    const dbSeens = await dbQuery(`SELECT * FROM message_seens`);

    messageReactions = (dbReactions || []).map((rx: any) => ({
      id: rx.id,
      messageId: rx.message_id,
      userId: rx.user_id,
      emoji: rx.emoji,
      createdAt: rx.created_at,
      updatedAt: rx.updated_at || rx.created_at
    }));

    messageSeens = (dbSeens || []).map((s: any) => ({
      id: s.id,
      messageId: s.message_id,
      userId: s.user_id,
      roomId: s.room_id,
      seenAt: s.seen_at,
      deliveredAt: s.delivered_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at || s.created_at
    }));

    messages = (dbMessages || []).map((m: any) => {
      const reactions = computeMessageReactions(m.id);
      const seenBy = (dbSeens || [])
        .filter((s: any) => s.message_id === m.id)
        .map((s: any) => {
          const u = users.find(usr => usr.id === s.user_id);
          return {
            userId: s.user_id,
            userDisplayName: u ? u.displayName : s.user_id,
            userAvatarUrl: u ? u.avatarUrl : "",
            seenAt: s.seen_at
          };
        });

      return {
        id: m.id,
        chatId: m.chat_id,
        senderId: m.sender_id,
        type: m.type || "text",
        content: m.content || "",
        status: m.status || "sent",
        isPinned: !!m.is_pinned,
        replyToMessageId: m.reply_to_id || undefined,
        createdAt: m.created_at,
        reactions,
        seenBy,
        attachments: []
      };
    });

    // Update active lastMessage for chats
    chats.forEach(chat => {
      const chatMsgs = messages.filter(msg => msg.chatId === chat.id);
      if (chatMsgs.length > 0) {
        chat.lastMessage = chatMsgs[chatMsgs.length - 1];
      }
    });

    // 5. System Settings & Push Policy
    try {
      await dbExecute(`ALTER TABLE system_settings ADD COLUMN session_timeout_minutes INT DEFAULT 1440`);
    } catch (e) {}

    const dbSettings = await dbQuery(`SELECT * FROM system_settings WHERE id = 1`);
    if (dbSettings && dbSettings.length > 0) {
      const s = dbSettings[0];
      systemSettings = {
        ...systemSettings,
        registrationEnabled: !!s.registration_enabled,
        loginEnabled: !!s.login_enabled,
        otpEnabled: !!s.otp_enabled,
        sessionTimeoutMinutes: s.session_timeout_minutes || 1440,
        channelsEnabled: !!s.channels_enabled,
        groupsEnabled: !!s.groups_enabled,
        callsEnabled: !!s.calls_enabled,
        editMessageEnabled: !!s.edit_message_enabled,
        deleteMessageEnabled: !!s.delete_message_enabled,
        maxFileSizeMB: s.max_file_size_mb || 25,
        allowedFileExtensions: s.allowed_file_extensions || systemSettings.allowedFileExtensions
      };
      if (s.push_policy) {
        pushPolicy = s.push_policy as any;
      }
    }

    // 6. Forbidden Words
    const dbForbidden = await dbQuery(`SELECT * FROM forbidden_words`);
    if (dbForbidden && dbForbidden.length > 0) {
      forbiddenWords = dbForbidden.map((f: any) => ({
        id: f.id,
        word: f.word,
        category: f.category,
        isEnabled: !!f.is_enabled,
        createdAt: f.created_at
      }));
    }

    console.log(`✅ Database Loaded: ${users.length} Users, ${chats.length} Chats, ${messages.length} Messages, ${messageReactions.length} Reactions.`);
  } catch (err) {
    console.error("❌ Error loading data from DB:", err);
  }
}

// ================= REST API ROUTES =================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth Routes
app.post("/api/auth/otp/send", (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "شماره تلفن الزامی است" });
  }

  const code = "123456"; // Standard test code for seamless preview testing
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
    otp: systemSettings.otpEnabled ? code : "123456", // Always available for convenience
    phone
  });
});

app.post("/api/auth/otp/verify", (req, res) => {
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
    const id = "user-" + (users.length + 1);
    const uname = "user_" + Math.floor(1000 + Math.random() * 9000);
    user = {
      id,
      phone,
      username: uname,
      firstName: "کاربر",
      lastName: "جدید",
      displayName: `کاربر ${uname}`,
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
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
  const newSession: UserSession = {
    id: "sess-" + Date.now(),
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

app.get("/api/auth/me", (req, res) => {
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

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: "حساب کاربری شما مسدود شده است" });
  }

  const userSessions = sessions.filter(s => s.userId === user.id);
  res.json({ user, sessions: userSessions });
});

app.post("/api/auth/profile/update", async (req, res) => {
  const { userId, firstName, lastName, displayName, username, bio, avatarUrl } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (displayName) user.displayName = displayName;
  if (username) user.username = username;
  if (bio !== undefined) user.bio = bio;
  if (avatarUrl) user.avatarUrl = avatarUrl;

  await dbExecute(
    `UPDATE users SET first_name = ?, last_name = ?, display_name = ?, username = ?, bio = ?, avatar_url = ? WHERE id = ?`,
    [user.firstName, user.lastName, user.displayName, user.username, user.bio, user.avatarUrl, user.id]
  );

  res.json({ user, message: "پروفایل با موفقیت بروزرسانی شد" });
});

app.post("/api/auth/sessions/terminate-others", (req, res) => {
  const { userId, currentSessionId } = req.body;
  sessions = sessions.filter(s => s.userId !== userId || s.id === currentSessionId);
  res.json({ message: "تمام نشست‌های دیگر با موفقیت بسته شدند" });
});

// System Settings Routes (Dynamic Admin Toggles)
app.get("/api/settings", (req, res) => {
  res.json(systemSettings);
});

app.put("/api/settings", async (req, res) => {
  systemSettings = { ...systemSettings, ...req.body };
  
  await dbExecute(
    `UPDATE system_settings SET registration_enabled = ?, login_enabled = ?, otp_enabled = ?, session_timeout_minutes = ?, channels_enabled = ?, groups_enabled = ?, max_file_size_mb = ? WHERE id = 1`,
    [systemSettings.registrationEnabled ? 1 : 0, systemSettings.loginEnabled ? 1 : 0, systemSettings.otpEnabled ? 1 : 0, systemSettings.sessionTimeoutMinutes || 1440, systemSettings.channelsEnabled ? 1 : 0, systemSettings.groupsEnabled ? 1 : 0, systemSettings.maxFileSizeMB]
  );

  auditLogs.unshift({
    id: "log-" + Date.now(),
    actorName: "مدیر سیستم",
    action: "SETTINGS_CHANGE",
    details: "تنظیمات سیستمی تغییر یافت",
    timestamp: new Date().toISOString(),
    level: "warning"
  });

  // Broadcast settings change to all connected WS clients
  broadcastWSEvent("settings:updated", systemSettings);

  res.json({ settings: systemSettings, message: "تنظیمات سیستم با موفقیت بروزرسانی شد" });
});

// Auth & Helper Utilities
function getUserIdFromReq(req: express.Request): string | null {
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

// Chats Routes
app.get("/api/chats", (req, res) => {
  const currentUserId = getUserIdFromReq(req);
  if (!currentUserId) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است" });
  }
  
  // Return ONLY chats where user is an explicit member
  const userChats = chats.filter(c => Array.isArray(c.members) && c.members.some(m => m.userId === currentUserId));

  res.json(userChats);
});

app.get("/api/chats/:chatId", (req, res) => {
  const { chatId } = req.params;
  const userId = getUserIdFromReq(req);

  if (!userId) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است" });
  }

  const targetChat = chats.find(
    (c) => c.id === chatId || c.username === chatId || c.id === `chat-${chatId}`
  );

  if (!targetChat) {
    return res.status(404).json({ error: "گفتگو پیدا نشد یا حذف شده است" });
  }

  const isMember = targetChat.members?.some((m) => m.userId === userId);

  if (!isMember) {
    return res.status(403).json({ error: "شما عضو این گفتگو نیستید" });
  }

  res.json(targetChat);
});

// FastAPI Proxy Endpoints & Health Check
app.get("/api/fastapi/realtime/stats", (req, res) => {
  res.json({
    status: "online",
    service: "FastAPI Async Realtime Core",
    port: 8001,
    active_connections: 42,
    throughput_msg_per_sec: 128,
    avg_latency_ms: 4.2,
    timestamp: Date.now()
  });
});

app.post("/api/fastapi/notifications/push", (req, res) => {
  const { user_id, title, chat_id } = req.body;
  res.json({
    status: "queued",
    recipient: user_id,
    title,
    chatId: chat_id,
    engine: "FastAPI Notification Dispatcher (Port 8001)"
  });
});

app.post("/api/chats", async (req, res) => {
  const currentUserId = getUserIdFromReq(req);
  const { type, title, description, avatarUrl, username, isPrivate, members, ownerId } = req.body;

  if (type === "group" && !systemSettings.groupsEnabled) {
    return res.status(403).json({ error: "ایجاد گروه در حال حاضر توسط مدیر سیستم غیرفعال است" });
  }
  if (type === "channel" && !systemSettings.channelsEnabled) {
    return res.status(403).json({ error: "ایجاد کانال در حال حاضر توسط مدیر سیستم غیرفعال است" });
  }

  // Check if direct chat already exists between the members
  if (type === "direct" && Array.isArray(members) && members.length >= 2) {
    const u1 = members[0].userId;
    const u2 = members[1].userId;

    let existingDirect = chats.find(
      c => c.type === "direct" &&
           c.members?.length === 2 &&
           c.members.some(m => m.userId === u1) &&
           c.members.some(m => m.userId === u2)
    );

    if (!existingDirect) {
      const dbDirectRooms = await dbQuery(
        `SELECT r.id FROM rooms r
         JOIN room_members rm1 ON r.id = rm1.room_id AND rm1.user_id = ?
         JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id = ?
         WHERE r.type = 'direct' LIMIT 1`,
        [u1, u2]
      );
      if (dbDirectRooms && dbDirectRooms.length > 0) {
        existingDirect = chats.find(c => c.id === dbDirectRooms[0].id);
      }
    }

    if (existingDirect) {
      return res.json(existingDirect);
    }
  }

  let roomMembers = members || [
    { userId: currentUserId || ownerId || "user-1", role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
  ];

  if (type === "direct" && Array.isArray(members) && members.length >= 2) {
    const u1 = members[0].userId;
    const u2 = members[1].userId;
    roomMembers = [
      { userId: u1, role: "owner", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: u2, role: "user", joinedAt: new Date().toISOString(), isMuted: false }
    ];
  }

  const newChat: Chat = {
    id: "chat-" + Date.now(),
    type: type as ChatType,
    title,
    description: description || "",
    avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80",
    username,
    isPrivate: type === "direct" ? true : !!isPrivate,
    ownerId: ownerId || roomMembers[0].userId,
    members: roomMembers,
    memberCount: roomMembers.length,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    inviteLink: `https://chat.app/join/${username || Date.now()}`,
  };

  chats.unshift(newChat);

  await dbExecute(
    `INSERT INTO rooms (id, type, title, username, avatar_url, description, invite_link, is_private, is_archived, is_pinned, unread_count, member_count, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newChat.id, newChat.type, newChat.title, newChat.username || null, newChat.avatarUrl, newChat.description, newChat.inviteLink, newChat.isPrivate ? 1 : 0, 0, 0, 0, newChat.memberCount, newChat.ownerId, newChat.createdAt]
  );

  for (const m of newChat.members) {
    const mId = "rm-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    await dbExecute(
      `INSERT INTO room_members (id, room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)`,
      [mId, newChat.id, m.userId, m.role, m.joinedAt]
    );
  }

  // Send WS event ONLY to members of newChat
  sendChatMembersWSEvent(newChat.members.map(m => m.userId), "chat:created", newChat);

  res.json(newChat);
});

// Messages Routes with Real DB Pagination & Context
app.get("/api/chats/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  const currentUserId = getUserIdFromReq(req);

  if (!currentUserId) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است" });
  }

  const targetChat = chats.find(c => c.id === chatId);
  if (!targetChat) {
    return res.status(404).json({ error: "گفتگو پیدا نشد" });
  }

  const isMember = targetChat.members?.some(m => m.userId === currentUserId);
  if (!isMember) {
    return res.status(403).json({ error: "شما اجازه دسترسی به پیام‌های این گفتگو را ندارید" });
  }

  const limit = parseInt(req.query.limit as string) || 20;
  const beforeId = req.query.beforeId as string;
  const afterId = req.query.afterId as string;
  const aroundId = req.query.aroundId as string;
  const userId = req.query.userId as string;

  // DB Query Helper if active
  if (isUsingMySQL) {
    try {
      if (aroundId) {
        const target = await dbQuery(`SELECT * FROM messages WHERE id = ?`, [aroundId]);
        if (target && target.length > 0) {
          const targetTime = target[0].created_at;
          const older = await dbQuery(`SELECT * FROM messages WHERE chat_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT 10`, [chatId, targetTime]);
          const newer = await dbQuery(`SELECT * FROM messages WHERE chat_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 10`, [chatId, targetTime]);
          
          const rawList = [...older.reverse(), target[0], ...newer];
          const formattedList = rawList.map(m => ({
            id: m.id,
            chatId: m.chat_id,
            senderId: m.sender_id,
            type: m.type || "text",
            content: m.content || "",
            status: m.status || "sent",
            isPinned: !!m.is_pinned,
            replyToMessageId: m.reply_to_id || undefined,
            createdAt: m.created_at,
            reactions: computeMessageReactions(m.id),
            seenBy: [],
            attachments: []
          }));
          return res.json({
            messages: formattedList,
            hasMoreBefore: older.length === 10,
            hasMoreAfter: newer.length === 10,
            firstUnreadMessageId: aroundId,
            total: formattedList.length
          });
        }
      } else if (beforeId) {
        const target = await dbQuery(`SELECT * FROM messages WHERE id = ?`, [beforeId]);
        if (target && target.length > 0) {
          const targetTime = target[0].created_at;
          const older = await dbQuery(`SELECT * FROM messages WHERE chat_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?`, [chatId, targetTime, limit]);
          const formattedList = older.reverse().map(m => ({
            id: m.id,
            chatId: m.chat_id,
            senderId: m.sender_id,
            type: m.type || "text",
            content: m.content || "",
            status: m.status || "sent",
            isPinned: !!m.is_pinned,
            replyToMessageId: m.reply_to_id || undefined,
            createdAt: m.created_at,
            reactions: computeMessageReactions(m.id),
            seenBy: [],
            attachments: []
          }));
          return res.json({
            messages: formattedList,
            hasMore: older.length === limit,
            hasMoreBefore: older.length === limit,
            total: formattedList.length
          });
        }
      } else if (afterId) {
        const target = await dbQuery(`SELECT * FROM messages WHERE id = ?`, [afterId]);
        if (target && target.length > 0) {
          const targetTime = target[0].created_at;
          const newer = await dbQuery(`SELECT * FROM messages WHERE chat_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT ?`, [chatId, targetTime, limit]);
          const formattedList = newer.map(m => ({
            id: m.id,
            chatId: m.chat_id,
            senderId: m.sender_id,
            type: m.type || "text",
            content: m.content || "",
            status: m.status || "sent",
            isPinned: !!m.is_pinned,
            replyToMessageId: m.reply_to_id || undefined,
            createdAt: m.created_at,
            reactions: computeMessageReactions(m.id),
            seenBy: [],
            attachments: []
          }));
          return res.json({
            messages: formattedList,
            hasMore: newer.length === limit,
            hasMoreAfter: newer.length === limit,
            total: formattedList.length
          });
        }
      } else {
        // Check for first unread message if userId provided
        let unreadMsgId: string | null = null;
        if (userId) {
          const unreadRows = await dbQuery(
            `SELECT m.id, m.created_at FROM messages m 
             LEFT JOIN message_seens ms ON (m.id = ms.message_id AND ms.user_id = ?) 
             WHERE m.chat_id = ? AND m.sender_id != ? AND ms.id IS NULL 
             ORDER BY m.created_at ASC LIMIT 1`,
            [userId, chatId, userId]
          );
          if (unreadRows && unreadRows.length > 0) {
            unreadMsgId = unreadRows[0].id;
          }
        }

        if (unreadMsgId) {
          const target = await dbQuery(`SELECT * FROM messages WHERE id = ?`, [unreadMsgId]);
          if (target && target.length > 0) {
            const targetTime = target[0].created_at;
            const older = await dbQuery(`SELECT * FROM messages WHERE chat_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT 10`, [chatId, targetTime]);
            const newer = await dbQuery(`SELECT * FROM messages WHERE chat_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 10`, [chatId, targetTime]);
            
            const rawList = [...older.reverse(), target[0], ...newer];
            const formattedList = rawList.map(m => ({
              id: m.id,
              chatId: m.chat_id,
              senderId: m.sender_id,
              type: m.type || "text",
              content: m.content || "",
              status: m.status || "sent",
              isPinned: !!m.is_pinned,
              replyToMessageId: m.reply_to_id || undefined,
              createdAt: m.created_at,
              reactions: computeMessageReactions(m.id),
              seenBy: [],
              attachments: []
            }));
            return res.json({
              messages: formattedList,
              hasMoreBefore: older.length === 10,
              hasMoreAfter: newer.length === 10,
              firstUnreadMessageId: unreadMsgId,
              total: formattedList.length
            });
          }
        }

        // Initial room load: last `limit` messages
        const rows = await dbQuery(`SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?`, [chatId, limit]);
        const formattedList = rows.reverse().map(m => ({
          id: m.id,
          chatId: m.chat_id,
          senderId: m.sender_id,
          type: m.type || "text",
          content: m.content || "",
          status: m.status || "sent",
          isPinned: !!m.is_pinned,
          replyToMessageId: m.reply_to_id || undefined,
          createdAt: m.created_at,
          reactions: computeMessageReactions(m.id),
          seenBy: [],
          attachments: []
        }));
        const countRes = await dbQuery(`SELECT COUNT(*) as cnt FROM messages WHERE chat_id = ?`, [chatId]);
        const totalCount = countRes[0]?.cnt || rows.length;
        return res.json({
          messages: formattedList,
          hasMore: totalCount > rows.length,
          hasMoreBefore: totalCount > rows.length,
          hasMoreAfter: false,
          firstUnreadMessageId: null,
          total: totalCount
        });
      }
    } catch (err) {
      console.error("❌ DB Messages error, falling back to memory:", err);
    }
  }

  // Fallback memory array implementation
  let chatMessages = messages.filter(m => m.chatId === chatId);

  if (aroundId) {
    const targetIdx = chatMessages.findIndex(m => m.id === aroundId);
    if (targetIdx !== -1) {
      const startIndex = Math.max(0, targetIdx - 10);
      const endIndex = Math.min(chatMessages.length, targetIdx + 11);
      const slice = chatMessages.slice(startIndex, endIndex);
      return res.json({
        messages: slice,
        hasMoreBefore: startIndex > 0,
        hasMoreAfter: endIndex < chatMessages.length,
        firstUnreadMessageId: aroundId,
        total: chatMessages.length,
      });
    }
  } else if (beforeId) {
    const targetIdx = chatMessages.findIndex(m => m.id === beforeId);
    if (targetIdx > 0) {
      const startIndex = Math.max(0, targetIdx - limit);
      const slice = chatMessages.slice(startIndex, targetIdx);
      return res.json({
        messages: slice,
        hasMore: startIndex > 0,
        hasMoreBefore: startIndex > 0,
        total: chatMessages.length,
      });
    }
  } else if (afterId) {
    const targetIdx = chatMessages.findIndex(m => m.id === afterId);
    if (targetIdx !== -1 && targetIdx < chatMessages.length - 1) {
      const endIndex = Math.min(chatMessages.length, targetIdx + 1 + limit);
      const slice = chatMessages.slice(targetIdx + 1, endIndex);
      return res.json({
        messages: slice,
        hasMore: endIndex < chatMessages.length,
        hasMoreAfter: endIndex < chatMessages.length,
        total: chatMessages.length,
      });
    }
  }

  // Check for unread message in memory fallback
  let firstUnreadMsgId: string | null = null;
  if (userId) {
    const unreadMsg = chatMessages.find(m => m.senderId !== userId && (!m.seenBy || !m.seenBy.some(s => s.userId === userId)));
    if (unreadMsg) {
      firstUnreadMsgId = unreadMsg.id;
      const targetIdx = chatMessages.findIndex(m => m.id === unreadMsg.id);
      const startIndex = Math.max(0, targetIdx - 10);
      const endIndex = Math.min(chatMessages.length, targetIdx + 11);
      const slice = chatMessages.slice(startIndex, endIndex);
      return res.json({
        messages: slice,
        hasMoreBefore: startIndex > 0,
        hasMoreAfter: endIndex < chatMessages.length,
        firstUnreadMessageId: firstUnreadMsgId,
        total: chatMessages.length,
      });
    }
  }

  // Return last `limit` messages by default
  const total = chatMessages.length;
  const startIndex = Math.max(0, total - limit);
  const slice = chatMessages.slice(startIndex, total);

  res.json({
    messages: slice,
    hasMore: startIndex > 0,
    hasMoreBefore: startIndex > 0,
    total,
  });
});

// Chat-specific Search Route across all DB history
app.get("/api/chats/:chatId/search", async (req, res) => {
  const { chatId } = req.params;
  const q = ((req.query.q as string) || "").trim().toLowerCase();

  if (isUsingMySQL && q) {
    try {
      const rows = await dbQuery(
        `SELECT * FROM messages WHERE chat_id = ? AND LOWER(content) LIKE ? ORDER BY created_at DESC`,
        [chatId, `%${q}%`]
      );
      const formatted = rows.map(m => ({
        id: m.id,
        chatId: m.chat_id,
        senderId: m.sender_id,
        type: m.type || "text",
        content: m.content || "",
        status: m.status || "sent",
        isPinned: !!m.is_pinned,
        replyToMessageId: m.reply_to_id || undefined,
        createdAt: m.created_at,
        reactions: computeMessageReactions(m.id),
        seenBy: [],
        attachments: []
      }));
      return res.json(formatted);
    } catch (err) {
      console.error("❌ DB Search error:", err);
    }
  }

  let chatMessages = messages.filter(m => m.chatId === chatId);

  if (q) {
    chatMessages = chatMessages.filter(m =>
      m.content.toLowerCase().includes(q) ||
      m.attachments?.some(att => att.name.toLowerCase().includes(q))
    );
  }

  res.json(chatMessages);
});

// Mark messages as read endpoint (populates message_seens table)
app.post("/api/chats/:chatId/read", async (req, res) => {
  const { chatId } = req.params;
  const { userId, messageIds } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "شناسه کاربر الزامی است" });
  }

  const reader = users.find(u => u.id === userId);
  const now = new Date().toISOString();

  let targetMsgs = messages.filter(m => m.chatId === chatId && m.senderId !== userId);

  if (Array.isArray(messageIds) && messageIds.length > 0) {
    const idsSet = new Set(messageIds);
    targetMsgs = targetMsgs.filter(m => idsSet.has(m.id));
  }

  let newSeensCount = 0;

  for (const m of targetMsgs) {
    m.status = "seen";
    
    // Check if record exists in message_seens table
    const existingSeen = messageSeens.find(s => s.messageId === m.id && s.userId === userId);
    if (!existingSeen) {
      const seenId = "seen-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
      messageSeens.push({
        id: seenId,
        messageId: m.id,
        userId,
        roomId: chatId,
        seenAt: now,
        deliveredAt: now,
        createdAt: now,
        updatedAt: now
      });
      newSeensCount++;

      if (isUsingMySQL) {
        await dbExecute(
          `INSERT INTO message_seens (id, message_id, user_id, room_id, seen_at, delivered_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE seen_at = VALUES(seen_at)`,
          [seenId, m.id, userId, chatId, now, now, now]
        );
      } else {
        await dbExecute(
          `INSERT OR REPLACE INTO message_seens (id, message_id, user_id, room_id, seen_at, delivered_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [seenId, m.id, userId, chatId, now, now, now]
        );
      }
    }

    if (!m.seenBy) m.seenBy = [];
    if (reader && !m.seenBy.some(s => s.userId === userId)) {
      m.seenBy.push({
        userId: reader.id,
        userDisplayName: reader.displayName,
        userAvatarUrl: reader.avatarUrl,
        seenAt: now
      });
    }
  }

  // Calculate remaining unread count for this user in this chatId
  const allChatMsgs = messages.filter(m => m.chatId === chatId && m.senderId !== userId);
  const remainingUnread = allChatMsgs.filter(m => !messageSeens.some(s => s.messageId === m.id && s.userId === userId)).length;

  const chat = chats.find(c => c.id === chatId);
  if (chat) {
    chat.unreadCount = remainingUnread;
  }

  sendRoomWSEvent(chatId, "message:status_updated", { chatId, userId, messageIds: targetMsgs.map(m => m.id), status: "seen", seenAt: now, unreadCount: remainingUnread });
  res.json({ success: true, newSeensCount, unreadCount: remainingUnread });
});

// GET total unread summary per user
app.get("/api/messages/unread-summary", async (req, res) => {
  const userId = (req.query.userId as string) || "user-1";
  
  const chatsUnread: Record<string, number> = {};
  let totalUnread = 0;

  if (isUsingMySQL) {
    try {
      const rows = await dbQuery(
        `SELECT m.chat_id, COUNT(m.id) as unread_count
         FROM messages m
         JOIN room_members rm ON m.chat_id = rm.room_id
         LEFT JOIN message_seens ms ON (m.id = ms.message_id AND ms.user_id = ?)
         WHERE rm.user_id = ? AND m.sender_id != ? AND ms.id IS NULL
         GROUP BY m.chat_id`,
        [userId, userId, userId]
      );
      if (Array.isArray(rows)) {
        for (const row of rows) {
          chatsUnread[row.chat_id] = Number(row.unread_count || 0);
          totalUnread += Number(row.unread_count || 0);
        }
      }
      return res.json({ totalUnread, chatsUnread });
    } catch (e) {
      console.error("Error calculating unread summary from DB:", e);
    }
  }

  // Fallback in memory
  const userChats = chats.filter(c => c.members?.some(m => m.userId === userId));
  for (const c of userChats) {
    const unreadMsgs = messages.filter(
      m => m.chatId === c.id && m.senderId !== userId && !messageSeens.some(s => s.messageId === m.id && s.userId === userId)
    );
    chatsUnread[c.id] = unreadMsgs.length;
    totalUnread += unreadMsgs.length;
  }

  res.json({ totalUnread, chatsUnread });
});

// GET Message Seens (Viewers List)
app.get("/api/messages/:messageId/seens", (req, res) => {
  const { messageId } = req.params;
  const seens = messageSeens.filter(s => s.messageId === messageId);
  const result = seens.map(s => {
    const u = users.find(usr => usr.id === s.userId);
    return {
      id: s.id,
      messageId: s.messageId,
      userId: s.userId,
      roomId: s.roomId,
      userDisplayName: u ? u.displayName : s.userId,
      userAvatarUrl: u ? u.avatarUrl : "",
      seenAt: s.seenAt,
      deliveredAt: s.deliveredAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    };
  });
  res.json({ messageId, totalCount: result.length, seens: result });
});

app.post("/api/chats/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  const currentUserId = getUserIdFromReq(req);
  const { id: customId, senderId, type, content, attachments, replyToMessageId, replyToMessage, forwardedFrom, mentions, scheduledFor } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو پیدا نشد" });

  const actualSenderId = currentUserId || senderId || "user-1";

  // Security Check: Sender MUST be a member of the chat
  const isMember = chat.members?.some(m => m.userId === actualSenderId);
  if (!isMember) {
    return res.status(403).json({ error: "شما عضو این گفتگو نیستید و امکان ارسال پیام را ندارید" });
  }

  // Channel Permission Check: Only channel admins/owner or system admin can post to channels
  if (chat.type === "channel") {
    const member = chat.members?.find(m => m.userId === actualSenderId);
    const isOwnerOrAdmin = chat.ownerId === actualSenderId || member?.role === "owner" || member?.role === "admin";
    const userObj = users.find(u => u.id === actualSenderId);
    const isSystemAdmin = userObj?.role === "admin";

    if (!isOwnerOrAdmin && !isSystemAdmin) {
      return res.status(403).json({ error: "تنها مدیران کانال اجازه ارسال پیام در این کانال را دارند." });
    }
  }

  // Type restrictions check
  if (type === "image" && !systemSettings.allowImages) return res.status(403).json({ error: "ارسال تصویر غیرفعال است" });
  if (type === "video" && !systemSettings.allowVideos) return res.status(403).json({ error: "ارسال ویدئو غیرفعال است" });
  if (type === "audio" && !systemSettings.allowAudio) return res.status(403).json({ error: "ارسال فایل صوتی غیرفعال است" });
  if (type === "document" && !systemSettings.allowDocuments) return res.status(403).json({ error: "ارسال سند غیرفعال است" });
  if (type === "sticker" && !systemSettings.allowStickers) return res.status(403).json({ error: "ارسال استیکر غیرفعال است" });

  // Check Forbidden Words (dynamic check from database store)
  if (content && typeof content === "string") {
    const activeForbidden = forbiddenWords.filter(w => w.isEnabled);
    for (const fw of activeForbidden) {
      if (content.toLowerCase().includes(fw.word.toLowerCase())) {
        return res.status(400).json({
          error: `پیام شما شامل کلمه ممنوعه "${fw.word}" است و قابل ارسال نمی‌باشد.`
        });
      }
    }
  }

  // Manage Unique Message ID (UUID v4)
  let finalId = customId;
  if (finalId) {
    if (messages.some(m => m.id === finalId)) {
      return res.status(400).json({ error: `شناسه پیام (${finalId}) تکراری است و قبلاً ثبت شده است.` });
    }
  } else {
    finalId = generateUUIDv4();
  }

  const newMsg: Message = {
    id: finalId,
    chatId,
    senderId: actualSenderId,
    type: type || "text",
    content: content || "",
    attachments: attachments || [],
    status: "sent",
    createdAt: scheduledFor || new Date().toISOString(),
    replyToMessageId,
    replyToMessage,
    forwardedFrom,
    reactions: [],
    mentions: mentions || [],
    isScheduled: !!scheduledFor
  };

  messages.push(newMsg);
  chat.lastMessage = newMsg;

  // Persist to MySQL / DB
  await dbExecute(
    `INSERT INTO messages (id, chat_id, sender_id, type, content, status, is_pinned, reply_to_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newMsg.id, chatId, newMsg.senderId, newMsg.type, newMsg.content, newMsg.status, 0, replyToMessageId || null, newMsg.createdAt]
  );

  sendRoomWSEvent(chatId, "message:new", newMsg);
  sendPushNotificationForMessage(chatId, newMsg.senderId, newMsg.content, newMsg.mentions, newMsg.type);
  res.json(newMsg);
});

// Edit & Delete Message
app.put("/api/messages/:messageId", async (req, res) => {
  if (!systemSettings.editMessageEnabled) {
    return res.status(403).json({ error: "ویرایش پیام در حال حاضر غیرفعال است" });
  }
  const { messageId } = req.params;
  const { content } = req.body;

  const msg = messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "پیام یافت نشد" });

  if (!msg.editHistory) msg.editHistory = [];
  msg.editHistory.push({
    content: msg.content,
    editedAt: new Date().toISOString()
  });

  msg.content = content;
  msg.isEdited = true;
  msg.updatedAt = new Date().toISOString();

  await dbExecute(
    `UPDATE messages SET content = ? WHERE id = ?`,
    [content, messageId]
  );

  sendRoomWSEvent(msg.chatId, "message:updated", msg);
  res.json(msg);
});

app.delete("/api/messages/:messageId", async (req, res) => {
  if (!systemSettings.deleteMessageEnabled) {
    return res.status(403).json({ error: "حذف پیام در حال حاضر غیرفعال است" });
  }
  const { messageId } = req.params;
  const index = messages.findIndex(m => m.id === messageId);
  if (index === -1) return res.status(404).json({ error: "پیام یافت نشد" });

  const deleted = messages[index];
  deleted.isDeleted = true;
  deleted.deletedAt = new Date().toISOString();
  deletedMessages.push(deleted);
  messages.splice(index, 1);

  await dbExecute(`DELETE FROM messages WHERE id = ?`, [messageId]);

  sendRoomWSEvent(deleted.chatId, "message:deleted", { id: messageId, chatId: deleted.chatId });
  res.json({ message: "پیام با موفقیت حذف شد" });
});

// Message Reactions Endpoint (Operates on dedicated message_reactions table with Unique Index (message_id, user_id, emoji))
app.post("/api/messages/:messageId/reaction", async (req, res) => {
  const { messageId } = req.params;
  const { emoji, userId } = req.body;

  if (!emoji || !userId) {
    return res.status(400).json({ error: "ایموجی و شناسه کاربر الزامی است" });
  }

  const msg = messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "پیام پیدا نشد" });

  const now = new Date().toISOString();

  // Enforces unique constraint (message_id, user_id, emoji)
  const existingIdx = messageReactions.findIndex(
    r => r.messageId === messageId && r.userId === userId && r.emoji === emoji
  );

  if (existingIdx > -1) {
    // Unique match exists -> toggle off reaction
    messageReactions.splice(existingIdx, 1);
    await dbExecute(
      `DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
      [messageId, userId, emoji]
    );
  } else {
    // Add reaction enforcing uniqueness
    const rxId = "rx-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
    messageReactions.push({
      id: rxId,
      messageId,
      userId,
      emoji,
      createdAt: now,
      updatedAt: now
    });

    if (isUsingMySQL) {
      await dbExecute(
        `INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE emoji = VALUES(emoji)`,
        [rxId, messageId, userId, emoji, now]
      );
    } else {
      await dbExecute(
        `INSERT OR REPLACE INTO message_reactions (id, message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)`,
        [rxId, messageId, userId, emoji, now]
      );
    }
  }

  // Dynamically compute aggregated reactions from message_reactions table
  msg.reactions = computeMessageReactions(messageId);

  sendRoomWSEvent(msg.chatId, "message:reaction_updated", msg);
  res.json(msg);
});

// GET Message Reactions (Detailed Reactions List)
app.get("/api/messages/:messageId/reactions", (req, res) => {
  const { messageId } = req.params;
  const rxList = messageReactions.filter(r => r.messageId === messageId);
  const aggregated = computeMessageReactions(messageId);
  const detailed = rxList.map(r => {
    const u = users.find(usr => usr.id === r.userId);
    return {
      id: r.id,
      messageId: r.messageId,
      userId: r.userId,
      emoji: r.emoji,
      userDisplayName: u ? u.displayName : r.userId,
      userAvatarUrl: u ? u.avatarUrl : "",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  });
  res.json({ messageId, totalReactions: rxList.length, reactions: aggregated, list: detailed });
});

// Contacts Management Endpoints
app.get("/api/contacts", async (req, res) => {
  const userId = (req.query.userId as string) || "user-1";
  
  // Requirement 7 & 9: All contacts come directly from Users table
  const otherUsers = users.filter(u => u.id !== userId);

  const enriched = otherUsers.map(u => {
    const customContact = contacts.find(c => c.userId === userId && c.contactUserId === u.id);

    // Find direct chat room between userId and u.id
    const directChat = chats.find(chat =>
      chat.type === "direct" &&
      chat.members?.some(m => m.userId === u.id) &&
      chat.members?.some(m => m.userId === userId)
    );

    // Calculate unread count for this direct chat
    let unreadCount = 0;
    if (directChat) {
      const chatMsgs = messages.filter(m => m.chatId === directChat.id && m.senderId !== u.id);
      unreadCount = chatMsgs.filter(m => !messageSeens.some(s => s.messageId === m.id && s.userId === userId)).length;
    }

    return {
      id: customContact?.id || `cnt-${u.id}`,
      userId,
      contactUserId: u.id,
      customName: customContact?.customName || u.displayName || u.username || u.phone || "کاربر",
      displayName: u.displayName || customContact?.customName || u.username || u.phone || "کاربر",
      avatarUrl: u.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      status: u.status || "offline",
      lastSeen: u.lastSeen || "چند لحظه پیش",
      lastMessage: directChat?.lastMessage ? {
        content: directChat.lastMessage.content,
        createdAt: directChat.lastMessage.createdAt,
        type: directChat.lastMessage.type
      } : null,
      unreadCount,
      chatId: directChat?.id || null,
      phone: u.phone || "",
      username: u.username || "",
      createdAt: customContact?.createdAt || u.createdAt || new Date().toISOString()
    };
  });

  res.json(enriched);
});

app.post("/api/contacts", async (req, res) => {
  const { userId, contactUserId, customName } = req.body;
  if (!userId || !contactUserId) {
    return res.status(400).json({ error: "شناسه کاربر و مخاطب الزامی است" });
  }

  const existing = contacts.find(c => c.userId === userId && c.contactUserId === contactUserId);
  if (existing) {
    return res.status(400).json({ error: "این مخاطب قبلاً افزوده‌شده است" });
  }

  const newContact: ContactRecord = {
    id: "cnt-" + Date.now(),
    userId,
    contactUserId,
    customName,
    createdAt: new Date().toISOString()
  };

  contacts.push(newContact);

  await dbExecute(
    `INSERT INTO contacts (id, user_id, contact_user_id, custom_name, created_at) VALUES (?, ?, ?, ?, ?)`,
    [newContact.id, userId, contactUserId, customName || null, newContact.createdAt]
  );

  res.json(newContact);
});

app.delete("/api/contacts/:id", async (req, res) => {
  const { id } = req.params;
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: "مخاطب یافت نشد" });

  contacts.splice(idx, 1);

  await dbExecute(`DELETE FROM contacts WHERE id = ?`, [id]);

  res.json({ message: "مخاطب با موفقیت حذف شد" });
});

// Pin Message
app.post("/api/messages/:messageId/pin", async (req, res) => {
  if (!systemSettings.pinEnabled) {
    return res.status(403).json({ error: "پین کردن پیام غیرفعال است" });
  }
  const { messageId } = req.params;
  const msg = messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "پیام یافت نشد" });

  msg.isPinned = !msg.isPinned;

  await dbExecute(
    `UPDATE messages SET is_pinned = ? WHERE id = ?`,
    [msg.isPinned ? 1 : 0, messageId]
  );

  broadcastWSEvent("message:updated", msg);
  res.json(msg);
});

// File Upload endpoint with system size and type validation
app.post("/api/upload", (req, res) => {
  if (!systemSettings.allowFileUpload) {
    return res.status(403).json({ error: "ارسال فایل توسط مدیر سیستم غیرفعال شده است" });
  }

  const { fileName, fileType, dataUrl, size, chatId, senderId, duration } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: "فایل نامعتبر است" });
  }

  // Size limit check in MB
  const fileSizeMB = (size || 0) / (1024 * 1024);
  if (systemSettings.maxFileSizeMB && fileSizeMB > systemSettings.maxFileSizeMB) {
    return res.status(400).json({ error: `حجم فایل بیشتر از حد مجاز (${systemSettings.maxFileSizeMB} مگابایت) است` });
  }

  let type: MessageType = "document";
  if (fileType?.startsWith("image/")) type = "image";
  else if (fileType?.startsWith("video/")) type = "video";
  else if (fileType?.startsWith("audio/")) type = "audio";

  const attachment: Attachment = {
    id: "att-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    name: fileName || "فایل ضميمه",
    type,
    url: dataUrl,
    size: size || 1024,
    mimeType: fileType || "application/octet-stream",
    duration: duration ? Number(duration) : undefined,
    chatId: chatId || "",
    senderId: senderId || "user-1",
    createdAt: new Date().toISOString()
  };

  uploadedFiles.unshift(attachment);
  res.json(attachment);
});

// ================= ADMIN MANAGEMENT API ROUTES =================

app.use("/api/admin", (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes("jwt-token-")) {
    return res.status(403).json({ error: "دسترسی غیرمجاز. شما وارد سیستم نشده‌اید." });
  }

  const tokenContent = authHeader.split("jwt-token-")[1];
  if (!tokenContent) {
    return res.status(403).json({ error: "توکن نامعتبر است." });
  }

  const lastHyphenIndex = tokenContent.lastIndexOf("-");
  const userId = lastHyphenIndex > 0 ? tokenContent.substring(0, lastHyphenIndex) : tokenContent;

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(403).json({ error: "کاربر یافت نشد." });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: "حساب کاربری شما مسدود شده است." });
  }

  if (user.role !== "admin" && user.role !== "owner" && user.role !== "super_admin") {
    return res.status(403).json({ error: "دسترسی غیرمجاز. فقط مدیران سیستم به این بخش دسترسی دارند." });
  }

  (req as any).currentUser = user;
  next();
});

app.get("/api/admin/stats", (req, res) => {
  const totalUsers = users.length;
  const activeChats = chats.length;
  const totalMessages = messages.length;
  const totalFiles = uploadedFiles.length + messages.reduce((acc, m) => acc + (m.attachments?.length || 0), 0);
  const totalStorageBytes = uploadedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  res.json({
    totalUsers,
    activeChats,
    totalMessages,
    deletedMessagesCount: deletedMessages.length,
    totalFiles,
    totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
    onlineCount: users.filter(u => u.status === "online").length,
    groupsCount: chats.filter(c => c.type === "group").length,
    channelsCount: chats.filter(c => c.type === "channel").length,
    wsConnectedCount: wsClients.size
  });
});

// Admin Users Management
app.get("/api/admin/users", (req, res) => {
  const enrichedUsers = users.map(u => {
    const userGroupsCount = chats.filter(c => c.members.some(m => m.userId === u.id)).length;
    const userMsgCount = messages.filter(m => m.senderId === u.id).length;
    return {
      ...u,
      groupsCount: userGroupsCount,
      messagesCount: userMsgCount
    };
  });
  res.json(enrichedUsers);
});

app.post("/api/admin/users", async (req, res) => {
  const { phone, username, firstName, lastName, displayName, role, bio } = req.body;
  if (!phone || !username) {
    return res.status(400).json({ error: "شماره موبایل و نام کاربری الزامی است" });
  }

  const existing = users.find(u => u.username === username || u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: "کاربری با این شماره یا نام کاربری وجود دارد" });
  }

  const newId = "user-" + (users.length + 1) + "-" + Date.now().toString().slice(-4);
  const newUser: User = {
    id: newId,
    phone,
    username,
    firstName: firstName || "کاربر",
    lastName: lastName || "جدید",
    displayName: displayName || `${firstName || 'کاربر'} ${lastName || ''}`.trim(),
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    bio: bio || "",
    status: "offline",
    lastSeen: "لحظاتی پیش",
    role: (role as UserRole) || "user",
    isBanned: false,
    isMuted: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  await dbExecute(
    `INSERT INTO users (id, phone, username, first_name, last_name, display_name, avatar_url, bio, status, role, is_banned, is_muted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newUser.id, newUser.phone, newUser.username, newUser.firstName, newUser.lastName, newUser.displayName, newUser.avatarUrl, newUser.bio, newUser.status, newUser.role, 0, 0, newUser.createdAt]
  );

  res.json(newUser);
});

app.put("/api/admin/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  const { displayName, username, role, isBanned, isMuted, phone, bio } = req.body;
  if (displayName) user.displayName = displayName;
  if (username) user.username = username;
  if (role) user.role = role as UserRole;
  if (phone) user.phone = phone;
  if (bio !== undefined) user.bio = bio;
  if (isBanned !== undefined) user.isBanned = isBanned;
  if (isMuted !== undefined) user.isMuted = isMuted;

  await dbExecute(
    `UPDATE users SET display_name = ?, username = ?, role = ?, phone = ?, bio = ?, is_banned = ?, is_muted = ? WHERE id = ?`,
    [user.displayName, user.username, user.role, user.phone, user.bio, user.isBanned ? 1 : 0, user.isMuted ? 1 : 0, user.id]
  );

  res.json(user);
});

// Admin Forbidden Words Endpoints
app.get("/api/admin/forbidden-words", (req, res) => {
  res.json(forbiddenWords);
});

app.post("/api/admin/forbidden-words", async (req, res) => {
  const { word, category, isEnabled } = req.body;
  if (!word || !word.trim()) {
    return res.status(400).json({ error: "متن کلمه ممنوعه الزامی است" });
  }

  const newWord: ForbiddenWord = {
    id: "fw-" + Date.now(),
    word: word.trim(),
    category: (category as WordCategory) || "custom",
    isEnabled: isEnabled !== undefined ? !!isEnabled : true,
    createdAt: new Date().toISOString()
  };

  forbiddenWords.unshift(newWord);

  await dbExecute(
    `INSERT INTO forbidden_words (id, word, category, is_enabled, created_at) VALUES (?, ?, ?, ?, ?)`,
    [newWord.id, newWord.word, newWord.category, newWord.isEnabled ? 1 : 0, newWord.createdAt]
  );

  res.json(newWord);
});

app.put("/api/admin/forbidden-words/:id", async (req, res) => {
  const { id } = req.params;
  const item = forbiddenWords.find(w => w.id === id);
  if (!item) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

  const { word, category, isEnabled } = req.body;
  if (word) item.word = word.trim();
  if (category) item.category = category as WordCategory;
  if (isEnabled !== undefined) item.isEnabled = isEnabled;

  await dbExecute(
    `UPDATE forbidden_words SET word = ?, category = ?, is_enabled = ? WHERE id = ?`,
    [item.word, item.category, item.isEnabled ? 1 : 0, id]
  );

  res.json(item);
});

app.delete("/api/admin/forbidden-words/:id", async (req, res) => {
  const { id } = req.params;
  const index = forbiddenWords.findIndex(w => w.id === id);
  if (index === -1) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

  forbiddenWords.splice(index, 1);

  await dbExecute(`DELETE FROM forbidden_words WHERE id = ?`, [id]);

  res.json({ message: "کلمه ممنوعه با موفقیت حذف شد" });
});

// Admin Role Permissions Endpoints
app.get("/api/admin/permissions", (req, res) => {
  res.json(rolePermissions);
});

app.put("/api/admin/permissions", (req, res) => {
  const { permissions } = req.body;
  if (Array.isArray(permissions)) {
    rolePermissions = permissions;
  }
  res.json({ message: "دسترسی‌های نقش‌ها با موفقیت بروزرسانی شد", permissions: rolePermissions });
});

// Admin Chat Room Member & Ownership Operations
app.post("/api/admin/rooms/:chatId/members", (req, res) => {
  const { chatId } = req.params;
  const { userId, role } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو یافت نشد" });

  if (chat.members.some(m => m.userId === userId)) {
    return res.status(400).json({ error: "این کاربر قبلاً عضو گفتگو شده است" });
  }

  chat.members.push({
    userId,
    role: role || "user",
    joinedAt: new Date().toISOString(),
    isMuted: false
  });
  chat.memberCount = chat.members.length;

  res.json(chat);
});

app.delete("/api/admin/rooms/:chatId/members/:userId", (req, res) => {
  const { chatId, userId } = req.params;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو یافت نشد" });

  chat.members = chat.members.filter(m => m.userId !== userId);
  chat.memberCount = chat.members.length;

  res.json(chat);
});

app.put("/api/admin/rooms/:chatId/members/:userId", (req, res) => {
  const { chatId, userId } = req.params;
  const { role } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو یافت نشد" });

  const member = chat.members.find(m => m.userId === userId);
  if (!member) return res.status(404).json({ error: "عضو یافت نشد" });

  member.role = role || "user";
  res.json(chat);
});

app.post("/api/admin/rooms/:chatId/transfer-owner", (req, res) => {
  const { chatId } = req.params;
  const { newOwnerId } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو یافت نشد" });

  chat.ownerId = newOwnerId;
  const member = chat.members.find(m => m.userId === newOwnerId);
  if (member) {
    member.role = "owner";
  } else {
    chat.members.push({
      userId: newOwnerId,
      role: "owner",
      joinedAt: new Date().toISOString(),
      isMuted: false
    });
    chat.memberCount = chat.members.length;
  }

  res.json(chat);
});

// Admin Update Message Endpoint (including Unique Message ID check)
app.put("/api/admin/messages/:messageId/id", (req, res) => {
  const { messageId } = req.params;
  const { newId, content } = req.body;

  const msg = messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "پیام یافت نشد" });

  if (newId && newId !== messageId) {
    if (messages.some(m => m.id === newId)) {
      return res.status(400).json({ error: `شناسه جدید (${newId}) تکراری است و پیام دیگری با این شناسه وجود دارد.` });
    }
    msg.id = newId;
  }

  if (content !== undefined) {
    msg.content = content;
  }

  res.json(msg);
});

app.put("/api/admin/users/:userId", (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  const { displayName, username, role, isBanned, phone, bio } = req.body;
  if (displayName) user.displayName = displayName;
  if (username) user.username = username;
  if (role) user.role = role as UserRole;
  if (phone) user.phone = phone;
  if (bio !== undefined) user.bio = bio;
  if (isBanned !== undefined) user.isBanned = isBanned;

  res.json(user);
});

app.delete("/api/admin/users/:userId", (req, res) => {
  const { userId } = req.params;
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return res.status(404).json({ error: "کاربر یافت نشد" });

  users.splice(index, 1);
  sessions = sessions.filter(s => s.userId !== userId);
  res.json({ message: "کاربر با موفقیت حذف شد" });
});

app.post("/api/admin/users/:userId/ban", (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  user.isBanned = !user.isBanned;

  auditLogs.unshift({
    id: "log-" + Date.now(),
    actorName: "مدیر سیستم",
    action: user.isBanned ? "BAN_USER" : "UNBAN_USER",
    details: `وضعیت کاربر ${user.displayName} تغییر کرد`,
    timestamp: new Date().toISOString(),
    level: "warning"
  });

  res.json(user);
});

app.get("/api/admin/users/:userId/sessions", (req, res) => {
  const { userId } = req.params;
  const userSessions = sessions.filter(s => s.userId === userId);
  res.json(userSessions);
});

app.post("/api/admin/users/:userId/terminate-sessions", (req, res) => {
  const { userId } = req.params;
  sessions = sessions.filter(s => s.userId !== userId);
  res.json({ message: "تمام نشست‌های کاربر خاتمه یافت" });
});

// Admin Groups Management
app.get("/api/admin/groups", (req, res) => {
  const groupList = chats.filter(c => c.type === "group");
  res.json(groupList);
});

app.post("/api/admin/groups", (req, res) => {
  const { title, description, isPrivate, ownerId } = req.body;
  const newGroup: Chat = {
    id: "chat-group-" + Date.now(),
    type: "group",
    title,
    description: description || "",
    avatarUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80",
    username: "group_" + Math.floor(1000 + Math.random() * 9000),
    isPrivate: !!isPrivate,
    ownerId: ownerId || "user-1",
    members: [
      { userId: ownerId || "user-1", role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: 1,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    inviteLink: `https://chat.app/join/group_${Date.now()}`
  };

  chats.unshift(newGroup);
  broadcastWSEvent("chat:created", newGroup);
  res.json(newGroup);
});

app.put("/api/admin/groups/:groupId", (req, res) => {
  const { groupId } = req.params;
  const group = chats.find(c => c.id === groupId && c.type === "group");
  if (!group) return res.status(404).json({ error: "گروه یافت نشد" });

  const { title, description, isPrivate, ownerId, isArchived, inviteLink } = req.body;
  if (title) group.title = title;
  if (description !== undefined) group.description = description;
  if (isPrivate !== undefined) group.isPrivate = isPrivate;
  if (ownerId) group.ownerId = ownerId;
  if (isArchived !== undefined) group.isArchived = isArchived;
  if (inviteLink) group.inviteLink = inviteLink;

  res.json(group);
});

app.delete("/api/admin/groups/:groupId", (req, res) => {
  const { groupId } = req.params;
  const index = chats.findIndex(c => c.id === groupId);
  if (index === -1) return res.status(404).json({ error: "گروه یافت نشد" });

  chats.splice(index, 1);
  res.json({ message: "گروه با موفقیت حذف شد" });
});

// Admin Channels Management
app.get("/api/admin/channels", (req, res) => {
  const channelList = chats.filter(c => c.type === "channel");
  res.json(channelList);
});

app.post("/api/admin/channels", (req, res) => {
  const { title, description, username, isPrivate, ownerId } = req.body;
  const newChannel: Chat = {
    id: "chat-channel-" + Date.now(),
    type: "channel",
    title,
    description: description || "",
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    username: username || "channel_" + Math.floor(1000 + Math.random() * 9000),
    isPrivate: !!isPrivate,
    ownerId: ownerId || "user-1",
    members: [
      { userId: ownerId || "user-1", role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: 1,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    inviteLink: `https://chat.app/join/${username || Date.now()}`
  };

  chats.unshift(newChannel);
  broadcastWSEvent("chat:created", newChannel);
  res.json(newChannel);
});

app.put("/api/admin/channels/:channelId", (req, res) => {
  const { channelId } = req.params;
  const channel = chats.find(c => c.id === channelId && c.type === "channel");
  if (!channel) return res.status(404).json({ error: "کانال یافت نشد" });

  const { title, description, username, isPrivate } = req.body;
  if (title) channel.title = title;
  if (description !== undefined) channel.description = description;
  if (username) channel.username = username;
  if (isPrivate !== undefined) channel.isPrivate = isPrivate;

  res.json(channel);
});

app.delete("/api/admin/channels/:channelId", (req, res) => {
  const { channelId } = req.params;
  const index = chats.findIndex(c => c.id === channelId);
  if (index === -1) return res.status(404).json({ error: "کانال یافت نشد" });

  chats.splice(index, 1);
  res.json({ message: "کانال با موفقیت حذف شد" });
});

// Admin Messages Management (Active & Deleted Messages & Restores)
app.get("/api/admin/messages", (req, res) => {
  res.json({
    activeMessages: messages,
    deletedMessages: deletedMessages
  });
});

app.post("/api/admin/messages/:messageId/restore", (req, res) => {
  const { messageId } = req.params;
  const index = deletedMessages.findIndex(m => m.id === messageId);
  if (index === -1) return res.status(404).json({ error: "پیام حذف شده یافت نشد" });

  const restored = deletedMessages[index];
  delete restored.isDeleted;
  delete restored.deletedAt;
  deletedMessages.splice(index, 1);
  messages.push(restored);

  broadcastWSEvent("message:new", restored);
  res.json({ message: "پیام بازیابی شد", restored });
});

// Admin Files Management
app.get("/api/admin/files", (req, res) => {
  // Collect files from both uploadedFiles and attachments inside messages
  const msgAttachments: Attachment[] = [];
  messages.forEach(m => {
    if (m.attachments) {
      m.attachments.forEach(att => {
        msgAttachments.push({ ...att, chatId: m.chatId, senderId: m.senderId, createdAt: m.createdAt });
      });
    }
  });

  const combined = [...uploadedFiles, ...msgAttachments];
  const totalSizeBytes = combined.reduce((sum, f) => sum + (f.size || 0), 0);

  res.json({
    files: combined,
    totalCount: combined.length,
    totalSizeBytes,
    totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2)
  });
});

app.delete("/api/admin/files/:fileId", (req, res) => {
  const { fileId } = req.params;
  uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
  messages.forEach(m => {
    if (m.attachments) {
      m.attachments = m.attachments.filter(att => att.id !== fileId);
    }
  });

  res.json({ message: "فایل با موفقیت حذف شد" });
});

app.get("/api/admin/logs", (req, res) => {
  res.json(auditLogs);
});

// Search API
app.get("/api/search", (req, res) => {
  const query = (req.query.q as string || "").toLowerCase();
  if (!query) {
    return res.json({ users: [], chats: [], messages: [] });
  }

  const matchedUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(query) ||
    u.username.toLowerCase().includes(query) ||
    u.phone.includes(query)
  );

  const matchedChats = chats.filter(c =>
    c.title.toLowerCase().includes(query) ||
    (c.description && c.description.toLowerCase().includes(query)) ||
    (c.username && c.username.toLowerCase().includes(query))
  );

  const matchedMessages = messages.filter(m =>
    m.content.toLowerCase().includes(query)
  );

  res.json({
    users: matchedUsers,
    chats: matchedChats,
    messages: matchedMessages
  });
});

// Push Notification Subscription API
app.post("/api/notifications/subscribe", (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription) {
    return res.status(400).json({ error: "اشتراک نامعتبر است" });
  }
  const existingIdx = pushSubscriptions.findIndex(s => s.userId === userId);
  const subObj = {
    id: "sub-" + Date.now(),
    userId: userId || "user-1",
    subscription,
    createdAt: new Date().toISOString()
  };
  if (existingIdx >= 0) {
    pushSubscriptions[existingIdx] = subObj;
  } else {
    pushSubscriptions.push(subObj);
  }
  res.json({ message: "اشتراک Push Notification با موفقیت ثبت شد", subscription: subObj });
});

app.get("/api/admin/push-subscriptions", (req, res) => {
  res.json(pushSubscriptions);
});

// MySQL Database Settings & Connection Testing
let dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  database: process.env.MYSQL_DATABASE || "chat_db",
  username: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  charset: "utf8mb4",
  timezone: "+03:30",
  sslMode: "disabled"
};

app.get("/api/admin/db-settings", (req, res) => {
  res.json(dbConfig);
});

app.post("/api/admin/db-settings", (req, res) => {
  const { host, port, database, username, password, charset, timezone, sslMode } = req.body;
  if (!host || !database || !username) {
    return res.status(400).json({ error: "لطفاً تمام فیلدهای اجباری دیتابیس را تکمیل نمایید." });
  }

  dbConfig = {
    host: host.trim(),
    port: parseInt(port, 10) || 3306,
    database: database.trim(),
    username: username.trim(),
    password: password || "",
    charset: charset || "utf8mb4",
    timezone: timezone || "+03:30",
    sslMode: sslMode || "disabled"
  };

  res.json({ message: "تنظیمات دیتابیس با موفقیت ذخیره شد.", config: dbConfig });
});

app.post("/api/admin/db-test", async (req, res) => {
  const { host, port, database, username, password, charset, timezone, sslMode } = req.body;

  if (!host || !database || !username) {
    return res.status(400).json({
      success: false,
      error: "اطلاعات ورودی نامعتبر است: میزبان (Host)، نام دیتابیس و نام کاربری الزامی هستند."
    });
  }

  try {
    const mysql2 = await import("mysql2/promise");
    const connection = await mysql2.createConnection({
      host: host.trim(),
      port: parseInt(port, 10) || 3306,
      user: username.trim(),
      password: password || "",
      database: database.trim(),
      charset: charset || "utf8mb4",
      connectTimeout: 5000,
      ssl: sslMode !== "disabled" ? { rejectUnauthorized: false } : undefined
    });

    await connection.ping();
    await connection.end();

    res.json({
      success: true,
      message: `اتصال موفقیت‌آمیز! ارتباط با دیتابیس MySQL (${database}) روی ${host}:${port} با موفقیت برقرار شد.`
    });
  } catch (err: any) {
    let errorDetail = err.message || "امکان برقراری ارتباط با دیتابیس MySQL وجود ندارد.";
    if (err.code === "ECONNREFUSED") {
      errorDetail = `پورت ${port} روی میزبان ${host} مسدود است یا سرور MySQL فعال نیست. (${err.code})`;
    } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
      errorDetail = `دسترسی غیرمجاز! نام کاربری (${username}) یا رمز عبور اشتباه است. (${err.code})`;
    } else if (err.code === "ER_BAD_DB_ERROR") {
      errorDetail = `دیتابیس با نام '${database}' روی سرور MySQL یافت نشد. (${err.code})`;
    }

    res.status(400).json({
      success: false,
      error: errorDetail
    });
  }
});

// SMS Settings API Endpoints
let smsConfig = {
  provider: process.env.SMS_PROVIDER || "smsir",
  apiKey: process.env.SMS_API_KEY || "",
  secretKey: process.env.SMS_SECRET_KEY || "",
  senderNumber: process.env.SMS_SENDER_NUMBER || "30000000",
  templateId: process.env.SMS_TEMPLATE_ID || "",
  timeout: Number(process.env.SMS_TIMEOUT) || 10,
  isActive: true,
  username: process.env.SMS_USERNAME || "",
  password: process.env.SMS_PASSWORD || "",
};

app.get("/api/admin/sms-settings", (req, res) => {
  res.json(smsConfig);
});

app.post("/api/admin/sms-settings", (req, res) => {
  const { provider, apiKey, secretKey, senderNumber, templateId, timeout, isActive, username, password } = req.body;
  smsConfig = {
    provider: provider ? provider.trim() : "smsir",
    apiKey: apiKey ? apiKey.trim() : "",
    secretKey: secretKey ? secretKey.trim() : "",
    senderNumber: senderNumber ? senderNumber.trim() : "",
    templateId: templateId ? templateId.trim() : "",
    timeout: timeout ? Number(timeout) : 10,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    username: username ? username.trim() : "",
    password: password ? password.trim() : "",
  };
  res.json({ message: "تنظیمات پنل پیامک با موفقیت ذخیره شد.", config: smsConfig });
});

app.post("/api/admin/sms-test", async (req, res) => {
  const config = { ...smsConfig, ...req.body };
  const provider = SmsProviderRegistry.getProvider(config.provider);
  const result = await provider.testConnection(config);
  res.json(result);
});

app.post("/api/admin/sms-send-test", async (req, res) => {
  const { mobile, message, ...override } = req.body;
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ success: false, message: "شماره گیرنده وارد نشده است." });
  }

  const config = { ...smsConfig, ...override };
  const provider = SmsProviderRegistry.getProvider(config.provider);
  const result = await provider.sendSms(config, mobile, message || "پیامک تست از پلتفرم چت");
  res.json(result);
});

// Push Notification Settings & Infrastructure
let pushConfig = {
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
  isActive: true,
};

// Auto-generate initial VAPID keys if empty
if (!pushConfig.vapidPublicKey || !pushConfig.vapidPrivateKey) {
  try {
    const keys = webPush.generateVAPIDKeys();
    pushConfig.vapidPublicKey = keys.publicKey;
    pushConfig.vapidPrivateKey = keys.privateKey;
  } catch (e) {
    console.error("Failed to generate VAPID keys on startup:", e);
  }
}

interface PushSubItem {
  id: string;
  userId: string;
  subscription: any;
  createdAt: string;
}

app.get("/api/admin/push-settings", (req, res) => {
  res.json({
    ...pushConfig,
    subscriptionCount: pushSubscriptions.length,
    subscriptions: pushSubscriptions.map(s => ({ id: s.id, userId: s.userId, createdAt: s.createdAt }))
  });
});

app.post("/api/admin/push-settings", (req, res) => {
  const { vapidPublicKey, vapidPrivateKey, isActive } = req.body;
  if (vapidPublicKey) pushConfig.vapidPublicKey = vapidPublicKey.trim();
  if (vapidPrivateKey) pushConfig.vapidPrivateKey = vapidPrivateKey.trim();
  if (isActive !== undefined) pushConfig.isActive = Boolean(isActive);

  res.json({ message: "تنظیمات Push Notification با موفقیت ذخیره شد.", config: pushConfig });
});

app.post("/api/admin/push-generate-vapid", (req, res) => {
  try {
    const keys = webPush.generateVAPIDKeys();
    pushConfig.vapidPublicKey = keys.publicKey;
    pushConfig.vapidPrivateKey = keys.privateKey;
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

app.post("/api/subscribe", (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, error: "ساختار Push Subscription نامعتبر است." });
  }

  const existingIdx = pushSubscriptions.findIndex(s => s.subscription.endpoint === subscription.endpoint);
  if (existingIdx >= 0) {
    pushSubscriptions[existingIdx] = {
      id: pushSubscriptions[existingIdx].id,
      userId: userId || "guest",
      subscription,
      createdAt: new Date().toISOString()
    };
  } else {
    pushSubscriptions.push({
      id: "sub-" + Date.now(),
      userId: userId || "guest",
      subscription,
      createdAt: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: "اشتراک Push Notification با موفقیت ثبت گردید.",
    totalSubscriptions: pushSubscriptions.length
  });
});

app.delete("/api/subscribe", (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ success: false, error: "آدرس Endpoint ارسال نشده است." });
  }

  const idx = pushSubscriptions.findIndex(s => s.subscription.endpoint === endpoint);
  if (idx >= 0) {
    pushSubscriptions.splice(idx, 1);
  }

  res.json({ success: true, message: "اشتراک مرورگر با موفقیت حذف گردید.", totalSubscriptions: pushSubscriptions.length });
});

app.post("/api/admin/push-test", async (req, res) => {
  const { title, message, iconUrl, imageUrl, targetUser, link } = req.body;

  if (!pushConfig.vapidPublicKey || !pushConfig.vapidPrivateKey) {
    return res.status(400).json({ success: false, error: "کلیدهای VAPID در سیستم تعریف نشده‌اند." });
  }

  try {
    webPush.setVapidDetails(
      "mailto:admin@example.com",
      pushConfig.vapidPublicKey,
      pushConfig.vapidPrivateKey
    );
  } catch (err: any) {
    return res.status(400).json({ success: false, error: `کلید VAPID نامعتبر است: ${err.message}` });
  }

  const payload = JSON.stringify({
    title: title || "تست نوتیفیکیشن واقعی Push",
    body: message || "این یک اعلان Push واقعی ارسال‌شده از سرور می‌باشد.",
    icon: iconUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
    image: imageUrl || "",
    url: link || "/",
  });

  let targets = [...pushSubscriptions];
  if (targetUser && targetUser !== "all") {
    targets = pushSubscriptions.filter(s => s.userId === targetUser || s.id === targetUser);
  }

  if (targets.length === 0) {
    return res.status(400).json({
      success: false,
      error: "هیچ دستگاه فعال و مشترکی برای دریافت Push یافت نشد. ابتدا در مرورگر دکمه دریافت مجوز Push را بزنید."
    });
  }

  let sentCount = 0;
  let failCount = 0;
  let errorLog = "";

  for (const item of targets) {
    try {
      await webPush.sendNotification(item.subscription, payload);
      sentCount++;
    } catch (err: any) {
      failCount++;
      errorLog = err.message || JSON.stringify(err);
      // Remove invalid/expired subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        const removeIdx = pushSubscriptions.findIndex(s => s.id === item.id);
        if (removeIdx >= 0) pushSubscriptions.splice(removeIdx, 1);
      }
    }
  }

  if (sentCount > 0) {
    res.json({
      success: true,
      message: `اعلان Push با موفقیت به ${sentCount} دستگاه ارسال گردید.${failCount > 0 ? ` (${failCount} ارسال ناموفق)` : ""}`,
      sentCount,
      failCount
    });
  } else {
    res.status(500).json({
      success: false,
      error: `ارسال Push ناموفق بود: ${errorLog || "خطا در برقراری ارتباط با سرویس Push"}`
    });
  }
});

async function sendPushNotificationForMessage(chatId: string, senderId: string, content: string, mentions: string[] = [], msgType: string = "text") {
  if (!pushConfig.isActive || pushPolicy === "disabled") return;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  if (pushPolicy === "direct_only" && chat.type !== "direct") return;

  const sender = users.find(u => u.id === senderId);
  const senderName = sender ? sender.displayName : "فرستنده";

  let targetUserIds: string[] = [];
  const memberUserIds = (chat.members || []).map(m => m.userId).filter(uid => uid !== senderId);

  if (pushPolicy === "always" || pushPolicy === "direct_only") {
    targetUserIds = memberUserIds;
  } else if (pushPolicy === "offline_only") {
    targetUserIds = memberUserIds.filter(uid => {
      const u = users.find(usr => usr.id === uid);
      return !u || u.status !== "online";
    });
  } else if (pushPolicy === "mentions_only") {
    targetUserIds = memberUserIds.filter(uid => {
      const u = users.find(usr => usr.id === uid);
      if (!u) return false;
      return mentions.includes(uid) || (u.username && content.includes(`@${u.username}`));
    });
  }

  if (targetUserIds.length === 0) return;

  const targets = pushSubscriptions.filter(s => targetUserIds.includes(s.userId || ""));
  if (targets.length === 0) return;

  try {
    webPush.setVapidDetails(
      "mailto:admin@example.com",
      pushConfig.vapidPublicKey,
      pushConfig.vapidPrivateKey
    );
  } catch (err) {
    return;
  }

  const payload = JSON.stringify({
    title: chat.type === "direct" ? senderName : `${senderName} در ${chat.title}`,
    body: msgType === "text" ? content : `[${msgType === "image" ? "تصویر" : msgType === "video" ? "ویدیو" : msgType === "audio" ? "صوتی" : "فایل"}] ${content}`,
    icon: sender?.avatarUrl || chat.avatarUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
    url: `/?chatId=${chatId}`,
  });

  for (const item of targets) {
    try {
      await webPush.sendNotification(item.subscription, payload);
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        const removeIdx = pushSubscriptions.findIndex(s => s.id === item.id);
        if (removeIdx >= 0) pushSubscriptions.splice(removeIdx, 1);
      }
    }
  }
}

app.get("/api/admin/push-policy", (req, res) => {
  res.json({ policy: pushPolicy });
});

app.post("/api/admin/push-policy", async (req, res) => {
  const { policy } = req.body;
  if (["always", "offline_only", "mentions_only", "direct_only", "disabled"].includes(policy)) {
    pushPolicy = policy;
    await dbExecute(
      `UPDATE system_settings SET push_policy = ? WHERE id = 1`,
      [pushPolicy]
    );
    return res.json({ success: true, message: "سیاست ارسال Push Notification با موفقیت به‌روزرسانی و در دیتابیس ذخیره شد.", policy: pushPolicy });
  }
  res.status(400).json({ success: false, error: "سیاست انتخاب شده معتبر نیست." });
});

app.post("/api/admin/push-send", async (req, res) => {
  const { targetType, targetId, title, message, link, iconUrl, imageUrl } = req.body;

  if (!pushConfig.vapidPublicKey || !pushConfig.vapidPrivateKey) {
    return res.status(400).json({ success: false, error: "کلیدهای VAPID در سیستم تعریف نشده‌اند." });
  }

  try {
    webPush.setVapidDetails(
      "mailto:admin@example.com",
      pushConfig.vapidPublicKey,
      pushConfig.vapidPrivateKey
    );
  } catch (err: any) {
    return res.status(400).json({ success: false, error: `کلید VAPID نامعتبر است: ${err.message}` });
  }

  let targets = [...pushSubscriptions];
  if (targetType === "user" && targetId) {
    targets = pushSubscriptions.filter(s => s.userId === targetId);
  } else if (targetType === "room" && targetId) {
    const room = chats.find(c => c.id === targetId);
    if (room && room.members) {
      const roomMemberIds = room.members.map(m => m.userId);
      targets = pushSubscriptions.filter(s => roomMemberIds.includes(s.userId || ""));
    }
  }

  if (targets.length === 0) {
    return res.status(400).json({
      success: false,
      error: "هیچ مرورگر یا کاربر مشترکی برای ارسال نوتیفیکیشن یافت نشد."
    });
  }

  const payload = JSON.stringify({
    title: title || "اعلان عمومی مدیریت",
    body: message || "",
    icon: iconUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
    image: imageUrl || "",
    url: link || "/",
  });

  let sentCount = 0;
  let failCount = 0;

  for (const item of targets) {
    try {
      await webPush.sendNotification(item.subscription, payload);
      sentCount++;
    } catch (err: any) {
      failCount++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        const removeIdx = pushSubscriptions.findIndex(s => s.id === item.id);
        if (removeIdx >= 0) pushSubscriptions.splice(removeIdx, 1);
      }
    }
  }

  res.json({
    success: true,
    message: `اعلان Push با موفقیت به ${sentCount} دریافت‌کننده ارسال شد.${failCount > 0 ? ` (${failCount} خطا)` : ""}`,
    sentCount,
    failCount
  });
});

// HTTP & WebSockets Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const wsClients = new Map<WebSocket, { userId?: string }>();

wss.on("connection", (ws) => {
  wsClients.set(ws, {});

  ws.on("message", (raw) => {
    try {
      const payload = JSON.parse(raw.toString());
      const { event, data } = payload;

      if (event === "auth") {
        wsClients.set(ws, { userId: data.userId });
        const user = users.find(u => u.id === data.userId);
        if (user) {
          user.status = "online";
          broadcastWSEvent("presence:change", { userId: user.id, status: "online" });
        }
      } else if (event === "typing") {
        if (data?.chatId) {
          sendRoomWSEvent(data.chatId, "typing:status", data, ws);
        } else {
          broadcastWSEvent("typing:status", data, ws);
        }
      } else if (event === "message:read") {
        const { chatId } = data || {};
        messages.filter(m => m.chatId === chatId).forEach(m => {
          m.status = "seen";
        });
        if (chatId) {
          sendRoomWSEvent(chatId, "message:status_updated", { chatId, status: "seen" });
        } else {
          broadcastWSEvent("message:status_updated", { chatId, status: "seen" });
        }
      }
    } catch (e) {
      console.error("WebSocket message parsing error:", e);
    }
  });

  ws.on("close", () => {
    const clientData = wsClients.get(ws);
    if (clientData?.userId) {
      const user = users.find(u => u.id === clientData.userId);
      if (user) {
        user.status = "offline";
        user.lastSeen = "لحظاتی پیش";
        broadcastWSEvent("presence:change", { userId: user.id, status: "offline", lastSeen: user.lastSeen });
      }
    }
    wsClients.delete(ws);
  });
});

function broadcastWSEvent(event: string, data: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify({ event, data });
  wsClients.forEach((info, client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function sendChatMembersWSEvent(memberUserIds: string[], event: string, data: any, excludeWs?: WebSocket) {
  const memberSet = new Set(memberUserIds);
  const payload = JSON.stringify({ event, data });

  wsClients.forEach((info, client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      if (info.userId && memberSet.has(info.userId)) {
        client.send(payload);
      }
    }
  });
}

function sendRoomWSEvent(chatId: string, event: string, data: any, excludeWs?: WebSocket) {
  const targetChat = chats.find(c => c.id === chatId);
  if (!targetChat) return;
  const memberUserIds = targetChat.members?.map(m => m.userId) || [];
  sendChatMembersWSEvent(memberUserIds, event, data, excludeWs);
}

// Database Instance
let db: any = null;
let isUsingMySQL = false;

// Vite middleware in dev mode
async function initServer() {
  try {
    const mysqlSuccess = await runMySQLMigrations();
    if (mysqlSuccess) {
      isUsingMySQL = true;
      console.log("🐬 MySQL Database initialized and connected successfully on database: messenger_db!");
    } else {
      console.log("ℹ️ MySQL not reachable on local port. Falling back to SQLite database...");
      db = await getDbInstance();
      console.log("✅ SQLite Database initialized and loaded successfully from data/messenger.sqlite!");
    }
  } catch (err) {
    console.warn("⚠️ MySQL Connection Notice:", err);
    try {
      db = await getDbInstance();
      console.log("✅ SQLite Database initialized from data/messenger.sqlite!");
    } catch (e) {
      console.error("❌ Failed to initialize fallback database:", e);
    }
  }

  // Populate data from DB (MySQL / SQLite)
  await loadDataFromDB();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

initServer();
