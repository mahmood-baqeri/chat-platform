import express, { Request, Response } from "express";
import {chats, messages, users, systemSettings} from "../../../store/dataStore.js";
import {Chat, ChatMember, ChatType, AvatarPhoto, BaseDomain} from "../../../models/types.js";
import {getUserIdFromReq, formatChatForUser} from "../../auth-endpoint.js";
import { dbQuery, dbExecute } from "../../../db/index.js";
import {sendChatMembersWSEvent, broadcastWSEvent} from "../../../websocket/wsServer.js";
import { saveBase64ToFile } from "../../../config.js";


const router = express.Router();

router.get("/chats", (req: Request, res: Response) => {
  const currentUserId = getUserIdFromReq(req);

  if (!currentUserId) {
    return res.status(401).json({
      error: "احراز هویت انجام نشده است",
    });
  }

  const userChats = chats
    .filter((c) => {
      if (!Array.isArray(c.members)) return false;

      return (
        c.members.some(
          (m) => String(m.userId) === String(currentUserId)
        ) ||
        String(c.ownerId) === String(currentUserId)
      );
    })
    .map((c) =>
      formatChatForUser(c, String(currentUserId))
    );

  res.json(userChats);
});

router.get("/chats/:chatId", (req: Request, res: Response) => {
    const { chatId } = req.params;
    const userId = getUserIdFromReq(req);

    if (!userId) {
      return res.status(401).json({
        error: "احراز هویت انجام نشده است",
      });
    }

    const targetChat = chats.find(
      (c) =>
        c.id === chatId ||
        c.username === chatId ||
        c.id === `chat-${chatId}`
    );

    if (!targetChat) {
      return res.status(404).json({
        error: "گفتگو پیدا نشد یا حذف شده است",
      });
    }

    const isMember =
      targetChat.members?.some(
        (m) => String(m.userId) === String(userId)
      ) ||
      String(targetChat.ownerId) === String(userId);

    if (!isMember) {
      return res.status(403).json({
        error: "شما عضو این گفتگو نیستید",
      });
    }

    res.json(
      formatChatForUser(targetChat, String(userId))
    );
  }
);

