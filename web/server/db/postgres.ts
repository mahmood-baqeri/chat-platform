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
      console.log("✅ PostgreSQL Schema migrated successfully!");
      return true;
    }
    return false;
  } catch (err) {
    console.error("❌ PostgreSQL Migration Error:", err);
    return false;
  }
}

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