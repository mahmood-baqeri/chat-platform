import {
  User,
  Chat,
  Message,
  Attachment,
  ForbiddenWord,
  RolePermission,
  ContactRecord,
  AuditLog,
  SystemSettings,
  PushSubItem,
  UserSession,
  MessageType,
  ChatType,
  UserRole,
  WordCategory,
  AvatarPhoto
} from "../models/types.js";
import { getDbInstance, dbQuery, dbExecute, queryAll } from "../db/index.js";
import { saveBase64ToFile } from "../config.js";

// Global In-Memory App State
export let systemSettings: SystemSettings = {
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
  allowedFileExtensions: "jpg,png,pdf,docx,zip,mp4,mp3",
};

export let users: User[] = [];
export let sessions: UserSession[] = [];
export let chats: Chat[] = [];
export let messages: Message[] = [];
export let deletedMessages: Message[] = [];
export let uploadedFiles: Attachment[] = [];
export let contacts: ContactRecord[] = [];
export let auditLogs: AuditLog[] = [];
export const otpStore: Record<string, {
  code: string;
  expiresAt: number;
  userId?: number | string;
  phone?: string;
  nationalCode?: string;
  personCode?: string;
}> = {};
export let pushSubscriptions: PushSubItem[] = [];
export let pushPolicy: "always" | "offline_only" | "mentions_only" | "direct_only" | "disabled" = "always";

