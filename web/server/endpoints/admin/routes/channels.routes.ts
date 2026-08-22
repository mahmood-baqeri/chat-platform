import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { chats } from "../dependencies.js";
import { Chat, AvatarPhoto, BaseDomain } from "../../../models/types.js";
import { dbExecute, getUserById, broadcastWSEvent, saveBase64ToFile } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/channels", (req: Request, res: Response) => {
  const channelList = chats.filter(c => c.type === "channel");
  res.json(channelList);
});

router.post("/channels", async (req: Request, res: Response) => {
  const { title, description, username, isPrivate, ownerId, avatarUrl } = req.body;
  const savedAvatar = avatarUrl ? saveBase64ToFile(avatarUrl, "channel_" + Date.now()) : AvatarPhoto;

  const numOwnerId = typeof ownerId === "number" ? ownerId : (parseInt(String(ownerId).replace(/\D/g, ""), 10) || 1);
  
  const user = await getUserById(ownerId);
  if (!user) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }
  
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
      { userId: numOwnerId, userDisplayname:user.displayName, role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
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

router.put("/channels/:channelId", async (req: Request, res: Response) => {
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

router.delete("/channels/:channelId", (req: Request, res: Response) => {
  const { channelId } = req.params;
  const index = chats.findIndex(c => c.id === channelId);
  if (index === -1) return res.status(404).json({ error: "کانال یافت نشد" });

  chats.splice(index, 1);
  res.json({ message: "کانال با موفقیت حذف شد" });
});

export default router;
