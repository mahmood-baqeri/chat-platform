import express, { Request, Response } from "express";
import {messages, users, messageReactions, computeMessageReactions} from "../../../store/dataStore.js";
import { dbExecute } from "../../../db/index.js";
import { sendRoomWSEvent } from "../../../websocket/wsServer.js";

const router = express.Router();

router.get("/messages/:messageId/reactions", (req: Request, res: Response) => {
    const { messageId } = req.params;

    const rxList = messageReactions.filter(
      (r) =>
        String(r.messageId) ===
        String(messageId)
    );

    const aggregated =
      computeMessageReactions(messageId);

    const detailed = rxList.map((r) => {
      const u = users.find(
        (usr) =>
          String(usr.id) ===
          String(r.userId)
      );

      return {
        id: r.id,
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        userDisplayName: u
          ? u.displayName
          : String(r.userId),
        userAvatarUrl: u
          ? u.avatarUrl
          : "",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    res.json({
      messageId,
      totalReactions: rxList.length,
      reactions: aggregated,
      list: detailed,
    });
  }
);

router.post("/messages/:messageId/reaction", async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { emoji, userId } = req.body;

    if (!emoji || !userId) {
      return res.status(400).json({
        error:
          "ایموجی و شناسه کاربر الزامی است",
      });
    }

    const msg = messages.find(
      (m) =>
        String(m.id) ===
        String(messageId)
    );

    if (!msg) {
      return res.status(404).json({
        error: "پیام پیدا نشد",
      });
    }

    const now = new Date().toISOString();

    const existingIdx =
      messageReactions.findIndex(
        (r) =>
          String(r.messageId) ===
            String(messageId) &&
          String(r.userId) ===
            String(userId) &&
          r.emoji === emoji
      );

    if (existingIdx > -1) {
      messageReactions.splice(
        existingIdx,
        1
      );

      await dbExecute(
        `DELETE FROM message_reactions
         WHERE message_id = ? AND user_id = ? AND emoji = ?`,
        [messageId, userId, emoji]
      );
    } else {
      const rxId =
        messageReactions.length > 0
          ? Math.max(
              ...messageReactions.map(
                (r) =>
                  Number(r.id) || 0
              )
            ) + 1
          : 1;

      messageReactions.push({
        id: rxId,
        messageId,
        userId,
        emoji,
        createdAt: now,
        updatedAt: now,
      });

      const dbType = (
        process.env.DB_TYPE ||
        "sqlite"
      ).toLowerCase();

      const numMsgId =
        typeof messageId === "number"
          ? messageId
          : parseInt(
              String(messageId).replace(
                /\D/g,
                ""
              ),
              10
            ) || 1;

      const numUserId =
        typeof userId === "number"
          ? userId
          : parseInt(
              String(userId).replace(
                /\D/g,
                ""
              ),
              10
            ) || 1;

      if (dbType === "mysql") {
        await dbExecute(
          `INSERT INTO message_reactions
           (message_id, user_id, emoji, created_at)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           emoji = VALUES(emoji)`,
          [
            numMsgId,
            numUserId,
            emoji,
            now,
          ]
        );
      } else if (
        dbType === "postgres" ||
        dbType === "postgresql"
      ) {
        await dbExecute(
          `INSERT INTO message_reactions
           (message_id, user_id, emoji, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT
           (message_id, user_id, emoji)
           DO UPDATE SET
           emoji = EXCLUDED.emoji`,
          [
            numMsgId,
            numUserId,
            emoji,
            now,
          ]
        );
      } else {
        await dbExecute(
          `INSERT OR REPLACE INTO message_reactions
           (id, message_id, user_id, emoji, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            rxId,
            numMsgId,
            numUserId,
            emoji,
            now,
          ]
        );
      }
    }

    msg.reactions =
      computeMessageReactions(messageId);

    sendRoomWSEvent(
      msg.chatId,
      "message:reaction_updated",
      msg
    );

    res.json(msg);
  }
);

router.post("/messages/:messageId/pin",  async (req: Request, res: Response) => {
    const {
      systemSettings,
    } = await import("../../../store/dataStore.js");

    if (!systemSettings.pinEnabled) {
      return res.status(403).json({
        error: "پین کردن پیام غیرفعال است",
      });
    }

    const { messageId } = req.params;

    const msg = messages.find(
      (m) =>
        String(m.id) ===
        String(messageId)
    );

    if (!msg) {
      return res.status(404).json({
        error: "پیام یافت نشد",
      });
    }

    msg.isPinned = !msg.isPinned;

    await dbExecute(
      `UPDATE messages SET is_pinned = ? WHERE id = ?`,
      [msg.isPinned ? 1 : 0, messageId]
    );

    sendRoomWSEvent(
      msg.chatId,
      "message:updated",
      msg
    );

    res.json(msg);
  }
);

export default router;
