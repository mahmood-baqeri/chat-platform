import {
  users,
} from "../../../store/dataStore.js";
import { Message, AvatarPhoto } from "../../../models/types.js";

/**
 * Adds sender display information to a message without changing
 * the original message object structure.
 */
export function enrichMessage(m: Message): Message {
  if (!m) return m;

  const senderUser = users.find(
    (u) => String(u.id) === String(m.senderId)
  );

  const senderName =
    m.senderName ||
    (senderUser
      ? senderUser.displayName ||
        `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim() ||
        `کاربر ${m.senderId}`
      : `کاربر ${m.senderId}`);

  const senderAvatar =
    m.senderAvatar || senderUser?.avatarUrl || AvatarPhoto;

  return {
    ...m,
    senderName,
    senderAvatar,
  };
}
