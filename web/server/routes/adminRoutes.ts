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
import { broadcastWSEvent, wsClients } from "../websocket/wsServer.js";
import { saveBase64ToFile } from "../config.js";

const router = express.Router();

// Admin Authentication Middleware
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

// Admin Stats
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

// Admin Users CRUD
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

router.post("/admin/users", async (req: Request, res: Response) => {
  const { phone, username, firstName, lastName, displayName, role, bio } = req.body;
  if (!phone || !username) {
    return res.status(400).json({ error: "شماره موبایل و نام کاربری الزامی است" });
  }

  const existing = users.find(u => u.username === username || u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: "کاربری با این شماره یا نام کاربری وجود دارد" });
  }

  const newId = users.length > 0 ? Math.max(...users.map(u => Number(u.id) || 0)) + 1 : 1;
  const newUser: User = {
    id: newId,
    phone,
    username,
    firstName: firstName || "کاربر",
    lastName: lastName || "جدید",
    displayName: displayName || `${firstName || 'کاربر'} ${lastName || ''}`.trim(),
    avatarUrl: AvatarPhoto,
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

router.put("/admin/users/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = users.find(u => String(u.id) === String(userId));
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

router.get("/admin/users/:userId/sessions", (req: Request, res: Response) => {
  const { userId } = req.params;
  const userSessions = sessions.filter(s => String(s.userId) === String(userId));
  res.json(userSessions);
});

router.post("/admin/users/:userId/terminate-sessions", (req: Request, res: Response) => {
  const { userId } = req.params;
  const remaining = sessions.filter(s => String(s.userId) !== String(userId));
  sessions.length = 0;
  sessions.push(...remaining);
  res.json({ message: "تمام نشست‌های کاربر خاتمه یافت" });
});

// Admin Forbidden Words
router.get("/admin/forbidden-words", (req: Request, res: Response) => {
  res.json(forbiddenWords);
});

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

router.delete("/admin/forbidden-words/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = forbiddenWords.findIndex(w => String(w.id) === String(id));
  if (index === -1) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

  forbiddenWords.splice(index, 1);

  await dbExecute(`DELETE FROM forbidden_words WHERE id = ?`, [id]);

  res.json({ message: "کلمه ممنوعه با موفقیت حذف شد" });
});

// Admin Permissions
router.get("/admin/permissions", (req: Request, res: Response) => {
  res.json(rolePermissions);
});

router.put("/admin/permissions", (req: Request, res: Response) => {
  const { permissions } = req.body;
  if (Array.isArray(permissions)) {
    rolePermissions.length = 0;
    rolePermissions.push(...permissions);
  }
  res.json({ message: "دسترسی‌های نقش‌ها با موفقیت بروزرسانی شد", permissions: rolePermissions });
});

// Admin Room Members
router.post("/admin/rooms/:chatId/members", (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId, role } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو یافت نشد" });

  if (chat.members.some(m => String(m.userId) === String(userId))) {
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

router.delete("/admin/rooms/:chatId/members/:userId", (req: Request, res: Response) => {
  const { chatId, userId } = req.params;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو یافت نشد" });

  chat.members = chat.members.filter(m => String(m.userId) !== String(userId));
  chat.memberCount = chat.members.length;

  res.json(chat);
});

router.put("/admin/rooms/:chatId/members/:userId", (req: Request, res: Response) => {
  const { chatId, userId } = req.params;
  const { role } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو یافت نشد" });

  const member = chat.members.find(m => String(m.userId) === String(userId));
  if (!member) return res.status(404).json({ error: "عضو یافت نشد" });

  member.role = role || "user";
  res.json(chat);
});

router.post("/admin/rooms/:chatId/transfer-owner", (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { newOwnerId } = req.body;

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: "گفتگو یافت نشد" });

  chat.ownerId = newOwnerId;
  const member = chat.members.find(m => String(m.userId) === String(newOwnerId));
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

// Admin Groups
router.get("/admin/groups", (req: Request, res: Response) => {
  const groupList = chats.filter(c => c.type === "group");
  res.json(groupList);
});

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
  } catch (e) {}
  broadcastWSEvent("chat:created", newGroup);
  res.json(newGroup);
});

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

router.delete("/admin/groups/:groupId", async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const index = chats.findIndex(c => c.id === groupId);
  if (index === -1) return res.status(404).json({ error: "گروه یافت نشد" });

  chats.splice(index, 1);
  await dbExecute(`DELETE FROM rooms WHERE id = ?`, [groupId]);
  res.json({ message: "گروه با موفقیت حذف شد" });
});

// Admin Channels
router.get("/admin/channels", (req: Request, res: Response) => {
  const channelList = chats.filter(c => c.type === "channel");
  res.json(channelList);
});

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
  } catch (e) {}
  broadcastWSEvent("chat:created", newChannel);
  res.json(newChannel);
});

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

router.delete("/admin/channels/:channelId", (req: Request, res: Response) => {
  const { channelId } = req.params;
  const index = chats.findIndex(c => c.id === channelId);
  if (index === -1) return res.status(404).json({ error: "کانال یافت نشد" });

  chats.splice(index, 1);
  res.json({ message: "کانال با موفقیت حذف شد" });
});

// Admin Messages
router.get("/admin/messages", (req: Request, res: Response) => {
  res.json({
    activeMessages: messages,
    deletedMessages: deletedMessages
  });
});

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

// Admin Files
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

// Admin Audit Logs
router.get("/admin/logs", (req: Request, res: Response) => {
  res.json(auditLogs);
});

// Admin System Settings GET & POST
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
  } catch (e) {}

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
  } catch (e) {}

  res.json({ success: true, message: "تنظیمات سیستم با موفقیت به‌روزرسانی شد." });
});

export default router;
