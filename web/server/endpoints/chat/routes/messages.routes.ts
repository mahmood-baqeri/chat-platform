import express, { Request, Response } from "express";
import {chats, messages, users, systemSettings, forbiddenWords, messageSeens} from "../../../store/dataStore.js";
import {Message, Attachment, AvatarPhoto} from "../../../models/types.js";
import {getUserIdFromReq} from "../../auth-endpoint.js";
import { dbExecute } from "../../../db/index.js";
import {sendRoomWSEvent} from "../../../websocket/wsServer.js";
import { saveBase64ToFile } from "../../../config.js";
import { enrichMessage } from "../helpers/message.helpers.js";
import { sendPushNotificationForMessage } from "../services/push-message.service.js";

const router = express.Router();

router.get("/chats/:chatId/messages",  async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const currentUserId = getUserIdFromReq(req);

    if (!currentUserId) {
      return res.status(401).json({
        error: "احراز هویت انجام نشده است",
      });
    }

    const targetChat = chats.find(
      (c) =>
        c.id === chatId ||
        c.username === chatId ||
        c.id === `chat-${chatId}` ||
        c.id === chatId.replace(/^chat-/, "")
    );

    if (!targetChat) {
      return res.status(404).json({
        error: "گفتگو پیدا نشد",
      });
    }

    const actualChatId = targetChat.id;

    const isMember =
      targetChat.members?.some(
        (m) =>
          String(m.userId) ===
          String(currentUserId)
      ) ||
      String(targetChat.ownerId) ===
        String(currentUserId);

    if (!isMember) {
      return res.status(403).json({
        error:
          "شما اجازه دسترسی به پیام‌های این گفتگو را ندارید",
      });
    }

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit as string) || 20,
        1
      ),
      50
    );

    const beforeId =
      req.query.beforeId as string;
    const afterId =
      req.query.afterId as string;
    const aroundId =
      req.query.aroundId as string;
    const userId =
      req.query.userId as string;

    let chatMessages = messages.filter(
      (m) =>
        String(m.chatId) ===
          String(actualChatId) ||
        String(m.chatId) === String(chatId) ||
        String(m.chatId).replace(
          /^chat-/,
          ""
        ) ===
          String(chatId).replace(
            /^chat-/,
            ""
          ) ||
        String(m.chatId).replace(
          /^room-/,
          ""
        ) ===
          String(actualChatId).replace(
            /^room-/,
            ""
          )
    );

    chatMessages.sort((a, b) => {
      const timeA =
        new Date(a.createdAt || 0).getTime() ||
        0;
      const timeB =
        new Date(b.createdAt || 0).getTime() ||
        0;

      if (timeA !== timeB)
        return timeA - timeB;

      return String(a.id).localeCompare(
        String(b.id)
      );
    });

    if (beforeId) {
      const idx = chatMessages.findIndex(
        (m) => String(m.id) === String(beforeId)
      );

      if (idx !== -1) {
        const older = chatMessages.slice(
          0,
          idx
        );
        const start = Math.max(
          0,
          older.length - limit
        );
        const slice = older.slice(start);

        return res.json({
          messages: slice.map(enrichMessage),
          hasMore: start > 0,
          hasMoreBefore: start > 0,
          hasMoreAfter:
            idx < chatMessages.length,
          total: slice.length,
        });
      }

      return res.json({
        messages: [],
        hasMore: false,
        hasMoreBefore: false,
        hasMoreAfter: true,
        total: 0,
      });
    }

    if (afterId) {
      const idx = chatMessages.findIndex(
        (m) => String(m.id) === String(afterId)
      );

      if (idx !== -1) {
        const slice = chatMessages.slice(
          idx + 1,
          idx + 1 + limit
        );

        return res.json({
          messages: slice.map(enrichMessage),
          hasMore:
            idx + 1 + limit <
            chatMessages.length,
          hasMoreAfter:
            idx + 1 + limit <
            chatMessages.length,
          hasMoreBefore: idx > 0,
          total: slice.length,
        });
      }

      return res.json({
        messages: [],
        hasMore: false,
        hasMoreAfter: false,
        hasMoreBefore: true,
        total: 0,
      });
    }

    if (aroundId) {
      const idx = chatMessages.findIndex(
        (m) => String(m.id) === String(aroundId)
      );

      if (idx !== -1) {
        const half = Math.floor(limit / 2);
        const start = Math.max(
          0,
          idx - half
        );
        const end = Math.min(
          chatMessages.length,
          idx + half + 1
        );
        const slice = chatMessages.slice(
          start,
          end
        );

        return res.json({
          messages: slice.map(enrichMessage),
          hasMoreBefore: start > 0,
          hasMoreAfter:
            end < chatMessages.length,
          firstUnreadMessageId: aroundId,
          total: slice.length,
        });
      }
    }

    let unreadMsgId: string | null = null;

    if (userId) {
      const unreadMsg = chatMessages.find(
        (m) =>
          String(m.senderId) !==
            String(userId) &&
          !m.seenBy?.some(
            (s) =>
              String(s.userId) ===
              String(userId)
          )
      );

      if (unreadMsg) {
        unreadMsgId = String(unreadMsg.id);
      }
    }

    if (unreadMsgId) {
      const idx = chatMessages.findIndex(
        (m) =>
          String(m.id) ===
          String(unreadMsgId)
      );

      if (idx !== -1) {
        const half = Math.floor(limit / 2);
        const start = Math.max(
          0,
          idx - half
        );
        const end = Math.min(
          chatMessages.length,
          idx + half + 1
        );
        const slice = chatMessages.slice(
          start,
          end
        );

        return res.json({
          messages: slice.map(enrichMessage),
          hasMoreBefore: start > 0,
          hasMoreAfter:
            end < chatMessages.length,
          firstUnreadMessageId: unreadMsgId,
          total: chatMessages.length,
        });
      }
    }

    const start = Math.max(
      0,
      chatMessages.length - limit
    );
    const slice = chatMessages.slice(start);

    return res.json({
      messages: slice.map(enrichMessage),
      hasMore: start > 0,
      hasMoreBefore: start > 0,
      hasMoreAfter: false,
      firstUnreadMessageId: null,
      total: chatMessages.length,
    });
  }
);

