// web/src/utils/helper.ts

import { dbQuery } from "@/server/db";

// ============================================
// تابع کمکی برای دریافت تایم زون تهران
// ============================================
export function getTehranTime(): string {
  const now = new Date();
  const tehranTime = new Date(now.getTime() + (3.5 * 60 * 60 * 1000));
  return tehranTime.toISOString().slice(0, 19).replace("T", " ");
}

// ============================================
// تابع کمکی برای دریافت یک رکورد از دیتابیس
// ============================================
export async function dbGet(sql: string, params: any[] = []): Promise<any | null> {
  const results = await dbQuery(sql, params);
  return results && results.length > 0 ? results[0] : null;
}

// ============================================
// دریافت کاربر بر اساس شناسه
// ============================================
export async function getUserById(userId: string | number): Promise<any | null> {
  try {
    const sql = `SELECT * FROM users WHERE id = ?`;
    const user = await dbGet(sql, [userId]);
    return user || null;
  } catch (error) {
    console.error("❌ Error in getUserById:", error);
    return null;
  }
}

// ============================================
// دریافت کاربر بر اساس شناسه با فیلدهای مشخص
// ============================================
export async function getUserByIdWithFields(
  userId: string | number,
  fields: string[] = ["id", "displayName", "avatarUrl", "phone", "username", "role", "status"]
): Promise<any | null> {
  try {
    const fieldList = fields.join(", ");
    const sql = `SELECT ${fieldList} FROM users WHERE id = ?`;
    const user = await dbGet(sql, [userId]);
    return user || null;
  } catch (error) {
    console.error("❌ Error in getUserByIdWithFields:", error);
    return null;
  }
}

// ============================================
// دریافت روم (گفتگو) بر اساس شناسه
// ============================================
export async function getRoomById(roomId: string): Promise<any | null> {
  try {
    const sql = `SELECT * FROM chats WHERE id = ?`;
    const room = await dbGet(sql, [roomId]);
    return room || null;
  } catch (error) {
    console.error("❌ Error in getRoomById:", error);
    return null;
  }
}

// ============================================
// دریافت روم با اعضای آن
// ============================================
export async function getRoomWithMembers(roomId: string): Promise<any | null> {
  try {
    const sql = `
      SELECT 
        c.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'userId', cm.user_id,
            'role', cm.role,
            'joinedAt', cm.joined_at,
            'isMuted', cm.is_muted
          )
        ) as members
      FROM chats c
      LEFT JOIN chat_members cm ON c.id = cm.chat_id
      WHERE c.id = ?
      GROUP BY c.id
    `;
    const room = await dbGet(sql, [roomId]);
    return room || null;
  } catch (error) {
    console.error("❌ Error in getRoomWithMembers:", error);
    return null;
  }
}

// ============================================
// دریافت کاربر با روم‌هایش
// ============================================
export async function getUserWithRooms(userId: string | number): Promise<any | null> {
  try {
    const sql = `
      SELECT 
        u.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'chatId', c.id,
            'title', c.title,
            'type', c.type,
            'avatarUrl', c.avatar_url,
            'role', cm.role,
            'joinedAt', cm.joined_at
          )
        ) as rooms
      FROM users u
      LEFT JOIN chat_members cm ON u.id = cm.user_id
      LEFT JOIN chats c ON cm.chat_id = c.id
      WHERE u.id = ?
      GROUP BY u.id
    `;
    const user = await dbGet(sql, [userId]);
    return user || null;
  } catch (error) {
    console.error("❌ Error in getUserWithRooms:", error);
    return null;
  }
}

// ============================================
// دریافت کاربر بر اساس شماره موبایل
// ============================================
export async function getUserByPhone(phone: string): Promise<any | null> {
  try {
    const sql = `SELECT * FROM users WHERE phone = ?`;
    const user = await dbGet(sql, [phone]);
    return user || null;
  } catch (error) {
    console.error("❌ Error in getUserByPhone:", error);
    return null;
  }
}

// ============================================
// دریافت کاربر بر اساس نام کاربری
// ============================================
export async function getUserByUsername(username: string): Promise<any | null> {
  try {
    const sql = `SELECT * FROM users WHERE username = ?`;
    const user = await dbGet(sql, [username]);
    return user || null;
  } catch (error) {
    console.error("❌ Error in getUserByUsername:", error);
    return null;
  }
}

// ============================================
// بررسی وجود کاربر
// ============================================
export async function userExists(userId: string | number): Promise<boolean> {
  try {
    const sql = `SELECT 1 FROM users WHERE id = ? LIMIT 1`;
    const result = await dbGet(sql, [userId]);
    return !!result;
  } catch (error) {
    console.error("❌ Error in userExists:", error);
    return false;
  }
}

// ============================================
// بررسی وجود روم
// ============================================
export async function roomExists(roomId: string): Promise<boolean> {
  try {
    const sql = `SELECT 1 FROM chats WHERE id = ? LIMIT 1`;
    const result = await dbGet(sql, [roomId]);
    return !!result;
  } catch (error) {
    console.error("❌ Error in roomExists:", error);
    return false;
  }
}

// ============================================
// دریافت اعضای یک روم
// ============================================
export async function getRoomMembers(roomId: string): Promise<any[]> {
  try {
    const sql = `
      SELECT 
        cm.user_id,
        u.displayName,
        u.avatarUrl,
        cm.role,
        cm.joined_at,
        cm.is_muted
      FROM chat_members cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.chat_id = ?
    `;
    const results = await dbQuery(sql, [roomId]);
    return results || [];
  } catch (error) {
    console.error("❌ Error in getRoomMembers:", error);
    return [];
  }
}

// ============================================
// بررسی عضویت کاربر در روم
// ============================================
export async function isUserInRoom(userId: string | number, roomId: string): Promise<boolean> {
  try {
    const sql = `SELECT 1 FROM chat_members WHERE user_id = ? AND chat_id = ? LIMIT 1`;
    const result = await dbGet(sql, [userId, roomId]);
    return !!result;
  } catch (error) {
    console.error("❌ Error in isUserInRoom:", error);
    return false;
  }
}

// ============================================
// دریافت نقش کاربر در روم
// ============================================
export async function getUserRoomRole(userId: string | number, roomId: string): Promise<string | null> {
  try {
    const sql = `SELECT role FROM chat_members WHERE user_id = ? AND chat_id = ?`;
    const result = await dbGet(sql, [userId, roomId]);
    return result?.role || null;
  } catch (error) {
    console.error("❌ Error in getUserRoomRole:", error);
    return null;
  }
}