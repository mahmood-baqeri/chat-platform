import {chats, users} from "../../../store/dataStore.js";
import { AvatarPhoto } from "../../../models/types.js";
import {getPushConfig, getPushSubscriptions, getPushPolicy, sendNotificationToTargets} from "../../../services/pushService.js";

export async function sendPushNotificationForMessage(
  chatId: string,
  senderId: string,
  content: string,
  mentions: string[] = [],
  msgType: string = "text"
): Promise<void> {
  setTimeout(async () => {
    try {
      const pushConfig = getPushConfig();
      const pushPolicy = getPushPolicy();
      const pushSubscriptions = getPushSubscriptions();

      if (!pushConfig.isActive || pushPolicy === "disabled") {
        return;
      }

      const chat = chats.find((c) => c.id === chatId);
      if (!chat) {
        return;
      }

      if (pushPolicy === "direct_only" && chat.type !== "direct") {
        return;
      }

      const sender = users.find(
        (u) => String(u.id) === String(senderId)
      );
      const senderName = sender ? sender.displayName : "فرستنده";

      let targetUserIds: (number | string)[] = [];

      const memberUserIds = (chat.members || [])
        .map((m) => m.userId)
        .filter((uid) => String(uid) !== String(senderId));

      if (pushPolicy === "always" || pushPolicy === "direct_only") {
        targetUserIds = memberUserIds;
      } else if (pushPolicy === "offline_only") {
        targetUserIds = memberUserIds.filter((uid) => {
          const u = users.find(
            (usr) => String(usr.id) === String(uid)
          );
          return !u || u.status !== "online";
        });
      } else if (pushPolicy === "mentions_only") {
        targetUserIds = memberUserIds.filter((uid) => {
          const u = users.find(
            (usr) => String(usr.id) === String(uid)
          );
          if (!u) return false;

          const mentionIds = mentions.map(String);

          return (
            mentionIds.includes(String(uid)) ||
            (u.personCode && content.includes(u.personCode))
          );
        });
      }

      if (targetUserIds.length === 0) {
        return;
      }

      const targetStrIds = targetUserIds.map(String);

      const targets = pushSubscriptions.filter((s) =>
        targetStrIds.includes(String(s.userId || ""))
      );

      if (targets.length === 0) {
        return;
      }

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
        title:
          chat.type === "direct"
            ? senderName
            : `${senderName} در ${chat.title}`,
        body: body || content,
        icon: sender?.avatarUrl || chat.avatarUrl || AvatarPhoto,
        url: `/?chatId=${chatId}`,
        chatId,
      };

      await sendNotificationToTargets(targets, payload);
    } catch (error: unknown) {
      console.error(
        "❌ Error in sendPushNotificationForMessage:",
        error
      );
    }
  }, 0);
}
