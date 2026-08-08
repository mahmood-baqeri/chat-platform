import express, { Request, Response } from "express";
import {
  users,
  contacts,
  chats,
  messages,
  messageSeens
} from "../store/dataStore.js";
import { AvatarPhoto, ContactRecord } from "../models/types.js";
import { dbExecute } from "../db/index.js";

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

    return {
      id: customContact?.id || `cnt-${u.id}`,
      userId,
      contactUserId: u.id,
      customName: customContact?.customName || u.displayName || u.username || u.phone || "کاربر",
      displayName: u.displayName || customContact?.customName || u.username || u.phone || "کاربر",
      avatarUrl: u.avatarUrl || AvatarPhoto,
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

// POST Add Contact
router.post("/contacts", async (req: Request, res: Response) => {
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

  try {
    await dbExecute(
      `INSERT INTO contacts (id, user_id, contact_user_id, custom_name, created_at) VALUES (?, ?, ?, ?, ?)`,
      [newContact.id, userId, contactUserId, customName || null, newContact.createdAt]
    );
  } catch (e) {}

  res.json(newContact);
});

// DELETE Contact
router.delete("/contacts/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: "مخاطب یافت نشد" });

  contacts.splice(idx, 1);

  try {
    await dbExecute(`DELETE FROM contacts WHERE id = ?`, [id]);
  } catch (e) {}

  res.json({ message: "مخاطب با موفقیت حذف شد" });
});

export default router;