router.post("/chats/:chatId/messages", async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const currentUserId =
      getUserIdFromReq(req);

    const {
      id: customId,
      senderId,
      type,
      content,
      attachments,
      replyToMessageId,
      replyToMessage,
      forwardedFrom,
      mentions,
      scheduledFor,
    } = req.body;

    const chat = chats.find(
      (c) => c.id === chatId
    );

    if (!chat) {
      return res.status(404).json({
        error: "گفتگو پیدا نشد",
      });
    }

    const actualSenderId =
      currentUserId || senderId || 1;

    const isMember = chat.members?.some(
      (m) =>
        String(m.userId) ===
        String(actualSenderId)
    );

    if (!isMember) {
      return res.status(403).json({
        error:
          "شما عضو این گفتگو نیستید و امکان ارسال پیام را ندارید",
      });
    }

    if (chat.type === "channel") {
      const member = chat.members?.find(
        (m) =>
          String(m.userId) ===
          String(actualSenderId)
      );

      const isOwnerOrAdmin =
        String(chat.ownerId) ===
          String(actualSenderId) ||
        member?.role === "owner" ||
        member?.role === "admin";

      const userObj = users.find(
        (u) =>
          String(u.id) ===
          String(actualSenderId)
      );

      const isSystemAdmin =
        userObj?.role === "admin";

      if (!isOwnerOrAdmin && !isSystemAdmin) {
        return res.status(403).json({
          error:
            "تنها مدیران کانال اجازه ارسال پیام در این کانال را دارند.",
        });
      }
    }

    if (
      type === "image" &&
      !systemSettings.allowImages
    ) {
      return res.status(403).json({
        error: "ارسال تصویر غیرفعال است",
      });
    }

    if (
      type === "video" &&
      !systemSettings.allowVideos
    ) {
      return res.status(403).json({
        error: "ارسال ویدئو غیرفعال است",
      });
    }

    if (
      type === "audio" &&
      !systemSettings.allowAudio
    ) {
      return res.status(403).json({
        error: "ارسال فایل صوتی غیرفعال است",
      });
    }

    if (
      type === "document" &&
      !systemSettings.allowDocuments
    ) {
      return res.status(403).json({
        error: "ارسال سند غیرفعال است",
      });
    }

    if (
      type === "sticker" &&
      !systemSettings.allowStickers
    ) {
      return res.status(403).json({
        error: "ارسال استیکر غیرفعال است",
      });
    }

    if (
      content &&
      typeof content === "string"
    ) {
      const activeForbidden =
        forbiddenWords.filter(
          (w) => w.isEnabled
        );

      for (const fw of activeForbidden) {
        if (
          content
            .toLowerCase()
            .includes(fw.word.toLowerCase())
        ) {
          return res.status(400).json({
            error: `پیام شما شامل کلمه ممنوعه "${fw.word}" است و قابل ارسال نمی‌باشد.`,
          });
        }
      }
    }

    let finalId = customId;

    if (finalId) {
      if (
        messages.some(
          (m) =>
            String(m.id) ===
            String(finalId)
        )
      ) {
        return res.status(400).json({
          error: `شناسه پیام (${finalId}) تکراری است و قبلاً ثبت شده است.`,
        });
      }
    } else {
      finalId =
        messages.length > 0
          ? Math.max(
              ...messages.map(
                (m) => Number(m.id) || 0
              )
            ) + 1
          : 1;
    }

    const processedAttachments = (
      attachments || []
    ).map((att: Attachment) => ({
      ...att,
      url: saveBase64ToFile(
        att.url,
        att.name
      ),
    }));

    const senderUser = users.find(
      (u) =>
        String(u.id) ===
        String(actualSenderId)
    );

    const senderName = senderUser
      ? senderUser.displayName ||
        `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim() ||
        `کاربر ${actualSenderId}`
      : `کاربر ${actualSenderId}`;

    const senderAvatar =
      senderUser?.avatarUrl || AvatarPhoto;

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
      createdAt:
        scheduledFor ||
        new Date().toISOString(),
      replyToMessageId,
      replyToMessage,
      forwardedFrom,
      reactions: [],
      mentions: mentions || [],
      isScheduled: !!scheduledFor,
    };

    messages.push(newMsg);
    chat.lastMessage = newMsg;

    await dbExecute(
      `INSERT INTO messages
       (id, chat_id, sender_id, type, content, status,
        is_pinned, reply_to_id, attachments,
        forwarded_from, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newMsg.id,
        chatId,
        newMsg.senderId,
        newMsg.type,
        newMsg.content,
        newMsg.status,
        0,
        replyToMessageId || null,
        JSON.stringify(
          newMsg.attachments || []
        ),
        newMsg.forwardedFrom
          ? JSON.stringify(
              newMsg.forwardedFrom
            )
          : null,
        newMsg.createdAt,
      ]
    );

    const enriched = enrichMessage(newMsg);

    sendPushNotificationForMessage(
      chatId,
      String(newMsg.senderId),
      newMsg.content,
      newMsg.mentions,
      newMsg.type
    ).catch((err) =>
      console.error(
        "❌ Push notification error:",
        err
      )
    );

    sendRoomWSEvent(
      chatId,
      "message:new",
      enriched
    );

    res.json(enriched);
  }
);

