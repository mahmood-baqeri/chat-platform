// web/server/db/repositories/UserRepository.ts

import { BaseRepository } from './BaseRepository.js';
import { dbQuery, dbExecute } from '../index.js';
import { ResultSetHeader } from 'mysql2';

// تعریف اینترفیس User
export interface IUser {
  id?: number;
  phone: string;
  nationalCode: string;
  personCode: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  avatar_url?: string | null;
  status?: 'online' | 'offline' | 'away' | 'busy';
  last_seen?: string | null;
  role?: 'user' | 'admin' | 'owner' | 'moderator';
  is_banned?: number;
  is_muted?: number;
  created_at?: string;
}

// کلاس UserRepository که از BaseRepository ارث‌بری می‌کند
export class UserRepository extends BaseRepository<IUser> {
  
  constructor() {
    super('users');
  }

  // 1. ایجاد کاربر جدید
  async create(userData: Omit<IUser, 'id' | 'created_at'>): Promise<IUser> {
    const query = `
      INSERT INTO users (
        phone, nationalCode, personCode, first_name, last_name, 
        display_name, avatar_url, status, role, is_banned, is_muted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userData.phone,
      userData.nationalCode,
      userData.personCode,
      userData.first_name || null,
      userData.last_name || null,
      userData.display_name,
      userData.avatar_url || null,
      userData.status || 'offline',
      userData.role || 'user',
      userData.is_banned || 0,
      userData.is_muted || 0
    ];

    const result = await dbExecute(query, params) as ResultSetHeader;
    const user = await this.findById(result.insertId);
    return user as IUser;
  }

  // 2. پیدا کردن کاربر با شماره موبایل
  async findByPhone(phone: string): Promise<IUser | null> {
    const query = 'SELECT * FROM users WHERE phone = ?';
    const rows = await dbQuery(query, [phone]);
    return rows.length > 0 ? rows[0] as IUser : null;
  }

  // 3. پیدا کردن کاربر با کد ملی
  async findByNationalCode(nationalCode: string): Promise<IUser | null> {
    const query = 'SELECT * FROM users WHERE nationalCode = ?';
    const rows = await dbQuery(query, [nationalCode]);
    return rows.length > 0 ? rows[0] as IUser : null;
  }

  // 4. پیدا کردن کاربر با کد پرسنلی
  async findByPersonCode(personCode: string): Promise<IUser | null> {
    const query = 'SELECT * FROM users WHERE personCode = ?';
    const rows = await dbQuery(query, [personCode]);
    return rows.length > 0 ? rows[0] as IUser : null;
  }

  // 5. پیدا کردن کاربر با شماره موبایل یا کد ملی
  async findByPhoneOrNational(phone: string, nationalCode: string): Promise<IUser | null> {
    const query = 'SELECT * FROM users WHERE phone = ? OR nationalCode = ?';
    const rows = await dbQuery(query, [phone, nationalCode]);
    return rows.length > 0 ? rows[0] as IUser : null;
  }

  // 6. دریافت همه کاربران با فیلتر و pagination (با نام متفاوت برای جلوگیری از تداخل)
  async findAllWithFilters(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    role?: string;
    search?: string;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<{ users: IUser[]; total: number }> {
    let whereClause = '1=1';
    const params: any[] = [];

    if (options?.status) {
      whereClause += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.role) {
      whereClause += ' AND role = ?';
      params.push(options.role);
    }

    if (options?.search) {
      whereClause += ` AND (phone LIKE ? OR display_name LIKE ? OR nationalCode LIKE ? OR personCode LIKE ?)`;
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // دریافت تعداد کل
    const countQuery = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
    const countRows = await dbQuery(countQuery, params);
    const total = countRows.length > 0 ? countRows[0].total : 0;

    // دریافت داده‌ها با pagination
    let query = `SELECT * FROM users WHERE ${whereClause}`;
    
    // ORDER BY
    const orderBy = options?.orderBy || 'created_at';
    const orderDirection = options?.orderDirection || 'DESC';
    query += ` ORDER BY ${orderBy} ${orderDirection}`;
    
    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options?.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = await dbQuery(query, params);
    return {
      users: rows as IUser[],
      total
    };
  }

  // 7. به‌روزرسانی کاربر
  async update(id: number, userData: Partial<IUser>): Promise<IUser | null> {
    const fields: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'phone', 'nationalCode', 'personCode', 'first_name', 'last_name',
      'display_name', 'avatar_url', 'status', 'role', 'is_banned', 'is_muted'
    ];

    for (const field of allowedFields) {
      if (userData[field as keyof IUser] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(userData[field as keyof IUser]);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    
    await dbExecute(query, params);
    return this.findById(id);
  }

  // 8. تغییر وضعیت کاربر
  async updateStatus(id: number, status: 'online' | 'offline' | 'away' | 'busy'): Promise<void> {
    const query = 'UPDATE users SET status = ?, last_seen = NOW() WHERE id = ?';
    await dbExecute(query, [status, id]);
  }

  // 9. بن کردن کاربر
  async banUser(id: number): Promise<void> {
    const query = 'UPDATE users SET is_banned = 1 WHERE id = ?';
    await dbExecute(query, [id]);
  }

  // 10. آن‌بن کردن کاربر
  async unbanUser(id: number): Promise<void> {
    const query = 'UPDATE users SET is_banned = 0 WHERE id = ?';
    await dbExecute(query, [id]);
  }

  // 11. میوت کردن کاربر
  async muteUser(id: number): Promise<void> {
    const query = 'UPDATE users SET is_muted = 1 WHERE id = ?';
    await dbExecute(query, [id]);
  }

  // 12. آن‌میوت کردن کاربر
  async unmuteUser(id: number): Promise<void> {
    const query = 'UPDATE users SET is_muted = 0 WHERE id = ?';
    await dbExecute(query, [id]);
  }

  // 13. جستجوی کاربران
  async search(queryText: string): Promise<IUser[]> {
    const query = `
      SELECT * FROM users 
      WHERE phone LIKE ? 
         OR display_name LIKE ? 
         OR nationalCode LIKE ? 
         OR personCode LIKE ?
      ORDER BY display_name ASC
      LIMIT 50
    `;
    const searchPattern = `%${queryText}%`;
    const rows = await dbQuery(query, [searchPattern, searchPattern, searchPattern, searchPattern]);
    return rows as IUser[];
  }

  // 14. دریافت کاربران آنلاین
  async getOnlineUsers(): Promise<IUser[]> {
    const query = "SELECT * FROM users WHERE status = 'online' ORDER BY display_name";
    const rows = await dbQuery(query, []);
    return rows as IUser[];
  }

  // 15. دریافت کاربران بن شده
  async getBannedUsers(): Promise<IUser[]> {
    const query = 'SELECT * FROM users WHERE is_banned = 1 ORDER BY display_name';
    const rows = await dbQuery(query, []);
    return rows as IUser[];
  }

  // 16. دریافت کاربران با نقش خاص
  async getByRole(role: string): Promise<IUser[]> {
    const query = 'SELECT * FROM users WHERE role = ? ORDER BY display_name';
    const rows = await dbQuery(query, [role]);
    return rows as IUser[];
  }

  // 17. بروزرسانی آخرین بازدید
  async updateLastSeen(id: number): Promise<void> {
    const query = "UPDATE users SET last_seen = NOW() WHERE id = ?";
    await dbExecute(query, [id]);
  }

  // 18. دریافت آمار کاربران
  async getStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    banned: number;
    admins: number;
    moderators: number;
  }> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total,
        (SELECT COUNT(*) FROM users WHERE status = 'online') as online,
        (SELECT COUNT(*) FROM users WHERE status = 'offline') as offline,
        (SELECT COUNT(*) FROM users WHERE is_banned = 1) as banned,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as admins,
        (SELECT COUNT(*) FROM users WHERE role = 'moderator') as moderators
    `;
    const rows = await dbQuery(query, []);
    return rows[0] as any;
  }

