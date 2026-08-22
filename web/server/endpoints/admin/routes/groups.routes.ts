import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { chats } from "../dependencies.js";
import { Chat, AvatarPhoto, BaseDomain } from "../../../models/types.js";
import { dbExecute, getUserById, broadcastWSEvent, saveBase64ToFile } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/groups", (req: Request, res: Response) => {
  const groupList = chats.filter(c => c.type === "group");
  res.json(groupList);
});

router.post("/groups", async (req: Request, res: Response) => {
  const { title, description, isPrivate, ownerId, avatarUrl } = req.body;
  const savedAvatar = avatarUrl ? saveBase64ToFile(avatarUrl, "group_" + Date.now()) : AvatarPhoto;

  const user = await getUserById(ownerId);
  if (!user) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }
  
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
      { userId: numOwnerId, userDisplayname:user.displayName, role: "owner", joinedAt: new Date().toISOString(), isMuted: false }
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

router.put("/groups/:groupId", async (req: Request, res: Response) => {
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

router.delete("/groups/:groupId", async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const index = chats.findIndex(c => c.id === groupId);
  if (index === -1) return res.status(404).json({ error: "گروه یافت نشد" });

  chats.splice(index, 1);
  await dbExecute(`DELETE FROM rooms WHERE id = ?`, [groupId]);
  res.json({ message: "گروه با موفقیت حذف شد" });
});

export default router;