router.put("/messages/:messageId", async (req: Request, res: Response) => {
    if (!systemSettings.editMessageEnabled) {
      return res.status(403).json({
        error:
          "ویرایش پیام در حال حاضر غیرفعال است",
      });
    }

    const { messageId } = req.params;
    const { content } = req.body;

    const msg = messages.find(
      (m) => m.id == messageId
    );

    if (!msg) {
      return res.status(404).json({
        error: "پیام یافت نشد",
      });
    }

    if (!msg.editHistory)
      msg.editHistory = [];

    msg.editHistory.push({
      content: msg.content,
      editedAt: new Date().toISOString(),
    });

    msg.content = content;
    msg.isEdited = true;
    msg.updatedAt = new Date().toISOString();

    await dbExecute(
      `UPDATE messages SET content = ? WHERE id = ?`,
      [content, messageId]
    );

    sendRoomWSEvent(
      msg.chatId,
      "message:updated",
      msg
    );

    res.json(msg);
  }
);

router.delete("/messages/:messageId",  async (req: Request, res: Response) => {
    if (
      !systemSettings.deleteMessageEnabled
    ) {
      return res.status(403).json({
        error:
          "حذف پیام در حال حاضر غیرفعال است",
      });
    }

    const { messageId } = req.params;

    const index = messages.findIndex(
      (m) =>
        String(m.id) ===
        String(messageId)
    );

    if (index === -1) {
      return res.status(404).json({
        error: "پیام یافت نشد",
      });
    }

    const deleted = messages[index];

    deleted.isDeleted = true;
    deleted.deletedAt =
      new Date().toISOString();

    messages.splice(index, 1);

    await dbExecute(
      `DELETE FROM messages WHERE id = ?`,
      [messageId]
    );

    sendRoomWSEvent(
      deleted.chatId,
      "message:deleted",
      {
        id: messageId,
        chatId: deleted.chatId,
      }
    );

    res.json({
      message: "پیام با موفقیت حذف شد",
    });
  }
);

