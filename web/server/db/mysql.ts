// web/server/db/mysql.ts

import mysql, { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import fs from "fs";
import path from "path";

let mysqlPool: Pool | null = null;

export function getMySQLConfig() {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase() || 'development';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development' || nodeEnv === 'dev';

  let config = {
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

  if (isProduction) {
    config = {
      ...config,
      host: process.env.MYSQL_HOST_PROD || process.env.MYSQL_HOST || "127.0.0.1",
      port: parseInt(process.env.MYSQL_PORT_PROD || process.env.MYSQL_PORT || "3306", 10),
      user: process.env.MYSQL_USER_PROD || process.env.MYSQL_USER || "fida_test",
      password: process.env.MYSQL_PASSWORD_PROD || process.env.MYSQL_PASSWORD || "cetbWRHXI1uAHmXn",
      database: process.env.MYSQL_DATABASE_PROD || process.env.MYSQL_DATABASE || "fida_test",
      connectionLimit: 20,
    };
    console.log("🔧 Using Production MySQL configuration");
  } else if (isDevelopment) {
    config = {
      ...config,
      host: process.env.MYSQL_HOST_DEV || process.env.MYSQL_HOST || "127.0.0.1",
      port: parseInt(process.env.MYSQL_PORT_DEV || process.env.MYSQL_PORT || "3306", 10),
      user: process.env.MYSQL_USER_DEV || process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD_DEV || process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE_DEV || process.env.MYSQL_DATABASE || "messenger_db",
      connectionLimit: 10,
    };
    console.log("🔧 Using Development MySQL configuration");
  }

  return config;
}

export function getMySQLPool(): Pool {
  if (mysqlPool) return mysqlPool;
  const config = getMySQLConfig();
  mysqlPool = mysql.createPool(config);
  return mysqlPool;
}

let migrationExecuted = false;

export async function runMySQLMigrations(): Promise<boolean> {
  if (migrationExecuted) {
    return true;
  }

  try {
    const config = getMySQLConfig();
    const pool = getMySQLPool();

    const rootConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: true
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConnection.end();

    const schemaPath = path.join(process.cwd(), "server", "db", "schema_mysql.sql");
    
    if (fs.existsSync(schemaPath)) {
      const sqlScript = fs.readFileSync(schemaPath, "utf-8");
      await pool.query(sqlScript);
      console.log("✅ MySQL Schema migrated successfully!");
      migrationExecuted = true;
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

// ✅ این تابع رو تغییر بده تا ResultSetHeader برگردونه
export async function queryMySQL<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getMySQLPool();
  const sanitizedParams = params.map(formatMySQLDateParam);
  const [rows] = await pool.query(sql, sanitizedParams);
  return rows as T[];
}

// ✅ این تابع رو تغییر بده تا ResultSetHeader برگردونه
export async function executeMySQL(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const pool = getMySQLPool();
  const sanitizedParams = params.map(formatMySQLDateParam);
  const [result] = await pool.execute(sql, sanitizedParams);
  return result as ResultSetHeader;
}

export function getEnvironmentInfo() {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase() || 'development';
  return {
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development' || nodeEnv === 'dev',
    isTest: nodeEnv === 'test',
    environment: nodeEnv,
    dbConfig: getMySQLConfig()
  };
}