// web/server/db/index.ts

import "dotenv/config";
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";
import { queryMySQL, executeMySQL, runMySQLMigrations, getEnvironmentInfo } from "./mysql.js";
import { queryPostgreSQL, executePostgreSQL, runPostgresMigrations } from "./postgres.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";

const dbPath = path.join(process.cwd(), "data", "messenger.sqlite");
let dbInstance: SqlJsDatabase | null = null;
let dbInitialized = false;
let migrationDone = false;

export async function ensureDbInitialized(): Promise<void> {
  if (dbInitialized) return;
  dbInitialized = true;

  const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();
  const envInfo = getEnvironmentInfo();
  
  console.log(`🌍 Environment: ${envInfo.environment}`);
  console.log(`📊 Database Type: ${dbType}`);

  if (dbType === "mysql") {
    console.log(`🔌 Initializing MySQL database for ${envInfo.isProduction ? 'Production' : 'Development'}...`);
    await runMySQLMigrations();
  } else if (dbType === "postgres" || dbType === "postgresql") {
    console.log("🔌 Initializing PostgreSQL database...");
    await runPostgresMigrations();
  } else {
    console.log("🔌 Using SQLite database...");
    await getDbInstance();
  }
}

function initTables(db: SqlJsDatabase) {
  console.log("📊 Creating tables...");

  db.create_function("tehran_now", () => {
    const now = new Date();
    const tehranTime = new Date(now.getTime() + (3.5 * 60 * 60 * 1000));
    return tehranTime.toISOString().slice(0, 19).replace("T", " ");
  });

  db.create_function("tehran_timestamp", (timestamp: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const tehranTime = new Date(date.getTime() + (3.5 * 60 * 60 * 1000));
    return tehranTime.toISOString().slice(0, 19).replace("T", " ");
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      nationalCode TEXT NOT NULL UNIQUE,
      personCode TEXT NOT NULL UNIQUE,
      first_name TEXT,
      last_name TEXT,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      status TEXT DEFAULT 'offline',
      last_seen TEXT,
      role TEXT DEFAULT 'user',
      is_banned INTEGER DEFAULT 0,
      is_muted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (tehran_now())
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_name TEXT,
      ip_address TEXT,
      browser TEXT,
      last_active TEXT,
      is_current INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      owner_id INTEGER,
      created_at TEXT DEFAULT (tehran_now())
    );

    CREATE TABLE IF NOT EXISTS room_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'user',
      joined_at TEXT DEFAULT (tehran_now()),
      is_muted INTEGER DEFAULT 0,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(room_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      sender_id INTEGER NOT NULL,
      type TEXT DEFAULT 'text',
      content TEXT,
      status TEXT DEFAULT 'sent',
      is_pinned INTEGER DEFAULT 0,
      reply_to_id INTEGER,
      forward_from_id INTEGER,
      attachments TEXT,
      forwarded_from TEXT,
      created_at TEXT DEFAULT (tehran_now()),
      FOREIGN KEY (chat_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_seens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      room_id TEXT NOT NULL,
      seen_at TEXT DEFAULT (tehran_now()),
      delivered_at TEXT,
      created_at TEXT DEFAULT (tehran_now()),
      updated_at TEXT DEFAULT (tehran_now()),
      UNIQUE(message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT (tehran_now()),
      updated_at TEXT DEFAULT (tehran_now()),
      UNIQUE(message_id, user_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS forbidden_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (tehran_now())
    );

    CREATE TABLE IF NOT EXISTS push_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vapid_public_key TEXT,
      vapid_private_key TEXT,
      is_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      subscription_json TEXT NOT NULL,
      created_at TEXT DEFAULT (tehran_now()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      level TEXT DEFAULT 'info',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Tables ready!");

  if (!migrationDone) {
    migrationDone = true;
  }
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
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dbDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    fs.writeFileSync(dbPath, buffer);
  } catch (error) {
    console.error("Error saving SQLite database:", error);
  }
}

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

// ✅ این تابع رو به این شکل تغییر بده
export async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();
  await ensureDbInitialized();

  if (dbType === "mysql") {
    return queryMySQL(sql, params);
  } else if (dbType === "postgres" || dbType === "postgresql") {
    return queryPostgreSQL(sql, params);
  } else {
    const db = await getDbInstance();
    return queryAll(db, sql, params);
  }
}

// ✅ این تابع رو به این شکل تغییر بده
export async function dbExecute(sql: string, params: any[] = []): Promise<any> {
  const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();
  await ensureDbInitialized();

  if (dbType === "mysql") {
    return await executeMySQL(sql, params);
  } else if (dbType === "postgres" || dbType === "postgresql") {
    return await executePostgreSQL(sql, params);
  } else {
    const db = await getDbInstance();
    return executeRun(db, sql, params);
  }
}

export function getCurrentEnvironment() {
  return getEnvironmentInfo();
}