router.post("/chats/:chatId/read", async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const { userId, messageIds } =
      req.body;

    if (!userId) {
      return res.status(400).json({
        error: "شناسه کاربر الزامی است",
      });
    }

    const reader = users.find(
      (u) =>
        String(u.id) === String(userId)
    );

    const now = new Date().toISOString();

    let targetMsgs = messages.filter(
      (m) =>
        m.chatId === chatId &&
        String(m.senderId) !==
          String(userId)
    );

    if (
      Array.isArray(messageIds) &&
      messageIds.length > 0
    ) {
      const idsSet = new Set(
        messageIds.map((id: unknown) =>
          String(id)
        )
      );

      targetMsgs = targetMsgs.filter(
        (m) =>
          idsSet.has(String(m.id))
      );
    }

    let newSeensCount = 0;

    for (const m of targetMsgs) {
      m.status = "seen";

      const existingSeen =
        messageSeens.find(
          (s) =>
            String(s.messageId) ===
              String(m.id) &&
            String(s.userId) ===
              String(userId)
        );

      if (!existingSeen) {
        const seenId =
          messageSeens.length > 0
            ? Math.max(
                ...messageSeens.map(
                  (s) =>
                    Number(s.id) || 0
                )
              ) + 1
            : 1;

        messageSeens.push({
          id: seenId,
          messageId: m.id,
          userId,
          roomId: chatId,
          seenAt: now,
          deliveredAt: now,
          createdAt: now,
          updatedAt: now,
        });

        newSeensCount++;

        const dbType = (
          process.env.DB_TYPE ||
          "sqlite"
        ).toLowerCase();

        const numMsgId =
          typeof m.id === "number"
            ? m.id
            : parseInt(
                String(m.id).replace(
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
            `INSERT INTO message_seens
             (message_id, user_id, room_id, seen_at,
              delivered_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             seen_at = VALUES(seen_at),
             delivered_at = VALUES(delivered_at)`,
            [
              numMsgId,
              numUserId,
              chatId,
              now,
              now,
              now,
            ]
          );
        } else if (
          dbType === "postgres" ||
          dbType === "postgresql"
        ) {
          await dbExecute(
            `INSERT INTO message_seens
             (message_id, user_id, room_id, seen_at,
              delivered_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (message_id, user_id)
             DO UPDATE SET
             seen_at = EXCLUDED.seen_at,
             delivered_at = EXCLUDED.delivered_at`,
            [
              numMsgId,
              numUserId,
              chatId,
              now,
              now,
              now,
            ]
          );
        } else {
          await dbExecute(
            `INSERT OR REPLACE INTO message_seens
             (id, message_id, user_id, room_id, seen_at,
              delivered_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              seenId,
              numMsgId,
              numUserId,
              chatId,
              now,
              now,
              now,
            ]
          );
        }
      }

      if (!m.seenBy) m.seenBy = [];

      if (
        reader &&
        !m.seenBy.some(
          (s) =>
            String(s.userId) ===
            String(userId)
        )
      ) {
        m.seenBy.push({
          userId: reader.id,
          userDisplayName:
            reader.displayName,
          userAvatarUrl:
            reader.avatarUrl,
          seenAt: now,
        });
      }
    }

    const allChatMsgs = messages.filter(
      (m) =>
        m.chatId === chatId &&
        String(m.senderId) !==
          String(userId)
    );

    const remainingUnread =
      allChatMsgs.filter(
        (m) =>
          !messageSeens.some(
            (s) =>
              String(s.messageId) ===
                String(m.id) &&
              String(s.userId) ===
                String(userId)
          )
      ).length;

    const chat = chats.find(
      (c) => c.id === chatId
    );

    if (chat) {
      chat.unreadCount =
        remainingUnread;
    }

    sendRoomWSEvent(
      chatId,
      "message:status_updated",
      {
        chatId,
        userId,
        messageIds: targetMsgs.map(
          (m) => m.id
        ),
        status: "seen",
        seenAt: now,
        unreadCount: remainingUnread,
      }
    );

    res.json({
      success: true,
      newSeensCount,
      unreadCount: remainingUnread,
    });
  }
);

export default router;
