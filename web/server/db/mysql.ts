import mysql, { Pool } from "mysql2/promise";
import fs from "fs";
import path from "path";

let mysqlPool: Pool | null = null;

export function getMySQLConfig() {
  return {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "messenger_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  };
}

export function getMySQLPool(): Pool {
  if (mysqlPool) return mysqlPool;

  const config = getMySQLConfig();
  mysqlPool = mysql.createPool(config);
  return mysqlPool;
}

export async function runMySQLMigrations(): Promise<boolean> {
  try {
    const config = getMySQLConfig();
    
    // Step 1: Connect without database to ensure DB creation
    const rootConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: true
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConnection.end();

    // Step 2: Run schema script against target database
    const pool = getMySQLPool();
    const schemaPath = path.join(process.cwd(), "server", "db", "schema_mysql.sql");

    if (fs.existsSync(schemaPath)) {
      const sqlScript = fs.readFileSync(schemaPath, "utf-8");
      await pool.query(sqlScript);

      // Step 3: Ensure missing columns like push_policy are added if running against existing DB
      try {
        await pool.query("ALTER TABLE `system_settings` ADD COLUMN `push_policy` VARCHAR(64) DEFAULT 'always';");
      } catch (e: any) {
        // Ignore if column already exists
      }

      console.log("✅ MySQL Schema and seed migration completed successfully!");
      return true;
    } else {
      console.warn("⚠️ MySQL schema file not found at:", schemaPath);
      return false;
    }
  } catch (err) {
    console.error("❌ MySQL Migration Error:", err);
    return false;
  }
}

export function formatMySQLDateParam(param: any): any {
  if (param instanceof Date) {
    return param.toISOString().slice(0, 19).replace("T", " ");
  }
  if (typeof param === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(param)) {
    return param.replace("T", " ").replace("Z", "").split(".")[0];
  }
  return param;
}

export async function queryMySQL<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getMySQLPool();
  const sanitizedParams = params.map(formatMySQLDateParam);
  const [rows] = await pool.query(sql, sanitizedParams);
  return rows as T[];
}

export async function executeMySQL(sql: string, params: any[] = []): Promise<any> {
  const pool = getMySQLPool();
  const sanitizedParams = params.map(formatMySQLDateParam);
  const [result] = await pool.execute(sql, sanitizedParams);
  return result;
}
