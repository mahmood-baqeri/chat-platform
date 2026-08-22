// web/server/endpoints/contact-endpoint.ts

import express, { Request, Response } from "express";
import {
  users,
  contacts,
  chats,
  messages,
  messageSeens
} from "../store/dataStore.js";
import { AvatarPhoto } from "../models/types.js";

const router = express.Router();

// GET Contacts
router.get("/contacts", async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || "user-1";
  
  const otherUsers = users.filter(u => String(u.id) !== String(userId));

  const enriched = otherUsers.map(u => {
    const customContact = contacts.find(c => String(c.userId) === String(userId) && String(c.contactUserId) === String(u.id));

    const directChat = chats.find(chat =>
      chat.type === "direct" &&
      chat.members?.some(m => String(m.userId) === String(u.id)) &&
      chat.members?.some(m => String(m.userId) === String(userId))
    );

    let unreadCount = 0;
    if (directChat) {
      const chatMsgs = messages.filter(m => m.chatId === directChat.id && String(m.senderId) !== String(u.id));
      unreadCount = chatMsgs.filter(m => !messageSeens.some(s => String(s.messageId) === String(m.id) && String(s.userId) === String(userId))).length;
    }

    // ✅ استفاده از فیلدهای دیتابیس: status و last_seen
    const isOnline = u.status === 'online';
    
    // ✅ محاسبه lastSeen از فیلد last_seen دیتابیس
    let lastSeenText = "خیلی وقت پیش";
    if (u.lastSeen) {
      const lastSeenDate = new Date(u.lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - lastSeenDate.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMinutes < 1) {
        lastSeenText = "هم‌اکنون";
      } else if (diffMinutes < 60) {
        lastSeenText = `${diffMinutes} دقیقه پیش`;
      } else if (diffHours < 24) {
        lastSeenText = `${diffHours} ساعت پیش`;
      } else if (diffDays < 7) {
        lastSeenText = `${diffDays} روز پیش`;
      } else {
        lastSeenText = lastSeenDate.toLocaleDateString("fa-IR");
      }
    }

    return {
      id: customContact?.id || `cnt-${u.id}`,
      userId,
      contactUserId: u.id,
      customName: customContact?.customName || u.displayName || u.phone || "کاربر",
      firstName: u.firstName,
      lastName: u.lastName,
      displayName: u.displayName || customContact?.customName || u.phone || "کاربر",
      avatarUrl: u.avatarUrl || AvatarPhoto,
      status: u.status || "offline", // استفاده از فیلد status دیتابیس
      lastSeen: lastSeenText,
      lastSeenRaw: u.lastSeen, // برای استفاده در کلاینت
      isOnline: isOnline,
      lastMessage: directChat?.lastMessage ? {
        content: directChat.lastMessage.content,
        createdAt: directChat.lastMessage.createdAt,
        type: directChat.lastMessage.type
      } : null,
      unreadCount,
      chatId: directChat?.id || null,
      phone: u.phone || "",
      username: u.personCode || "",
      createdAt: customContact?.createdAt || u.createdAt || new Date().toISOString()
    };
  });

  res.json(enriched);
});

export default router;
