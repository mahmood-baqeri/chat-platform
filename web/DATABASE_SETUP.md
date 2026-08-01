# راهنمای کامل پیکربندی و راه‌اندازی پایگاه داده MySQL

این مستند شامل راهنمای جامع مهندسی پایگاه داده، اسکریپت‌های DDL ساخت جداول، اسکریپت‌های Migration داده‌ها، تنظیمات امنیتی و دستورالعمل راه‌اندازی پایگاه داده MySQL برای سامانه پیام‌رسان پیشرفته می‌باشد.

---

## ۱. معماری پیشنهادی جداول دیتابیس (Database Schema)

برای پشتیبانی از تمام قابلیت‌های پیام‌رسان (کاربران، گفت‌وگوهای دوتایی، گروه‌ها، کانال‌ها، پیام‌های متنی و چندرسانه‌ای، ری‌اکشن‌ها، کلمات ممنوعه، سطح دسترسی و لاگ‌های سیستم)، ساختار زیر طراحی شده است:

### جداول اصلی:
1. `users`: نگهداری اطلاعات حساب کاربری، وضعیت آنلاین، عکس پروفایل و نقش.
2. `chats`: نگهداری اطلاعات گروه‌ها، کانال‌ها و گفت‌وگوهای مستقیم.
3. `chat_members`: جدول واسط اعضای گروه‌ها/کانال‌ها و نقش‌های آن‌ها (`owner`, `admin`, `user`).
4. `messages`: نگهداری پیام‌ها، شناسه اختصاصی (Message ID / UUID)، وضعیت ویرایش و پاسخ (Reply).
5. `attachments`: نگهداری اطلاعات فایل‌ها و رسانه‌های پیوست‌شده به پیام.
6. `reactions`: نگهداری شکلک‌های واکنش کاربر به هر پیام.
7. `forbidden_words`: لیست کلمات ممنوعه بر اساس دسته‌بندی.
8. `role_permissions`: تنظیمات دسترسی نقش‌های کاربری.
9. `system_audit_logs`: گزارشات عملیاتی و امنیتی مدیران و سیستم.

---

## ۲. اسکریپت کامل ساخت دیتابیس و جداول (SQL Initialization DDL)

برای ساخت کامل دیتابیس و جداول، دستورات زیر را در MySQL اجرا کنید:

```sql
-- ایجاد دیتابیس با انکودینگ کامل utf8mb4
CREATE DATABASE IF NOT EXISTS `chat_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `chat_db`;

-- ۱. جدول کاربران
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `first_name` VARCHAR(100) NULL,
  `last_name` VARCHAR(100) NULL,
  `display_name` VARCHAR(150) NOT NULL,
  `avatar_url` TEXT NULL,
  `role` ENUM('owner', 'super_admin', 'admin', 'trusted_user', 'user', 'guest') NOT NULL DEFAULT 'user',
  `status` ENUM('online', 'offline', 'busy') NOT NULL DEFAULT 'offline',
  `custom_status_text` VARCHAR(255) NULL,
  `bio` TEXT NULL,
  `last_seen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲. جدول گفت‌وگوها (چت‌ها، گروه‌ها، کانال‌ها)
CREATE TABLE IF NOT EXISTS `chats` (
  `id` VARCHAR(64) NOT NULL,
  `type` ENUM('direct', 'group', 'channel') NOT NULL DEFAULT 'direct',
  `title` VARCHAR(200) NULL,
  `description` TEXT NULL,
  `avatar_url` TEXT NULL,
  `username` VARCHAR(50) NULL UNIQUE,
  `is_private` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_pinned` BOOLEAN NOT NULL DEFAULT FALSE,
  `owner_id` VARCHAR(64) NULL,
  `slow_mode_seconds` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_chats_type` (`type`),
  INDEX `idx_chats_username` (`username`),
  CONSTRAINT `fk_chats_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳. جدول اعضای چت‌ها
