-- web/server/db/schema_mysql.sql

-- MySQL Schema - استفاده از AUTO_INCREMENT برای IDها
USE `messenger_db`;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(32) NOT NULL UNIQUE,
  `username` VARCHAR(64) NOT NULL UNIQUE,
  `first_name` VARCHAR(128) NULL,
  `last_name` VARCHAR(128) NULL,
  `display_name` VARCHAR(255) NOT NULL,
  `avatar_url` TEXT NULL,
  `bio` TEXT NULL,
  `status` VARCHAR(32) DEFAULT 'offline',
  `last_seen` DATETIME NULL,
  `role` VARCHAR(32) DEFAULT 'user',
  `is_banned` TINYINT(1) DEFAULT 0,
  `is_muted` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Sessions
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `device_name` VARCHAR(255) NULL,
  `ip_address` VARCHAR(64) NULL,
  `browser` VARCHAR(255) NULL,
  `last_active` DATETIME NULL,
  `is_current` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` VARCHAR(64) PRIMARY KEY,
  `type` VARCHAR(32) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `username` VARCHAR(64) NULL UNIQUE,
  `avatar_url` TEXT NULL,
  `description` TEXT NULL,
  `invite_link` VARCHAR(255) NULL,
  `is_private` TINYINT(1) DEFAULT 0,
  `is_archived` TINYINT(1) DEFAULT 0,
  `is_pinned` TINYINT(1) DEFAULT 0,
  `unread_count` INT DEFAULT 0,
  `member_count` INT DEFAULT 0,
  `owner_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Room Members
