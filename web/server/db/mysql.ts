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

      // Step 3: Ensure missing columns are added if running against existing DB
      try {
        await pool.query("ALTER TABLE `system_settings` ADD COLUMN `push_policy` VARCHAR(64) DEFAULT 'always';");
      } catch (e: any) {}

      try {
        await pool.query("ALTER TABLE `messages` ADD COLUMN `attachments` LONGTEXT NULL;");
      } catch (e: any) {}

      try {
        await pool.query("ALTER TABLE `messages` ADD COLUMN `forwarded_from` LONGTEXT NULL;");
      } catch (e: any) {}

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS \`push_settings\` (
            \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
            \`vapid_public_key\` TEXT NULL,
            \`vapid_private_key\` TEXT NULL,
            \`is_enabled\` TINYINT(1) DEFAULT 1
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } catch (e: any) {}

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS \`push_subscriptions\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`user_id\` INT NOT NULL,
            \`endpoint\` VARCHAR(512) NOT NULL,
            \`subscription_json\` LONGTEXT NOT NULL,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
            UNIQUE KEY \`unique_push_endpoint\` (\`endpoint\`(255))
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } catch (e: any) {}

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS \`contacts\` (
            \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
            \`user_id\` INT NOT NULL,
            \`contact_user_id\` INT NOT NULL,
            \`custom_name\` VARCHAR(255) NULL,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
            FOREIGN KEY (\`contact_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } catch (e: any) {}

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