CREATE TABLE IF NOT EXISTS `chat_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `chat_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `role` ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
  `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_chat_user` (`chat_id`, `user_id`),
  INDEX `idx_chat_members_chat` (`chat_id`),
  INDEX `idx_chat_members_user` (`user_id`),
  CONSTRAINT `fk_members_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴. جدول پیام‌ها (مجهز به Message ID اختصاصی)
CREATE TABLE IF NOT EXISTS `messages` (
  `id` VARCHAR(64) NOT NULL COMMENT 'UUID v4 اختصاصی پیام',
  `chat_id` VARCHAR(64) NOT NULL,
  `sender_id` VARCHAR(64) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `type` ENUM('text', 'image', 'video', 'audio', 'voice', 'file', 'system') NOT NULL DEFAULT 'text',
  `reply_to_id` VARCHAR(64) NULL,
  `is_pinned` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_edited` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('sending', 'sent', 'delivered', 'seen') NOT NULL DEFAULT 'sent',
  `seen_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_messages_chat_created` (`chat_id`, `created_at`),
  INDEX `idx_messages_sender` (`sender_id`),
  CONSTRAINT `fk_messages_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_reply` FOREIGN KEY (`reply_to_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵. جدول فایل‌های پیوست (Attachments)
CREATE TABLE IF NOT EXISTS `attachments` (
  `id` VARCHAR(64) NOT NULL,
  `message_id` VARCHAR(64) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_url` TEXT NOT NULL,
  `file_size` BIGINT NOT NULL,
  `file_type` VARCHAR(100) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `duration_seconds` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_attachments_message` (`message_id`),
  CONSTRAINT `fk_attachments_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۶. جدول واکنش‌ها (Reactions)
CREATE TABLE IF NOT EXISTS `reactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `emoji` VARCHAR(32) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uk_message_user_emoji` (`message_id`, `user_id`, `emoji`),
  CONSTRAINT `fk_reactions_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷. جدول کلمات ممنوعه
CREATE TABLE IF NOT EXISTS `forbidden_words` (
  `id` VARCHAR(64) NOT NULL,
  `word` VARCHAR(250) NOT NULL UNIQUE,
  `category` ENUM('political', 'insult', 'ads', 'spam', 'custom') NOT NULL DEFAULT 'custom',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۸. جدول نقش‌ها و دسترسی‌ها
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` VARCHAR(64) NOT NULL,
  `role` VARCHAR(50) NOT NULL UNIQUE,
  `role_label` VARCHAR(100) NOT NULL,
  `can_send_message` BOOLEAN NOT NULL DEFAULT TRUE,
  `can_send_media` BOOLEAN NOT NULL DEFAULT TRUE,
  `can_send_voice` BOOLEAN NOT NULL DEFAULT TRUE,
  `can_create_group` BOOLEAN NOT NULL DEFAULT TRUE,
  `can_create_channel` BOOLEAN NOT NULL DEFAULT TRUE,
  `can_pin_message` BOOLEAN NOT NULL DEFAULT FALSE,
  `can_delete_messages` BOOLEAN NOT NULL DEFAULT FALSE,
  `can_ban_users` BOOLEAN NOT NULL DEFAULT FALSE,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۹. جدول گزارشات سیستم (Audit Logs)
CREATE TABLE IF NOT EXISTS `system_audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `admin_id` VARCHAR(64) NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_logs_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## ۳. انواع داده‌ها و انتخاب کلیدها (Data Types & Indexing)

* **انکودینگ (`utf8mb4_unicode_ci`)**: پشتیبانی کامل از تمام حروف فارسی/عربی و ایموجی‌های ۴ بایتی (مانند شکلک‌های پیام‌رسان).
* **تاریخ و زمان (`DATETIME(3)`)**: ذخیره‌سازی زمان با دقت میلی‌ثانیه جهت نمایش دقیق ترتیب پیام‌ها.
* **شناسه‌ها (`VARCHAR(64)` / UUID v4)**: تضمین عدم تعارض شناسه‌ها در توزیع سیستم و مهاجرت داده‌ها.
* **ایندکس‌های ترکیبی (`idx_messages_chat_created`)**: افزایش چشمگیر سرعت بازخوانی پیام‌های هر چت بر اساس تاریخ.

---

## ۴. نحوه اتصال لایه Application به MySQL در Node.js

پروژه از پکیج رسمی `mysql2/promise` جهت مدیریت connection pool استفاده می‌کند:

```typescript
import mysql from 'mysql2/promise';

export const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'chat_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 10000,
});
```

---

## ۵. اسکریپت Migration جهت انتقال داده‌های موجود به دیتابیس

کد زیر نحوه مهاجرت حافظه فعلی (JSON memory store) به جداول MySQL را اتوماتیک انجام می‌دهد:

```typescript
import { dbPool } from './db';

