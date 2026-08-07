import pg from "pg";
const { Pool } = pg;
import fs from "fs";
import path from "path";

let pgPool: pg.Pool | null = null;

export function getPostgresConfig() {
  return {
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432", 10),
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "postgres",
    database: process.env.PG_DATABASE || "messenger_db",
  };
}

export function getPostgresPool(): pg.Pool {
  if (pgPool) return pgPool;
  const config = getPostgresConfig();
  pgPool = new Pool(config);
  return pgPool;
}

export async function runPostgresMigrations(): Promise<boolean> {
  try {
    const pool = getPostgresPool();
    const schemaPath = path.join(process.cwd(), "server", "db", "schema_postgres.sql");
    if (fs.existsSync(schemaPath)) {
      const sqlScript = fs.readFileSync(schemaPath, "utf-8");
      await pool.query(sqlScript);

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS push_settings (
            id VARCHAR(64) PRIMARY KEY,
            vapid_public_key TEXT,
            vapid_private_key TEXT,
            is_enabled INTEGER DEFAULT 1
          );
        `);
      } catch (e: any) {}

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            endpoint TEXT NOT NULL UNIQUE,
            subscription_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (e: any) {}

      console.log("✅ PostgreSQL Schema and seed migration completed successfully!");
      return true;
    }
    return false;
  } catch (err) {
    console.error("❌ PostgreSQL Migration Error:", err);
    return false;
  }
}

// Convert SQLite '?' parameters to PostgreSQL '$1, $2, ...'
function convertQuestionMarkParams(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export async function queryPostgreSQL<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getPostgresPool();
  const convertedSql = convertQuestionMarkParams(sql);
  const res = await pool.query(convertedSql, params);
  return res.rows as T[];
}

export async function executePostgreSQL(sql: string, params: any[] = []): Promise<any> {
  const pool = getPostgresPool();
  const convertedSql = convertQuestionMarkParams(sql);
  const res = await pool.query(convertedSql, params);
  return res;
}
