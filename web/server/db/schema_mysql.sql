-- web/server/db/schema_mysql.sql

-- MySQL Schema - استفاده از AUTO_INCREMENT برای IDها
USE `messenger_db`;

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

INSERT INTO
    `users` (
        `phone`,
        `nationalCode`,
        `personCode`,
        `first_name`,
        `last_name`,
        `display_name`,
        `avatar_url`,
        `status`,
        `role`
    )
VALUES (
        '09135345636',
        '1120019699',
        '400701',
        'محمود',
        'باقری',
        'محمود باقری',
        'https://i.pravatar.cc/150?img=1',
        'online',
        'owner'
    ),
    (
        '09122222222',
        '1234567891',
        'EMP002',
        'حسین',
        'کاظمیان',
        'حسین کاظمیان',
        'https://i.pravatar.cc/150?img=2',
        'online',
        'admin'
    ),
    (
        '09123333333',
        '1234567892',
        'EMP003',
        'مصطفی',
        'نصری',
        'مصطفی نصری',
        'https://i.pravatar.cc/150?img=3',
        'offline',
        'user'
    ),
    (
        '09124444444',
        '1234567893',
        'EMP004',
        'رضا',
        'رضایی',
        'رضا رضایی',
        'https://i.pravatar.cc/150?img=4',
        'online',
        'admin'
    ),
    (
        '09125555555',
        '1234567894',
        'EMP005',
        'علی',
        'کریمی',
        'علی کریمی',
        'https://i.pravatar.cc/150?img=5',
        'offline',
        'user'
    ),
    (
        '09126666666',
        '1234567895',
        'EMP006',
        'احمد',
        'احمدی',
        'احمد احمدی',
        'https://i.pravatar.cc/150?img=6',
        'online',
        'user'
    ),
    (
        '09127777777',
        '1234567896',
        'EMP007',
        'محمد',
        'محمدی',
        'محمد محمدی',
        'https://i.pravatar.cc/150?img=7',
        'offline',
        'user'
    ),
    (
        '09128888888',
        '1234567897',
        'EMP008',
        'حسن',
        'حسنی',
        'حسن حسنی',
        'https://i.pravatar.cc/150?img=8',
        'online',
        'admin'
    ),
    (
        '09129999999',
        '1234567898',
        'EMP009',
        'سید',
        'حسینی',
        'سید حسینی',
        'https://i.pravatar.cc/150?img=9',
        'offline',
        'user'
    ),
    (
        '09120000000',
        '1234567899',
        'EMP010',
        'فرهاد',
        'فرهادی',
        'فرهاد فرهادی',
        'https://i.pravatar.cc/150?img=10',
        'online',
        'user'
    ),
    (
        '09131111111',
        '1234567900',
        'EMP011',
        'ابراهیم',
        'ابراهیمی',
        'ابراهیم ابراهیمی',
        'https://i.pravatar.cc/150?img=11',
        'online',
        'admin'
    ),
    (
        '09132222222',
        '1234567901',
        'EMP012',
        'سعید',
        'مظلومی',
        'سعید مظلومی',
        'https://i.pravatar.cc/150?img=12',
        'offline',
        'user'
    ),
    (
        '09133333333',
        '1234567902',
        'EMP013',
        'رضا',
        'زارعی',
        'رضا زارعی',
        'https://i.pravatar.cc/150?img=13',
        'online',
        'user'
    ),
    (
        '09134444444',
        '1234567903',
        'EMP014',
        'مهدی',
        'مرادی',
        'مهدی مرادی',
        'https://i.pravatar.cc/150?img=14',
        'offline',
        'admin'
    ),
    (
        '09135555555',
        '1234567904',
        'EMP015',
        'جعفر',
        'جعفری',
        'جعفر جعفری',
        'https://i.pravatar.cc/150?img=15',
        'online',
        'user'
    ),
    (
        '09136666666',
        '1234567905',
        'EMP016',
        'رحیم',
        'رحیمی',
        'رحیم رحیمی',
        'https://i.pravatar.cc/150?img=16',
        'offline',
        'user'
    ),
    (
        '09137777777',
        '1234567906',
        'EMP017',
        'امیر',
        'امیری',
        'امیر امیری',
        'https://i.pravatar.cc/150?img=17',
        'online',
        'user'
    ),
    (
        '09138888888',
        '1234567907',
        'EMP018',
        'قاسم',
        'قاسمی',
        'قاسم قاسمی',
        'https://i.pravatar.cc/150?img=18',
        'offline',
        'user'
    ),
    (
        '09139999999',
        '1234567908',
        'EMP019',
        'نجف',
        'نجفی',
        'نجف نجفی',
        'https://i.pravatar.cc/150?img=19',
        'online',
        'user'
    ),
    (
        '09130000000',
        '1234567909',
        'EMP020',
        'رشید',
        'رشیدی',
        'رشید رشیدی',
        'https://i.pravatar.cc/150?img=20',
        'offline',
        'user'
    ),
    (
        '09141111111',
        '1234567910',
        'EMP021',
        'شریف',
        'شریفی',
        'شریف شریفی',
        'https://i.pravatar.cc/150?img=21',
        'online',
        'admin'
    ),
    (
        '09142222222',
        '1234567911',
        'EMP022',
        'خسرو',
        'خسروی',
        'خسرو خسروی',
        'https://i.pravatar.cc/150?img=22',
        'offline',
        'user'
    ),
    (
        '09143333333',
        '1234567912',
        'EMP023',
        'طالب',
        'طالبی',
        'طالب طالبی',
        'https://i.pravatar.cc/150?img=23',
        'online',
        'user'
    ),
    (
        '09144444444',
        '1234567913',
        'EMP024',
        'بایار',
        'بیات',
        'بایار بیات',
        'https://i.pravatar.cc/150?img=24',
        'offline',
        'user'
    ),
    (
        '09145555555',
        '1234567914',
        'EMP025',
        'فتح',
        'فتحی',
        'فتح فتحی',
        'https://i.pravatar.cc/150?img=25',
        'online',
        'user'
    ),
    (
        '09146666666',
        '1234567915',
        'EMP026',
        'قنبر',
        'قنبری',
        'قنبر قنبری',
        'https://i.pravatar.cc/150?img=26',
        'offline',
        'user'
    ),
    (
        '09147777777',
        '1234567916',
        'EMP027',
        'حیدر',
        'حیدری',
        'حیدر حیدری',
        'https://i.pravatar.cc/150?img=27',
        'online',
        'user'
    ),
    (
        '09148888888',
        '1234567917',
        'EMP028',
        'ایزد',
        'ایزدی',
        'ایزد ایزدی',
        'https://i.pravatar.cc/150?img=28',
        'offline',
        'user'
    ),
    (
        '09149999999',
        '1234567918',
        'EMP029',
        'جلیل',
        'جلیلی',
        'جلیل جلیلی',
        'https://i.pravatar.cc/150?img=29',
        'online',
        'user'
    ),
    (
        '09140000000',
        '1234567919',
        'EMP030',
        'کیان',
        'کیانی',
        'کیان کیانی',
        'https://i.pravatar.cc/150?img=30',
        'offline',
        'user'
    ),
    (
        '09151111111',
        '1234567920',
        'EMP031',
        'لطف',
        'لطفی',
        'لطف لطفی',
        'https://i.pravatar.cc/150?img=31',
        'online',
        'user'
    ),
    (
        '09152222222',
        '1234567921',
        'EMP032',
        'محب',
        'محبی',
        'محب محبی',
        'https://i.pravatar.cc/150?img=32',
        'offline',
        'user'
    ),
    (
        '09153333333',
        '1234567922',
        'EMP033',
        'نادر',
        'نادری',
        'نادر نادری',
        'https://i.pravatar.cc/150?img=33',
        'online',
        'user'
    ),
    (
        '09154444444',
        '1234567923',
        'EMP034',
        'اورنگ',
        'اورنگی',
        'اورنگ اورنگی',
        'https://i.pravatar.cc/150?img=34',
        'offline',
        'user'
    ),
    (
        '09155555555',
        '1234567924',
        'EMP035',
        'پرویز',
        'پرویزی',
        'پرویز پرویزی',
        'https://i.pravatar.cc/150?img=35',
        'online',
        'admin'
    ),
    (
        '09156666666',
        '1234567925',
        'EMP036',
        'روشن',
        'روشنی',
        'روشن روشنی',
        'https://i.pravatar.cc/150?img=36',
        'offline',
        'user'
    ),
    (
        '09157777777',
        '1234567926',
        'EMP037',
        'صادق',
        'صادقی',
        'صادق صادقی',
        'https://i.pravatar.cc/150?img=37',
        'online',
        'user'
    ),
    (
        '09158888888',
        '1234567927',
        'EMP038',
        'طاهر',
        'طاهری',
        'طاهر طاهری',
        'https://i.pravatar.cc/150?img=38',
        'offline',
        'user'
    ),
    (
        '09159999999',
        '1234567928',
        'EMP039',
        'وحید',
        'وحیدی',
        'وحید وحیدی',
        'https://i.pravatar.cc/150?img=39',
        'online',
        'user'
    ),
    (
        '09150000000',
        '1234567929',
        'EMP040',
        'یوسف',
        'یوسفی',
        'یوسف یوسفی',
        'https://i.pravatar.cc/150?img=40',
        'offline',
        'user'
    ),
    (
        '09161111111',
        '1234567930',
        'EMP041',
        'اکبر',
        'اکبری',
        'اکبر اکبری',
        'https://i.pravatar.cc/150?img=41',
        'online',
        'user'
    ),
    (
        '09162222222',
        '1234567931',
        'EMP042',
        'بهنام',
        'بهنامی',
        'بهنام بهنامی',
        'https://i.pravatar.cc/150?img=42',
        'offline',
        'user'
    ),
    (
        '09163333333',
        '1234567932',
        'EMP043',
        'داود',
        'داودی',
        'داود داودی',
        'https://i.pravatar.cc/150?img=43',
        'online',
        'admin'
    ),
    (
        '09164444444',
        '1234567933',
        'EMP044',
        'اسلام',
        'اسلامی',
        'اسلام اسلامی',
        'https://i.pravatar.cc/150?img=44',
        'offline',
        'user'
    ),
    (
        '09165555555',
        '1234567934',
        'EMP045',
        'فردوس',
        'فردوسی',
        'فردوس فردوسی',
        'https://i.pravatar.cc/150?img=45',
        'online',
        'user'
    ),
    (
        '09166666666',
        '1234567935',
        'EMP046',
        'غلام',
        'غلامی',
        'غلام غلامی',
        'https://i.pravatar.cc/150?img=46',
        'offline',
        'user'
    ),
    (
        '09167777777',
        '1234567936',
        'EMP047',
        'هاشم',
        'هاشمی',
        'هاشم هاشمی',
        'https://i.pravatar.cc/150?img=47',
        'online',
        'user'
    ),
    (
        '09168888888',
        '1234567937',
        'EMP048',
        'ایمان',
        'ایمانی',
        'ایمان ایمانی',
        'https://i.pravatar.cc/150?img=48',
        'offline',
        'user'
    ),
    (
        '09169999999',
        '1234567938',
        'EMP049',
        'جمال',
        'جمالی',
        'جمال جمالی',
        'https://i.pravatar.cc/150?img=49',
        'online',
        'user'
    ),
    (
        '09160000000',
        '1234567939',
        'EMP050',
        'کمال',
        'کمالی',
        'کمال کمالی',
        'https://i.pravatar.cc/150?img=50',
        'offline',
        'user'
    );

-- Seed Data
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