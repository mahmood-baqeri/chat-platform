// web/server/endpoints/chat-endpoint.ts

import express, { Request, Response } from "express";
import {
  chats,
  messages,
  users,
  systemSettings,
  forbiddenWords,
  uploadedFiles,
  messageSeens,
  messageReactions,
  isUsingMySQL,
  dbInstance,
  computeMessageReactions,
  formatMessageFromDB,
} from "../store/dataStore.js";
import {
  Chat,
  ChatMember,
  Message,
  Attachment,
  ChatType,
  AvatarPhoto,
  BaseDomain
} from "../models/types.js";
import { getUserIdFromReq, formatChatForUser } from "./auth-endpoint.js";
import { dbQuery, dbExecute } from "../db/index.js";
import { sendRoomWSEvent, sendChatMembersWSEvent, broadcastWSEvent } from "../websocket/wsServer.js";
import { saveBase64ToFile, generateUUIDv4 } from "../config.js";
import webPush from "web-push";
// ✅ import از pushService
import { getPushConfig, getPushSubscriptions, getPushPolicy, sendNotificationToTargets } from "../services/pushService.js";

const router = express.Router();

// ==========================================
// ENRICH MESSAGE
// ==========================================
export function enrichMessage(m: Message): Message {
  if (!m) return m;
  const senderUser = users.find(u => String(u.id) === String(m.senderId));
  const senderName = m.senderName || (senderUser
    ? senderUser.displayName || `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim() || `کاربر ${m.senderId}`
    : `کاربر ${m.senderId}`);
  const senderAvatar = m.senderAvatar || senderUser?.avatarUrl || AvatarPhoto;
  return {
    ...m,
    senderName,
    senderAvatar
  };
}

// ==========================================
// SEND PUSH NOTIFICATION FOR MESSAGE
// ==========================================
async function sendPushNotificationForMessage(
  chatId: string,
  senderId: string,
  content: string,
  mentions: string[] = [],
  msgType: string = "text"
) {
  // اجرا در setTimeout برای اینکه کاملاً در پس‌زمینه اجرا بشه
  setTimeout(async () => {
    try {
      // 1. دریافت تنظیمات از سرویس
      const pushConfig = getPushConfig();
      const pushPolicy = getPushPolicy();
      const pushSubscriptions = getPushSubscriptions();

      // 2. بررسی‌های اولیه
      if (!pushConfig.isActive || pushPolicy === "disabled") {
        return;
      }

      const chat = chats.find(c => c.id === chatId);
      if (!chat) {
        return;
      }

      if (pushPolicy === "direct_only" && chat.type !== "direct") {
        return;
      }

      const sender = users.find(u => String(u.id) === String(senderId));
      const senderName = sender ? sender.displayName : "فرستنده";

      // 3. پیدا کردن کاربران هدف
      let targetUserIds: (number | string)[] = [];
      const memberUserIds = (chat.members || [])
        .map(m => m.userId)
        .filter(uid => String(uid) !== String(senderId));

      if (pushPolicy === "always" || pushPolicy === "direct_only") {
        targetUserIds = memberUserIds;
      } else if (pushPolicy === "offline_only") {
        targetUserIds = memberUserIds.filter(uid => {
          const u = users.find(usr => String(usr.id) === String(uid));
          return !u || u.status !== "online";
        });
      } else if (pushPolicy === "mentions_only") {
        targetUserIds = memberUserIds.filter(uid => {
          const u = users.find(usr => String(usr.id) === String(uid));
          if (!u) return false;
          const mentionIds = mentions.map(String);
          return mentionIds.includes(String(uid)) ||
            (u.personCode && content.includes(u.personCode));
        });
      }

      if (targetUserIds.length === 0) {
        return;
      }

      // 4. گرفتن اشتراک‌های فعال
      const targetStrIds = targetUserIds.map(String);
      const targets = pushSubscriptions.filter(s =>
        targetStrIds.includes(String(s.userId || ""))
      );

      if (targets.length === 0) {
        return;
      }

      // 5. ساخت payload
      let body = content;
      if (msgType === "image") body = "📷 تصویر";
      else if (msgType === "video") body = "🎬 ویدیو";
      else if (msgType === "audio") body = "🎵 صوتی";
      else if (msgType === "voice") body = "🎙️ پیام صوتی";
      else if (msgType === "document") body = "📄 فایل";
      else if (msgType === "sticker") body = "🎨 استیکر";
      else if (msgType === "location") body = "📍 موقعیت مکانی";
      else if (msgType === "contact") body = "👤 تماس";

      const payload = {
        title: chat.type === "direct" ? senderName : `${senderName} در ${chat.title}`,
        body: body || content,
        icon: sender?.avatarUrl || chat.avatarUrl || AvatarPhoto,
        url: `/?chatId=${chatId}`,
        chatId: chatId,
      };

      // 6. ارسال به سرویس
      await sendNotificationToTargets(targets, payload);

    } catch (error: any) {
      console.error("❌ Error in sendPushNotificationForMessage:", error);
    }
  }, 0); // تاخیر 0 برای اجرا در event loop بعدی
}

// ==========================================
// GET USER CHATS
// ==========================================
router.get("/chats", (req: Request, res: Response) => {
  const currentUserId = getUserIdFromReq(req);
  if (!currentUserId) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است" });
  }

  const userChats = chats
    .filter(c => {
      if (!Array.isArray(c.members)) return false;
      return (
        c.members.some(m => String(m.userId) === String(currentUserId)) ||
        String(c.ownerId) === String(currentUserId)
      );
    })
    .map(c => formatChatForUser(c, String(currentUserId)));

  res.json(userChats);
});

// ==========================================
// GET CHAT DETAIL
// ==========================================
router.get("/chats/:chatId", (req: Request, res: Response) => {
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

  const isMember = targetChat.members?.some((m) => String(m.userId) === String(userId)) || String(targetChat.ownerId) === String(userId);

  if (!isMember) {
    return res.status(403).json({ error: "شما عضو این گفتگو نیستید" });
  }

  res.json(formatChatForUser(targetChat, String(userId)));
});

// ==========================================
// CREATE CHAT
// ==========================================
router.post("/chats", async (req: Request, res: Response) => {
  const currentUserId = getUserIdFromReq(req);
  const { type, title, description, avatarUrl, username, isPrivate, members, ownerId } = req.body;

  if (type === "group" && !systemSettings.groupsEnabled) {
    return res.status(403).json({ error: "ایجاد گروه در حال حاضر توسط مدیر سیستم غیرفعال است" });
  }
  if (type === "channel" && !systemSettings.channelsEnabled) {
    return res.status(403).json({ error: "ایجاد کانال در حال حاضر توسط مدیر سیستم غیرفعال است" });
  }

  if (type === "direct" && Array.isArray(members) && members.length >= 2) {
    const u1 = members[0].userId;
    const u2 = members[1].userId;

    let existingDirect = chats.find(
      c => c.type === "direct" &&
        c.members?.length === 2 &&
        c.members.some(m => String(m.userId) === String(u1)) &&
        c.members.some(m => String(m.userId) === String(u2))
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
      return res.json(formatChatForUser(existingDirect, String(currentUserId || "")));
    }
  }

  let rawMembers = members || [
    { userId: currentUserId || ownerId || "user-1", role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
  ];

  if (type === "direct" && Array.isArray(members) && members.length >= 2) {
    const u1 = members[0].userId;
    const u2 = members[1].userId;
    rawMembers = [
      { userId: u1, role: "owner", joinedAt: new Date().toISOString(), isMuted: false },
      { userId: u2, role: "user", joinedAt: new Date().toISOString(), isMuted: false }
    ];
  } else if (currentUserId && !rawMembers.some((m: any) => String(m.userId) === String(currentUserId))) {
    rawMembers.unshift({ userId: currentUserId, role: "owner", joinedAt: new Date().toISOString(), isMuted: false });
  }

  const uniqueMembersMap = new Map<string, ChatMember>();
  for (const rm of rawMembers) {
    const uidStr = String(rm.userId);
    if (!uniqueMembersMap.has(uidStr)) {
      uniqueMembersMap.set(uidStr, rm);
    }
  }
  const roomMembers = Array.from(uniqueMembersMap.values());

  const newChat: Chat = {
    id: "chat-" + Date.now(),
    type: type as ChatType,
    title,
    description: description || "",
    avatarUrl: avatarUrl || AvatarPhoto,
    username,
    isPrivate: type === "direct" ? true : !!isPrivate,
    ownerId: ownerId || roomMembers[0]?.userId || currentUserId || 1,
    members: roomMembers,
    memberCount: roomMembers.length,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    inviteLink: `${BaseDomain}/join/${username || Date.now()}`,
  };

  chats.unshift(newChat);

  const numOwnerId = typeof newChat.ownerId === "number" ? newChat.ownerId : (parseInt(String(newChat.ownerId).replace(/\D/g, ""), 10) || 1);

  await dbExecute(
    `INSERT INTO rooms (id, type, title, username, avatar_url, description, invite_link, is_private, is_archived, is_pinned, unread_count, member_count, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newChat.id, newChat.type, newChat.title, newChat.username || null, newChat.avatarUrl, newChat.description, newChat.inviteLink, newChat.isPrivate ? 1 : 0, 0, 0, 0, newChat.memberCount, numOwnerId, newChat.createdAt]
  );

  const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();
  for (const m of newChat.members) {
    const mUserId = typeof m.userId === "number" ? m.userId : (parseInt(String(m.userId).replace(/\D/g, ""), 10) || 1);
    try {
      if (dbType === "mysql") {
        await dbExecute(
          `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)`,
          [newChat.id, mUserId, m.role, m.joinedAt]
        );
      } else if (dbType === "postgres" || dbType === "postgresql") {
        await dbExecute(
          `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?) ON CONFLICT (room_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [newChat.id, mUserId, m.role, m.joinedAt]
        );
      } else {
        await dbExecute(
          `INSERT OR REPLACE INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`,
          [newChat.id, mUserId, m.role, m.joinedAt]
        );
      }
    } catch (e: any) {
      console.error("Error inserting room member:", e.message);
    }
  }

  sendChatMembersWSEvent(newChat.members.map(m => m.userId), "chat:created", newChat);

  res.json(formatChatForUser(newChat, String(currentUserId || "")));
});

// ==========================================
// UPDATE CHAT
// ==========================================
router.put("/chats/:chatId", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const currentUserId = getUserIdFromReq(req);
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو پیدا نشد" });

  const { title, description, avatarUrl, username, isPrivate } = req.body;

  const isOwnerOrAdmin =
    String(chat.ownerId) === String(currentUserId) ||
    chat.members?.some(m => String(m.userId) === String(currentUserId) && (m.role === "owner" || m.role === "admin")) ||
    users.find(u => String(u.id) === String(currentUserId))?.role === "admin";

  if (!isOwnerOrAdmin && chat.type !== "direct") {
    return res.status(403).json({ error: "شما دسترسی لازم برای تغییر مشخصات این گفت‌وگو را ندارید" });
  }

  if (title) chat.title = title;
  if (description !== undefined) chat.description = description;
  if (username) chat.username = username;
  if (isPrivate !== undefined) chat.isPrivate = isPrivate;
  if (avatarUrl !== undefined) {
    chat.avatarUrl = avatarUrl ? saveBase64ToFile(avatarUrl, "room_" + chat.id) : chat.avatarUrl;
  }

  await dbExecute(
    `UPDATE rooms SET title = ?, description = ?, username = ?, is_private = ?, avatar_url = ? WHERE id = ?`,
    [chat.title, chat.description, chat.username || null, chat.isPrivate ? 1 : 0, chat.avatarUrl, chat.id]
  );

  broadcastWSEvent("chat:updated", chat);
  res.json(chat);
});

// ==========================================
// GET MESSAGES
// ==========================================
router.get("/chats/:chatId/messages", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const currentUserId = getUserIdFromReq(req);

  if (!currentUserId) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است" });
  }

  const targetChat = chats.find(
    c => c.id === chatId || c.username === chatId || c.id === `chat-${chatId}` || c.id === chatId.replace(/^chat-/, '')
  );
  if (!targetChat) {
    return res.status(404).json({ error: "گفتگو پیدا نشد" });
  }

  const actualChatId = targetChat.id;

  const isMember = targetChat.members?.some(m => String(m.userId) === String(currentUserId)) || String(targetChat.ownerId) === String(currentUserId);
  if (!isMember) {
    return res.status(403).json({ error: "شما اجازه دسترسی به پیام‌های این گفتگو را ندارید" });
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);
  const beforeId = req.query.beforeId as string;
  const afterId = req.query.afterId as string;
  const aroundId = req.query.aroundId as string;
  const userId = req.query.userId as string;

  let chatMessages = messages.filter(m =>
    String(m.chatId) === String(actualChatId) ||
    String(m.chatId) === String(chatId) ||
    String(m.chatId).replace(/^chat-/, '') === String(chatId).replace(/^chat-/, '') ||
    String(m.chatId).replace(/^room-/, '') === String(actualChatId).replace(/^room-/, '')
  );

  chatMessages.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime() || 0;
    const timeB = new Date(b.createdAt || 0).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;
    return String(a.id).localeCompare(String(b.id));
  });

  if (beforeId) {
    const idx = chatMessages.findIndex(m => String(m.id) === String(beforeId));
    if (idx !== -1) {
      const older = chatMessages.slice(0, idx);
      const start = Math.max(0, older.length - limit);
      const slice = older.slice(start);
      return res.json({
        messages: slice.map(enrichMessage),
        hasMore: start > 0,
        hasMoreBefore: start > 0,
        hasMoreAfter: idx < chatMessages.length,
        total: slice.length
      });
    } else {
      return res.json({
        messages: [],
        hasMore: false,
        hasMoreBefore: false,
        hasMoreAfter: true,
        total: 0
      });
    }
  }

  if (afterId) {
    const idx = chatMessages.findIndex(m => String(m.id) === String(afterId));
    if (idx !== -1) {
      const slice = chatMessages.slice(idx + 1, idx + 1 + limit);
      return res.json({
        messages: slice.map(enrichMessage),
        hasMore: (idx + 1 + limit) < chatMessages.length,
        hasMoreAfter: (idx + 1 + limit) < chatMessages.length,
        hasMoreBefore: idx > 0,
        total: slice.length
      });
    } else {
      return res.json({
        messages: [],
        hasMore: false,
        hasMoreAfter: false,
        hasMoreBefore: true,
        total: 0
      });
    }
  }

  if (aroundId) {
    const idx = chatMessages.findIndex(m => String(m.id) === String(aroundId));
    if (idx !== -1) {
      const half = Math.floor(limit / 2);
      const start = Math.max(0, idx - half);
      const end = Math.min(chatMessages.length, idx + half + 1);
      const slice = chatMessages.slice(start, end);
      return res.json({
        messages: slice.map(enrichMessage),
        hasMoreBefore: start > 0,
        hasMoreAfter: end < chatMessages.length,
        firstUnreadMessageId: aroundId,
        total: slice.length
      });
    }
  }

  let unreadMsgId: string | null = null;
  if (userId) {
    const unreadMsg = chatMessages.find(m =>
      String(m.senderId) !== String(userId) &&
      !m.seenBy?.some(s => String(s.userId) === String(userId))
    );
    if (unreadMsg) {
      unreadMsgId = String(unreadMsg.id);
    }
  }

  if (unreadMsgId) {
    const idx = chatMessages.findIndex(m => String(m.id) === String(unreadMsgId));
    if (idx !== -1) {
      const half = Math.floor(limit / 2);
      const start = Math.max(0, idx - half);
      const end = Math.min(chatMessages.length, idx + half + 1);
      const slice = chatMessages.slice(start, end);
      return res.json({
        messages: slice.map(enrichMessage),
        hasMoreBefore: start > 0,
        hasMoreAfter: end < chatMessages.length,
        firstUnreadMessageId: unreadMsgId,
        total: chatMessages.length
      });
    }
  }

  const start = Math.max(0, chatMessages.length - limit);
  const slice = chatMessages.slice(start);
  return res.json({
    messages: slice.map(enrichMessage),
    hasMore: start > 0,
    hasMoreBefore: start > 0,
    hasMoreAfter: false,
    firstUnreadMessageId: null,
    total: chatMessages.length
  });
});

// ==========================================
// POST NEW MESSAGE
// ==========================================
router.post("/chats/:chatId/messages", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const currentUserId = getUserIdFromReq(req);
  const { id: customId, senderId, type, content, attachments, replyToMessageId, replyToMessage, forwardedFrom, mentions, scheduledFor } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو پیدا نشد" });

  const actualSenderId = currentUserId || senderId || 1;

  const isMember = chat.members?.some(m => String(m.userId) === String(actualSenderId));
  if (!isMember) {
    return res.status(403).json({ error: "شما عضو این گفتگو نیستید و امکان ارسال پیام را ندارید" });
  }

  if (chat.type === "channel") {
    const member = chat.members?.find(m => String(m.userId) === String(actualSenderId));
    const isOwnerOrAdmin = String(chat.ownerId) === String(actualSenderId) || member?.role === "owner" || member?.role === "admin";
    const userObj = users.find(u => String(u.id) === String(actualSenderId));
    const isSystemAdmin = userObj?.role === "admin";

    if (!isOwnerOrAdmin && !isSystemAdmin) {
      return res.status(403).json({ error: "تنها مدیران کانال اجازه ارسال پیام در این کانال را دارند." });
    }
  }

  if (type === "image" && !systemSettings.allowImages) return res.status(403).json({ error: "ارسال تصویر غیرفعال است" });
  if (type === "video" && !systemSettings.allowVideos) return res.status(403).json({ error: "ارسال ویدئو غیرفعال است" });
  if (type === "audio" && !systemSettings.allowAudio) return res.status(403).json({ error: "ارسال فایل صوتی غیرفعال است" });
  if (type === "document" && !systemSettings.allowDocuments) return res.status(403).json({ error: "ارسال سند غیرفعال است" });
  if (type === "sticker" && !systemSettings.allowStickers) return res.status(403).json({ error: "ارسال استیکر غیرفعال است" });

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

  let finalId = customId;
  if (finalId) {
    if (messages.some(m => String(m.id) === String(finalId))) {
      return res.status(400).json({ error: `شناسه پیام (${finalId}) تکراری است و قبلاً ثبت شده است.` });
    }
  } else {
    finalId = messages.length > 0 ? Math.max(...messages.map(m => Number(m.id) || 0)) + 1 : 1;
  }

  const processedAttachments = (attachments || []).map((att: Attachment) => ({
    ...att,
    url: saveBase64ToFile(att.url, att.name)
  }));

  const senderUser = users.find(u => String(u.id) === String(actualSenderId));
  const senderName = senderUser
    ? senderUser.displayName || `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim() || `کاربر ${actualSenderId}`
    : `کاربر ${actualSenderId}`;
  const senderAvatar = senderUser?.avatarUrl || AvatarPhoto;

  const newMsg: Message = {
    id: finalId,
    chatId,
    senderId: actualSenderId,
    senderName,
    senderAvatar,
    type: type || "text",
    content: content || "",
    attachments: processedAttachments,
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

  await dbExecute(
    `INSERT INTO messages (id, chat_id, sender_id, type, content, status, is_pinned, reply_to_id, attachments, forwarded_from, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newMsg.id,
      chatId,
      newMsg.senderId,
      newMsg.type,
      newMsg.content,
      newMsg.status,
      0,
      replyToMessageId || null,
      JSON.stringify(newMsg.attachments || []),
      newMsg.forwardedFrom ? JSON.stringify(newMsg.forwardedFrom) : null,
      newMsg.createdAt
    ]
  );

  const enriched = enrichMessage(newMsg);
  // sendRoomWSEvent(chatId, "message:new", enriched);

  // // ==========================================
  // // ارسال پوش نوتیفیکیشن
  // // ==========================================
  // await sendPushNotificationForMessage(chatId, String(newMsg.senderId), newMsg.content, newMsg.mentions, newMsg.type);


   // ==========================================
  // ✅ ارسال پوش نوتیفیکیشن به صورت غیرهمگام (بدون منتظر ماندن)
  // ==========================================
  // این تابع رو بدون await صدا بزنید تا بلاک نشه
  sendPushNotificationForMessage(chatId, String(newMsg.senderId), newMsg.content, newMsg.mentions, newMsg.type)
    .catch(err => console.error("❌ Push notification error:", err));

  // ==========================================
  // ارسال پاسخ به فرانت (سریع)
  // ==========================================
  sendRoomWSEvent(chatId, "message:new", enriched);
  res.json(enriched);
  
});

// ==========================================
// EDIT MESSAGE
// ==========================================
router.put("/messages/:messageId", async (req: Request, res: Response) => {
  if (!systemSettings.editMessageEnabled) {
    return res.status(403).json({ error: "ویرایش پیام در حال حاضر غیرفعال است" });
  }
  const { messageId } = req.params;
  const { content } = req.body;

  const msg = messages.find(m => m.id == messageId);
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

// ==========================================
// DELETE MESSAGE
// ==========================================
router.delete("/messages/:messageId", async (req: Request, res: Response) => {
  if (!systemSettings.deleteMessageEnabled) {
    return res.status(403).json({ error: "حذف پیام در حال حاضر غیرفعال است" });
  }
  const { messageId } = req.params;
  const index = messages.findIndex(m => String(m.id) === String(messageId));
  if (index === -1) return res.status(404).json({ error: "پیام یافت نشد" });

  const deleted = messages[index];
  deleted.isDeleted = true;
  deleted.deletedAt = new Date().toISOString();
  messages.splice(index, 1);

  await dbExecute(`DELETE FROM messages WHERE id = ?`, [messageId]);

  sendRoomWSEvent(deleted.chatId, "message:deleted", { id: messageId, chatId: deleted.chatId });
  res.json({ message: "پیام با موفقیت حذف شد" });
});

// ==========================================
// READ RECEIPTS
// ==========================================
router.post("/chats/:chatId/read", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId, messageIds } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "شناسه کاربر الزامی است" });
  }

  const reader = users.find(u => String(u.id) === String(userId));
  const now = new Date().toISOString();

  let targetMsgs = messages.filter(m => m.chatId === chatId && String(m.senderId) !== String(userId));

  if (Array.isArray(messageIds) && messageIds.length > 0) {
    const idsSet = new Set(messageIds.map(id => String(id)));
    targetMsgs = targetMsgs.filter(m => idsSet.has(String(m.id)));
  }

  let newSeensCount = 0;

  for (const m of targetMsgs) {
    m.status = "seen";

    const existingSeen = messageSeens.find(s => String(s.messageId) === String(m.id) && String(s.userId) === String(userId));
    if (!existingSeen) {
      const seenId = messageSeens.length > 0 ? Math.max(...messageSeens.map(s => Number(s.id) || 0)) + 1 : 1;
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

      const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();
      const numMsgId = typeof m.id === "number" ? m.id : (parseInt(String(m.id).replace(/\D/g, ""), 10) || 1);
      const numUserId = typeof userId === "number" ? userId : (parseInt(String(userId).replace(/\D/g, ""), 10) || 1);

      if (dbType === "mysql") {
        await dbExecute(
          `INSERT INTO message_seens (message_id, user_id, room_id, seen_at, delivered_at, created_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE seen_at = VALUES(seen_at), delivered_at = VALUES(delivered_at)`,
          [numMsgId, numUserId, chatId, now, now, now]
        );
      } else if (dbType === "postgres" || dbType === "postgresql") {
        await dbExecute(
          `INSERT INTO message_seens (message_id, user_id, room_id, seen_at, delivered_at, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (message_id, user_id) DO UPDATE SET seen_at = EXCLUDED.seen_at, delivered_at = EXCLUDED.delivered_at`,
          [numMsgId, numUserId, chatId, now, now, now]
        );
      } else {
        await dbExecute(
          `INSERT OR REPLACE INTO message_seens (id, message_id, user_id, room_id, seen_at, delivered_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [seenId, numMsgId, numUserId, chatId, now, now, now]
        );
      }
    }

    if (!m.seenBy) m.seenBy = [];
    if (reader && !m.seenBy.some(s => String(s.userId) === String(userId))) {
      m.seenBy.push({
        userId: reader.id,
        userDisplayName: reader.displayName,
        userAvatarUrl: reader.avatarUrl,
        seenAt: now
      });
    }
  }

  const allChatMsgs = messages.filter(m => m.chatId === chatId && String(m.senderId) !== String(userId));
  const remainingUnread = allChatMsgs.filter(m => !messageSeens.some(s => String(s.messageId) === String(m.id) && String(s.userId) === String(userId))).length;

  const chat = chats.find(c => c.id === chatId);
  if (chat) {
    chat.unreadCount = remainingUnread;
  }

  sendRoomWSEvent(chatId, "message:status_updated", { chatId, userId, messageIds: targetMsgs.map(m => m.id), status: "seen", seenAt: now, unreadCount: remainingUnread });
  res.json({ success: true, newSeensCount, unreadCount: remainingUnread });
});

// ==========================================
// GET MESSAGE REACTIONS
// ==========================================
router.get("/messages/:messageId/reactions", (req: Request, res: Response) => {
  const { messageId } = req.params;
  const rxList = messageReactions.filter(r => String(r.messageId) === String(messageId));
  const aggregated = computeMessageReactions(messageId);
  const detailed = rxList.map(r => {
    const u = users.find(usr => String(usr.id) === String(r.userId));
    return {
      id: r.id,
      messageId: r.messageId,
      userId: r.userId,
      emoji: r.emoji,
      userDisplayName: u ? u.displayName : String(r.userId),
      userAvatarUrl: u ? u.avatarUrl : "",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  });
  res.json({ messageId, totalReactions: rxList.length, reactions: aggregated, list: detailed });
});

// ==========================================
// POST TOGGLE REACTION
// ==========================================
router.post("/messages/:messageId/reaction", async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { emoji, userId } = req.body;

  if (!emoji || !userId) {
    return res.status(400).json({ error: "ایموجی و شناسه کاربر الزامی است" });
  }

  const msg = messages.find(m => String(m.id) === String(messageId));
  if (!msg) return res.status(404).json({ error: "پیام پیدا نشد" });

  const now = new Date().toISOString();

  const existingIdx = messageReactions.findIndex(
    r => String(r.messageId) === String(messageId) && String(r.userId) === String(userId) && r.emoji === emoji
  );

  if (existingIdx > -1) {
    messageReactions.splice(existingIdx, 1);
    await dbExecute(
      `DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
      [messageId, userId, emoji]
    );
  } else {
    const rxId = messageReactions.length > 0 ? Math.max(...messageReactions.map(r => Number(r.id) || 0)) + 1 : 1;
    messageReactions.push({
      id: rxId,
      messageId,
      userId,
      emoji,
      createdAt: now,
      updatedAt: now
    });

    const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();
    const numMsgId = typeof messageId === "number" ? messageId : (parseInt(String(messageId).replace(/\D/g, ""), 10) || 1);
    const numUserId = typeof userId === "number" ? userId : (parseInt(String(userId).replace(/\D/g, ""), 10) || 1);

    if (dbType === "mysql") {
      await dbExecute(
        `INSERT INTO message_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE emoji = VALUES(emoji)`,
        [numMsgId, numUserId, emoji, now]
      );
    } else if (dbType === "postgres" || dbType === "postgresql") {
      await dbExecute(
        `INSERT INTO message_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (message_id, user_id, emoji) DO UPDATE SET emoji = EXCLUDED.emoji`,
        [numMsgId, numUserId, emoji, now]
      );
    } else {
      await dbExecute(
        `INSERT OR REPLACE INTO message_reactions (id, message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)`,
        [rxId, numMsgId, numUserId, emoji, now]
      );
    }
  }

  msg.reactions = computeMessageReactions(messageId);

  sendRoomWSEvent(msg.chatId, "message:reaction_updated", msg);
  res.json(msg);
});

// ==========================================
// PIN MESSAGE
// ==========================================
router.post("/messages/:messageId/pin", async (req: Request, res: Response) => {
  if (!systemSettings.pinEnabled) {
    return res.status(403).json({ error: "پین کردن پیام غیرفعال است" });
  }
  const { messageId } = req.params;
  const msg = messages.find(m => String(m.id) === String(messageId));
  if (!msg) return res.status(404).json({ error: "پیام یافت نشد" });

  msg.isPinned = !msg.isPinned;

  await dbExecute(
    `UPDATE messages SET is_pinned = ? WHERE id = ?`,
    [msg.isPinned ? 1 : 0, messageId]
  );

  broadcastWSEvent("message:updated", msg);
  res.json(msg);
});

// ==========================================
// GLOBAL SEARCH
// ==========================================
router.get("/search", (req: Request, res: Response) => {
  const query = (req.query.q as string || "").toLowerCase();
  if (!query) {
    return res.json({ users: [], chats: [], messages: [] });
  }

  const matchedUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(query) ||
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

// ==========================================
// FASTAPI PROXIES
// ==========================================
router.get("/fastapi/realtime/stats", (req: Request, res: Response) => {
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

router.post("/fastapi/notifications/push", (req: Request, res: Response) => {
  const { user_id, title, chat_id } = req.body;
  res.json({
    status: "queued",
    recipient: user_id,
    title,
    chatId: chat_id,
    engine: "FastAPI Notification Dispatcher (Port 8001)"
  });
});

export default router;