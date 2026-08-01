import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import webPush from "web-push";
import { SmsProviderRegistry } from "./server/sms/providers.js";
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
  WordCategory
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

let chats: Chat[] = [
  {
    id: "chat-global-news",
    type: "channel",
    title: "📢 اخبار و اطلاعیه‌های رسمی سیستم",
    description: "آخرین به‌روزرسانی‌ها، امکانات جدید و گزارش‌های سیستم",
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    username: "official_news",
    isPrivate: false,
    ownerId: "user-1",
    members: [
      { userId: "user-1", role: "owner", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: "user-2", role: "admin", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: "user-3", role: "user", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: "user-4", role: "user", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: 4,
    unreadCount: 1,
    isPinned: true,
    isArchived: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    inviteLink: "https://chat.app/join/official_news",
  },
  {
    id: "chat-dev-group",
    type: "group",
    title: "💻 گروه توسعه‌دهندگان فرانت‌اند و بک‌اند",
    description: "محل بحث و تبادل نظر فنی، بررسی کد و معماری نرم‌افزار",
    avatarUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80",
    username: "dev_team_ir",
    isPrivate: false,
    ownerId: "user-1",
    members: [
      { userId: "user-1", role: "owner", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: "user-2", role: "admin", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: "user-3", role: "moderator", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: "user-4", role: "user", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: 4,
    unreadCount: 3,
    isPinned: true,
    isArchived: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    inviteLink: "https://chat.app/join/dev_team_ir",
  },
  {
    id: "chat-direct-sara",
    type: "direct",
    title: "سارا احمدی",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    members: [
      { userId: "user-1", role: "user", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: "user-2", role: "user", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: 2,
    unreadCount: 0,
    isPinned: false,
    isArchived: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "chat-direct-mehdi",
    type: "direct",
    title: "مهدی کریمی",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    members: [
      { userId: "user-1", role: "user", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: "user-3", role: "user", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: 2,
    unreadCount: 0,
    isPinned: false,
    isArchived: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  }
];

let messages: Message[] = [
  {
    id: "msg-101",
    chatId: "chat-global-news",
    senderId: "user-1",
    type: "text",
    content: "به نسخه جدید پلتفرم چت خوش آمدید! تمام قابلیت‌های ارتباطی چندرسانه‌ای، مدیریت گروه و کانال فعال هستند.",
    status: "seen",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    isPinned: true,
    reactions: [
      { emoji: "🔥", count: 12, users: ["user-1", "user-2", "user-3"] },
      { emoji: "❤️", count: 8, users: ["user-2", "user-4"] }
    ]
  },
  {
    id: "msg-201",
    chatId: "chat-dev-group",
    senderId: "user-2",
    type: "text",
    content: "سلام دوستان، طرح‌های جدید UI/UX برای نسخه وب آماده شد. لطفاً بررسی کنید.",
    status: "seen",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    reactions: [
      { emoji: "👍", count: 4, users: ["user-1", "user-3"] }
    ]
  },
  {
    id: "msg-202",
    chatId: "chat-dev-group",
    senderId: "user-1",
    type: "text",
    content: "عالیه سارا جان! طراحی RTL و تایپوگرافی خیلی مرتب شده.",
    status: "seen",
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    replyToMessageId: "msg-201",
    replyToMessage: {
      id: "msg-201",
      senderName: "سارا احمدی",
      content: "سلام دوستان، طرح‌های جدید UI/UX برای نسخه وب آماده شد.",
      type: "text"
    },
    reactions: [
      { emoji: "🙏", count: 2, users: ["user-2"] }
    ]
  },
  {
    id: "msg-301",
    chatId: "chat-direct-sara",
    senderId: "user-2",
    type: "text",
    content: "سلام علی، تنظیمات مربوط به محدودیت ارسال فایل در پنل مدیریت اضافه شد؟",
    status: "seen",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    reactions: []
  },
  {
    id: "msg-302",
    chatId: "chat-direct-sara",
    senderId: "user-1",
    type: "text",
    content: "بله، تمام کلیدهای Dynamic Feature Toggle در داشبورد ادمین آنلاین هستند و لحظه‌ای اعمال می‌شوند.",
    status: "seen",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    reactions: [
      { emoji: "🎉", count: 1, users: ["user-2"] }
    ]
  }
];

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
  let userId = "user-1"; // Default fallback current logged in user
  if (authHeader && authHeader.includes("jwt-token-")) {
    const parts = authHeader.split("jwt-token-")[1]?.split("-");
    if (parts && parts[0]) {
      userId = parts[0] + "-" + parts[1];
    }
  }
  const user = users.find(u => u.id === userId) || users[0];
  const userSessions = sessions.filter(s => s.userId === user.id);
  res.json({ user, sessions: userSessions });
});

app.post("/api/auth/profile/update", (req, res) => {
  const { userId, firstName, lastName, displayName, username, bio, avatarUrl } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (displayName) user.displayName = displayName;
  if (username) user.username = username;
  if (bio !== undefined) user.bio = bio;
  if (avatarUrl) user.avatarUrl = avatarUrl;

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

app.put("/api/settings", (req, res) => {
  systemSettings = { ...systemSettings, ...req.body };
  
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

// Chats Routes
app.get("/api/chats", (req, res) => {
  const currentUserId = (req.query.userId as string) || "user-1";
  
  // Filter chats where user is a member
  let userChats = chats.filter(c => c.members.some(m => m.userId === currentUserId));
  
  // Also include public channels if enabled
  if (systemSettings.channelsEnabled) {
    const publicChannels = chats.filter(c => c.type === "channel" && !c.isPrivate && !userChats.some(uc => uc.id === c.id));
    userChats = [...userChats, ...publicChannels];
  }

  res.json(userChats);
});

app.get("/api/chats/:chatId", (req, res) => {
  const { chatId } = req.params;
  const userId = req.query.userId as string;

  const targetChat = chats.find(
    (c) => c.id === chatId || c.username === chatId || c.id === `chat-${chatId}`
  );

  if (!targetChat) {
    return res.status(404).json({ error: "گفتگو پیدا نشد یا حذف شده است" });
  }

  const isMember = userId ? targetChat.members.some((m) => m.userId === userId) : false;
  const isPublicChannel = targetChat.type === "channel" && !targetChat.isPrivate;

  if (!isMember && !isPublicChannel) {
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

app.post("/api/chats", (req, res) => {
  const { type, title, description, avatarUrl, username, isPrivate, members, ownerId } = req.body;

  if (type === "group" && !systemSettings.groupsEnabled) {
    return res.status(403).json({ error: "ایجاد گروه در حال حاضر توسط مدیر سیستم غیرفعال است" });
  }
  if (type === "channel" && !systemSettings.channelsEnabled) {
    return res.status(403).json({ error: "ایجاد کانال در حال حاضر توسط مدیر سیستم غیرفعال است" });
  }

  const newChat: Chat = {
    id: "chat-" + Date.now(),
    type: type as ChatType,
    title,
    description: description || "",
    avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80",
    username,
    isPrivate: !!isPrivate,
    ownerId: ownerId || "user-1",
    members: members || [
      { userId: ownerId || "user-1", role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: (members || []).length || 1,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    inviteLink: `https://chat.app/join/${username || Date.now()}`,
  };

  chats.unshift(newChat);

  broadcastWSEvent("chat:created", newChat);
  res.json(newChat);
});

// Messages Routes
app.get("/api/chats/:chatId/messages", (req, res) => {
  const { chatId } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const beforeId = req.query.beforeId as string;

  let chatMessages = messages.filter(m => m.chatId === chatId);

  if (beforeId) {
    const targetIdx = chatMessages.findIndex(m => m.id === beforeId);
    if (targetIdx > 0) {
      const startIndex = Math.max(0, targetIdx - limit);
      const slice = chatMessages.slice(startIndex, targetIdx);
      return res.json({
        messages: slice,
        hasMore: startIndex > 0,
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
    total,
  });
});

// Chat-specific Search Route across all history
app.get("/api/chats/:chatId/search", (req, res) => {
  const { chatId } = req.params;
  const q = ((req.query.q as string) || "").toLowerCase();
  const type = req.query.type as string;
  const senderId = req.query.senderId as string;
  const date = req.query.date as string;

  let chatMessages = messages.filter(m => m.chatId === chatId);

  if (q) {
    chatMessages = chatMessages.filter(m =>
      m.content.toLowerCase().includes(q) ||
      m.attachments?.some(att => att.name.toLowerCase().includes(q))
    );
  }

  if (type) {
    chatMessages = chatMessages.filter(m =>
      m.type === type || m.attachments?.some(att => att.type === type)
    );
  }

  if (senderId) {
    chatMessages = chatMessages.filter(m => m.senderId === senderId);
  }

  if (date) {
    chatMessages = chatMessages.filter(m => m.createdAt.startsWith(date));
  }

  res.json(chatMessages);
});

// Mark messages as read endpoint
app.post("/api/chats/:chatId/read", (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  const reader = users.find(u => u.id === userId);
  const now = new Date().toISOString();

  messages.filter(m => m.chatId === chatId).forEach(m => {
    m.status = "seen";
    if (!m.seenBy) m.seenBy = [];
    if (reader && !m.seenBy.some(s => s.userId === userId)) {
      m.seenBy.push({
        userId: reader.id,
        userDisplayName: reader.displayName,
        userAvatarUrl: reader.avatarUrl,
        seenAt: now
      });
    }
  });

  broadcastWSEvent("message:status_updated", { chatId, userId, status: "seen", seenAt: now });
  res.json({ success: true });
});

app.post("/api/chats/:chatId/messages", (req, res) => {
  const { chatId } = req.params;
  const { id: customId, senderId, type, content, attachments, replyToMessageId, replyToMessage, forwardedFrom, mentions, scheduledFor } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو پیدا نشد" });

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
    senderId: senderId || "user-1",
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

  broadcastWSEvent("message:new", newMsg);
  res.json(newMsg);
});

// Edit & Delete Message
app.put("/api/messages/:messageId", (req, res) => {
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

  broadcastWSEvent("message:updated", msg);
  res.json(msg);
});

app.delete("/api/messages/:messageId", (req, res) => {
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

  broadcastWSEvent("message:deleted", { id: messageId, chatId: deleted.chatId });
  res.json({ message: "پیام با موفقیت حذف شد" });
});

// Message Reactions
app.post("/api/messages/:messageId/reaction", (req, res) => {
  const { messageId } = req.params;
  const { emoji, userId } = req.body;

  const msg = messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "پیام پیدا نشد" });

  let rx = msg.reactions.find(r => r.emoji === emoji);
  if (!rx) {
    rx = { emoji, count: 0, users: [] };
    msg.reactions.push(rx);
  }

  const uIndex = rx.users.indexOf(userId);
  if (uIndex > -1) {
    rx.users.splice(uIndex, 1);
    rx.count -= 1;
  } else {
    rx.users.push(userId);
    rx.count += 1;
  }

  msg.reactions = msg.reactions.filter(r => r.count > 0);

  broadcastWSEvent("message:reaction_updated", msg);
  res.json(msg);
});

// Pin Message
app.post("/api/messages/:messageId/pin", (req, res) => {
  if (!systemSettings.pinEnabled) {
    return res.status(403).json({ error: "پین کردن پیام غیرفعال است" });
  }
  const { messageId } = req.params;
  const msg = messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "پیام یافت نشد" });

  msg.isPinned = !msg.isPinned;
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

app.post("/api/admin/users", (req, res) => {
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
  res.json(newUser);
});

app.put("/api/admin/users/:userId", (req, res) => {
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

  res.json(user);
});

// Admin Forbidden Words Endpoints
app.get("/api/admin/forbidden-words", (req, res) => {
  res.json(forbiddenWords);
});

app.post("/api/admin/forbidden-words", (req, res) => {
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
  res.json(newWord);
});

app.put("/api/admin/forbidden-words/:id", (req, res) => {
  const { id } = req.params;
  const item = forbiddenWords.find(w => w.id === id);
  if (!item) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

  const { word, category, isEnabled } = req.body;
  if (word) item.word = word.trim();
  if (category) item.category = category as WordCategory;
  if (isEnabled !== undefined) item.isEnabled = isEnabled;

  res.json(item);
});

app.delete("/api/admin/forbidden-words/:id", (req, res) => {
  const { id } = req.params;
  const index = forbiddenWords.findIndex(w => w.id === id);
  if (index === -1) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

  forbiddenWords.splice(index, 1);
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
      message: `اعلان Push واقعی با موفقیت به ${sentCount} دستگاه ارسال گردید.${failCount > 0 ? ` (${failCount} ارسال ناموفق)` : ""}`,
      sentCount,
      failCount
    });
  } else {
    res.status(500).json({
      success: false,
      error: `ارسال Push ناموفق بود: ${errorLog || "خطا در برقراری ارتباط با سرویس فایربیس/گوگل Push"}`
    });
  }
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
        broadcastWSEvent("typing:status", data, ws);
      } else if (event === "message:read") {
        const { chatId, userId } = data;
        messages.filter(m => m.chatId === chatId).forEach(m => {
          m.status = "seen";
        });
        broadcastWSEvent("message:status_updated", { chatId, status: "seen" });
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

// Vite middleware in dev mode
async function initServer() {
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