router.post("/chats", async (req: Request, res: Response) => {
    const currentUserId = getUserIdFromReq(req);

    const {
      type,
      title,
      description,
      avatarUrl,
      username,
      isPrivate,
      members,
      ownerId,
    } = req.body;

    if (
      type === "group" &&
      !systemSettings.groupsEnabled
    ) {
      return res.status(403).json({
        error:
          "ایجاد گروه در حال حاضر توسط مدیر سیستم غیرفعال است",
      });
    }

    if (
      type === "channel" &&
      !systemSettings.channelsEnabled
    ) {
      return res.status(403).json({
        error:
          "ایجاد کانال در حال حاضر توسط مدیر سیستم غیرفعال است",
      });
    }

    if (
      type === "direct" &&
      Array.isArray(members) &&
      members.length >= 2
    ) {
      const u1 = members[0].userId;
      const u2 = members[1].userId;

      let existingDirect = chats.find(
        (c) =>
          c.type === "direct" &&
          c.members?.length === 2 &&
          c.members.some(
            (m) => String(m.userId) === String(u1)
          ) &&
          c.members.some(
            (m) => String(m.userId) === String(u2)
          )
      );

      if (!existingDirect) {
        const dbDirectRooms = await dbQuery(
          `SELECT r.id FROM rooms r
           JOIN room_members rm1 ON r.id = rm1.room_id AND rm1.user_id = ?
           JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id = ?
           WHERE r.type = 'direct' LIMIT 1`,
          [u1, u2]
        );

        if (
          dbDirectRooms &&
          dbDirectRooms.length > 0
        ) {
          existingDirect = chats.find(
            (c) => c.id === dbDirectRooms[0].id
          );
        }
      }

      if (existingDirect) {
        return res.json(
          formatChatForUser(
            existingDirect,
            String(currentUserId || "")
          )
        );
      }
    }

    let rawMembers =
      members || [
        {
          userId:
            currentUserId ||
            ownerId ||
            "user-1",
          role: "owner",
          joinedAt: new Date().toISOString(),
          isMuted: false,
        },
      ];

    if (
      type === "direct" &&
      Array.isArray(members) &&
      members.length >= 2
    ) {
      const u1 = members[0].userId;
      const u2 = members[1].userId;

      rawMembers = [
        {
          userId: u1,
          role: "owner",
          joinedAt: new Date().toISOString(),
          isMuted: false,
        },
        {
          userId: u2,
          role: "user",
          joinedAt: new Date().toISOString(),
          isMuted: false,
        },
      ];
    } else if (
      currentUserId &&
      !rawMembers.some(
        (m: any) =>
          String(m.userId) === String(currentUserId)
      )
    ) {
      rawMembers.unshift({
        userId: currentUserId,
        role: "owner",
        joinedAt: new Date().toISOString(),
        isMuted: false,
      });
    }

    const uniqueMembersMap =
      new Map<string, ChatMember>();

    for (const rm of rawMembers) {
      const uidStr = String(rm.userId);

      if (!uniqueMembersMap.has(uidStr)) {
        uniqueMembersMap.set(uidStr, rm);
      }
    }

    const roomMembers =
      Array.from(uniqueMembersMap.values());

    const newChat: Chat = {
      id: "chat-" + Date.now(),
      type: type as ChatType,
      title,
      description: description || "",
      avatarUrl: avatarUrl || AvatarPhoto,
      username,
      isPrivate:
        type === "direct" ? true : !!isPrivate,
      ownerId:
        ownerId ||
        roomMembers[0]?.userId ||
        currentUserId ||
        1,
      members: roomMembers,
      memberCount: roomMembers.length,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      inviteLink: `${BaseDomain}/join/${
        username || Date.now()
      }`,
    };

    chats.unshift(newChat);

    const numOwnerId =
      typeof newChat.ownerId === "number"
        ? newChat.ownerId
        : parseInt(
            String(newChat.ownerId).replace(/\D/g, ""),
            10
          ) || 1;

    await dbExecute(
      `INSERT INTO rooms
       (id, type, title, username, avatar_url, description,
        invite_link, is_private, is_archived, is_pinned,
        unread_count, member_count, owner_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newChat.id,
        newChat.type,
        newChat.title,
        newChat.username || null,
        newChat.avatarUrl,
        newChat.description,
        newChat.inviteLink,
        newChat.isPrivate ? 1 : 0,
        0,
        0,
        0,
        newChat.memberCount,
        numOwnerId,
        newChat.createdAt,
      ]
    );

    const dbType = (
      process.env.DB_TYPE || "sqlite"
    ).toLowerCase();

    for (const m of newChat.members) {
      const mUserId =
        typeof m.userId === "number"
          ? m.userId
          : parseInt(
              String(m.userId).replace(/\D/g, ""),
              10
            ) || 1;

      try {
        if (dbType === "mysql") {
          await dbExecute(
            `INSERT INTO room_members
             (room_id, user_id, role, joined_at)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE role = VALUES(role)`,
            [
              newChat.id,
              mUserId,
              m.role,
              m.joinedAt,
            ]
          );
        } else if (
          dbType === "postgres" ||
          dbType === "postgresql"
        ) {
          await dbExecute(
            `INSERT INTO room_members
             (room_id, user_id, role, joined_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT (room_id, user_id)
             DO UPDATE SET role = EXCLUDED.role`,
            [
              newChat.id,
              mUserId,
              m.role,
              m.joinedAt,
            ]
          );
        } else {
          await dbExecute(
            `INSERT OR REPLACE INTO room_members
             (room_id, user_id, role, joined_at)
             VALUES (?, ?, ?, ?)`,
            [
              newChat.id,
              mUserId,
              m.role,
              m.joinedAt,
            ]
          );
        }
      } catch (e: any) {
        console.error(
          "Error inserting room member:",
          e.message
        );
      }
    }

    sendChatMembersWSEvent(
      newChat.members.map((m) => m.userId),
      "chat:created",
      newChat
    );

    res.json(
      formatChatForUser(
        newChat,
        String(currentUserId || "")
      )
    );
  }
);

router.put("/chats/:chatId", async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const currentUserId =
      getUserIdFromReq(req);

    const chat = chats.find(
      (c) => c.id === chatId
    );

    if (!chat) {
      return res.status(404).json({
        error: "گفتگو پیدا نشد",
      });
    }

    const {
      title,
      description,
      avatarUrl,
      username,
      isPrivate,
    } = req.body;

    const isOwnerOrAdmin =
      String(chat.ownerId) ===
        String(currentUserId) ||
      chat.members?.some(
        (m) =>
          String(m.userId) ===
            String(currentUserId) &&
          (m.role === "owner" ||
            m.role === "admin")
      ) ||
      users.find(
        (u) =>
          String(u.id) ===
          String(currentUserId)
      )?.role === "admin";

    if (!isOwnerOrAdmin && chat.type !== "direct") {
      return res.status(403).json({
        error:
          "شما دسترسی لازم برای تغییر مشخصات این گفت‌وگو را ندارید",
      });
    }

    if (title) chat.title = title;
    if (description !== undefined)
      chat.description = description;
    if (username) chat.username = username;
    if (isPrivate !== undefined)
      chat.isPrivate = isPrivate;

    if (avatarUrl !== undefined) {
      chat.avatarUrl = avatarUrl
        ? saveBase64ToFile(
            avatarUrl,
            "room_" + chat.id
          )
        : chat.avatarUrl;
    }

    await dbExecute(
      `UPDATE rooms
       SET title = ?, description = ?, username = ?,
           is_private = ?, avatar_url = ?
       WHERE id = ?`,
      [
        chat.title,
        chat.description,
        chat.username || null,
        chat.isPrivate ? 1 : 0,
        chat.avatarUrl,
        chat.id,
      ]
    );

    broadcastWSEvent("chat:updated", chat);

    res.json(chat);
  }
);

export default router;
