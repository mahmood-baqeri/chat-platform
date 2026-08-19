// web/server/db/repositories/RoomRepository.ts

import { BaseRepository } from './BaseRepository.js';
import { dbQuery, dbExecute } from '../index.js';
import { ResultSetHeader } from 'mysql2';

export interface IRoom {
  id: string;
  type: 'private' | 'group' | 'channel';
  title: string;
  username?: string;
  avatar_url?: string;
  description?: string;
  invite_link?: string;
  is_private: number;
  is_archived: number;
  is_pinned: number;
  unread_count: number;
  member_count: number;
  owner_id?: number;
  created_at?: string;
}

export interface IRoomMember {
  id?: number;
  room_id: string;
  user_id: number;
  role: 'user' | 'admin' | 'owner' | 'moderator';
  joined_at?: string;
  is_muted: number;
}

export class RoomRepository extends BaseRepository<IRoom> {
  constructor() {
    super('rooms');
    this.idField = 'id';
  }

  // ایجاد اتاق جدید
  async create(roomData: Omit<IRoom, 'created_at' | 'member_count' | 'unread_count'>): Promise<IRoom> {
    const query = `
      INSERT INTO rooms (
        id, type, title, username, avatar_url, description, 
        invite_link, is_private, is_archived, is_pinned, owner_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      roomData.id,
      roomData.type,
      roomData.title,
      roomData.username || null,
      roomData.avatar_url || null,
      roomData.description || null,
      roomData.invite_link || null,
      roomData.is_private || 0,
      roomData.is_archived || 0,
      roomData.is_pinned || 0,
      roomData.owner_id || null
    ];

    await dbExecute(query, params);
    const room = await this.findById(roomData.id);
    return room as IRoom;
  }

  // پیدا کردن اتاق با آیدی
  async findById(id: string): Promise<IRoom | null> {
    const query = 'SELECT * FROM rooms WHERE id = ?';
    const rows = await dbQuery(query, [id]);
    return rows.length > 0 ? rows[0] as IRoom : null;
  }

  // پیدا کردن اتاق با یوزرنیم
  async findByUsername(username: string): Promise<IRoom | null> {
    const query = 'SELECT * FROM rooms WHERE username = ?';
    const rows = await dbQuery(query, [username]);
    return rows.length > 0 ? rows[0] as IRoom : null;
  }

  // پیدا کردن اتاق‌های کاربر
  async findByUser(userId: number): Promise<IRoom[]> {
    const query = `
      SELECT r.* FROM rooms r
      INNER JOIN room_members rm ON rm.room_id = r.id
      WHERE rm.user_id = ?
      ORDER BY r.created_at DESC
    `;
    const rows = await dbQuery(query, [userId]);
    return rows as IRoom[];
  }

  // دریافت اتاق‌های عمومی
  async getPublicRooms(limit: number = 20, offset: number = 0): Promise<IRoom[]> {
    const query = `
      SELECT * FROM rooms 
      WHERE type != 'private' AND is_private = 0
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await dbQuery(query, [limit, offset]);
    return rows as IRoom[];
  }

  // به‌روزرسانی اتاق
  async update(id: string, roomData: Partial<IRoom>): Promise<IRoom | null> {
    const fields: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'title', 'username', 'avatar_url', 'description', 'invite_link',
      'is_private', 'is_archived', 'is_pinned'
    ];