CREATE TABLE IF NOT EXISTS `room_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` VARCHAR(64) NOT NULL,
  `user_id` INT NOT NULL,
  `role` VARCHAR(32) DEFAULT 'user',
  `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_muted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_room_user` (`room_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages
CREATE TABLE IF NOT EXISTS `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `chat_id` VARCHAR(64) NOT NULL,
  `sender_id` INT NOT NULL,
  `type` VARCHAR(32) DEFAULT 'text',
  `content` LONGTEXT NULL,
  `status` VARCHAR(32) DEFAULT 'sent',
  `is_pinned` TINYINT(1) DEFAULT 0,
  `reply_to_id` INT NULL,
  `forward_from_id` INT NULL,
  `attachments` LONGTEXT NULL,
  `forwarded_from` LONGTEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`chat_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message Seens
CREATE TABLE IF NOT EXISTS `message_seens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `room_id` VARCHAR(64) NOT NULL,
  `seen_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_message_user_seen` (`message_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message Reactions
CREATE TABLE IF NOT EXISTS `message_reactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `emoji` VARCHAR(32) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_message_user_emoji` (`message_id`, `user_id`, `emoji`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Forbidden Words
CREATE TABLE IF NOT EXISTS `forbidden_words` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `word` VARCHAR(128) NOT NULL UNIQUE,
  `category` VARCHAR(64) NOT NULL,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Push Settings
CREATE TABLE IF NOT EXISTS `push_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vapid_public_key` TEXT NULL,
  `vapid_private_key` TEXT NULL,
  `is_enabled` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `endpoint` VARCHAR(512) NOT NULL,
  `subscription_json` LONGTEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_push_endpoint` (`endpoint`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `registration_enabled` TINYINT(1) DEFAULT 1,
  `login_enabled` TINYINT(1) DEFAULT 1,
  `otp_enabled` TINYINT(1) DEFAULT 1,
  `channels_enabled` TINYINT(1) DEFAULT 1,
  `groups_enabled` TINYINT(1) DEFAULT 1,
  `calls_enabled` TINYINT(1) DEFAULT 0,
  `edit_message_enabled` TINYINT(1) DEFAULT 1,
  `delete_message_enabled` TINYINT(1) DEFAULT 1,
  `max_file_size_mb` INT DEFAULT 25,
  `allowed_file_extensions` TEXT NULL,
  `push_policy` VARCHAR(64) DEFAULT 'always'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Audit Logs
CREATE TABLE IF NOT EXISTS `system_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_name` VARCHAR(128) NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT NULL,
  `level` VARCHAR(32) DEFAULT 'info',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- درج کاربران جدید
-- درج کاربران جدید
INSERT INTO `users` (`phone`, `username`, `first_name`, `last_name`, `display_name`, `avatar_url`, `bio`, `status`, `role`) VALUES
('09121111111', 'smb', 'محمود', 'باقری', 'محمود باقری', 'https://i.pravatar.cc/150?img=1', 'مدیر ارشد سیستم', 'online', 'owner'),
('09122222222', 'kazem', 'حسین', 'کاظمیان', 'حسین کاظمیان', 'https://i.pravatar.cc/150?img=2', 'مدیر فنی', 'online', 'admin'),
('09123333333', 'nasr', 'مصطفی', 'نصری', 'مصطفی نصری', 'https://i.pravatar.cc/150?img=3', 'توسعه‌دهنده ارشد', 'offline', 'user'),
('09124444444', 'rezaei', 'رضا', 'رضایی', 'رضا رضایی', 'https://i.pravatar.cc/150?img=4', 'مدیر پروژه', 'online', 'admin'),
('09125555555', 'karimi', 'علی', 'کریمی', 'علی کریمی', 'https://i.pravatar.cc/150?img=5', 'توسعه‌دهنده بک‌اند', 'offline', 'user'),
('09126666666', 'ahmadi', 'احمد', 'احمدی', 'احمد احمدی', 'https://i.pravatar.cc/150?img=6', 'طراح UI/UX', 'online', 'user'),
('09127777777', 'mohammadi', 'محمد', 'محمدی', 'محمد محمدی', 'https://i.pravatar.cc/150?img=7', 'توسعه‌دهنده موبایل', 'offline', 'user'),
('09128888888', 'hassani', 'حسن', 'حسنی', 'حسن حسنی', 'https://i.pravatar.cc/150?img=8', 'کارشناس امنیت', 'online', 'admin'),
('09129999999', 'hosseini', 'سید', 'حسینی', 'سید حسینی', 'https://i.pravatar.cc/150?img=9', 'توسعه‌دهنده فول‌استک', 'offline', 'user'),
('09120000000', 'farhadi', 'فرهاد', 'فرهادی', 'فرهاد فرهادی', 'https://i.pravatar.cc/150?img=10', 'کارشناس داده', 'online', 'user'),
('09131111111', 'ebrahimi', 'ابراهیم', 'ابراهیمی', 'ابراهیم ابراهیمی', 'https://i.pravatar.cc/150?img=11', 'توسعه‌دهنده ارشد', 'online', 'admin'),
('09132222222', 'mazlomi', 'سعید', 'مظلومی', 'سعید مظلومی', 'https://i.pravatar.cc/150?img=12', 'متخصص هوش مصنوعی', 'offline', 'user'),
('09133333333', 'zarei', 'رضا', 'زارعی', 'رضا زارعی', 'https://i.pravatar.cc/150?img=13', 'توسعه‌دهنده گیم', 'online', 'user'),
('09134444444', 'moradi', 'مهدی', 'مرادی', 'مهدی مرادی', 'https://i.pravatar.cc/150?img=14', 'مدیر محصول', 'offline', 'admin'),
('09135555555', 'jafari', 'جعفر', 'جعفری', 'جعفر جعفری', 'https://i.pravatar.cc/150?img=15', 'توسعه‌دهنده بک‌اند', 'online', 'user'),
('09136666666', 'rahimi', 'رحیم', 'رحیمی', 'رحیم رحیمی', 'https://i.pravatar.cc/150?img=16', 'کارشناس DevOps', 'offline', 'user'),
('09137777777', 'amiri', 'امیر', 'امیری', 'امیر امیری', 'https://i.pravatar.cc/150?img=17', 'توسعه‌دهنده فرانت‌اند', 'online', 'user'),
('09138888888', 'ghasemi', 'قاسم', 'قاسمی', 'قاسم قاسمی', 'https://i.pravatar.cc/150?img=18', 'متخصص دیتابیس', 'offline', 'user'),
('09139999999', 'najafi', 'نجف', 'نجفی', 'نجف نجفی', 'https://i.pravatar.cc/150?img=19', 'توسعه‌دهنده موبایل', 'online', 'user'),
('09130000000', 'rashidi', 'رشید', 'رشیدی', 'رشید رشیدی', 'https://i.pravatar.cc/150?img=20', 'کارشناس امنیت', 'offline', 'user'),
('09141111111', 'sharifi', 'شریف', 'شریفی', 'شریف شریفی', 'https://i.pravatar.cc/150?img=21', 'توسعه‌دهنده ارشد', 'online', 'admin'),
('09142222222', 'khosravi', 'خسرو', 'خسروی', 'خسرو خسروی', 'https://i.pravatar.cc/150?img=22', 'متخصص شبکه', 'offline', 'user'),
('09143333333', 'talebi', 'طالب', 'طالبی', 'طالب طالبی', 'https://i.pravatar.cc/150?img=23', 'توسعه‌دهنده فول‌استک', 'online', 'user'),
('09144444444', 'bayat', 'بایار', 'بیات', 'بایار بیات', 'https://i.pravatar.cc/150?img=24', 'مهندس نرم‌افزار', 'offline', 'user'),
('09145555555', 'fathi', 'فتح', 'فتحی', 'فتح فتحی', 'https://i.pravatar.cc/150?img=25', 'توسعه‌دهنده بک‌اند', 'online', 'user'),
('09146666666', 'ghanbari', 'قنبر', 'قنبری', 'قنبر قنبری', 'https://i.pravatar.cc/150?img=26', 'طراح سیستم', 'offline', 'user'),
('09147777777', 'heidari', 'حیدر', 'حیدری', 'حیدر حیدری', 'https://i.pravatar.cc/150?img=27', 'کارشناس پشتیبانی', 'online', 'user'),
('09148888888', 'izadi', 'ایزد', 'ایزدی', 'ایزد ایزدی', 'https://i.pravatar.cc/150?img=28', 'توسعه‌دهنده موبایل', 'offline', 'user'),
('09149999999', 'jalili', 'جلیل', 'جلیلی', 'جلیل جلیلی', 'https://i.pravatar.cc/150?img=29', 'متخصص دیتا', 'online', 'user'),
('09140000000', 'kiani', 'کیان', 'کیانی', 'کیان کیانی', 'https://i.pravatar.cc/150?img=30', 'مهندس فرانت‌اند', 'offline', 'user'),
('09151111111', 'lotfi', 'لطف', 'لطفی', 'لطف لطفی', 'https://i.pravatar.cc/150?img=31', 'توسعه‌دهنده گیم', 'online', 'user'),
('09152222222', 'mohebbi', 'محب', 'محبی', 'محب محبی', 'https://i.pravatar.cc/150?img=32', 'کارشناس UI/UX', 'offline', 'user'),
('09153333333', 'naderi', 'نادر', 'نادری', 'نادر نادری', 'https://i.pravatar.cc/150?img=33', 'مهندس نرم‌افزار', 'online', 'user'),
('09154444444', 'orangi', 'اورنگ', 'اورنگی', 'اورنگ اورنگی', 'https://i.pravatar.cc/150?img=34', 'توسعه‌دهنده بک‌اند', 'offline', 'user'),
('09155555555', 'parvizi', 'پرویز', 'پرویزی', 'پرویز پرویزی', 'https://i.pravatar.cc/150?img=35', 'مدیر فنی', 'online', 'admin'),
('09156666666', 'roshan', 'روشن', 'روشنی', 'روشن روشنی', 'https://i.pravatar.cc/150?img=36', 'توسعه‌دهنده فول‌استک', 'offline', 'user'),
('09157777777', 'sadeghi', 'صادق', 'صادقی', 'صادق صادقی', 'https://i.pravatar.cc/150?img=37', 'کارشناس امنیت', 'online', 'user'),
('09158888888', 'taheri', 'طاهر', 'طاهری', 'طاهر طاهری', 'https://i.pravatar.cc/150?img=38', 'توسعه‌دهنده موبایل', 'offline', 'user'),
('09159999999', 'vahidi', 'وحید', 'وحیدی', 'وحید وحیدی', 'https://i.pravatar.cc/150?img=39', 'متخصص هوش مصنوعی', 'online', 'user'),
('09150000000', 'yousefi', 'یوسف', 'یوسفی', 'یوسف یوسفی', 'https://i.pravatar.cc/150?img=40', 'توسعه‌دهنده بک‌اند', 'offline', 'user'),
('09161111111', 'akbari', 'اکبر', 'اکبری', 'اکبر اکبری', 'https://i.pravatar.cc/150?img=41', 'مهندس دیتابیس', 'online', 'user'),
('09162222222', 'behnam', 'بهنام', 'بهنامی', 'بهنام بهنامی', 'https://i.pravatar.cc/150?img=42', 'توسعه‌دهنده فرانت‌اند', 'offline', 'user'),
('09163333333', 'davoodi', 'داود', 'داودی', 'داود داودی', 'https://i.pravatar.cc/150?img=43', 'مدیر پروژه', 'online', 'admin'),
('09164444444', 'eslami', 'اسلام', 'اسلامی', 'اسلام اسلامی', 'https://i.pravatar.cc/150?img=44', 'توسعه‌دهنده گیم', 'offline', 'user'),
('09165555555', 'ferdowsi', 'فردوس', 'فردوسی', 'فردوس فردوسی', 'https://i.pravatar.cc/150?img=45', 'کارشناس DevOps', 'online', 'user'),
('09166666666', 'golami', 'غلام', 'غلامی', 'غلام غلامی', 'https://i.pravatar.cc/150?img=46', 'توسعه‌دهنده موبایل', 'offline', 'user'),
('09167777777', 'hashemi', 'هاشم', 'هاشمی', 'هاشم هاشمی', 'https://i.pravatar.cc/150?img=47', 'متخصص شبکه', 'online', 'user'),
('09168888888', 'imani', 'ایمان', 'ایمانی', 'ایمان ایمانی', 'https://i.pravatar.cc/150?img=48', 'توسعه‌دهنده بک‌اند', 'offline', 'user'),
('09169999999', 'jamali', 'جمال', 'جمالی', 'جمال جمالی', 'https://i.pravatar.cc/150?img=49', 'کارشناس امنیت', 'online', 'user'),
('09160000000', 'kamali', 'کمال', 'کمالی', 'کمال کمالی', 'https://i.pravatar.cc/150?img=50', 'توسعه‌دهنده فول‌استک', 'offline', 'user');

-- Seed Data
INSERT INTO `system_settings` (`registration_enabled`, `login_enabled`, `otp_enabled`, `channels_enabled`, `groups_enabled`, `max_file_size_mb`, `push_policy`)
SELECT 1, 1, 1, 1, 1, 25, 'always'
WHERE NOT EXISTS (SELECT 1 FROM `system_settings`);