  // 19. آپدیت یا ایجاد کاربر (Upsert)
  async upsert(userData: Partial<IUser> & { phone: string }): Promise<IUser> {
    const existing = await this.findByPhone(userData.phone);
    
    if (existing) {
      const updated = await this.update(existing.id!, userData);
      return updated!;
    } else {
      return this.create(userData as any);
    }
  }

  // 20. ایجاد چند کاربر به صورت batch
  async createMany(usersData: Omit<IUser, 'id' | 'created_at'>[]): Promise<IUser[]> {
    const createdUsers: IUser[] = [];
    
    for (const userData of usersData) {
      const user = await this.create(userData);
      createdUsers.push(user);
    }
    
    return createdUsers;
  }

  // 21. دریافت کاربران جدید (اخیراً ثبت شده)
  async getRecentUsers(limit: number = 10): Promise<IUser[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT ?';
    const rows = await dbQuery(query, [limit]);
    return rows as IUser[];
  }

  // 22. بررسی وجود کاربر با شماره موبایل
  async phoneExists(phone: string): Promise<boolean> {
    const user = await this.findByPhone(phone);
    return user !== null;
  }

  // 23. بررسی وجود کاربر با کد ملی
  async nationalCodeExists(nationalCode: string): Promise<boolean> {
    const user = await this.findByNationalCode(nationalCode);
    return user !== null;
  }