    for (const field of allowedFields) {
      if (roomData[field as keyof IRoom] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(roomData[field as keyof IRoom]);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`;
    await dbExecute(query, params);
    return this.findById(id);
  }

  // افزایش تعداد اعضا
  async incrementMemberCount(roomId: string): Promise<void> {
    const query = 'UPDATE rooms SET member_count = member_count + 1 WHERE id = ?';
    await dbExecute(query, [roomId]);
  }

  // کاهش تعداد اعضا
  async decrementMemberCount(roomId: string): Promise<void> {
    const query = 'UPDATE rooms SET member_count = member_count - 1 WHERE id = ? AND member_count > 0';
    await dbExecute(query, [roomId]);
  }

  // آرشیو کردن اتاق
  async archive(id: string): Promise<void> {
    const query = 'UPDATE rooms SET is_archived = 1 WHERE id = ?';
    await dbExecute(query, [id]);
  }

  // خارج کردن از آرشیو
  async unarchive(id: string): Promise<void> {
    const query = 'UPDATE rooms SET is_archived = 0 WHERE id = ?';
    await dbExecute(query, [id]);
  }

  // پین کردن اتاق
  async pin(id: string): Promise<void> {
    const query = 'UPDATE rooms SET is_pinned = 1 WHERE id = ?';
    await dbExecute(query, [id]);
  }

  // آنپین کردن اتاق
  async unpin(id: string): Promise<void> {
    const query = 'UPDATE rooms SET is_pinned = 0 WHERE id = ?';
    await dbExecute(query, [id]);
  }

  // اضافه کردن عضو به اتاق
  async addMember(roomId: string, userId: number, role: string = 'user'): Promise<IRoomMember> {
    const query = `
      INSERT INTO room_members (room_id, user_id, role)
      VALUES (?, ?, ?)
    `;
    await dbExecute(query, [roomId, userId, role]);
    await this.incrementMemberCount(roomId);
    
    // دریافت عضو اضافه شده
    const rows = await dbQuery(
      'SELECT * FROM room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );
    return rows[0] as IRoomMember;
  }

  // حذف عضو از اتاق
  async removeMember(roomId: string, userId: number): Promise<boolean> {
    const query = 'DELETE FROM room_members WHERE room_id = ? AND user_id = ?';
    const result = await dbExecute(query, [roomId, userId]) as ResultSetHeader;
    if (result.affectedRows > 0) {
      await this.decrementMemberCount(roomId);
      return true;
    }
    return false;
  }

  // دریافت اعضای اتاق
  async getMembers(roomId: string, limit: number = 50, offset: number = 0): Promise<IRoomMember[]> {
    const query = `
      SELECT rm.*, u.display_name, u.avatar_url, u.status
      FROM room_members rm
      INNER JOIN users u ON u.id = rm.user_id
      WHERE rm.room_id = ?
      ORDER BY rm.joined_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await dbQuery(query, [roomId, limit, offset]);
    return rows as IRoomMember[];
  }

  // بررسی عضویت کاربر در اتاق
  async isMember(roomId: string, userId: number): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM room_members WHERE room_id = ? AND user_id = ?';
    const rows = await dbQuery(query, [roomId, userId]);
    return rows[0]?.count > 0;
  }

  // دریافت نقش کاربر در اتاق
  async getUserRole(roomId: string, userId: number): Promise<string | null> {
    const query = 'SELECT role FROM room_members WHERE room_id = ? AND user_id = ?';
    const rows = await dbQuery(query, [roomId, userId]);
    return rows.length > 0 ? rows[0].role : null;
  }

  // تغییر نقش کاربر در اتاق
  async updateUserRole(roomId: string, userId: number, role: string): Promise<void> {
    const query = 'UPDATE room_members SET role = ? WHERE room_id = ? AND user_id = ?';
    await dbExecute(query, [role, roomId, userId]);
  }

  // میوت کردن کاربر در اتاق
  async muteUser(roomId: string, userId: number): Promise<void> {
    const query = 'UPDATE room_members SET is_muted = 1 WHERE room_id = ? AND user_id = ?';
    await dbExecute(query, [roomId, userId]);
  }

  // آنمیوت کردن کاربر در اتاق
  async unmuteUser(roomId: string, userId: number): Promise<void> {
    const query = 'UPDATE room_members SET is_muted = 0 WHERE room_id = ? AND user_id = ?';
    await dbExecute(query, [roomId, userId]);
  }
}

export const roomRepository = new RoomRepository();


