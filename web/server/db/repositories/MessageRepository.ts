// web/server/db/repositories/MessageRepository.ts

import { BaseRepository } from './BaseRepository.js';
import { dbQuery, dbExecute } from '../index.js';
import { ResultSetHeader } from 'mysql2';

export interface IMessage {
  id?: number;
  chat_id: string;
  sender_id: number;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact';
  content?: string;
  status: 'sent' | 'delivered' | 'seen' | 'failed';
  is_pinned: number;
  reply_to_id?: number;
  forward_from_id?: number;
  attachments?: string;
  forwarded_from?: string;
  created_at?: string;
}

export interface IMessageSeen {
  id?: number;
  message_id: number;
  user_id: number;
  room_id: string;
  seen_at?: string;
  delivered_at?: string;
}

export interface IMessageReaction {
  id?: number;
  message_id: number;
  user_id: number;
  emoji: string;
  created_at?: string;
}

export class MessageRepository extends BaseRepository<IMessage> {
  constructor() {
    super('messages');
  }

  // ایجاد پیام جدید
  async create(messageData: Omit<IMessage, 'id' | 'created_at'>): Promise<IMessage> {
    const query = `
      INSERT INTO messages (
        chat_id, sender_id, type, content, status, 
        is_pinned, reply_to_id, forward_from_id, attachments, forwarded_from
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      messageData.chat_id,
      messageData.sender_id,
      messageData.type || 'text',
      messageData.content || null,
      messageData.status || 'sent',
      messageData.is_pinned || 0,
      messageData.reply_to_id || null,
      messageData.forward_from_id || null,
      messageData.attachments || null,
      messageData.forwarded_from || null
    ];

    const result = await dbExecute(query, params) as ResultSetHeader;
    const message = await this.findById(result.insertId);
    return message as IMessage;
  }

  // پیدا کردن پیام با آیدی
  async findById(id: number): Promise<IMessage | null> {
    const query = `
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?
    `;
    const rows = await dbQuery(query, [id]);
    return rows.length > 0 ? rows[0] as IMessage : null;
  }

  // دریافت پیام‌های یک اتاق
  async getRoomMessages(
    chatId: string, 
    limit: number = 50, 
    offset: number = 0,
    before?: number
  ): Promise<IMessage[]> {
    let query = `
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.chat_id = ?
    `;
    const params: any[] = [chatId];

    if (before) {
      query += ` AND m.id < ?`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await dbQuery(query, params);
    return rows as IMessage[];
  }

  // دریافت آخرین پیام اتاق
  async getLastMessage(chatId: string): Promise<IMessage | null> {
    const query = `
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.chat_id = ?
      ORDER BY m.created_at DESC
      LIMIT 1
    `;
    const rows = await dbQuery(query, [chatId]);
    return rows.length > 0 ? rows[0] as IMessage : null;
  }

  // به‌روزرسانی وضعیت پیام
  async updateStatus(messageId: number, status: 'sent' | 'delivered' | 'seen' | 'failed'): Promise<void> {
    const query = 'UPDATE messages SET status = ? WHERE id = ?';
    await dbExecute(query, [status, messageId]);
  }

  // پین کردن پیام
  async pin(messageId: number): Promise<void> {
    const query = 'UPDATE messages SET is_pinned = 1 WHERE id = ?';
    await dbExecute(query, [messageId]);
  }

  // آنپین کردن پیام
  async unpin(messageId: number): Promise<void> {
    const query = 'UPDATE messages SET is_pinned = 0 WHERE id = ?';
    await dbExecute(query, [messageId]);
  }

  // دریافت پیام‌های پین شده
  async getPinnedMessages(chatId: string): Promise<IMessage[]> {
    const query = `
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.chat_id = ? AND m.is_pinned = 1
      ORDER BY m.created_at DESC
    `;
    const rows = await dbQuery(query, [chatId]);
    return rows as IMessage[];
  }

  // ثبت دیده شدن پیام
  async markAsSeen(messageId: number, userId: number, roomId: string): Promise<void> {
    const query = `
      INSERT INTO message_seens (message_id, user_id, room_id, seen_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE seen_at = NOW()
    `;
    await dbExecute(query, [messageId, userId, roomId]);
  }

  // دریافت وضعیت دیده شدن پیام
  async getMessageSeenStatus(messageId: number): Promise<IMessageSeen[]> {
    const query = `
      SELECT ms.*, u.display_name, u.avatar_url
      FROM message_seens ms
      LEFT JOIN users u ON u.id = ms.user_id
      WHERE ms.message_id = ?
    `;
    const rows = await dbQuery(query, [messageId]);
    return rows as IMessageSeen[];
  }

  // دریافت تعداد دیده شدن پیام
  async getSeenCount(messageId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM message_seens WHERE message_id = ?';
    const rows = await dbQuery(query, [messageId]);
    return rows[0]?.count || 0;
  }

  // اضافه کردن واکنش به پیام
  async addReaction(messageId: number, userId: number, emoji: string): Promise<void> {
    const query = `
      INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE updated_at = NOW()
    `;
    await dbExecute(query, [messageId, userId, emoji]);
  }

  // حذف واکنش از پیام
  async removeReaction(messageId: number, userId: number, emoji: string): Promise<void> {
    const query = 'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?';
    await dbExecute(query, [messageId, userId, emoji]);
  }

  // دریافت واکنش‌های پیام
  async getReactions(messageId: number): Promise<IMessageReaction[]> {
    const query = `
      SELECT mr.*, u.display_name, u.avatar_url
      FROM message_reactions mr
      LEFT JOIN users u ON u.id = mr.user_id
      WHERE mr.message_id = ?
    `;
    const rows = await dbQuery(query, [messageId]);
    return rows as IMessageReaction[];
  }

  // دریافت واکنش‌های یک کاربر به پیام
  async getUserReaction(messageId: number, userId: number): Promise<string | null> {
    const query = 'SELECT emoji FROM message_reactions WHERE message_id = ? AND user_id = ?';
    const rows = await dbQuery(query, [messageId, userId]);
    return rows.length > 0 ? rows[0].emoji : null;
  }

  // جستجوی پیام‌ها
  async search(chatId: string, queryText: string): Promise<IMessage[]> {
    const query = `
      SELECT m.*, u.display_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.chat_id = ? AND m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    const rows = await dbQuery(query, [chatId, `%${queryText}%`]);
    return rows as IMessage[];
  }

  // حذف پیام‌های قدیمی
  async deleteOldMessages(days: number = 30): Promise<number> {
    const query = `
      DELETE FROM messages 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      AND is_pinned = 0
    `;
    const result = await dbExecute(query, [days]) as ResultSetHeader;
    return result.affectedRows;
  }

  // دریافت آمار پیام‌ها
  async getStats(chatId?: string): Promise<{
    total: number;
    today: number;
    lastWeek: number;
    lastMonth: number;
  }> {
    let whereClause = '';
    const params: any[] = [];

    if (chatId) {
      whereClause = ' WHERE chat_id = ?';
      params.push(chatId);
    }

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM messages ${whereClause}) as total,
        (SELECT COUNT(*) FROM messages ${whereClause} AND DATE(created_at) = CURDATE()) as today,
        (SELECT COUNT(*) FROM messages ${whereClause} AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)) as lastWeek,
        (SELECT COUNT(*) FROM messages ${whereClause} AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)) as lastMonth
    `;
    const rows = await dbQuery(query, params);
    return rows[0] as any;
  }
}

export const messageRepository = new MessageRepository();

/*

متد	توضیح	خروجی
create(messageData)	ایجاد پیام جدید	Promise<IMessage>
findById(id)	پیدا کردن پیام با آیدی	Promise<IMessage | null>
getRoomMessages(chatId, limit, offset, before)	دریافت پیام‌های یک اتاق	Promise<IMessage[]>
getLastMessage(chatId)	دریافت آخرین پیام اتاق	Promise<IMessage | null>
findAll(options?)	دریافت همه پیام‌ها (از BaseRepository)	Promise<IMessage[]>
updateStatus(messageId, status)	به‌روزرسانی وضعیت پیام	Promise<void>
pin(messageId)	پین کردن پیام	Promise<void>
unpin(messageId)	آنپین کردن پیام	Promise<void>
getPinnedMessages(chatId)	دریافت پیام‌های پین شده	Promise<IMessage[]>
markAsSeen(messageId, userId, roomId)	ثبت دیده شدن پیام	Promise<void>
getMessageSeenStatus(messageId)	دریافت وضعیت دیده شدن پیام	Promise<IMessageSeen[]>
getSeenCount(messageId)	دریافت تعداد دیده شدن پیام	Promise<number>
addReaction(messageId, userId, emoji)	اضافه کردن واکنش به پیام	Promise<void>
removeReaction(messageId, userId, emoji)	حذف واکنش از پیام	Promise<void>
getReactions(messageId)	دریافت واکنش‌های پیام	Promise<IMessageReaction[]>
getUserReaction(messageId, userId)	دریافت واکنش کاربر به پیام	Promise<string | null>
search(chatId, queryText)	جستجوی پیام‌ها	Promise<IMessage[]>
delete(id)	حذف پیام (از BaseRepository)	Promise<boolean>
deleteOldMessages(days)	حذف پیام‌های قدیمی	Promise<number>
getStats(chatId?)	دریافت آمار پیام‌ها	Promise<{ total, today, lastWeek, lastMonth }>
count(where?)	تعداد پیام‌ها (از BaseRepository)	Promise<number>
exists(id)	بررسی وجود پیام (از BaseRepository)	Promise<boolean>

*/