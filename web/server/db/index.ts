import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "messenger.sqlite");

let dbInstance: SqlJsDatabase | null = null;

function initTables(db: SqlJsDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      first_name TEXT,
      last_name TEXT,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      status TEXT DEFAULT 'offline',
      last_seen TEXT,
      role TEXT DEFAULT 'user',
      is_banned INTEGER DEFAULT 0,
      is_muted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_name TEXT,
      ip_address TEXT,
      browser TEXT,
      last_active TEXT,
      is_current INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      contact_user_id TEXT NOT NULL,
      custom_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      username TEXT UNIQUE,
      avatar_url TEXT,
      description TEXT,
      invite_link TEXT,
      is_private INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      unread_count INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 0,
      owner_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS room_members (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_muted INTEGER DEFAULT 0,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      content TEXT,
      status TEXT DEFAULT 'sent',
      is_pinned INTEGER DEFAULT 0,
      reply_to_id TEXT,
      forward_from_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      type TEXT NOT NULL,
      duration_seconds INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_seens (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
      delivered_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS forbidden_words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sms_settings (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      api_key TEXT,
      sender_number TEXT,
      pattern_code TEXT,
      is_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS push_settings (
      id TEXT PRIMARY KEY,
      vapid_public_key TEXT,
      vapid_private_key TEXT,
      is_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      registration_enabled INTEGER DEFAULT 1,
      login_enabled INTEGER DEFAULT 1,
      otp_enabled INTEGER DEFAULT 1,
      channels_enabled INTEGER DEFAULT 1,
      groups_enabled INTEGER DEFAULT 1,
      calls_enabled INTEGER DEFAULT 0,
      edit_message_enabled INTEGER DEFAULT 1,
      delete_message_enabled INTEGER DEFAULT 1,
      max_file_size_mb INTEGER DEFAULT 25,
      allowed_file_extensions TEXT,
      push_policy TEXT DEFAULT 'always'
    );

    CREATE TABLE IF NOT EXISTS system_audit_logs (
      id TEXT PRIMARY KEY,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      level TEXT DEFAULT 'info',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default data if empty
  const res = db.exec("SELECT COUNT(*) as cnt FROM users");
  const count = res[0] && res[0].values[0] ? (res[0].values[0][0] as number) : 0;
  if (count === 0) {
    seedDatabase(db);
  }
}

function seedDatabase(db: SqlJsDatabase) {
  const now = new Date().toISOString();
  
  // Seed Users
  db.run(`
    INSERT INTO users (id, phone, username, first_name, last_name, display_name, avatar_url, bio, status, role) VALUES
    ('user-1', '09121111111', 'ali_rezaei', 'علی', 'رضایی', 'علی رضایی (مدیر ارشد)', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'توسعه‌دهنده سیستم‌های توزیع‌شده', 'online', 'owner'),
    ('user-2', '09122222222', 'sara_ahmadi', 'سارا', 'احمدی', 'سارا احمدی', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', 'طراح رابط کاربری', 'online', 'admin'),
    ('user-3', '09123333333', 'mohammad_hosseini', 'محمد', 'حسینی', 'محمد حسینی', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'مدیر پروژه', 'offline', 'user'),
    ('user-4', '09124444444', 'maryam_karimi', 'مریم', 'کریمی', 'مریم کریمی', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', 'متخصص DevOps', 'online', 'user');
  `);

  // Seed Contacts
  db.run(`
    INSERT INTO contacts (id, user_id, contact_user_id, custom_name, created_at) VALUES
    ('cnt-1', 'user-1', 'user-2', 'سارا احمدی', '${now}'),
    ('cnt-2', 'user-1', 'user-3', 'محمد حسینی', '${now}'),
    ('cnt-3', 'user-1', 'user-4', 'مریم کریمی', '${now}');
  `);

  // Seed System Settings
  db.run(`
    INSERT INTO system_settings (id, registration_enabled, login_enabled, otp_enabled, channels_enabled, groups_enabled, max_file_size_mb, push_policy)
    VALUES (1, 1, 1, 1, 1, 1, 25, 'always');
  `);
}

export async function getDbInstance(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  fs.writeFileSync(dbPath, buffer);
}

// Helper SQL Query wrapper functions
export function queryAll<T = any>(db: SqlJsDatabase, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(db: SqlJsDatabase, sql: string, params: any[] = []): T | null {
  const results = queryAll<T>(db, sql, params);
  return results.length > 0 ? results[0] : null;
}

export function executeRun(db: SqlJsDatabase, sql: string, params: any[] = []) {
  db.run(sql, params);
  saveDb();
}
