-- web/server/db/schema_mysql.sql

-- Users
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `phone` VARCHAR(32) NOT NULL UNIQUE,
    `nationalCode` VARCHAR(20) NOT NULL UNIQUE,
    `personCode` VARCHAR(20) NOT NULL UNIQUE,
    `first_name` VARCHAR(128) NULL,
    `last_name` VARCHAR(128) NULL,
    `display_name` VARCHAR(255) NOT NULL,
    `avatar_url` TEXT NULL,
    `status` VARCHAR(32) DEFAULT 'offline',
    `last_seen` DATETIME NULL,
    `role` VARCHAR(32) DEFAULT 'user',
    `is_banned` TINYINT(1) DEFAULT 0,
    `is_muted` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- User Sessions
CREATE TABLE IF NOT EXISTS `user_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `device_name` VARCHAR(255) NULL,
    `ip_address` VARCHAR(64) NULL,
    `browser` VARCHAR(255) NULL,
    `last_active` DATETIME NULL,
    `is_current` TINYINT(1) DEFAULT 0,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Room Members
CREATE TABLE IF NOT EXISTS `room_members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_id` VARCHAR(64) NOT NULL,
    `user_id` INT NOT NULL,
    `role` VARCHAR(32) DEFAULT 'user',
    `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `is_muted` TINYINT(1) DEFAULT 0,
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_room_user` (`room_id`, `user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    FOREIGN KEY (`chat_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_message_user_seen` (`message_id`, `user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Message Reactions
CREATE TABLE IF NOT EXISTS `message_reactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `message_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `emoji` VARCHAR(32) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_message_user_emoji` (
        `message_id`,
        `user_id`,
        `emoji`
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Forbidden Words
CREATE TABLE IF NOT EXISTS `forbidden_words` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `word` VARCHAR(128) NOT NULL UNIQUE,
    `category` VARCHAR(64) NOT NULL,
    `is_enabled` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Push Settings
CREATE TABLE IF NOT EXISTS `push_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `vapid_public_key` TEXT NULL,
    `vapid_private_key` TEXT NULL,
    `is_enabled` TINYINT(1) DEFAULT 1
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `endpoint` VARCHAR(512) NOT NULL,
    `subscription_json` LONGTEXT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_push_endpoint` (`endpoint` (255))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- System Audit Logs
CREATE TABLE IF NOT EXISTS `system_audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `actor_name` VARCHAR(128) NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `details` TEXT NULL,
    `level` VARCHAR(32) DEFAULT 'info',
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- فقط یک رکورد پیش‌فرض برای system_settings در صورت خالی بودن جدول
INSERT INTO
    `system_settings` (
        `registration_enabled`,
        `login_enabled`,
        `otp_enabled`,
        `channels_enabled`,
        `groups_enabled`,
        `max_file_size_mb`,
        `push_policy`
    )
SELECT 1, 1, 1, 1, 1, 25, 'always'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM `system_settings`
    );