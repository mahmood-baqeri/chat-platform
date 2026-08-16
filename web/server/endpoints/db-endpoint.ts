import express, { Request, Response } from "express";

const router = express.Router();

let dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  database: process.env.MYSQL_DATABASE || "chat_db",
  username: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  charset: "utf8mb4",
  timezone: "+03:30",
  sslMode: "disabled"
};

router.get("/admin/db-settings", (req: Request, res: Response) => {
  res.json(dbConfig);
});

router.post("/admin/db-settings", (req: Request, res: Response) => {
  const { host, port, database, username, password, charset, timezone, sslMode } = req.body;
  if (!host || !database || !username) {
    return res.status(400).json({ error: "لطفاً تمام فیلدهای اجباری دیتابیس را تکمیل نمایید." });
  }

  dbConfig = {
    host: host.trim(),
    port: parseInt(port, 10) || 3306,
    database: database.trim(),
    username: username.trim(),
    password: password || "",
    charset: charset || "utf8mb4",
    timezone: timezone || "+03:30",
    sslMode: sslMode || "disabled"
  };

  res.json({ message: "تنظیمات دیتابیس با موفقیت ذخیره شد.", config: dbConfig });
});

router.post("/admin/db-test", async (req: Request, res: Response) => {
  const { host, port, database, username, password, charset, timezone, sslMode } = req.body;

  if (!host || !database || !username) {
    return res.status(400).json({
      success: false,
      error: "اطلاعات ورودی نامعتبر است: میزبان (Host)، نام دیتابیس و نام کاربری الزامی هستند."
    });
  }

  try {
    const mysql2 = await import("mysql2/promise");
    const connection = await mysql2.createConnection({
      host: host.trim(),
      port: parseInt(port, 10) || 3306,
      user: username.trim(),
      password: password || "",
      database: database.trim(),
      charset: charset || "utf8mb4",
      connectTimeout: 5000,
      ssl: sslMode !== "disabled" ? { rejectUnauthorized: false } : undefined
    });

    await connection.ping();
    await connection.end();

    res.json({
      success: true,
      message: `اتصال موفقیت‌آمیز! ارتباط با دیتابیس MySQL (${database}) روی ${host}:${port} با موفقیت برقرار شد.`
    });
  } catch (err: any) {
    let errorDetail = err.message || "امکان برقراری ارتباط با دیتابیس MySQL وجود ندارد.";
    if (err.code === "ECONNREFUSED") {
      errorDetail = `پورت ${port} روی میزبان ${host} مسدود است یا سرور MySQL فعال نیست. (${err.code})`;
    } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
      errorDetail = `دسترسی غیرمجاز! نام کاربری (${username}) یا رمز عبور اشتباه است. (${err.code})`;
    } else if (err.code === "ER_BAD_DB_ERROR") {
      errorDetail = `دیتابیس با نام '${database}' روی سرور MySQL یافت نشد. (${err.code})`;
    }

    res.status(400).json({
      success: false,
      error: errorDetail
    });
  }
});

export default router;