export async function migrateInMemoryDataToMySQL(initialUsers: any[], initialMessages: any[]) {
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    // ۱. انتقال کاربران
    for (const u of initialUsers) {
      await connection.query(
        `INSERT INTO users (id, phone, username, display_name, avatar_url, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), avatar_url=VALUES(avatar_url)`,
        [u.id, u.phone || u.id, u.username, u.displayName, u.avatarUrl, u.role || 'user', u.status || 'offline']
      );
    }

    // ۲. انتقال پیام‌ها
    for (const m of initialMessages) {
      await connection.query(
        `INSERT INTO messages (id, chat_id, sender_id, content, type, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content=VALUES(content)`,
        [m.id, m.chatId, m.senderId, m.content, m.type || 'text', m.status || 'sent', new Date(m.createdAt)]
      );
    }

    await connection.commit();
    console.log('مهاجرت داده‌ها با موفقیت به پایان رسید.');
  } catch (error) {
    await connection.rollback();
    console.error('خطا در فرایند مهاجرت داده‌ها:', error);
  } finally {
    connection.release();
  }
}
```

---

## ۶. نحوه تست صحت عملکرد دیتابیس

برای تست اتصال و کارکرد صحت دیتابیس:

۱. ورود به محیط MySQL از طریق CLI:
```bash
mysql -u root -p -h localhost chat_db
```

۲. بررسی وضعیت جداول:
```sql
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM messages;
```

۳. تست کوئری دریافت پیام‌ها با ایندکس زمان:
```sql
SELECT m.*, u.display_name 
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.chat_id = 'c1'
ORDER BY m.created_at DESC
LIMIT 50;
```

---

## ۷. تنظیمات پیشنهادی MySQL برای محیط Production (`my.cnf`)

تنظیمات زیر را در فایل `/etc/mysql/my.cnf` سرور اعمال فرمایید:

```ini
[mysqld]
# انکودینگ پیش‌فرض
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci

# افزایش حافظه بافر برای عملکرد بالا
innodb_buffer_pool_size = 1G
innodb_log_file_size    = 256M
innodb_flush_log_at_trx_commit = 2

# اتصالات همزمان
max_connections = 500
max_connect_errors = 1000
wait_timeout = 28800
interactive_timeout = 28800

# زمان‌بندی و لاگ کوئری‌های کند
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
```

---

## ۸. نکات امنیتی دیتابیس

1. **حذف کاربر Root لایو**: یک کاربر اختصاصی غیر ریشه با دسترسی محدود به `chat_db` تعریف کنید:
   ```sql
   CREATE USER 'chat_app_user'@'localhost' IDENTIFIED BY 'Strong_Pass_2026!#';
   GRANT SELECT, INSERT, UPDATE, DELETE ON chat_db.* TO 'chat_app_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
2. **رمزنگاری SSL**: در صورت جدا بودن سرور اپلیکیشن از سرور دیتابیس، حالت `sslMode=required` را فعال کنید.
3. **عدم دسترسی عمومی (Firewall)**: پورت `3306` را از اینترنت عمومی مسدود کرده و فقط IP سرور اپلیکیشن را مجاز کنید.

---

## ۹. راهنمای گام‌به‌گام راه‌اندازی برای مدیر سیستم

1. **نصب MySQL نسخه 8.0+** روی سرور (توزیع اوبونتو/دبین یا CentOS):
   ```bash
   sudo apt update && sudo apt install mysql-server -y
   ```
2. **ساخت دیتابیس و جداول**: فایل اسکریپت DDL بخش ۲ را ذخیره و اجرا کنید:
   ```bash
   mysql -u root -p < schema.sql
   ```
3. **تنظیم متغیرهای محیطی در `.env`**:
   ```env
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_DATABASE=chat_db
   MYSQL_USER=chat_app_user
   MYSQL_PASSWORD=Strong_Pass_2026!#
   ```
4. **تست و بررسی در پنل مدیریت**:
   - وارد اپلیکیشن پیام‌رسان شوید.
   - آیکون **پنل مدیریت** -> تب **تنظیمات دیتابیس** را باز کنید.
   - اطلاعات بالا را وارد نموده و دکمه **"تست اتصال به دیتابیس"** را کلیک نمایید.
   - پس از دریافت پیام سبز رنگ "اتصال موفقیت‌آمیز"، دکمه **"ذخیره تنظیمات"** را فشار دهید.