/*


متد	توضیح	خروجی
create(roomData)	ایجاد اتاق جدید	Promise<IRoom>
findById(id)	پیدا کردن اتاق با آیدی	Promise<IRoom | null>
findByUsername(username)	پیدا کردن اتاق با یوزرنیم	Promise<IRoom | null>
findByUser(userId)	پیدا کردن اتاق‌های کاربر	Promise<IRoom[]>
getPublicRooms(limit, offset)	دریافت اتاق‌های عمومی	Promise<IRoom[]>
findAll(options?)	دریافت همه اتاق‌ها (از BaseRepository)	Promise<IRoom[]>
update(id, roomData)	به‌روزرسانی اتاق	Promise<IRoom | null>
delete(id)	حذف اتاق (از BaseRepository)	Promise<boolean>
incrementMemberCount(roomId)	افزایش تعداد اعضا	Promise<void>
decrementMemberCount(roomId)	کاهش تعداد اعضا	Promise<void>
archive(id)	آرشیو کردن اتاق	Promise<void>
unarchive(id)	خارج کردن از آرشیو	Promise<void>
pin(id)	پین کردن اتاق	Promise<void>
unpin(id)	آنپین کردن اتاق	Promise<void>
addMember(roomId, userId, role)	اضافه کردن عضو به اتاق	Promise<IRoomMember>
removeMember(roomId, userId)	حذف عضو از اتاق	Promise<boolean>
getMembers(roomId, limit, offset)	دریافت اعضای اتاق	Promise<IRoomMember[]>
isMember(roomId, userId)	بررسی عضویت کاربر در اتاق	Promise<boolean>
getUserRole(roomId, userId)	دریافت نقش کاربر در اتاق	Promise<string | null>
updateUserRole(roomId, userId, role)	تغییر نقش کاربر در اتاق	Promise<void>
muteUser(roomId, userId)	میوت کردن کاربر در اتاق	Promise<void>
unmuteUser(roomId, userId)	آنمیوت کردن کاربر در اتاق	Promise<void>
count(where?)	تعداد اتاق‌ها (از BaseRepository)	Promise<number>
exists(id)	بررسی وجود اتاق (از BaseRepository)	Promise<boolean>




// web/server/routes/rooms.ts

import { roomRepository } from '../db/repositories/RoomRepository.js';
import { messageRepository } from '../db/repositories/MessageRepository.js';
import { userRepository } from '../db/repositories/UserRepository.js';

// ایجاد اتاق جدید
const room = await roomRepository.create({
  id: 'room_123', // یا استفاده از uuid
  type: 'group',
  title: 'گروه توسعه',
  username: 'dev_group',
  description: 'گروه بحث و تبادل نظر توسعه‌دهندگان',
  is_private: 0,
  owner_id: user.id
});

// اضافه کردن عضو
await roomRepository.addMember(room.id, user.id, 'admin');

// ارسال پیام
const message = await messageRepository.create({
  chat_id: room.id,
  sender_id: user.id,
  type: 'text',
  content: 'سلام به همه!',
  status: 'sent'
});

// دریافت پیام‌های اتاق
const messages = await messageRepository.getRoomMessages(room.id, 50, 0);

// دریافت لیست اتاق‌های کاربر
const userRooms = await roomRepository.findByUser(user.id);

// تنظیمات سیستم
import { systemSettingsRepository } from '../db/repositories/SystemSettingsRepository.js';

// دریافت تنظیمات
const settings = await systemSettingsRepository.getSettings();

// به‌روزرسانی تنظیمات
await systemSettingsRepository.updateSettings({
  registration_enabled: 0,
  max_file_size_mb: 50
});

// بررسی کلمات ممنوعه
import { forbiddenWordsRepository } from '../db/repositories/ForbiddenWordsRepository.js';

const check = await forbiddenWordsRepository.checkText('متن کاربر');
if (check.hasForbidden) {
  console.log('کلمات ممنوعه یافت شد:', check.foundWords);
}

// دیده شدن پیام
await messageRepository.markAsSeen(message.id, user.id, room.id);

// واکنش به پیام
await messageRepository.addReaction(message.id, user.id, '❤️');

*/