  // 24. غیرفعال کردن همه کاربران (به جز ادمین‌ها)
  async deactivateAllUsers(): Promise<number> {
    const query = "UPDATE users SET status = 'offline' WHERE role NOT IN ('admin', 'owner')";
    const result = await dbExecute(query, []) as ResultSetHeader;
    return result.affectedRows;
  }

  // 25. دریافت کاربران با فیلترهای پیشرفته
  async findWithFilters(filters: {
    status?: string[];
    role?: string[];
    is_banned?: boolean;
    is_muted?: boolean;
    created_after?: string;
    created_before?: string;
    search?: string;
  }): Promise<IUser[]> {
    let whereClause = '1=1';
    const params: any[] = [];

    if (filters.status && filters.status.length > 0) {
      const placeholders = filters.status.map(() => '?').join(',');
      whereClause += ` AND status IN (${placeholders})`;
      params.push(...filters.status);
    }

    if (filters.role && filters.role.length > 0) {
      const placeholders = filters.role.map(() => '?').join(',');
      whereClause += ` AND role IN (${placeholders})`;
      params.push(...filters.role);
    }

    if (filters.is_banned !== undefined) {
      whereClause += ' AND is_banned = ?';
      params.push(filters.is_banned ? 1 : 0);
    }

    if (filters.is_muted !== undefined) {
      whereClause += ' AND is_muted = ?';
      params.push(filters.is_muted ? 1 : 0);
    }

    if (filters.created_after) {
      whereClause += ' AND created_at >= ?';
      params.push(filters.created_after);
    }

    if (filters.created_before) {
      whereClause += ' AND created_at <= ?';
      params.push(filters.created_before);
    }

    if (filters.search) {
      whereClause += ` AND (phone LIKE ? OR display_name LIKE ? OR nationalCode LIKE ?)`;
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const query = `SELECT * FROM users WHERE ${whereClause} ORDER BY created_at DESC`;
    const rows = await dbQuery(query, params);
    return rows as IUser[];
  }

  // 26. متد findAll که با BaseRepository سازگار است (برای جلوگیری از خطا)
  async findAll(options?: { 
    limit?: number; 
    offset?: number; 
    orderBy?: string; 
    orderDirection?: 'ASC' | 'DESC';
    where?: Record<string, any>;
  }): Promise<IUser[]> {
    // استفاده از متد base
    return super.findAll(options);
  }
}

// ایجاد یک نمونه سینگلتون
export const userRepository = new UserRepository();



/*


خلاصه متدها:
متد	توضیح	خروجی
create()	ایجاد کاربر جدید	Promise<IUser>
findById()	پیدا کردن با ID	Promise<IUser | null>
findByPhone()	پیدا کردن با موبایل	Promise<IUser | null>
findByNationalCode()	پیدا کردن با کد ملی	Promise<IUser | null>
findByPersonCode()	پیدا کردن با کد پرسنلی	Promise<IUser | null>
findByPhoneOrNational()	پیدا کردن با موبایل یا کد ملی	Promise<IUser | null>
findAll()	دریافت همه کاربران (از BaseRepository)	Promise<IUser[]>
findAllWithFilters()	دریافت با فیلتر و pagination	Promise<{ users, total }>
search()	جستجوی کاربران	Promise<IUser[]>
getOnlineUsers()	دریافت کاربران آنلاین	Promise<IUser[]>
getBannedUsers()	دریافت کاربران بن شده	Promise<IUser[]>
getByRole()	دریافت کاربران با نقش خاص	Promise<IUser[]>
getRecentUsers()	دریافت کاربران جدید	Promise<IUser[]>
update()	به‌روزرسانی کاربر	Promise<IUser | null>
updateStatus()	تغییر وضعیت	Promise<void>
updateLastSeen()	بروزرسانی آخرین بازدید	Promise<void>
banUser()	بن کردن	Promise<void>
unbanUser()	آن‌بن کردن	Promise<void>
muteUser()	میوت کردن	Promise<void>
unmuteUser()	آن‌میوت کردن	Promise<void>
delete()	حذف کاربر	Promise<boolean>
getStats()	دریافت آمار	Promise<{ total, online, offline, banned, admins, moderators }>
upsert()	ایجاد یا به‌روزرسانی	Promise<IUser>
createMany()	ایجاد چند کاربر	Promise<IUser[]>
phoneExists()	بررسی وجود موبایل	Promise<boolean>
nationalCodeExists()	بررسی وجود کد ملی	Promise<boolean>
deactivateAllUsers()	غیرفعال کردن همه کاربران	Promise<number>
findWithFilters()	فیلتر پیشرفته	Promise<IUser[]>
count()	تعداد کاربران (از BaseRepository)	Promise<number>
exists()	بررسی وجود کاربر (از BaseRepository)	Promise<boolean>



// web/server/routes/users.ts

import { userRepository, IUser } from '../db/repositories/UserRepository.js';
import { Router } from 'express';

const router = Router();

// ============================================
// 1. ایجاد کاربر جدید (CREATE)
// ============================================
router.post('/users', async (req, res) => {
  try {
    const userData = {
      phone: req.body.phone,
      nationalCode: req.body.nationalCode,
      personCode: req.body.personCode,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      display_name: req.body.display_name,
      avatar_url: req.body.avatar_url,
      status: 'online',
      role: 'user'
    };

    const user = await userRepository.create(userData);
    res.status(201).json({
      success: true,
      data: user,
      message: 'کاربر با موفقیت ایجاد شد'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 2. پیدا کردن کاربر با ID (READ - by ID)
// ============================================
router.get('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await userRepository.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 3. پیدا کردن کاربر با شماره موبایل (READ - by Phone)
// ============================================
router.get('/users/phone/:phone', async (req, res) => {
  try {
    const user = await userRepository.findByPhone(req.params.phone);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر با این شماره موبایل یافت نشد'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 4. پیدا کردن کاربر با کد ملی (READ - by NationalCode)
// ============================================
router.get('/users/national/:nationalCode', async (req, res) => {
  try {
    const user = await userRepository.findByNationalCode(req.params.nationalCode);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر با این کد ملی یافت نشد'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 5. پیدا کردن کاربر با کد پرسنلی (READ - by PersonCode)
// ============================================
router.get('/users/person/:personCode', async (req, res) => {
  try {
    const user = await userRepository.findByPersonCode(req.params.personCode);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر با این کد پرسنلی یافت نشد'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 6. پیدا کردن کاربر با موبایل یا کد ملی (READ - by Phone or National)
// ============================================
router.get('/users/find', async (req, res) => {
  try {
    const { phone, nationalCode } = req.query;
    
    if (!phone && !nationalCode) {
      return res.status(400).json({
        success: false,
        message: 'حداقل یکی از پارامترهای phone یا nationalCode باید ارسال شود'
      });
    }
    
    const user = await userRepository.findByPhoneOrNational(
      phone as string,
      nationalCode as string
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 7. دریافت همه کاربران (READ - All) - از BaseRepository
// ============================================
router.get('/users', async (req, res) => {
  try {
    const { limit = 20, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = req.query;
    
    const users = await userRepository.findAll({
      limit: Number(limit),
      offset: Number(offset),
      orderBy: orderBy as string,
      orderDirection: orderDirection as 'ASC' | 'DESC'
    });
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 8. دریافت کاربران با فیلتر و pagination (READ - with Filters)
// ============================================
router.get('/users/filtered', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      status, 
      role, 
      search,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = req.query;
    
    const result = await userRepository.findAllWithFilters({
      limit: Number(limit),
      offset: Number(offset),
      status: status as string,
      role: role as string,
      search: search as string,
      orderBy: orderBy as string,
      orderDirection: orderDirection as 'ASC' | 'DESC'
    });
    
    res.json({
      success: true,
      data: result.users,
      total: result.total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 9. جستجوی کاربران (SEARCH)
// ============================================
router.get('/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'پارامتر جستجو (q) الزامی است'
      });
    }
    
    const users = await userRepository.search(q as string);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 10. دریافت کاربران آنلاین (READ - Online)
// ============================================
router.get('/users/online', async (req, res) => {
  try {
    const users = await userRepository.getOnlineUsers();
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 11. دریافت کاربران بن شده (READ - Banned)
// ============================================
router.get('/users/banned', async (req, res) => {
  try {
    const users = await userRepository.getBannedUsers();
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 12. دریافت کاربران با نقش خاص (READ - by Role)
// ============================================
router.get('/users/role/:role', async (req, res) => {
  try {
    const users = await userRepository.getByRole(req.params.role);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 13. دریافت کاربران جدید (READ - Recent)
// ============================================
router.get('/users/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const users = await userRepository.getRecentUsers(Number(limit));
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 14. به‌روزرسانی کاربر (UPDATE)
// ============================================
router.put('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;
    
    const user = await userRepository.update(id, updateData);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    res.json({
      success: true,
      data: user,
      message: 'کاربر با موفقیت به‌روزرسانی شد'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 15. تغییر وضعیت کاربر (UPDATE - Status)
// ============================================
router.patch('/users/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!['online', 'offline', 'away', 'busy'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'وضعیت نامعتبر است. مقادیر مجاز: online, offline, away, busy'
      });
    }
    
    await userRepository.updateStatus(id, status);
    
    res.json({
      success: true,
      message: `وضعیت کاربر با موفقیت به ${status} تغییر یافت`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 16. بن کردن کاربر (UPDATE - Ban)
// ============================================
router.post('/users/:id/ban', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    await userRepository.banUser(id);
    
    res.json({
      success: true,
      message: 'کاربر با موفقیت بن شد'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 17. آن‌بن کردن کاربر (UPDATE - Unban)
// ============================================
router.post('/users/:id/unban', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    await userRepository.unbanUser(id);
    
    res.json({
      success: true,
      message: 'بن کاربر با موفقیت لغو شد'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 18. میوت کردن کاربر (UPDATE - Mute)
// ============================================
router.post('/users/:id/mute', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    await userRepository.muteUser(id);
    
    res.json({
      success: true,
      message: 'کاربر با موفقیت میوت شد'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 19. آن‌میوت کردن کاربر (UPDATE - Unmute)
// ============================================
router.post('/users/:id/unmute', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    await userRepository.unmuteUser(id);
    
    res.json({
      success: true,
      message: 'میوت کاربر با موفقیت لغو شد'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 20. بروزرسانی آخرین بازدید (UPDATE - Last Seen)
// ============================================
router.patch('/users/:id/lastseen', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    await userRepository.updateLastSeen(id);
    
    res.json({
      success: true,
      message: 'آخرین بازدید کاربر با موفقیت به‌روزرسانی شد'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 21. حذف کاربر (DELETE)
// ============================================
router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    const deleted = await userRepository.delete(id);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'کاربر با موفقیت حذف شد'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'خطا در حذف کاربر'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 22. دریافت آمار کاربران (STATS)
// ============================================
router.get('/users/stats', async (req, res) => {
  try {
    const stats = await userRepository.getStats();
    
    res.json({
      success: true,
      data: {
        total: stats.total,
        online: stats.online,
        offline: stats.offline,
        banned: stats.banned,
        admins: stats.admins,
        moderators: stats.moderators
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 23. آپدیت یا ایجاد کاربر (UPSERT)
// ============================================
router.post('/users/upsert', async (req, res) => {
  try {
    const { phone, ...otherData } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'شماره موبایل الزامی است'
      });
    }
    
    const user = await userRepository.upsert({
      phone,
      ...otherData
    });
    
    res.json({
      success: true,
      data: user,
      message: 'کاربر با موفقیت ایجاد یا به‌روزرسانی شد'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 24. ایجاد چند کاربر به صورت batch (BATCH CREATE)
// ============================================
router.post('/users/batch', async (req, res) => {
  try {
    const usersData = req.body.users;
    
    if (!Array.isArray(usersData) || usersData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'آرایه‌ای از کاربران باید ارسال شود'
      });
    }
    
    const createdUsers = await userRepository.createMany(usersData);
    
    res.status(201).json({
      success: true,
      data: createdUsers,
      count: createdUsers.length,
      message: `${createdUsers.length} کاربر با موفقیت ایجاد شد`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 25. بررسی وجود کاربر با شماره موبایل (CHECK - Phone)
// ============================================
router.get('/users/check/phone/:phone', async (req, res) => {
  try {
    const exists = await userRepository.phoneExists(req.params.phone);
    
    res.json({
      success: true,
      data: {
        phone: req.params.phone,
        exists
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 26. بررسی وجود کاربر با کد ملی (CHECK - NationalCode)
// ============================================
router.get('/users/check/national/:nationalCode', async (req, res) => {
  try {
    const exists = await userRepository.nationalCodeExists(req.params.nationalCode);
    
    res.json({
      success: true,
      data: {
        nationalCode: req.params.nationalCode,
        exists
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 27. غیرفعال کردن همه کاربران (به جز ادمین‌ها) (BULK UPDATE)
// ============================================
router.post('/users/deactivate-all', async (req, res) => {
  try {
    const count = await userRepository.deactivateAllUsers();
    
    res.json({
      success: true,
      message: `${count} کاربر غیرفعال شدند`,
      count
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 28. دریافت کاربران با فیلترهای پیشرفته (ADVANCED FILTER)
// ============================================
router.post('/users/filter', async (req, res) => {
  try {
    const filters = req.body;
    
    const users = await userRepository.findWithFilters(filters);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 29. دریافت کاربر با فیلدهای خاص (PROJECTION)
// ============================================
router.get('/users/:id/fields', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fields } = req.query;
    
    const user = await userRepository.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }
    
    // اگر فیلدهای خاص درخواست شده باشد
    if (fields) {
      const fieldList = (fields as string).split(',');
      const filteredUser: any = {};
      
      for (const field of fieldList) {
        if (user[field as keyof IUser] !== undefined) {
          filteredUser[field] = user[field as keyof IUser];
        }
      }
      
      return res.json({
        success: true,
        data: filteredUser
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 30. دریافت تعداد کل کاربران (COUNT)
// ============================================
router.get('/users/count', async (req, res) => {
  try {
    const { status, role, is_banned } = req.query;
    
    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (is_banned !== undefined) where.is_banned = Number(is_banned);
    
    const count = await userRepository.count(where);
    
    res.json({
      success: true,
      data: {
        count,
        filters: where
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 31. بررسی وجود کاربر (EXISTS)
// ============================================
router.get('/users/:id/exists', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const exists = await userRepository.exists(id);
    
    res.json({
      success: true,
      data: {
        id,
        exists
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

*/