export interface MessageSeenRecord {
  id: number | string;
  messageId: number | string;
  userId: number | string;
  roomId: string;
  seenAt: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageReactionRecord {
  id: number | string;
  messageId: number | string;
  userId: number | string;
  emoji: string;
  createdAt: string;
  updatedAt?: string;
}

export let messageSeens: MessageSeenRecord[] = [];
export let messageReactions: MessageReactionRecord[] = [];

export let forbiddenWords: ForbiddenWord[] = [
  { id: "fw-1", word: "تست غیرمجاز", category: "spam", isEnabled: true, createdAt: new Date().toISOString() },
  { id: "fw-2", word: "کلمه ممنوعه", category: "insult", isEnabled: true, createdAt: new Date().toISOString() }
];

export let rolePermissions: RolePermission[] = [
  {
    role: "owner",
    roleNameFa: "مالک کل (Super Admin)",
    permissions: {
      createGroup: true, createChannel: true, deleteGroup: true, deleteChannel: true,
      addMember: true, removeMember: true, editGroupSettings: true, sendMessage: true,
      uploadFiles: true, accessAdminPanel: true
    }
  },
  {
    role: "admin",
    roleNameFa: "مدیر سیستم (Admin)",
    permissions: {
      createGroup: true, createChannel: true, deleteGroup: true, deleteChannel: true,
      addMember: true, removeMember: true, editGroupSettings: true, sendMessage: true,
      uploadFiles: true, accessAdminPanel: true
    }
  },
  {
    role: "user",
    roleNameFa: "کاربر عادی (User)",
    permissions: {
      createGroup: true, createChannel: true, deleteGroup: false, deleteChannel: false,
      addMember: true, removeMember: false, editGroupSettings: false, sendMessage: true,
      uploadFiles: true, accessAdminPanel: false
    }
  }
];

export let isUsingMySQL = false;
export let dbInstance: any = null;

export function computeMessageReactions(msgId: number | string) {
  const msgRxList = messageReactions.filter(r => String(r.messageId) === String(msgId));
  const rxMap: Record<string, { count: number; users: (number | string)[] }> = {};

  for (const rx of msgRxList) {
    if (!rxMap[rx.emoji]) {
      rxMap[rx.emoji] = { count: 0, users: [] };
    }
    rxMap[rx.emoji].count += 1;
    if (!rxMap[rx.emoji].users.some(u => String(u) === String(rx.userId))) {
      rxMap[rx.emoji].users.push(rx.userId);
    }
  }

  return Object.keys(rxMap).map(emoji => ({
    emoji,
    count: rxMap[emoji].count,
    users: rxMap[emoji].users
  }));
}

export function formatMessageFromDB(m: any): Message {
  let attachments: Attachment[] = [];
  try {
    if (m.attachments) {
      attachments = typeof m.attachments === "string" ? JSON.parse(m.attachments) : m.attachments;
    }
  } catch (e) { }

  let forwardedFrom = undefined;
  try {
    if (m.forwarded_from) {
      forwardedFrom = typeof m.forwarded_from === "string" ? JSON.parse(m.forwarded_from) : m.forwarded_from;
    }
  } catch (e) { }

  const seenRecords = messageSeens.filter(s => String(s.messageId) === String(m.id));
  const seenBy = seenRecords.map(s => {
    const u = users.find(usr => String(usr.id) === String(s.userId));
    return {
      userId: s.userId,
      userDisplayName: u ? u.displayName : String(s.userId),
      userAvatarUrl: u ? u.avatarUrl : "",
      seenAt: s.seenAt || m.created_at
    };
  });

  const senderUser = users.find(usr => String(usr.id) === String(m.sender_id || m.senderId));
  const senderName = m.sender_name || m.senderName || (senderUser
    ? senderUser.displayName || `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim() || `کاربر ${m.sender_id || m.senderId}`
    : `کاربر ${m.sender_id || m.senderId}`);
  const senderAvatar = m.sender_avatar || m.senderAvatar || senderUser?.avatarUrl || AvatarPhoto;

  return {
    id: m.id,
    chatId: m.chat_id || m.chatId,
    senderId: m.sender_id || m.senderId,
    senderName,
    senderAvatar,
    type: (m.type as MessageType) || "text",
    content: m.content || "",
    status: (m.status as any) || "sent",
    isPinned: !!m.is_pinned,
    replyToMessageId: m.reply_to_id || undefined,
    attachments,
    forwardedFrom,
    createdAt: m.created_at || m.createdAt,
    reactions: computeMessageReactions(m.id),
    seenBy
  };
}

export async function runMySQLMigrations(): Promise<boolean> {
  const mysqlHost = process.env.MYSQL_HOST || "127.0.0.1";
  const mysqlUser = process.env.MYSQL_USER || "root";
  const mysqlPass = process.env.MYSQL_PASSWORD || "";
  const mysqlPort = parseInt(process.env.MYSQL_PORT || "3306", 10);
  const mysqlDb = process.env.MYSQL_DATABASE || "messenger_db";

  try {
    const mysql2 = await import("mysql2/promise");
    const connection = await mysql2.createConnection({
      host: mysqlHost,
      port: mysqlPort,
      user: mysqlUser,
      password: mysqlPass,
      connectTimeout: 2000
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${mysqlDb}\`;`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_enabled TINYINT(1) DEFAULT 1,
        login_enabled TINYINT(1) DEFAULT 1,
        otp_enabled TINYINT(1) DEFAULT 1,
        session_timeout_minutes INT DEFAULT 1440,
        channels_enabled TINYINT(1) DEFAULT 1,
        groups_enabled TINYINT(1) DEFAULT 1,
        calls_enabled TINYINT(1) DEFAULT 0,
        edit_message_enabled TINYINT(1) DEFAULT 1,
        delete_message_enabled TINYINT(1) DEFAULT 1,
        max_file_size_mb INT DEFAULT 25,
        allowed_file_extensions VARCHAR(255) DEFAULT 'jpg,png,pdf,docx,zip,mp4,mp3',
        push_policy VARCHAR(50) DEFAULT 'always'
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(32) NOT NULL UNIQUE,
        username VARCHAR(64) NOT NULL UNIQUE,
        first_name VARCHAR(64),
        last_name VARCHAR(64),
        display_name VARCHAR(128) NOT NULL,
        avatar_url VARCHAR(512),
        bio VARCHAR(255),
        status VARCHAR(32) DEFAULT 'offline',
        last_seen VARCHAR(64),
        role VARCHAR(32) DEFAULT 'user',
        is_banned TINYINT(1) DEFAULT 0,
        is_muted TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(32) NOT NULL,
        title VARCHAR(128) NOT NULL,
        username VARCHAR(64) UNIQUE,
        avatar_url VARCHAR(512),
        description VARCHAR(255),
        invite_link VARCHAR(255),
        is_private TINYINT(1) DEFAULT 0,
        is_archived TINYINT(1) DEFAULT 0,
        is_pinned TINYINT(1) DEFAULT 0,
        unread_count INT DEFAULT 0,
        member_count INT DEFAULT 0,
        owner_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS room_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(64) NOT NULL,
        user_id INT NOT NULL,
        role VARCHAR(32) DEFAULT 'user',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_muted TINYINT(1) DEFAULT 0,
        UNIQUE KEY room_user_unique (room_id, user_id)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chat_id VARCHAR(64) NOT NULL,
        sender_id INT NOT NULL,
        type VARCHAR(32) DEFAULT 'text',
        content TEXT,
        status VARCHAR(32) DEFAULT 'sent',
        is_pinned TINYINT(1) DEFAULT 0,
        reply_to_id INT,
        attachments JSON,
        forwarded_from JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY idx_chat_created (chat_id, created_at)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS message_seens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        user_id INT NOT NULL,
        room_id VARCHAR(64) NOT NULL,
        seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        delivered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY msg_user_seen_unique (message_id, user_id)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        user_id INT NOT NULL,
        emoji VARCHAR(32) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY msg_user_emoji_unique (message_id, user_id, emoji)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS push_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vapid_public_key TEXT,
        vapid_private_key TEXT,
        is_enabled TINYINT(1) DEFAULT 1
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint VARCHAR(512) NOT NULL,
        subscription_json LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_push_endpoint (endpoint(255))
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS forbidden_words (
        id INT AUTO_INCREMENT PRIMARY KEY,
        word VARCHAR(128) NOT NULL UNIQUE,
        category VARCHAR(64) NOT NULL,
        is_enabled TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.end();
    return true;
  } catch (err) {
    return false;
  }
}

export async function loadDataFromDB() {
  try {
    // System Settings
    const settingsRows = await dbQuery("SELECT * FROM system_settings WHERE id = 1");
    if (settingsRows.length > 0) {
      const row = settingsRows[0];
      systemSettings = {
        ...systemSettings,
        registrationEnabled: !!row.registration_enabled,
        loginEnabled: !!row.login_enabled,
        otpEnabled: !!row.otp_enabled,
        channelsEnabled: !!row.channels_enabled,
        groupsEnabled: !!row.groups_enabled,
        callsEnabled: !!row.calls_enabled,
        editMessageEnabled: !!row.edit_message_enabled,
        deleteMessageEnabled: !!row.delete_message_enabled,
        maxFileSizeMB: row.max_file_size_mb || 25,
        allowedFileExtensions: row.allowed_file_extensions || "jpg,png,pdf,docx,zip,mp4,mp3",
      };
      if (row.push_policy) {
        pushPolicy = row.push_policy;
      }
    }

    // Users
    const dbUsers = await dbQuery("SELECT * FROM users");
    if (dbUsers.length > 0) {
      users = dbUsers.map((u: any) => ({
        id: u.id,
        phone: u.phone,
        nationalCode: u.nationalCode,
        personCode: u.personCode,
        firstName: u.first_name || "",
        lastName: u.last_name || "",
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        bio: u.bio || "",
        status: (u.status as any) || "offline",
        lastSeen: u.last_seen || null,
        role: (u.role as UserRole) || "user",
        isBanned: !!u.is_banned,
        isMuted: !!u.is_muted,
        createdAt: u.created_at || new Date().toISOString()
      }));
    }

    // Message Seens
    const dbSeens = await dbQuery("SELECT * FROM message_seens");
    messageSeens = dbSeens.map((s: any) => ({
      id: s.id,
      messageId: s.message_id,
      userId: s.user_id,
      roomId: s.room_id,
      seenAt: s.seen_at || s.created_at,
      deliveredAt: s.delivered_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    // Message Reactions
    const dbRx = await dbQuery("SELECT * FROM message_reactions");
    messageReactions = dbRx.map((r: any) => ({
      id: r.id,
      messageId: r.message_id,
      userId: r.user_id,
      emoji: r.emoji,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    
    const dbRooms = await dbQuery("SELECT * FROM rooms");
    const dbMembersWithUser = await dbQuery(`
      SELECT 
        rm.*,
        u.display_name as userDisplayname,
        u.status,
        u.last_seen
      FROM room_members rm
      LEFT JOIN users u ON rm.user_id = u.id
    `);

    if (dbRooms.length > 0) {
      const userDisplayMap = new Map();
      dbMembersWithUser.forEach((m: any) => {
        if (m.user_id && m.userDisplayname) {
          userDisplayMap.set(String(m.user_id), m.userDisplayname);
        }
      });

      chats = dbRooms.map((r: any) => {
        const roomM = dbMembersWithUser
          .filter((m: any) => String(m.room_id) === String(r.id))
          .map((m: any) => ({
            userId: m.user_id,
            userDisplayname: m.userDisplayname || String(m.user_id),
            role: m.role || "user",
            joinedAt: m.joined_at,
            isMuted: !!m.is_muted,
            status: m.status || "offline",    // ✅ اضافه
            lastSeen: m.last_seen || null,     // ✅ اضافه
          }));

        if (r.owner_id && !roomM.some((m: any) => String(m.userId) === String(r.owner_id))) {
          const ownerUser = users.find(u => String(u.id) === String(r.owner_id));
          roomM.push({
            userId: r.owner_id,
            userDisplayname: userDisplayMap.get(String(r.owner_id)) || String(r.owner_id),
            role: "owner",
            joinedAt: r.created_at || new Date().toISOString(),
            isMuted: false,
            status: ownerUser?.status || "offline",
            lastSeen: ownerUser?.lastSeen || null,
          });
        }

        return {
          id: r.id,
          type: r.type as ChatType,
          title: r.title,
          username: r.username || undefined,
          avatarUrl: r.avatar_url,
          description: r.description || "",
          inviteLink: r.invite_link,
          isPrivate: !!r.is_private,
          isArchived: !!r.is_archived,
          isPinned: !!r.is_pinned,
          ownerId: r.owner_id || 1,
          members: roomM,
          memberCount: roomM.length || r.member_count || 1,
          unreadCount: r.unread_count || 0,
          createdAt: r.created_at || new Date().toISOString(),
        };
      });
    }


    // Messages
    const dbMsgs = await dbQuery("SELECT * FROM messages ORDER BY created_at ASC");
    if (dbMsgs.length > 0) {
      messages = dbMsgs.map((m: any) => formatMessageFromDB(m));
      // Update last message on rooms
      chats.forEach(c => {
        const cMsgs = messages.filter(m => String(m.chatId) === String(c.id));
        if (cMsgs.length > 0) {
          c.lastMessage = cMsgs[cMsgs.length - 1];
        }
      });
    }

    // Contacts
    try {
      const dbContacts = await dbQuery("SELECT * FROM contacts");
      if (dbContacts && dbContacts.length > 0) {
        contacts = dbContacts.map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          contactUserId: c.contact_user_id,
          customName: c.custom_name,
          createdAt: c.created_at
        }));
      }
    } catch (e) { }

    // Forbidden Words
    const dbForbidden = await dbQuery("SELECT * FROM forbidden_words");
    if (dbForbidden.length > 0) {
      forbiddenWords = dbForbidden.map((w: any) => ({
        id: w.id,
        word: w.word,
        category: w.category as WordCategory,
        isEnabled: !!w.is_enabled,
        createdAt: w.created_at
      }));
    }

    // Push Subscriptions
    const dbPushSubs = await dbQuery("SELECT * FROM push_subscriptions");
    if (dbPushSubs.length > 0) {
      pushSubscriptions = dbPushSubs.map((s: any) => {
        let sub = {};
        try {
          sub = typeof s.subscription_json === "string" ? JSON.parse(s.subscription_json) : s.subscription_json;
        } catch (e) { }
        return {
          id: s.id,
          userId: s.user_id,
          subscription: sub,
          createdAt: s.created_at || new Date().toISOString()
        };
      });
    }
  } catch (err) {
    console.error("Failed to load initial data from DB:", err);
  }
}
