import express, { Request, Response } from "express";
import {
  users,
  chats,
  messages,
  deletedMessages,
  uploadedFiles,
  forbiddenWords,
  rolePermissions,
  auditLogs,
  sessions,
  systemSettings,
  pushPolicy
} from "../store/dataStore.js";
import {
  User,
  Chat,
  UserRole,
  ForbiddenWord,
  WordCategory,
  AvatarPhoto,
  BaseDomain
} from "../models/types.js";
import { dbExecute, dbQuery } from "../db/index.js";
import { broadcastWSEvent, sendRoomWSEvent, wsClients } from "../websocket/wsServer.js";
import { saveBase64ToFile } from "../config.js";
import { dbGet } from "@/src/utils/helper.js";

const router = express.Router();

// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Authentication Middleware
// ============================================
router.use("/admin", (req: Request, res: Response, next) => {
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

  const user = users.find(u => String(u.id) === String(userId));
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

// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Stats - آمار کلی سیستم
// ============================================
router.get("/admin/stats", (req: Request, res: Response) => {
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

// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Users CRUD - مدیریت کاربران
// ============================================

// دریافت لیست کاربران
router.get("/admin/users", (req: Request, res: Response) => {
  const enrichedUsers = users.map(u => {
    const userGroupsCount = chats.filter(c => c.members.some(m => String(m.userId) === String(u.id))).length;
    const userMsgCount = messages.filter(m => String(m.senderId) === String(u.id)).length;
    return {
      ...u,
      groupsCount: userGroupsCount,
      messagesCount: userMsgCount
    };
  });
  res.json(enrichedUsers);
});

// ایجاد کاربر جدید
router.post("/admin/users", async (req: Request, res: Response) => {
  const { phone, nationalCode, firstName, lastName, displayName, role, personCode } = req.body;
  if (!phone || !nationalCode) {
    return res.status(400).json({ error: "شماره موبایل و کد ملی الزامی است" });
  }

  const existing = users.find(u => u.nationalCode === nationalCode || u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: "کاربری با این شماره یا نام کاربری وجود دارد" });
  }

  const newId = users.length > 0 ? Math.max(...users.map(u => Number(u.id) || 0)) + 1 : 1;
  const newUser: User = {
    id: newId,
    phone,
    nationalCode,
    firstName: firstName || "کاربر",
    lastName: lastName || "جدید",
    displayName: displayName || `${firstName || 'کاربر'} ${lastName || ''}`.trim(),
    avatarUrl: AvatarPhoto,
    personCode: personCode || "",
    status: "offline",
    lastSeen: "لحظاتی پیش",
    role: (role as UserRole) || "user",
    isBanned: false,
    isMuted: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  await dbExecute(
    `INSERT INTO users (id, phone, nationalCode, firstName, lastName, displayName, avatarUrl, personCode, status, role, isBanned, isMuted, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newUser.id, newUser.phone, newUser.nationalCode, newUser.firstName, newUser.lastName, newUser.displayName, newUser.avatarUrl, newUser.personCode, newUser.status, newUser.role, 0, 0, newUser.createdAt]
  );

  res.json(newUser);
});

// ویرایش کاربر
router.put("/admin/users/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  const { displayName, nationalCode, role, isBanned, isMuted, phone, personCode } = req.body;
  if (displayName) user.displayName = displayName;
  if (nationalCode) user.nationalCode = nationalCode;
  if (role) user.role = role as UserRole;
  if (phone) user.phone = phone;
  if (personCode !== undefined) user.personCode = personCode;
  if (isBanned !== undefined) user.isBanned = isBanned;
  if (isMuted !== undefined) user.isMuted = isMuted;

  await dbExecute(
    `UPDATE users SET display_name = ?, nationalCode = ?, role = ?, phone = ?, personCode = ?, is_banned = ?, is_muted = ? WHERE id = ?`,
    [user.displayName, user.nationalCode, user.role, user.phone, user.personCode, user.isBanned ? 1 : 0, user.isMuted ? 1 : 0, user.id]
  );

  res.json(user);
});

// حذف کاربر
router.delete("/admin/users/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const index = users.findIndex(u => String(u.id) === String(userId));
  if (index === -1) return res.status(404).json({ error: "کاربر یافت نشد" });

  users.splice(index, 1);
  const remainingSessions = sessions.filter(s => String(s.userId) !== String(userId));
  sessions.length = 0;
  sessions.push(...remainingSessions);

  await dbExecute(`DELETE FROM users WHERE id = ?`, [userId]);

  res.json({ message: "کاربر با موفقیت حذف شد" });
});

// مسدود/رفع مسدودیت کاربر
router.post("/admin/users/:userId/ban", (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  user.isBanned = !user.isBanned;

  const logId = auditLogs.length > 0 ? Math.max(...auditLogs.map(l => Number(l.id) || 0)) + 1 : 1;
  auditLogs.unshift({
    id: logId,
    actorName: "مدیر سیستم",
    action: user.isBanned ? "BAN_USER" : "UNBAN_USER",
    details: `وضعیت کاربر ${user.displayName} تغییر کرد`,
    timestamp: new Date().toISOString(),
    level: "warning"
  });

  res.json(user);
});

// دریافت نشست‌های کاربر
router.get("/admin/users/:userId/sessions", (req: Request, res: Response) => {
  const { userId } = req.params;
  const userSessions = sessions.filter(s => String(s.userId) === String(userId));
  res.json(userSessions);
});

// پایان دادن به تمام نشست‌های کاربر
router.post("/admin/users/:userId/terminate-sessions", (req: Request, res: Response) => {
  const { userId } = req.params;
  const remaining = sessions.filter(s => String(s.userId) !== String(userId));
  sessions.length = 0;
  sessions.push(...remaining);
  res.json({ message: "تمام نشست‌های کاربر خاتمه یافت" });
});


// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Forbidden Words - مدیریت کلمات ممنوعه
// ============================================

// دریافت لیست کلمات ممنوعه
router.get("/admin/forbidden-words", (req: Request, res: Response) => {
  res.json(forbiddenWords);
});


// ایجاد کلمه ممنوعه جدید
router.post("/admin/forbidden-words", async (req: Request, res: Response) => {
  const { word, category, isEnabled } = req.body;
  if (!word || !word.trim()) {
    return res.status(400).json({ error: "متن کلمه ممنوعه الزامی است" });
  }

  const fwId = forbiddenWords.length > 0 ? Math.max(...forbiddenWords.map(w => Number(w.id) || 0)) + 1 : 1;
  const newWord: ForbiddenWord = {
    id: fwId,
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

// ویرایش کلمه ممنوعه
router.put("/admin/forbidden-words/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const item = forbiddenWords.find(w => String(w.id) === String(id));
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

// حذف کلمه ممنوعه
router.delete("/admin/forbidden-words/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = forbiddenWords.findIndex(w => String(w.id) === String(id));
  if (index === -1) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

  forbiddenWords.splice(index, 1);

  await dbExecute(`DELETE FROM forbidden_words WHERE id = ?`, [id]);

  res.json({ message: "کلمه ممنوعه با موفقیت حذف شد" });
});

// ============================================ 
// ============================================ 
// ============================================ 
// ============================================ 
// ============================================ 
// ============================================ 
// ============================================ 
// ============================================ 
// Admin Permissions - مدیریت دسترسی‌ها
// ============================================

// دریافت دسترسی‌ها
router.get("/admin/permissions", (req: Request, res: Response) => {
  res.json(rolePermissions);
});

// به‌روزرسانی دسترسی‌ها
router.put("/admin/permissions", (req: Request, res: Response) => {
  const { permissions } = req.body;
  if (Array.isArray(permissions)) {
    rolePermissions.length = 0;
    rolePermissions.push(...permissions);
  }
  res.json({ message: "دسترسی‌های نقش‌ها با موفقیت بروزرسانی شد", permissions: rolePermissions });
});

// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Room Members - مدیریت اعضای اتاق‌ها
// ============================================

// افزودن عضو به اتاق
router.post("/admin/rooms/:chatId/members", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId, role } = req.body;

  if (!chatId || !userId) {
    return res.status(400).json({ error: "شناسه اتاق و کاربر الزامی است" });
  }

  try {
    const now = new Date().toISOString();
    
    const chatInMemory = chats.find(c => c.id === chatId);
    if (!chatInMemory) return res.status(404).json({ error: "گفتگو یافت نشد" });
    
    if (chatInMemory) {
      chatInMemory.members.push({
        userId: Number(userId),
        role: role || "user",
        joinedAt: now,
        isMuted: false,
      });
      chatInMemory.memberCount = chatInMemory.members.length;
    }
    
    
    const chat = await dbGet(`SELECT * FROM rooms WHERE id = ?`, [chatId]);
    if (!chat) {
      return res.status(404).json({ error: "گفتگو یافت نشد" });
    }

    const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    const existingMember = await dbGet(
      `SELECT * FROM room_members WHERE room_id = ? AND user_id = ?`,
      [chatId, userId]
    );

    if (existingMember) {
      return res.status(400).json({ error: "این کاربر قبلاً عضو گفتگو شده است" });
    }


    await dbExecute(
      `INSERT INTO room_members (room_id, user_id, role, joined_at, is_muted) 
       VALUES (?, ?, ?, ?, ?)`,
      [chatId, userId, role || "user", now, 0]
    );

    await dbExecute(
      `UPDATE rooms SET member_count = member_count + 1 WHERE id = ?`,
      [chatId]
    );

    await dbGet(
      `SELECT rm.*, u.display_name, u.avatar_url, u.phone 
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = ? AND rm.user_id = ?`,
      [chatId, userId]
    );


    res.json(chatInMemory);

    // sendRoomWSEvent(chatId, "member:added", newMember);

    // res.status(201).json({
    //   success: true,
    //   message: "کاربر با موفقیت به گفتگو اضافه شد",
    //   member: newMember
    // });

  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "خطا در افزودن کاربر به گفتگو" });
  }
});

// // حذف عضو از اتاق
router.delete("/admin/rooms/:chatId/members/:userId", async (req: Request, res: Response) => {
  const { chatId, userId } = req.params;

  try {
    const chatInMemory = chats.find(c => c.id === chatId);
    if (!chatInMemory) return res.status(404).json({ error: "گفتگو یافت نشد" });
    chatInMemory.members = chatInMemory.members.filter(m => String(m.userId) !== String(userId));
    chatInMemory.memberCount = chatInMemory.members.length;
    
    
    const member = await dbGet(
      `SELECT * FROM room_members WHERE room_id = ? AND user_id = ?`,
      [chatId, userId]
    );
    if (!member) {
      return res.status(404).json({ error: "عضو یافت نشد" });
    }

    await dbExecute(
      `DELETE FROM room_members WHERE room_id = ? AND user_id = ?`,
      [chatId, userId]
    );

    await dbExecute(
      `UPDATE rooms SET member_count = member_count - 1 WHERE id = ?`,
      [chatId]
    );

    res.json(chatInMemory);

  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: "خطا در حذف عضو از گفتگو" });
  }
});

// ویرایش نقش عضو
router.put("/admin/rooms/:chatId/members/:userId", async (req: Request, res: Response) => {
  const { chatId, userId } = req.params;
  const { role } = req.body;

  try {
    const chatInMemory = chats.find(c => c.id === chatId);
    if (!chatInMemory) return res.status(404).json({ error: "گفتگو یافت نشد" });

    const memberInMemory = chatInMemory.members.find(m => String(m.userId) === String(userId));
    if (!memberInMemory) return res.status(404).json({ error: "عضو یافت نشد" });

    memberInMemory.role = role || "user";
      
    
    const member = await dbGet(
      `SELECT * FROM room_members WHERE room_id = ? AND user_id = ?`,
      [chatId, userId]
    );
    if (!member) {
      return res.status(404).json({ error: "عضو یافت نشد" });
    }
       
    await dbExecute(
      `UPDATE room_members SET role = ? WHERE room_id = ? AND user_id = ?`,
      [role || "user", chatId, userId]
    );

    res.json(chatInMemory);

  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ error: "خطا در ویرایش نقش عضو" });
  }
});

// انتقال مالکیت اتاق
router.post("/admin/rooms/:chatId/transfer-owner", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { newOwnerId } = req.body;

  try {
    const chatInMemory = chats.find(c => c.id === chatId);
    if (!chatInMemory) return res.status(404).json({ error: "گفتگو یافت نشد" });
  
  
    const chat = await dbGet(`SELECT * FROM rooms WHERE id = ?`, [chatId]);
    if (!chat) {
      return res.status(404).json({ error: "گفتگو یافت نشد" });
    }

    const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [newOwnerId]);
    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    await dbExecute(
      `UPDATE rooms SET owner_id = ? WHERE id = ?`,
      [newOwnerId, chatId]
    );
    
    chatInMemory.ownerId = newOwnerId;
    const member = chatInMemory.members.find(m => String(m.userId) === String(newOwnerId));
    if (member) {
      member.role = "owner";
    } else {
      chatInMemory.members.push({
        userId: newOwnerId,
        role: "owner",
        joinedAt: new Date().toISOString(),
        isMuted: false
      });
      chatInMemory.memberCount = chatInMemory.members.length;
    }
    res.json(chatInMemory);

  } catch (error) {
    console.error("Error transferring ownership:", error);
    res.status(500).json({ error: "خطا در انتقال مالکیت" });
  }
});


// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Groups - مدیریت گروه‌ها
// ============================================

// دریافت لیست گروه‌ها
router.get("/admin/groups", (req: Request, res: Response) => {
  const groupList = chats.filter(c => c.type === "group");
  res.json(groupList);
});

// ایجاد گروه جدید
router.post("/admin/groups", async (req: Request, res: Response) => {
  const { title, description, isPrivate, ownerId, avatarUrl } = req.body;
  const savedAvatar = avatarUrl ? saveBase64ToFile(avatarUrl, "group_" + Date.now()) : AvatarPhoto;

  const numOwnerId = typeof ownerId === "number" ? ownerId : (parseInt(String(ownerId).replace(/\D/g, ""), 10) || 1);
  const newGroup: Chat = {
    id: "chat-group-" + Date.now(),
    type: "group",
    title,
    description: description || "",
    avatarUrl: savedAvatar,
    username: "group_" + Math.floor(1000 + Math.random() * 9000),
    isPrivate: !!isPrivate,
    ownerId: numOwnerId,
    members: [
      { userId: numOwnerId, role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: 1,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    inviteLink: `${BaseDomain}/join/group_${Date.now()}`
  };

  chats.unshift(newGroup);
  await dbExecute(
    `INSERT INTO rooms (id, type, title, description, avatar_url, username, is_private, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newGroup.id, newGroup.type, newGroup.title, newGroup.description, newGroup.avatarUrl, newGroup.username, newGroup.isPrivate ? 1 : 0, numOwnerId, newGroup.createdAt]
  );
  try {
    await dbExecute(
      `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`,
      [newGroup.id, numOwnerId, "owner", newGroup.createdAt]
    );
  } catch (e) { }
  broadcastWSEvent("chat:created", newGroup);
  res.json(newGroup);
});

// ویرایش گروه
router.put("/admin/groups/:groupId", async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const group = chats.find(c => c.id === groupId && c.type === "group");
  if (!group) return res.status(404).json({ error: "گروه یافت نشد" });

  const { title, description, isPrivate, ownerId, isArchived, inviteLink, avatarUrl } = req.body;
  if (title) group.title = title;
  if (description !== undefined) group.description = description;
  if (isPrivate !== undefined) group.isPrivate = isPrivate;
  if (ownerId) group.ownerId = ownerId;
  if (isArchived !== undefined) group.isArchived = isArchived;
  if (inviteLink) group.inviteLink = inviteLink;
  if (avatarUrl !== undefined) {
    group.avatarUrl = avatarUrl ? saveBase64ToFile(avatarUrl, "group_" + group.id) : AvatarPhoto;
  }

  await dbExecute(
    `UPDATE rooms SET title = ?, description = ?, is_private = ?, avatar_url = ? WHERE id = ?`,
    [group.title, group.description, group.isPrivate ? 1 : 0, group.avatarUrl, group.id]
  );
  broadcastWSEvent("chat:updated", group);
  res.json(group);
});


// حذف گروه
router.delete("/admin/groups/:groupId", async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const index = chats.findIndex(c => c.id === groupId);
  if (index === -1) return res.status(404).json({ error: "گروه یافت نشد" });

  chats.splice(index, 1);
  await dbExecute(`DELETE FROM rooms WHERE id = ?`, [groupId]);
  res.json({ message: "گروه با موفقیت حذف شد" });
});


// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Channels - مدیریت کانال‌ها
// ============================================

// دریافت لیست کانال‌ها
router.get("/admin/channels", (req: Request, res: Response) => {
  const channelList = chats.filter(c => c.type === "channel");
  res.json(channelList);
});

// ایجاد کانال جدید
router.post("/admin/channels", async (req: Request, res: Response) => {
  const { title, description, username, isPrivate, ownerId, avatarUrl } = req.body;
  const savedAvatar = avatarUrl ? saveBase64ToFile(avatarUrl, "channel_" + Date.now()) : AvatarPhoto;

  const numOwnerId = typeof ownerId === "number" ? ownerId : (parseInt(String(ownerId).replace(/\D/g, ""), 10) || 1);
  const newChannel: Chat = {
    id: "chat-channel-" + Date.now(),
    type: "channel",
    title,
    description: description || "",
    avatarUrl: savedAvatar,
    username: username || "channel_" + Math.floor(1000 + Math.random() * 9000),
    isPrivate: !!isPrivate,
    ownerId: numOwnerId,
    members: [
      { userId: numOwnerId, role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
    ],
    memberCount: 1,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    inviteLink: `${BaseDomain}/join/${username || Date.now()}`
  };

  chats.unshift(newChannel);
  await dbExecute(
    `INSERT INTO rooms (id, type, title, description, avatar_url, username, is_private, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newChannel.id, newChannel.type, newChannel.title, newChannel.description, newChannel.avatarUrl, newChannel.username, newChannel.isPrivate ? 1 : 0, numOwnerId, newChannel.createdAt]
  );
  try {
    await dbExecute(
      `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`,
      [newChannel.id, numOwnerId, "owner", newChannel.createdAt]
    );
  } catch (e) { }
  broadcastWSEvent("chat:created", newChannel);
  res.json(newChannel);
});

// ویرایش کانال
router.put("/admin/channels/:channelId", async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const channel = chats.find(c => c.id === channelId && c.type === "channel");
  if (!channel) return res.status(404).json({ error: "کانال یافت نشد" });

  const { title, description, username, isPrivate, avatarUrl } = req.body;
  if (title) channel.title = title;
  if (description !== undefined) channel.description = description;
  if (username) channel.username = username;
  if (isPrivate !== undefined) channel.isPrivate = isPrivate;
  if (avatarUrl !== undefined) {
    channel.avatarUrl = avatarUrl ? saveBase64ToFile(avatarUrl, "channel_" + channel.id) : AvatarPhoto;
  }

  await dbExecute(
    `UPDATE rooms SET title = ?, description = ?, username = ?, is_private = ?, avatar_url = ? WHERE id = ?`,
    [channel.title, channel.description, channel.username || null, channel.isPrivate ? 1 : 0, channel.avatarUrl, channel.id]
  );
  broadcastWSEvent("chat:updated", channel);
  res.json(channel);
});

// حذف کانال
router.delete("/admin/channels/:channelId", (req: Request, res: Response) => {
  const { channelId } = req.params;
  const index = chats.findIndex(c => c.id === channelId);
  if (index === -1) return res.status(404).json({ error: "کانال یافت نشد" });

  chats.splice(index, 1);
  res.json({ message: "کانال با موفقیت حذف شد" });
});


// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Messages - مدیریت پیام‌ها
// ============================================

// دریافت لیست پیام‌ها
router.get("/admin/messages", (req: Request, res: Response) => {
  res.json({
    activeMessages: messages,
    deletedMessages: deletedMessages
  });
});

// بازیابی پیام حذف شده
router.post("/admin/messages/:messageId/restore", (req: Request, res: Response) => {
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


// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Files - مدیریت فایل‌ها
// ============================================

// دریافت لیست فایل‌ها
router.get("/admin/files", (req: Request, res: Response) => {
  const msgAttachments: any[] = [];
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

// حذف فایل
router.delete("/admin/files/:fileId", (req: Request, res: Response) => {
  const { fileId } = req.params;
  const filteredUploads = uploadedFiles.filter(f => f.id !== fileId);
  uploadedFiles.length = 0;
  uploadedFiles.push(...filteredUploads);

  messages.forEach(m => {
    if (m.attachments) {
      m.attachments = m.attachments.filter(att => att.id !== fileId);
    }
  });

  res.json({ message: "فایل با موفقیت حذف شد" });
});

// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin Audit Logs - گزارش‌های سیستمی
// ============================================

// دریافت لاگ‌ها
router.get("/admin/logs", (req: Request, res: Response) => {
  res.json(auditLogs);
});

// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// ============================================
// Admin System Settings - تنظیمات سیستم
// ============================================

// دریافت تنظیمات سیستم
router.get("/admin/system-settings", async (req: Request, res: Response) => {
  try {
    const rows = await dbQuery(`SELECT * FROM system_settings WHERE id = 1`);
    if (rows && rows.length > 0) {
      const s = rows[0];
      return res.json({
        registrationEnabled: !!s.registration_enabled,
        loginEnabled: !!s.login_enabled,
        otpEnabled: !!s.otp_enabled,
        channelsEnabled: !!s.channels_enabled,
        groupsEnabled: !!s.groups_enabled,
        callsEnabled: !!s.calls_enabled,
        editMessageEnabled: !!s.edit_message_enabled,
        deleteMessageEnabled: !!s.delete_message_enabled,
        maxFileSizeMb: s.max_file_size_mb || 25,
        pushPolicy: s.push_policy || "always",
      });
    }
  } catch (e) { }

  res.json({
    registrationEnabled: systemSettings.registrationEnabled,
    loginEnabled: systemSettings.loginEnabled,
    otpEnabled: systemSettings.otpEnabled,
    channelsEnabled: systemSettings.channelsEnabled,
    groupsEnabled: systemSettings.groupsEnabled,
    callsEnabled: systemSettings.callsEnabled,
    editMessageEnabled: systemSettings.editMessageEnabled,
    deleteMessageEnabled: systemSettings.deleteMessageEnabled,
    maxFileSizeMb: systemSettings.maxFileSizeMB,
    pushPolicy,
  });
});

// به‌روزرسانی تنظیمات سیستم
router.post("/admin/system-settings", async (req: Request, res: Response) => {
  const {
    registrationEnabled,
    loginEnabled,
    otpEnabled,
    channelsEnabled,
    groupsEnabled,
    callsEnabled,
    editMessageEnabled,
    deleteMessageEnabled,
    maxFileSizeMb,
  } = req.body;

  try {
    if (registrationEnabled !== undefined) {
      systemSettings.registrationEnabled = registrationEnabled;
      await dbExecute(`UPDATE system_settings SET registration_enabled = ? WHERE id = 1`, [registrationEnabled ? 1 : 0]);
    }
    if (loginEnabled !== undefined) {
      systemSettings.loginEnabled = loginEnabled;
      await dbExecute(`UPDATE system_settings SET login_enabled = ? WHERE id = 1`, [loginEnabled ? 1 : 0]);
    }
    if (otpEnabled !== undefined) {
      systemSettings.otpEnabled = otpEnabled;
      await dbExecute(`UPDATE system_settings SET otp_enabled = ? WHERE id = 1`, [otpEnabled ? 1 : 0]);
    }
    if (channelsEnabled !== undefined) {
      systemSettings.channelsEnabled = channelsEnabled;
      await dbExecute(`UPDATE system_settings SET channels_enabled = ? WHERE id = 1`, [channelsEnabled ? 1 : 0]);
    }
    if (groupsEnabled !== undefined) {
      systemSettings.groupsEnabled = groupsEnabled;
      await dbExecute(`UPDATE system_settings SET groups_enabled = ? WHERE id = 1`, [groupsEnabled ? 1 : 0]);
    }
    if (callsEnabled !== undefined) {
      systemSettings.callsEnabled = callsEnabled;
      await dbExecute(`UPDATE system_settings SET calls_enabled = ? WHERE id = 1`, [callsEnabled ? 1 : 0]);
    }
    if (editMessageEnabled !== undefined) {
      systemSettings.editMessageEnabled = editMessageEnabled;
      await dbExecute(`UPDATE system_settings SET edit_message_enabled = ? WHERE id = 1`, [editMessageEnabled ? 1 : 0]);
    }
    if (deleteMessageEnabled !== undefined) {
      systemSettings.deleteMessageEnabled = deleteMessageEnabled;
      await dbExecute(`UPDATE system_settings SET delete_message_enabled = ? WHERE id = 1`, [deleteMessageEnabled ? 1 : 0]);
    }
    if (maxFileSizeMb !== undefined) {
      systemSettings.maxFileSizeMB = maxFileSizeMb;
      await dbExecute(`UPDATE system_settings SET max_file_size_mb = ? WHERE id = 1`, [maxFileSizeMb]);
    }
  } catch (e) { }

  res.json({ success: true, message: "تنظیمات سیستم با موفقیت به‌روزرسانی شد." });
});

export default router;




// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################
// ################################################################################

// // ============================================
// // تابع کمکی برای بررسی وجود members
// // ============================================
// function getSafeMembers(chat: any): any[] {
//   return chat?.members || [];
// }

// // ============================================
// // Admin Authentication Middleware
// // ============================================
// router.use("/admin", (req: Request, res: Response, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.includes("jwt-token-")) {
//     return res.status(403).json({ error: "دسترسی غیرمجاز. شما وارد سیستم نشده‌اید." });
//   }

//   const tokenContent = authHeader.split("jwt-token-")[1];
//   if (!tokenContent) {
//     return res.status(403).json({ error: "توکن نامعتبر است." });
//   }

//   const lastHyphenIndex = tokenContent.lastIndexOf("-");
//   const userId = lastHyphenIndex > 0 ? tokenContent.substring(0, lastHyphenIndex) : tokenContent;

//   const user = users.find(u => String(u.id) === String(userId));
//   if (!user) {
//     return res.status(403).json({ error: "کاربر یافت نشد." });
//   }

//   if (user.isBanned) {
//     return res.status(403).json({ error: "حساب کاربری شما مسدود شده است." });
//   }

//   if (user.role !== "admin" && user.role !== "owner" && user.role !== "super_admin") {
//     return res.status(403).json({ error: "دسترسی غیرمجاز. فقط مدیران سیستم به این بخش دسترسی دارند." });
//   }

//   (req as any).currentUser = user;
//   next();
// });

// // ============================================
// // Admin Stats - آمار کلی سیستم
// // ============================================
// router.get("/admin/stats", (req: Request, res: Response) => {
//   const totalUsers = users.length;
//   const activeChats = chats.length;
//   const totalMessages = messages.length;
//   const totalFiles = uploadedFiles.length + messages.reduce((acc, m) => acc + (m.attachments?.length || 0), 0);
//   const totalStorageBytes = uploadedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

//   const groupsCount = chats.filter(c => c.type === "group").length;
//   const channelsCount = chats.filter(c => c.type === "channel").length;

//   res.json({
//     totalUsers,
//     activeChats,
//     totalMessages,
//     deletedMessagesCount: deletedMessages.length,
//     totalFiles,
//     totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
//     onlineCount: users.filter(u => u.status === "online").length,
//     groupsCount,
//     channelsCount,
//     wsConnectedCount: wsClients.size
//   });
// });

// // ============================================
// // Admin Users CRUD - مدیریت کاربران
// // ============================================

// // دریافت لیست کاربران
// router.get("/admin/users", async (req: Request, res: Response) => {
//   try {
//     const usersFromDB = await dbQuery(`SELECT * FROM users ORDER BY created_at DESC`);
    
//     if (!usersFromDB || usersFromDB.length === 0) {
//       return res.json([]);
//     }

//     const enrichedUsers = await Promise.all(usersFromDB.map(async (u: any) => {
//       const groupsResult = await dbQuery(
//         `SELECT COUNT(DISTINCT rm.room_id) as count 
//          FROM room_members rm
//          INNER JOIN rooms r ON rm.room_id = r.id
//          WHERE rm.user_id = ? AND r.type IN ('group', 'channel')`,
//         [u.id]
//       );
      
//       const messagesResult = await dbQuery(
//         `SELECT COUNT(*) as count FROM messages WHERE sender_id = ?`,
//         [u.id]
//       );
      
//       return {
//         id: u.id,
//         phone: u.phone,
//         nationalCode: u.nationalCode,
//         personCode: u.personCode,
//         firstName: u.first_name,
//         lastName: u.last_name,
//         displayName: u.display_name,
//         avatarUrl: u.avatar_url,
//         status: u.status || 'offline',
//         lastSeen: u.last_seen,
//         role: u.role || 'user',
//         isBanned: !!u.is_banned,
//         isMuted: !!u.is_muted,
//         createdAt: u.created_at,
//         groupsCount: groupsResult[0]?.count || 0,
//         messagesCount: messagesResult[0]?.count || 0
//       };
//     }));
    
//     res.json(enrichedUsers);
//   } catch (error) {
//     console.error("Error fetching users:", error);
    
//     try {
//       const enrichedUsers = users.map(u => {
//         const userGroupsCount = chats.filter(c => {
//           const members = getSafeMembers(c);
//           return members.some(m => String(m.userId) === String(u.id));
//         }).length;
        
//         const userMsgCount = messages.filter(m => 
//           String(m.senderId) === String(u.id)
//         ).length;
        
//         return {
//           ...u,
//           groupsCount: userGroupsCount,
//           messagesCount: userMsgCount
//         };
//       });
      
//       return res.json(enrichedUsers);
//     } catch (fallbackError) {
//       console.error("Fallback error:", fallbackError);
//       return res.status(500).json({ error: "خطا در دریافت لیست کاربران" });
//     }
//   }
// });

// // ایجاد کاربر جدید
// router.post("/admin/users", async (req: Request, res: Response) => {
//   const { phone, nationalCode, firstName, lastName, displayName, role, personCode } = req.body;
//   if (!phone || !nationalCode) {
//     return res.status(400).json({ error: "شماره موبایل و کد ملی الزامی است" });
//   }

//   const existing = await dbGet(
//     `SELECT * FROM users WHERE nationalCode = ? OR phone = ?`,
//     [nationalCode, phone]
//   );
  
//   if (existing) {
//     return res.status(400).json({ error: "کاربری با این شماره یا کد ملی وجود دارد" });
//   }

//   const newId = users.length > 0 ? Math.max(...users.map(u => Number(u.id) || 0)) + 1 : 1;
//   const newUser: User = {
//     id: newId,
//     phone,
//     nationalCode,
//     firstName: firstName || "کاربر",
//     lastName: lastName || "جدید",
//     displayName: displayName || `${firstName || 'کاربر'} ${lastName || ''}`.trim(),
//     avatarUrl: AvatarPhoto,
//     personCode: personCode || "",
//     status: "offline",
//     lastSeen: "لحظاتی پیش",
//     role: (role as UserRole) || "user",
//     isBanned: false,
//     isMuted: false,
//     createdAt: new Date().toISOString()
//   };

//   users.push(newUser);

//   await dbExecute(
//     `INSERT INTO users (id, phone, nationalCode, firstName, lastName, displayName, avatarUrl, personCode, status, role, isBanned, isMuted, createdAt) 
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [newUser.id, newUser.phone, newUser.nationalCode, newUser.firstName, newUser.lastName, 
//      newUser.displayName, newUser.avatarUrl, newUser.personCode, newUser.status, 
//      newUser.role, 0, 0, newUser.createdAt]
//   );

//   res.json(newUser);
// });

// // ویرایش کاربر
// router.put("/admin/users/:userId", async (req: Request, res: Response) => {
//   const { userId } = req.params;
  
//   const userFromDB = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
//   if (!userFromDB) {
//     return res.status(404).json({ error: "کاربر یافت نشد" });
//   }

//   const user = users.find(u => String(u.id) === String(userId));
//   if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

//   const { displayName, nationalCode, role, isBanned, isMuted, phone, personCode } = req.body;
//   if (displayName) user.displayName = displayName;
//   if (nationalCode) user.nationalCode = nationalCode;
//   if (role) user.role = role as UserRole;
//   if (phone) user.phone = phone;
//   if (personCode !== undefined) user.personCode = personCode;
//   if (isBanned !== undefined) user.isBanned = isBanned;
//   if (isMuted !== undefined) user.isMuted = isMuted;

//   await dbExecute(
//     `UPDATE users SET display_name = ?, nationalCode = ?, role = ?, phone = ?, personCode = ?, is_banned = ?, is_muted = ? WHERE id = ?`,
//     [user.displayName, user.nationalCode, user.role, user.phone, user.personCode, 
//      user.isBanned ? 1 : 0, user.isMuted ? 1 : 0, user.id]
//   );

//   res.json(user);
// });

// // حذف کاربر
// router.delete("/admin/users/:userId", async (req: Request, res: Response) => {
//   const { userId } = req.params;
  
//   const userFromDB = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
//   if (!userFromDB) {
//     return res.status(404).json({ error: "کاربر یافت نشد" });
//   }

//   const index = users.findIndex(u => String(u.id) === String(userId));
//   if (index !== -1) {
//     users.splice(index, 1);
//   }
  
//   const remainingSessions = sessions.filter(s => String(s.userId) !== String(userId));
//   sessions.length = 0;
//   sessions.push(...remainingSessions);

//   await dbExecute(`DELETE FROM users WHERE id = ?`, [userId]);

//   res.json({ message: "کاربر با موفقیت حذف شد" });
// });

// // مسدود/رفع مسدودیت کاربر
// router.post("/admin/users/:userId/ban", async (req: Request, res: Response) => {
//   const { userId } = req.params;
  
//   const userFromDB = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
//   if (!userFromDB) {
//     return res.status(404).json({ error: "کاربر یافت نشد" });
//   }

//   const user = users.find(u => String(u.id) === String(userId));
//   if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

//   user.isBanned = !user.isBanned;

//   await dbExecute(
//     `UPDATE users SET is_banned = ? WHERE id = ?`,
//     [user.isBanned ? 1 : 0, userId]
//   );

//   const logId = auditLogs.length > 0 ? Math.max(...auditLogs.map(l => Number(l.id) || 0)) + 1 : 1;
//   auditLogs.unshift({
//     id: logId,
//     actorName: "مدیر سیستم",
//     action: user.isBanned ? "BAN_USER" : "UNBAN_USER",
//     details: `وضعیت کاربر ${user.displayName} تغییر کرد`,
//     timestamp: new Date().toISOString(),
//     level: "warning"
//   });

//   res.json(user);
// });

// // دریافت نشست‌های کاربر
// router.get("/admin/users/:userId/sessions", (req: Request, res: Response) => {
//   const { userId } = req.params;
//   const userSessions = sessions.filter(s => String(s.userId) === String(userId));
//   res.json(userSessions);
// });

// // پایان دادن به تمام نشست‌های کاربر
// router.post("/admin/users/:userId/terminate-sessions", (req: Request, res: Response) => {
//   const { userId } = req.params;
//   const remaining = sessions.filter(s => String(s.userId) !== String(userId));
//   sessions.length = 0;
//   sessions.push(...remaining);
//   res.json({ message: "تمام نشست‌های کاربر خاتمه یافت" });
// });

// // ============================================
// // Admin Forbidden Words - مدیریت کلمات ممنوعه
// // ============================================

// // دریافت لیست کلمات ممنوعه
// router.get("/admin/forbidden-words", (req: Request, res: Response) => {
//   res.json(forbiddenWords);
// });

// // ایجاد کلمه ممنوعه جدید
// router.post("/admin/forbidden-words", async (req: Request, res: Response) => {
//   const { word, category, isEnabled } = req.body;
//   if (!word || !word.trim()) {
//     return res.status(400).json({ error: "متن کلمه ممنوعه الزامی است" });
//   }

//   const fwId = forbiddenWords.length > 0 ? Math.max(...forbiddenWords.map(w => Number(w.id) || 0)) + 1 : 1;
//   const newWord: ForbiddenWord = {
//     id: fwId,
//     word: word.trim(),
//     category: (category as WordCategory) || "custom",
//     isEnabled: isEnabled !== undefined ? !!isEnabled : true,
//     createdAt: new Date().toISOString()
//   };

//   forbiddenWords.unshift(newWord);

//   await dbExecute(
//     `INSERT INTO forbidden_words (id, word, category, is_enabled, created_at) VALUES (?, ?, ?, ?, ?)`,
//     [newWord.id, newWord.word, newWord.category, newWord.isEnabled ? 1 : 0, newWord.createdAt]
//   );

//   res.json(newWord);
// });

// // ویرایش کلمه ممنوعه
// router.put("/admin/forbidden-words/:id", async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const item = forbiddenWords.find(w => String(w.id) === String(id));
//   if (!item) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

//   const { word, category, isEnabled } = req.body;
//   if (word) item.word = word.trim();
//   if (category) item.category = category as WordCategory;
//   if (isEnabled !== undefined) item.isEnabled = isEnabled;

//   await dbExecute(
//     `UPDATE forbidden_words SET word = ?, category = ?, is_enabled = ? WHERE id = ?`,
//     [item.word, item.category, item.isEnabled ? 1 : 0, id]
//   );

//   res.json(item);
// });

// // حذف کلمه ممنوعه
// router.delete("/admin/forbidden-words/:id", async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const index = forbiddenWords.findIndex(w => String(w.id) === String(id));
//   if (index === -1) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

//   forbiddenWords.splice(index, 1);

//   await dbExecute(`DELETE FROM forbidden_words WHERE id = ?`, [id]);

//   res.json({ message: "کلمه ممنوعه با موفقیت حذف شد" });
// });

// // ============================================
// // Admin Permissions - مدیریت دسترسی‌ها
// // ============================================

// // دریافت دسترسی‌ها
// router.get("/admin/permissions", (req: Request, res: Response) => {
//   res.json(rolePermissions);
// });

// // به‌روزرسانی دسترسی‌ها
// router.put("/admin/permissions", (req: Request, res: Response) => {
//   const { permissions } = req.body;
//   if (Array.isArray(permissions)) {
//     rolePermissions.length = 0;
//     rolePermissions.push(...permissions);
//   }
//   res.json({ message: "دسترسی‌های نقش‌ها با موفقیت بروزرسانی شد", permissions: rolePermissions });
// });

// // ============================================
// // Admin Room Members - مدیریت اعضای اتاق‌ها
// // ============================================



// // ============================================
// // Admin Groups - مدیریت گروه‌ها
// // ============================================

// // دریافت لیست گروه‌ها
// router.get("/admin/groups", async (req: Request, res: Response) => {
//   try {
//     const groupList = await dbQuery(
//       `SELECT * FROM rooms WHERE type = 'group' ORDER BY created_at DESC`
//     );
//     res.json(groupList);
//   } catch (error) {
//     console.error("Error fetching groups:", error);
//     res.status(500).json({ error: "خطا در دریافت لیست گروه‌ها" });
//   }
// });

// // ایجاد گروه جدید
// router.post("/admin/groups", async (req: Request, res: Response) => {
//   const { title, description, isPrivate, ownerId, avatarUrl } = req.body;
//   const savedAvatar = avatarUrl ? saveBase64ToFile(avatarUrl, "group_" + Date.now()) : AvatarPhoto;

//   const numOwnerId = typeof ownerId === "number" ? ownerId : (parseInt(String(ownerId).replace(/\D/g, ""), 10) || 1);
//   const now = new Date().toISOString();
//   const newGroup: Chat = {
//     id: "chat-group-" + Date.now(),
//     type: "group",
//     title,
//     description: description || "",
//     avatarUrl: savedAvatar,
//     username: "group_" + Math.floor(1000 + Math.random() * 9000),
//     isPrivate: !!isPrivate,
//     ownerId: numOwnerId,
//     members: [
//       { userId: numOwnerId, role: "owner", joinedAt: now, isMuted: false }
//     ],
//     memberCount: 1,
//     unreadCount: 0,
//     createdAt: now,
//     inviteLink: `${BaseDomain}/join/group_${Date.now()}`
//   };

//   chats.unshift(newGroup);
  
//   await dbExecute(
//     `INSERT INTO rooms (id, type, title, description, avatar_url, username, is_private, owner_id, created_at, member_count) 
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [newGroup.id, newGroup.type, newGroup.title, newGroup.description, newGroup.avatarUrl, 
//      newGroup.username, newGroup.isPrivate ? 1 : 0, numOwnerId, newGroup.createdAt, 1]
//   );
  
//   await dbExecute(
//     `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`,
//     [newGroup.id, numOwnerId, "owner", newGroup.createdAt]
//   );
  
//   broadcastWSEvent("chat:created", newGroup);
//   res.json(newGroup);
// });

// // ویرایش گروه
// router.put("/admin/groups/:groupId", async (req: Request, res: Response) => {
//   const { groupId } = req.params;
  
//   try {
//     const group = await dbGet(`SELECT * FROM rooms WHERE id = ? AND type = 'group'`, [groupId]);
//     if (!group) {
//       return res.status(404).json({ error: "گروه یافت نشد" });
//     }

//     const { title, description, isPrivate, ownerId, isArchived, inviteLink, avatarUrl } = req.body;
    
//     const updates: string[] = [];
//     const values: any[] = [];

//     if (title) { updates.push("title = ?"); values.push(title); }
//     if (description !== undefined) { updates.push("description = ?"); values.push(description); }
//     if (isPrivate !== undefined) { updates.push("is_private = ?"); values.push(isPrivate ? 1 : 0); }
//     if (ownerId) { updates.push("owner_id = ?"); values.push(ownerId); }
//     if (isArchived !== undefined) { updates.push("is_archived = ?"); values.push(isArchived ? 1 : 0); }
//     if (inviteLink) { updates.push("invite_link = ?"); values.push(inviteLink); }
//     if (avatarUrl !== undefined) {
//       const savedAvatar = avatarUrl ? saveBase64ToFile(avatarUrl, "group_" + groupId) : AvatarPhoto;
//       updates.push("avatar_url = ?");
//       values.push(savedAvatar);
//     }

//     if (updates.length === 0) {
//       return res.status(400).json({ error: "هیچ فیلدی برای بروزرسانی ارسال نشده است" });
//     }

//     values.push(groupId);
//     await dbExecute(
//       `UPDATE rooms SET ${updates.join(", ")} WHERE id = ?`,
//       values
//     );

//     const chatInMemory = chats.find(c => c.id === groupId);
//     if (chatInMemory) {
//       if (title) chatInMemory.title = title;
//       if (description !== undefined) chatInMemory.description = description;
//       if (isPrivate !== undefined) chatInMemory.isPrivate = isPrivate;
//       if (ownerId) chatInMemory.ownerId = ownerId;
//       if (isArchived !== undefined) chatInMemory.isArchived = isArchived;
//       if (inviteLink) chatInMemory.inviteLink = inviteLink;
//       if (avatarUrl !== undefined) {
//         chatInMemory.avatarUrl = avatarUrl ? saveBase64ToFile(avatarUrl, "group_" + groupId) : AvatarPhoto;
//       }
//     }

//     const updatedGroup = await dbGet(`SELECT * FROM rooms WHERE id = ?`, [groupId]);
//     broadcastWSEvent("chat:updated", updatedGroup);
//     res.json(updatedGroup);

//   } catch (error) {
//     console.error("Error updating group:", error);
//     res.status(500).json({ error: "خطا در ویرایش گروه" });
//   }
// });

// // حذف گروه
// router.delete("/admin/groups/:groupId", async (req: Request, res: Response) => {
//   const { groupId } = req.params;
  
//   try {
//     const group = await dbGet(`SELECT * FROM rooms WHERE id = ? AND type = 'group'`, [groupId]);
//     if (!group) {
//       return res.status(404).json({ error: "گروه یافت نشد" });
//     }

//     await dbExecute(`DELETE FROM room_members WHERE room_id = ?`, [groupId]);
//     await dbExecute(`DELETE FROM rooms WHERE id = ?`, [groupId]);

//     const index = chats.findIndex(c => c.id === groupId);
//     if (index !== -1) {
//       chats.splice(index, 1);
//     }

//     res.json({ message: "گروه با موفقیت حذف شد" });

//   } catch (error) {
//     console.error("Error deleting group:", error);
//     res.status(500).json({ error: "خطا در حذف گروه" });
//   }
// });

// // ============================================
// // Admin Channels - مدیریت کانال‌ها
// // ============================================

// // دریافت لیست کانال‌ها
// router.get("/admin/channels", async (req: Request, res: Response) => {
//   try {
//     const channelList = await dbQuery(
//       `SELECT * FROM rooms WHERE type = 'channel' ORDER BY created_at DESC`
//     );
//     res.json(channelList);
//   } catch (error) {
//     console.error("Error fetching channels:", error);
//     res.status(500).json({ error: "خطا در دریافت لیست کانال‌ها" });
//   }
// });

// // ایجاد کانال جدید
// router.post("/admin/channels", async (req: Request, res: Response) => {
//   const { title, description, username, isPrivate, ownerId, avatarUrl } = req.body;
//   const savedAvatar = avatarUrl ? saveBase64ToFile(avatarUrl, "channel_" + Date.now()) : AvatarPhoto;

//   const numOwnerId = typeof ownerId === "number" ? ownerId : (parseInt(String(ownerId).replace(/\D/g, ""), 10) || 1);
//   const now = new Date().toISOString();
//   const newChannel: Chat = {
//     id: "chat-channel-" + Date.now(),
//     type: "channel",
//     title,
//     description: description || "",
//     avatarUrl: savedAvatar,
//     username: username || "channel_" + Math.floor(1000 + Math.random() * 9000),
//     isPrivate: !!isPrivate,
//     ownerId: numOwnerId,
//     members: [
//       { userId: numOwnerId, role: "owner", joinedAt: now, isMuted: false }
//     ],
//     memberCount: 1,
//     unreadCount: 0,
//     createdAt: now,
//     inviteLink: `${BaseDomain}/join/${username || Date.now()}`
//   };

//   chats.unshift(newChannel);
  
//   await dbExecute(
//     `INSERT INTO rooms (id, type, title, description, avatar_url, username, is_private, owner_id, created_at, member_count) 
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [newChannel.id, newChannel.type, newChannel.title, newChannel.description, newChannel.avatarUrl, 
//      newChannel.username, newChannel.isPrivate ? 1 : 0, numOwnerId, newChannel.createdAt, 1]
//   );
  
//   await dbExecute(
//     `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`,
//     [newChannel.id, numOwnerId, "owner", newChannel.createdAt]
//   );
  
//   broadcastWSEvent("chat:created", newChannel);
//   res.json(newChannel);
// });

// // ویرایش کانال
// router.put("/admin/channels/:channelId", async (req: Request, res: Response) => {
//   const { channelId } = req.params;
  
//   try {
//     const channel = await dbGet(`SELECT * FROM rooms WHERE id = ? AND type = 'channel'`, [channelId]);
//     if (!channel) {
//       return res.status(404).json({ error: "کانال یافت نشد" });
//     }

//     const { title, description, username, isPrivate, avatarUrl } = req.body;
    
//     const updates: string[] = [];
//     const values: any[] = [];

//     if (title) { updates.push("title = ?"); values.push(title); }
//     if (description !== undefined) { updates.push("description = ?"); values.push(description); }
//     if (username) { updates.push("username = ?"); values.push(username); }
//     if (isPrivate !== undefined) { updates.push("is_private = ?"); values.push(isPrivate ? 1 : 0); }
//     if (avatarUrl !== undefined) {
//       const savedAvatar = avatarUrl ? saveBase64ToFile(avatarUrl, "channel_" + channelId) : AvatarPhoto;
//       updates.push("avatar_url = ?");
//       values.push(savedAvatar);
//     }

//     if (updates.length === 0) {
//       return res.status(400).json({ error: "هیچ فیلدی برای بروزرسانی ارسال نشده است" });
//     }

//     values.push(channelId);
//     await dbExecute(
//       `UPDATE rooms SET ${updates.join(", ")} WHERE id = ?`,
//       values
//     );

//     const chatInMemory = chats.find(c => c.id === channelId);
//     if (chatInMemory) {
//       if (title) chatInMemory.title = title;
//       if (description !== undefined) chatInMemory.description = description;
//       if (username) chatInMemory.username = username;
//       if (isPrivate !== undefined) chatInMemory.isPrivate = isPrivate;
//       if (avatarUrl !== undefined) {
//         chatInMemory.avatarUrl = avatarUrl ? saveBase64ToFile(avatarUrl, "channel_" + channelId) : AvatarPhoto;
//       }
//     }

//     const updatedChannel = await dbGet(`SELECT * FROM rooms WHERE id = ?`, [channelId]);
//     broadcastWSEvent("chat:updated", updatedChannel);
//     res.json(updatedChannel);

//   } catch (error) {
//     console.error("Error updating channel:", error);
//     res.status(500).json({ error: "خطا در ویرایش کانال" });
//   }
// });

// // حذف کانال
// router.delete("/admin/channels/:channelId", async (req: Request, res: Response) => {
//   const { channelId } = req.params;
  
//   try {
//     const channel = await dbGet(`SELECT * FROM rooms WHERE id = ? AND type = 'channel'`, [channelId]);
//     if (!channel) {
//       return res.status(404).json({ error: "کانال یافت نشد" });
//     }

//     await dbExecute(`DELETE FROM room_members WHERE room_id = ?`, [channelId]);
//     await dbExecute(`DELETE FROM rooms WHERE id = ?`, [channelId]);

//     const index = chats.findIndex(c => c.id === channelId);
//     if (index !== -1) {
//       chats.splice(index, 1);
//     }

//     res.json({ message: "کانال با موفقیت حذف شد" });

//   } catch (error) {
//     console.error("Error deleting channel:", error);
//     res.status(500).json({ error: "خطا در حذف کانال" });
//   }
// });

// // ============================================
// // Admin Messages - مدیریت پیام‌ها
// // ============================================

// // دریافت لیست پیام‌ها
// router.get("/admin/messages", (req: Request, res: Response) => {
//   res.json({
//     activeMessages: messages,
//     deletedMessages: deletedMessages
//   });
// });

// // بازیابی پیام حذف شده
// router.post("/admin/messages/:messageId/restore", (req: Request, res: Response) => {
//   const { messageId } = req.params;
//   const index = deletedMessages.findIndex(m => m.id === messageId);
//   if (index === -1) return res.status(404).json({ error: "پیام حذف شده یافت نشد" });

//   const restored = deletedMessages[index];
//   delete restored.isDeleted;
//   delete restored.deletedAt;
//   deletedMessages.splice(index, 1);
//   messages.push(restored);

//   broadcastWSEvent("message:new", restored);
//   res.json({ message: "پیام بازیابی شد", restored });
// });

// // ============================================
// // Admin Files - مدیریت فایل‌ها
// // ============================================

// // دریافت لیست فایل‌ها
// router.get("/admin/files", (req: Request, res: Response) => {
//   const msgAttachments: any[] = [];
//   messages.forEach(m => {
//     if (m.attachments) {
//       m.attachments.forEach(att => {
//         msgAttachments.push({ ...att, chatId: m.chatId, senderId: m.senderId, createdAt: m.createdAt });
//       });
//     }
//   });

//   const combined = [...uploadedFiles, ...msgAttachments];
//   const totalSizeBytes = combined.reduce((sum, f) => sum + (f.size || 0), 0);

//   res.json({
//     files: combined,
//     totalCount: combined.length,
//     totalSizeBytes,
//     totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2)
//   });
// });

// // حذف فایل
// router.delete("/admin/files/:fileId", (req: Request, res: Response) => {
//   const { fileId } = req.params;
//   const filteredUploads = uploadedFiles.filter(f => f.id !== fileId);
//   uploadedFiles.length = 0;
//   uploadedFiles.push(...filteredUploads);

//   messages.forEach(m => {
//     if (m.attachments) {
//       m.attachments = m.attachments.filter(att => att.id !== fileId);
//     }
//   });

//   res.json({ message: "فایل با موفقیت حذف شد" });
// });

// // ============================================
// // Admin Audit Logs - گزارش‌های سیستمی
// // ============================================

// // دریافت لاگ‌ها
// router.get("/admin/logs", (req: Request, res: Response) => {
//   res.json(auditLogs);
// });

// // ============================================
// // Admin System Settings - تنظیمات سیستم
// // ============================================

// // دریافت تنظیمات سیستم
// router.get("/admin/system-settings", async (req: Request, res: Response) => {
//   try {
//     const settings = await dbGet(`SELECT * FROM system_settings WHERE id = 1`);
//     if (settings) {
//       return res.json({
//         registrationEnabled: !!settings.registration_enabled,
//         loginEnabled: !!settings.login_enabled,
//         otpEnabled: !!settings.otp_enabled,
//         channelsEnabled: !!settings.channels_enabled,
//         groupsEnabled: !!settings.groups_enabled,
//         callsEnabled: !!settings.calls_enabled,
//         editMessageEnabled: !!settings.edit_message_enabled,
//         deleteMessageEnabled: !!settings.delete_message_enabled,
//         maxFileSizeMb: settings.max_file_size_mb || 25,
//         pushPolicy: settings.push_policy || "always",
//       });
//     }
//   } catch (e) { }

//   res.json({
//     registrationEnabled: systemSettings.registrationEnabled,
//     loginEnabled: systemSettings.loginEnabled,
//     otpEnabled: systemSettings.otpEnabled,
//     channelsEnabled: systemSettings.channelsEnabled,
//     groupsEnabled: systemSettings.groupsEnabled,
//     callsEnabled: systemSettings.callsEnabled,
//     editMessageEnabled: systemSettings.editMessageEnabled,
//     deleteMessageEnabled: systemSettings.deleteMessageEnabled,
//     maxFileSizeMb: systemSettings.maxFileSizeMB,
//     pushPolicy,
//   });
// });

// // به‌روزرسانی تنظیمات سیستم
// router.post("/admin/system-settings", async (req: Request, res: Response) => {
//   const {
//     registrationEnabled,
//     loginEnabled,
//     otpEnabled,
//     channelsEnabled,
//     groupsEnabled,
//     callsEnabled,
//     editMessageEnabled,
//     deleteMessageEnabled,
//     maxFileSizeMb,
//   } = req.body;

//   try {
//     if (registrationEnabled !== undefined) {
//       systemSettings.registrationEnabled = registrationEnabled;
//       await dbExecute(`UPDATE system_settings SET registration_enabled = ? WHERE id = 1`, [registrationEnabled ? 1 : 0]);
//     }
//     if (loginEnabled !== undefined) {
//       systemSettings.loginEnabled = loginEnabled;
//       await dbExecute(`UPDATE system_settings SET login_enabled = ? WHERE id = 1`, [loginEnabled ? 1 : 0]);
//     }
//     if (otpEnabled !== undefined) {
//       systemSettings.otpEnabled = otpEnabled;
//       await dbExecute(`UPDATE system_settings SET otp_enabled = ? WHERE id = 1`, [otpEnabled ? 1 : 0]);
//     }
//     if (channelsEnabled !== undefined) {
//       systemSettings.channelsEnabled = channelsEnabled;
//       await dbExecute(`UPDATE system_settings SET channels_enabled = ? WHERE id = 1`, [channelsEnabled ? 1 : 0]);
//     }
//     if (groupsEnabled !== undefined) {
//       systemSettings.groupsEnabled = groupsEnabled;
//       await dbExecute(`UPDATE system_settings SET groups_enabled = ? WHERE id = 1`, [groupsEnabled ? 1 : 0]);
//     }
//     if (callsEnabled !== undefined) {
//       systemSettings.callsEnabled = callsEnabled;
//       await dbExecute(`UPDATE system_settings SET calls_enabled = ? WHERE id = 1`, [callsEnabled ? 1 : 0]);
//     }
//     if (editMessageEnabled !== undefined) {
//       systemSettings.editMessageEnabled = editMessageEnabled;
//       await dbExecute(`UPDATE system_settings SET edit_message_enabled = ? WHERE id = 1`, [editMessageEnabled ? 1 : 0]);
//     }
//     if (deleteMessageEnabled !== undefined) {
//       systemSettings.deleteMessageEnabled = deleteMessageEnabled;
//       await dbExecute(`UPDATE system_settings SET delete_message_enabled = ? WHERE id = 1`, [deleteMessageEnabled ? 1 : 0]);
//     }
//     if (maxFileSizeMb !== undefined) {
//       systemSettings.maxFileSizeMB = maxFileSizeMb;
//       await dbExecute(`UPDATE system_settings SET max_file_size_mb = ? WHERE id = 1`, [maxFileSizeMb]);
//     }
//   } catch (e) { }

//   res.json({ success: true, message: "تنظیمات سیستم با موفقیت به‌روزرسانی شد." });
// });

