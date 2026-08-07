-- ============================================================
-- MySQL Database Schema and Seed Data for Messenger Platform
-- Database Encoding: utf8mb4 / utf8mb4_unicode_ci
-- ============================================================

CREATE DATABASE IF NOT EXISTS `messenger_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `messenger_db`;

-- 1. Users Table
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

-- 2. User Sessions Table
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

-- 3. Rooms / Chats / Channels Table
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
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

-- 4. Room Members Table
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

-- 5. Messages Table
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

-- 6. Message Read Receipts (Message Seens) Table
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

-- 7. Message Reactions Table
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

-- 8. Forbidden Words Table
CREATE TABLE IF NOT EXISTS `forbidden_words` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `word` VARCHAR(128) NOT NULL UNIQUE,
  `category` VARCHAR(64) NOT NULL,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Push Settings Table
CREATE TABLE IF NOT EXISTS `push_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vapid_public_key` TEXT NULL,
  `vapid_private_key` TEXT NULL,
  `is_enabled` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `endpoint` VARCHAR(512) NOT NULL,
  `subscription_json` LONGTEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_push_endpoint` (`endpoint`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. System Settings Table
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

-- 12. System Audit Logs Table
CREATE TABLE IF NOT EXISTS `system_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_name` VARCHAR(128) NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT NULL,
  `level` VARCHAR(32) DEFAULT 'info',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Contacts Table
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `contact_user_id` INT NOT NULL,
  `custom_name` VARCHAR(255) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`contact_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED INITIAL DATA
-- ============================================================

INSERT INTO `users` (`id`, `phone`, `username`, `first_name`, `last_name`, `display_name`, `avatar_url`, `bio`, `status`, `role`) VALUES
(1, '09121111111', 'ali_rezaei', 'علی', 'رضایی', 'علی رضایی (مدیر ارشد)', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'توسعه‌دهنده سیستم‌های توزیع‌شده', 'online', 'owner'),
(2, '09122222222', 'sara_ahmadi', 'سارا', 'احمدی', 'سارا احمدی', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', 'طراح رابط کاربری', 'online', 'admin'),
(3, '09123333333', 'mohammad_hosseini', 'محمد', 'حسینی', 'محمد حسینی', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'مدیر پروژه', 'offline', 'user'),
(4, '09124444444', 'maryam_karimi', 'مریم', 'کریمی', 'مریم کریمی', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', 'متخصص DevOps', 'online', 'user')
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

INSERT INTO `system_settings` (`id`, `registration_enabled`, `login_enabled`, `otp_enabled`, `channels_enabled`, `groups_enabled`, `max_file_size_mb`, `push_policy`)
VALUES (1, 1, 1, 1, 1, 1, 25, 'always')
ON DUPLICATE KEY UPDATE `max_file_size_mb` = VALUES(`max_file_size_mb`);
