-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.0.30 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.1.0.6537
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for messenger_db
CREATE DATABASE IF NOT EXISTS `messenger_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `messenger_db`;

-- Dumping structure for table messenger_db.forbidden_words
CREATE TABLE IF NOT EXISTS `forbidden_words` (
  `id` int NOT NULL AUTO_INCREMENT,
  `word` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `word` (`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.forbidden_words: ~0 rows (approximately)

-- Dumping structure for table messenger_db.messages
CREATE TABLE IF NOT EXISTS `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chat_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` int NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `content` longtext COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'sent',
  `is_pinned` tinyint(1) DEFAULT '0',
  `reply_to_id` int DEFAULT NULL,
  `forward_from_id` int DEFAULT NULL,
  `attachments` longtext COLLATE utf8mb4_unicode_ci,
  `forwarded_from` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `chat_id` (`chat_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`chat_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.messages: ~96 rows (approximately)
INSERT INTO `messages` (`id`, `chat_id`, `sender_id`, `type`, `content`, `status`, `is_pinned`, `reply_to_id`, `forward_from_id`, `attachments`, `forwarded_from`, `created_at`) VALUES
	(1, 'chat-1787133288208', 3572, 'image', 'photo22483321517.jpg', 'sent', 0, NULL, NULL, '[{"id":"att-1787133303639-978","name":"photo22483321517.jpg","type":"image","url":"/uploads/1787133303637_581_photo22483321517.jpg.jpeg","size":40466,"mimeType":"image/jpeg","chatId":"","senderId":"user-1","createdAt":"2026-08-19T09:55:03.639Z"}]', NULL, '2026-08-19 09:55:03'),
	(2, 'chat-1787394080204', 3572, 'text', 'سلام', 'sent', 0, NULL, NULL, '[]', NULL, '2026-08-22 10:21:30'),
	(3, 'chat-1787394080204', 3572, 'text', '11', 'sent', 0, 2, NULL, '[]', NULL, '2026-08-22 10:22:06'),
	(4, 'chat-1787394080204', 3593, 'text', '22', 'sent', 0, 3, NULL, '[]', NULL, '2026-08-22 10:22:13');

-- Dumping structure for table messenger_db.message_reactions
CREATE TABLE IF NOT EXISTS `message_reactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `emoji` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_message_user_emoji` (`message_id`,`user_id`,`emoji`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.message_reactions: ~4 rows (approximately)
INSERT INTO `message_reactions` (`id`, `message_id`, `user_id`, `emoji`, `created_at`, `updated_at`) VALUES
	(11, 2, 3572, '👍', '2026-08-22 10:21:56', '2026-08-22 13:51:56'),
	(12, 2, 3593, '👍', '2026-08-22 10:21:58', '2026-08-22 13:51:59'),
	(13, 4, 3593, '🤔', '2026-08-22 10:22:24', '2026-08-22 13:52:24'),
	(14, 4, 3572, '🙏', '2026-08-22 10:22:28', '2026-08-22 13:52:28');

-- Dumping structure for table messenger_db.message_seens
CREATE TABLE IF NOT EXISTS `message_seens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `room_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seen_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_message_user_seen` (`message_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `message_seens_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_seens_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_seens_ibfk_3` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=171 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.message_seens: ~111 rows (approximately)
INSERT INTO `message_seens` (`id`, `message_id`, `user_id`, `room_id`, `seen_at`, `delivered_at`, `created_at`, `updated_at`) VALUES
	(168, 2, 3593, 'chat-1787394080204', '2026-08-22 10:21:37', '2026-08-22 10:21:37', '2026-08-22 10:21:37', '2026-08-22 13:51:37'),
	(169, 3, 3593, 'chat-1787394080204', '2026-08-22 10:22:06', '2026-08-22 10:22:06', '2026-08-22 10:22:06', '2026-08-22 13:52:06'),
	(170, 4, 3572, 'chat-1787394080204', '2026-08-22 10:22:13', '2026-08-22 10:22:13', '2026-08-22 10:22:13', '2026-08-22 13:52:13');

-- Dumping structure for table messenger_db.push_settings
CREATE TABLE IF NOT EXISTS `push_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vapid_public_key` text COLLATE utf8mb4_unicode_ci,
  `vapid_private_key` text COLLATE utf8mb4_unicode_ci,
  `is_enabled` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.push_settings: ~1 rows (approximately)
INSERT INTO `push_settings` (`id`, `vapid_public_key`, `vapid_private_key`, `is_enabled`) VALUES
	(1, 'BH8MohCJEgNo5qaGpiOw-6QsjEL0RSJ7DSqvf15tlJ1oMD8h_SILf_akH5B7qayOSqY1VSwZV1kFuSmINEGxraA', '2z7HiQzIqeGj6QoBAuNb7m7YvjzqJdeXPpZXUUKewUs', 1);

-- Dumping structure for table messenger_db.push_subscriptions
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `endpoint` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscription_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_push_endpoint` (`endpoint`(255)),
  KEY `user_id` (`user_id`),
  CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.push_subscriptions: ~1 rows (approximately)
INSERT INTO `push_subscriptions` (`id`, `user_id`, `endpoint`, `subscription_json`, `created_at`) VALUES
	(15, 3572, 'https://fcm.googleapis.com/fcm/send/fIcNNkDBu0A:APA91bHfu_hqxDqJDrzOuc1dMruHVpv0uv0twwDZjO4BMtpq-6mof1hfuhpnNPE8hk4CQ6IJp1EhaXcugtdAsWFVWF_ZME0eGlkviKPs5oGgTWni8bMnDJHBkS3bL6SPdYUZxek93qAj', '{"endpoint":"https://fcm.googleapis.com/fcm/send/fIcNNkDBu0A:APA91bHfu_hqxDqJDrzOuc1dMruHVpv0uv0twwDZjO4BMtpq-6mof1hfuhpnNPE8hk4CQ6IJp1EhaXcugtdAsWFVWF_ZME0eGlkviKPs5oGgTWni8bMnDJHBkS3bL6SPdYUZxek93qAj","expirationTime":null,"keys":{"p256dh":"BAK8jFWbvfWZ47OEjtnr0osaGZkoBrtWLXC54PGGXAs0XSZymS_j5DYCtzdUqGiDqiAyBpamnKtMkpq4Fxhit9A","auth":"AFLe6ezsbz2WFd_Nczb6kw"}}', '2026-08-19 09:35:55'),
	(16, 3593, 'https://wns2-am3p.notify.windows.com/w/?token=BQYAAACLH1uX6Rx56Z6LINpU3SE0iWG%2bpy%2fqodgYT6SSwo6Khe0axZFOpU%2fCbsU3%2fNFy5E69lBDUau%2bxiBbb8N2fjwFYWt754AvCVVedN2c3cBynYjos9D2KIfd42jJ761eal9NB%2bfELxiuhxayT7TSfLzKTI5pUsAj0SCLKqtNdndXmJSwQutQ1xbT%2fWdILCglcvnMpcJiHomkng7SkTU5gtgJ%2fgpDXzFX7KzcrovhrVxdnVMWF47n2SL%2fe%2by2fEQ6ESX51c%2b%2f2R%2ffWiRWmIKTpoUTbQr8UDCaYuAodIDvOSmbe62hB10VYEpYgi1mBD7XnMkg%3d', '{"endpoint":"https://wns2-am3p.notify.windows.com/w/?token=BQYAAACLH1uX6Rx56Z6LINpU3SE0iWG%2bpy%2fqodgYT6SSwo6Khe0axZFOpU%2fCbsU3%2fNFy5E69lBDUau%2bxiBbb8N2fjwFYWt754AvCVVedN2c3cBynYjos9D2KIfd42jJ761eal9NB%2bfELxiuhxayT7TSfLzKTI5pUsAj0SCLKqtNdndXmJSwQutQ1xbT%2fWdILCglcvnMpcJiHomkng7SkTU5gtgJ%2fgpDXzFX7KzcrovhrVxdnVMWF47n2SL%2fe%2by2fEQ6ESX51c%2b%2f2R%2ffWiRWmIKTpoUTbQr8UDCaYuAodIDvOSmbe62hB10VYEpYgi1mBD7XnMkg%3d","expirationTime":null,"keys":{"p256dh":"BDmoUg02MQxvCG6QsIh-b92riAkKXYWUdeFK7Fy-QROsjKRpJWaCYQs7bMi353-tnucoJc4RA5uXwxapbPVdTbs","auth":"GZxxSmaCFEQcsYOr43JNVg"}}', '2026-08-22 13:50:50');

-- Dumping structure for table messenger_db.rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `invite_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_private` tinyint(1) DEFAULT '0',
  `is_archived` tinyint(1) DEFAULT '0',
  `is_pinned` tinyint(1) DEFAULT '0',
  `unread_count` int DEFAULT '0',
  `member_count` int DEFAULT '0',
  `owner_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.rooms: ~5 rows (approximately)
INSERT INTO `rooms` (`id`, `type`, `title`, `username`, `avatar_url`, `description`, `invite_link`, `is_private`, `is_archived`, `is_pinned`, `unread_count`, `member_count`, `owner_id`, `created_at`) VALUES
	('chat-1787130022962', 'direct', 'سیدمحمدمهدی سیدمعلمی', NULL, '/uploads/000_avatar.png?w=150', '', '/join/1787130022962', 1, 0, 0, 0, 2, 3572, '2026-08-19 09:00:22'),
	('chat-1787133288208', 'direct', 'بهنام آذرخش', NULL, '/uploads/000_avatar.png?w=150', '', '/join/1787133288208', 1, 0, 0, 0, 2, 3572, '2026-08-19 09:54:48'),
	('chat-1787394080204', 'direct', 'حسین کاظمیان', NULL, '/uploads/000_avatar.png?w=150', '', '/join/1787394080204', 1, 0, 0, 0, 2, 3572, '2026-08-22 10:21:20'),
	('chat-channel-1787384933006', 'channel', 'erg', 'erg', '/uploads/1787384933002_576_channel_1787384933002.webp', '', NULL, 0, 0, 0, 0, 3, 3572, '2026-08-22 07:48:53'),
	('chat-group-1787384285890', 'group', 'tyu12', 'group_1179', '/uploads/1787393099515_481_group_chat-group-1787384285890.png', '', NULL, 0, 0, 0, 0, 4, 3572, '2026-08-22 07:38:05');

-- Dumping structure for table messenger_db.room_members
CREATE TABLE IF NOT EXISTS `room_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `joined_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_muted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_room_user` (`room_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `room_members_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `room_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.room_members: ~13 rows (approximately)
INSERT INTO `room_members` (`id`, `room_id`, `user_id`, `role`, `joined_at`, `is_muted`) VALUES
	(42, 'chat-1787130022962', 3572, 'owner', '2026-08-19 09:00:22', 0),
	(43, 'chat-1787130022962', 3438, 'user', '2026-08-19 09:00:22', 0),
	(44, 'chat-1787133288208', 3572, 'owner', '2026-08-19 09:54:48', 0),
	(45, 'chat-1787133288208', 3590, 'user', '2026-08-19 09:54:48', 0),
	(46, 'chat-group-1787384285890', 3572, 'owner', '2026-08-22 07:38:05', 0),
	(47, 'chat-group-1787384285890', 3370, 'user', '2026-08-22 07:38:22', 0),
	(48, 'chat-group-1787384285890', 3377, 'user', '2026-08-22 07:38:24', 0),
	(49, 'chat-group-1787384285890', 3379, 'user', '2026-08-22 07:38:26', 0),
	(50, 'chat-group-1787384285890', 3371, 'user', '2026-08-22 07:38:30', 0),
	(51, 'chat-channel-1787384933006', 3572, 'owner', '2026-08-22 07:48:53', 0),
	(52, 'chat-channel-1787384933006', 3386, 'user', '2026-08-22 07:49:04', 0),
	(53, 'chat-channel-1787384933006', 3380, 'user', '2026-08-22 07:49:06', 0),
	(54, 'chat-channel-1787384933006', 3371, 'user', '2026-08-22 07:49:09', 0),
	(55, 'chat-1787394080204', 3572, 'owner', '2026-08-22 10:21:20', 0),
	(56, 'chat-1787394080204', 3593, 'user', '2026-08-22 10:21:20', 0);

-- Dumping structure for table messenger_db.system_audit_logs
CREATE TABLE IF NOT EXISTS `system_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `level` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.system_audit_logs: ~0 rows (approximately)

-- Dumping structure for table messenger_db.system_settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `registration_enabled` tinyint(1) DEFAULT '1',
  `login_enabled` tinyint(1) DEFAULT '1',
  `otp_enabled` tinyint(1) DEFAULT '1',
  `channels_enabled` tinyint(1) DEFAULT '1',
  `groups_enabled` tinyint(1) DEFAULT '1',
  `calls_enabled` tinyint(1) DEFAULT '0',
  `edit_message_enabled` tinyint(1) DEFAULT '1',
  `delete_message_enabled` tinyint(1) DEFAULT '1',
  `max_file_size_mb` int DEFAULT '25',
  `allowed_file_extensions` text COLLATE utf8mb4_unicode_ci,
  `push_policy` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'always',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.system_settings: ~0 rows (approximately)
INSERT INTO `system_settings` (`id`, `registration_enabled`, `login_enabled`, `otp_enabled`, `channels_enabled`, `groups_enabled`, `calls_enabled`, `edit_message_enabled`, `delete_message_enabled`, `max_file_size_mb`, `allowed_file_extensions`, `push_policy`) VALUES
	(1, 1, 1, 1, 1, 1, 0, 1, 1, 25, NULL, 'always');

-- Dumping structure for table messenger_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nationalCode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `personCode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'offline',
  `last_seen` datetime DEFAULT NULL,
  `role` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `is_banned` tinyint(1) DEFAULT '0',
  `is_muted` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `nationalCode` (`nationalCode`),
  UNIQUE KEY `personCode` (`personCode`)
) ENGINE=InnoDB AUTO_INCREMENT=3684 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.users: ~314 rows (approximately)
INSERT INTO `users` (`id`, `phone`, `nationalCode`, `personCode`, `first_name`, `last_name`, `display_name`, `avatar_url`, `status`, `last_seen`, `role`, `is_banned`, `is_muted`, `created_at`) VALUES
	(3370, '09131013762', '1289382050', '720804', 'مصطفی', 'ابراهیمی چمکاکائی', 'مصطفی ابراهیمی چمکاکائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3371, '09130789683', '5649241831', '720902', 'سید علی رضا', 'محمد زاده', 'سید علی رضا محمد زاده', '/uploads/ali-mohamadzadeh.jpg', 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3372, '09133061195', '0055588204', '730901', 'محمد', 'عسگری', 'محمد عسگری', '/uploads/mohamad-asgari.jpg', 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3373, '09131052758', '1286847796', '741001', 'مجتبی', 'حسینی تودشکی', 'مجتبی حسینی تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3374, '09132660147', '1290534888', '750206', 'سید روح اله', 'محمد زاده', 'سید روح اله محمد زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3375, '09132669717', '1288044951', '750703', 'حسین', 'بیطارپور', 'حسین بیطارپور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3376, '09366729779', '3256282121', '770701', 'افشین', 'متقی', 'افشین متقی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3377, '09131265356', '1287088481', '780102', 'مهدی', 'فقیهی', 'مهدی فقیهی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3378, '09365389693', '1288925107', '790201', 'جلال', 'هادی', 'جلال هادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3379, '09132655714', '1285833503', '790801', 'حمید', 'شیرانی', 'حمید شیرانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3380, '09131161615', '1280417463', '791101', 'شهاب الدین', 'بقولی زاده', 'شهاب الدین بقولی زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3381, '09132693519', '1288936745', '800303', 'حمید رضا', 'محقق', 'حمید رضا محقق', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3382, '09132183629', '1288111312', '800305', 'امین', 'اسمعیلی بوانی', 'امین اسمعیلی بوانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3383, '09138138170', '1261907175', '800306', 'مهدی', 'حمصی جزی', 'مهدی حمصی جزی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3384, '09130592292', '1291039791', '800501', 'علیرضا', 'گمنامان فرد', 'علیرضا گمنامان فرد', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3385, '09103001203', '1285841220', '800504', 'مرتضی', 'حسنی', 'مرتضی حسنی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3386, '09022464820', '1287103642', '800905', 'مهدی', 'یزدانی ادرمنابادی', 'مهدی یزدانی ادرمنابادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3387, '09132258727', '1249483190', '801008', 'حسن', 'قنبری نائینی', 'حسن قنبری نائینی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3388, '09133082604', '1289514569', '810402', 'مجتبی', 'باقری تودشکی', 'مجتبی باقری تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3389, '09133160805', '2991547529', '810403', 'آرش', 'احمدی', 'آرش احمدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3390, '09131298322', '1285997621', '810405', 'سعید', 'رجب زاده', 'سعید رجب زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3391, '09132085968', '6609853576', '810406', 'امید', 'نوربخش حبیب آبادی', 'امید نوربخش حبیب آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3392, '09137902864', '5659634524', '810601', 'مصطفی', 'مردانی تودشکی', 'مصطفی مردانی تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3393, '09103000649', '1281867586', '810701', 'عباس', 'صالحی', 'عباس صالحی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3394, '09132133175', '5659634621', '810801', 'مهدی', 'رضائی تودشکی', 'مهدی رضائی تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3395, '09136927791', '1286950228', '810901', 'حمیدرضا', 'رشیدی', 'حمیدرضا رشیدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3396, '09138778474', '1189891298', '811202', 'مهدی', 'اسماعیلی', 'مهدی اسماعیلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3397, '09132285495', '1283841487', '811203', 'حسن', 'بدیعی گورتی', 'حسن بدیعی گورتی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3398, '09138003392', '1291734465', '811204', 'محمد', 'دهقانی بهارانی', 'محمد دهقانی بهارانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3399, '09138299863', '5658935954', '811205', 'محسن', 'زینلی حسین ابادی', 'محسن زینلی حسین ابادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3400, '09135109719', '6309402961', '820101', 'یاسین', 'اسماعیل پور', 'یاسین اسماعیل پور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3401, '09138775390', '1291572554', '840201', 'حسین', 'نادری بنی', 'حسین نادری بنی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3402, '09132701265', '4284264532', '840303', 'اشرف خانم', 'حسنی', 'اشرف خانم حسنی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3403, '09131862153', '5659642251', '840114', 'عباس', 'حسینی تودشکی', 'عباس حسینی تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3404, '09132658099', '1281034495', '840401', 'محمد', 'اله یاری', 'محمد اله یاری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3405, '09131013897', '1290695768', '840402', 'سید مهدی', 'محمد زاده', 'سید مهدی محمد زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3406, '09131946488', '1287300642', '840501', 'امیر', 'اسماعیلی', 'امیر اسماعیلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3407, '09131135962', '1280310650', '841001', 'علی', 'بقولی زاده', 'علی بقولی زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3408, '09132128373', '1286106184', '841002', 'مجید', 'هادی مشکنانی', 'مجید هادی مشکنانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3409, '09131041428', '1285979001', '841101', 'مجید', 'همایونی نژاد', 'مجید همایونی نژاد', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3410, '09132128839', '5659623166', '850101', 'مصطفی', 'رنجبری کی جند ابه', 'مصطفی رنجبری کی جند ابه', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3411, '09133697244', '5659617001', '850601', 'جواد', 'قاسمی', 'جواد قاسمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3412, '09131161818', '1292184396', '851001', 'حسام الدین', 'بقولی زاده', 'حسام الدین بقولی زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3413, '09103144568', '1283946505', '860501', 'مریم', 'افتخاری', 'مریم افتخاری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3414, '09132115944', '1285099044', '860703', 'حمیدرضا', 'برقی کار', 'حمیدرضا برقی کار', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3415, '09138128289', '1283882851', '860704', 'محمدرضا', 'زمانیان خوراسگانی', 'محمدرضا زمانیان خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3416, '09134130095', '1159121192', '860804', 'غلامحسین', 'قائدی دهقی', 'غلامحسین قائدی دهقی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3417, '09131252236', '6219261941', '860806', 'نایب رضا', 'مومنی موگوئی', 'نایب رضا مومنی موگوئی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3418, '09139626780', '1284955397', '860807', 'مجتبی', 'بصیرنژاد', 'مجتبی بصیرنژاد', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3419, '09133654370', '5659905463', '860808', 'رضا', 'حسینی تودشکی', 'رضا حسینی تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3420, '09131943188', '4623218279', '860902', 'خدامراد', 'طاهری بارده', 'خدامراد طاهری بارده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3421, '09131001214', '1292377194', '861010', 'مجد الدین', 'بقولی زاده', 'مجد الدین بقولی زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3422, '09133151277', '1292157501', '861101', 'امین', 'بقولی زاده', 'امین بقولی زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3423, '09131057428', '1289737861', '861201', 'جواد', 'شفیعی', 'جواد شفیعی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3424, '09133865827', '1289451222', '861202', 'مجید', 'جعفری خسرو آبادی', 'مجید جعفری خسرو آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3425, '09132057648', '4623312593', '870704', 'محسن', 'محمدی چم جنگلی', 'محسن محمدی چم جنگلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3426, '09136431550', '1287418163', '870705', 'رسول', 'مظاهری', 'رسول مظاهری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3427, '09131888210', '1287033873', '870801', 'حسنعلی', 'قاسمی', 'حسنعلی قاسمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3428, '09923140151', '1292358858', '880302', 'سعید', 'برقی کار', 'سعید برقی کار', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3429, '09133659024', '1293150983', '880304', 'جواد', 'بابا صفری رنانی', 'جواد بابا صفری رنانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3430, '09131664563', '1292973412', '880306', 'مجید', 'نوروزی چم جنگلی', 'مجید نوروزی چم جنگلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3431, '09132882058', '1293309834', '880309', 'حجت', 'شبانی قهجاورستانی', 'حجت شبانی قهجاورستانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3432, '09131948265', '1293372587', '880403', 'جواد', 'یزدی', 'جواد یزدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3433, '09131264312', '1285085914', '880404', 'عباس', 'نصوحی', 'عباس نصوحی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3434, '09137731757', '1289591301', '880406', 'داود', 'نوروزی چم جنگلی', 'داود نوروزی چم جنگلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3435, '09136098387', '1285130901', '880503', 'محمد حسن', 'ره افروز', 'محمد حسن ره افروز', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3436, '09132803759', '4650472415', '880602', 'علیرضا', 'حمیدیان', 'علیرضا حمیدیان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3437, '09139106008', '1293315801', '880604', 'حجت اله', 'سیاوشی', 'حجت اله سیاوشی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3438, '09133081153', '1285053532', '880606', 'سیدمحمدمهدی', 'سیدمعلمی', 'سیدمحمدمهدی سیدمعلمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3439, '09131079688', '1270921551', '880609', 'مجتبی', 'کوچکیان', 'مجتبی کوچکیان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3440, '09361628595', '1292229411', '880905', 'محسن', 'رضائی دهقی', 'محسن رضائی دهقی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3441, '09103984728', '1270164678', '880811', 'سیدمحمدرضا', 'تقوی', 'سیدمحمدرضا تقوی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3442, '09139251601', '4623544885', '880815', 'مهدی', 'مردانی', 'مهدی مردانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3443, '09138641520', '1282837400', '880816', 'محمود', 'نوروزی چم جنگلی', 'محمود نوروزی چم جنگلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3444, '09136846468', '5759927523', '880819', 'اسماعیل', 'متولیان', 'اسماعیل متولیان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3445, '09130828977', '1129944956', '880821', 'مجید', 'بهرامی', 'مجید بهرامی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3446, '09139258038', '1292517387', '890904', 'عباسعلی', 'نوروزی آبادشاپوری', 'عباسعلی نوروزی آبادشاپوری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3447, '09124224048', '3090843242', '890907', 'علی', 'رنجبری ترکمانی', 'علی رنجبری ترکمانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3448, '09359446646', '4679807512', '891004', 'امین', 'هلاکوئی', 'امین هلاکوئی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3449, '09222710316', '1120026652', '900101', 'محسن', 'یسلیانی', 'محسن یسلیانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3450, '09138729391', '1271018993', '900104', 'رضا', 'نوری', 'رضا نوری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3451, '09138700612', '1289637024', '900108', 'ابراهیم', 'لیموچی ولی', 'ابراهیم لیموچی ولی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3452, '09331753159', '2411575394', '900201', 'بهروز', 'ملکی محمدآبادی', 'بهروز ملکی محمدآبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3453, '09135347263', '1270198335', '900301', 'ابراهیم', 'شفیعی طهمورساتی', 'ابراهیم شفیعی طهمورساتی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3454, '09132173596', '1141215357', '900405', 'جواد', 'زاولانه', 'جواد زاولانه', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3455, '09939114298', '1292126051', '901201', 'رضا', 'ردانی پور', 'رضا ردانی پور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3456, '09330303024', '1287167063', '901202', 'احمد رضا', 'علی خاصی', 'احمد رضا علی خاصی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3457, '09138192653', '1292485906', '901203', 'رضا', 'خودسیانی', 'رضا خودسیانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3458, '09135358531', '1270055410', '901209', 'علیرضا', 'قدمی خوراسگانی', 'علیرضا قدمی خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3459, '09138293585', '1291608257', '891101', 'منصور', 'فروغی ابری', 'منصور فروغی ابری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3460, '09135641577', '3501094558', '900412', 'حسین', 'شهسواری علویجه', 'حسین شهسواری علویجه', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3461, '09378046595', '1293323446', '900414', 'رضا', 'شفیعی', 'رضا شفیعی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3462, '09138193219', '1270340638', '900501', 'محسن', 'عباسی محمدآبادی', 'محسن عباسی محمدآبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3463, '09137103620', '1292328592', '900703', 'احمد', 'توکلی', 'احمد توکلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3464, '09133889931', '1270153064', '900802', 'جواد', 'رستمی دهقی', 'جواد رستمی دهقی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3465, '09133275274', '1290640874', '900803', 'محمد آرمین', 'صالحی', 'محمد آرمین صالحی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3466, '09138046257', '1129782352', '900903', 'علی', 'یبلوئی', 'علی یبلوئی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3467, '09136003363', '1293417467', '900905', 'مجتبی', 'طالبی محمد آبادی', 'مجتبی طالبی محمد آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3468, '09103014151', '1285170954', '900909', 'محمد امین', 'عطائی', 'محمد امین عطائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3469, '09133880466', '1291617361', '901001', 'علی', 'محمد باقری', 'علی محمد باقری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3470, '09132058029', '1270307185', '901004', 'سهراب', 'قربانی', 'سهراب قربانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3471, '09366233621', '1120024358', '910101', 'حمید', 'هاشمی', 'حمید هاشمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3472, '09133678526', '1290935904', '910102', 'خدابخش', 'آهنگری', 'خدابخش آهنگری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3473, '09132061599', '1130021564', '910107', 'رسول', 'سلحشور', 'رسول سلحشور', '/uploads/14-34-16-401726.jpg', 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3474, '09913946535', '1293301434', '910108', 'سعید', 'مهر پرور', 'سعید مهر پرور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3475, '09132056534', '5110312151', '910201', 'اسماعیل', 'امیری', 'اسماعیل امیری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3476, '09131940560', '1292236681', '910302', 'فرهاد', 'قاسمی', 'فرهاد قاسمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3477, '09138786402', '1249980771', '910303', 'رسول', 'عبدالهی', 'رسول عبدالهی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3478, '09131055651', '5659406262', '920202', 'مهدی', 'شفیعی', 'مهدی شفیعی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3479, '09103143102', '1270893041', '920213', 'میلاد', 'بنکدارپور', 'میلاد بنکدارپور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3480, '09132249576', '1129935361', '920303', 'مهدی', 'خداپرست دهسوری', 'مهدی خداپرست دهسوری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3481, '09139200636', '1199974201', '920307', 'مجید', 'مرادزاده', 'مجید مرادزاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3482, '09137129641', '6210001602', '920310', 'علیرضا', 'مهدوری ازناوله', 'علیرضا مهدوری ازناوله', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3483, '09138091037', '1292459859', '920706', 'قدرت اله', 'شفیعی', 'قدرت اله شفیعی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3484, '09136958587', '1289247390', '920709', 'مهدی', 'قنبری', 'مهدی قنبری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3485, '09137414374', '6210022308', '920719', 'امین', 'باقری', 'امین باقری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3486, '09137126978', '1128993503', '920804', 'سید مجید', 'باقری', 'سید مجید باقری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3487, '09139647283', '5759919921', '921102', 'جواد', 'عروجی', 'جواد عروجی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3488, '09131056896', '1270651137', '930401', 'حمید', 'سلمانی محمد آبادی', 'حمید سلمانی محمد آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3489, '09133689212', '1270375407', '930406', 'مهرداد', 'حیدری', 'مهرداد حیدری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3490, '09137978122', '1270787901', '930507', 'باقر', 'باقری', 'باقر باقری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3491, '09136944606', '1271170094', '930509', 'سید ابوالفضل', 'حسینی نژاد خوراسگانی', 'سید ابوالفضل حسینی نژاد خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3492, '09131011469', '1270637381', '930511', 'محمد', 'آقا نوری محمد آبادی', 'محمد آقا نوری محمد آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3493, '09139293564', '1270691864', '930603', 'قاسم', 'بهرامی', 'قاسم بهرامی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3494, '09136904434', '1270247123', '930620', 'احمد', 'خلیلی', 'احمد خلیلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3495, '09139272087', '1271155631', '930707', 'حامد', 'محمدی ننادگانی', 'حامد محمدی ننادگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3496, '09138111353', '5650068828', '930810', 'حمیدرضا', 'توسلی کفرانی', 'حمیدرضا توسلی کفرانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3497, '09139021762', '1270536206', '930908', 'حمید', 'عباسی محمد آبادی', 'حمید عباسی محمد آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3498, '09139086169', '1570012695', '930911', 'حیدر', 'جلیل پور', 'حیدر جلیل پور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3499, '09133092458', '1199849685', '930916', 'علی', 'خضری', 'علی خضری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3500, '09133285715', '1292547723', '930918', 'احسان', 'برخوردار', 'احسان برخوردار', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3501, '09131344176', '4323275897', '125031', 'علیرضا', 'جعفری تهرانی', 'علیرضا جعفری تهرانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3502, '09137210994', '4623361667', '931005', 'امین', 'مظاهری چم جنگلی', 'امین مظاهری چم جنگلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3503, '09136035868', '6219944631', '931007', 'داود', 'نوری', 'داود نوری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3504, '09138075520', '1240034636', '931008', 'محمد', 'ورپایی', 'محمد ورپایی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3505, '09369708653', '1271578522', '940209', 'محمد', 'اسماعیل خانیان', 'محمد اسماعیل خانیان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3506, '09139266905', '1293028878', '940206', 'سعید', 'قاراخانی ده سرخی', 'سعید قاراخانی ده سرخی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3507, '09133000984', '1271057387', '950501', 'مهدی', 'پاکروان لنبانی', 'مهدی پاکروان لنبانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3508, '09308940552', '1280343151', '861204', 'مهرداد', 'بقولی زاده', 'مهرداد بقولی زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3509, '09131160295', '5649617287', '125015', 'حسنعلی', 'بختیار نصرآبادی', 'حسنعلی بختیار نصرآبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3510, '09132707783', '1292060069', '940701', 'مهدی', 'عباد', 'مهدی عباد', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3511, '09999999999', '1280323574', '125005', 'بابک', 'کیانی', 'بابک کیانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3512, '09131250438', '1280992328', '125047', 'سیدمصطفی', 'مدرسی', 'سیدمصطفی مدرسی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3513, '09131257662', '1270664761', '950322', 'مجتبی', 'ابراهیمی', 'مجتبی ابراهیمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3514, '09389594666', '1292367393', '950606', 'میلاد', 'حسین خانی سیلاخور', 'میلاد حسین خانی سیلاخور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3515, '09135710450', '1240036558', '951117', 'حامد', 'مختاری کجانی', 'حامد مختاری کجانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3516, '09131869593', '1271610140', '960209', 'محمدحسن', 'بقولی زاده', 'محمدحسن بقولی زاده', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3517, '09138965154', '5659908004', '960212', 'مهرشاد', 'یوسفی تودشکی', 'مهرشاد یوسفی تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3518, '09131291731', '1292392967', '961009', 'مهرداد', 'فراست پور', 'مهرداد فراست پور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3519, '09132840996', '4621722700', '980304', 'ایمان', 'کبیری', 'ایمان کبیری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3520, '09362292699', '0084641691', '980401', 'مهران', 'زارعی', 'مهران زارعی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3521, '09138037705', '1740846907', '980916', 'مرتضی', 'بهادرانی هفشجانی', 'مرتضی بهادرانی هفشجانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3522, '09134359729', '1271841800', '980911', 'مهرداد', 'اکبری جوجی', 'مهرداد اکبری جوجی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3523, '09332466572', '1270409514', '980913', 'محمدمهدی', 'ناظمی', 'محمدمهدی ناظمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3524, '09131696301', '1287249361', '981002', 'یوسف', 'رضوانی', 'یوسف رضوانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3525, '09103462106', '1271580251', '981003', 'حمیدرضا', 'قضاوی', 'حمیدرضا قضاوی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3526, '09132025405', '1292519886', '990305', 'اکبر', 'آرین راد', 'اکبر آرین راد', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3527, '09135422239', '1271780623', '990321', 'احمد', 'قائد امینی هارونی', 'احمد قائد امینی هارونی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3528, '09138696439', '1271443457', '990301', 'سید محمدرضا', 'حسنی چقائی', 'سید محمدرضا حسنی چقائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3529, '09136843211', '1190134357', '990223', 'پژمان', 'عمرانپور', 'پژمان عمرانپور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3530, '09397289249', '1272027694', '990226', 'امیر', 'ملکوتی خواه', 'امیر ملکوتی خواه', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3531, '09133283514', '1270764561', '920305', 'جعفر', 'خزاعی خوراسگانی', 'جعفر خزاعی خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3532, '09162891123', '1270743678', '990319', 'مصطفی', 'شفیعی', 'مصطفی شفیعی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3533, '09308136839', '1272910431', '990309', 'حسین', 'جمالیان کیانی', 'حسین جمالیان کیانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3534, '09372605503', '5650089523', '990324', 'پویا', 'ملکی محمدآبادی', 'پویا ملکی محمدآبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3535, '09162831935', '1271862875', '990224', 'احسان', 'شفیعی', 'احسان شفیعی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3536, '09133379525', '1240054548', '990333', 'مهدی', 'راحتی بلاباد', 'مهدی راحتی بلاباد', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3537, '09136571889', '1270496573', '990402', 'محمدحسن', 'داستانپور', 'محمدحسن داستانپور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3538, '09130362649', '4610637839', '990403', 'محمد', 'رمضانی کتکی', 'محمد رمضانی کتکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3539, '09138884897', '1249981514', '990424', 'علی', 'ورپائی', 'علی ورپائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3540, '09103248145', '5650067511', '990407', 'امیرمحمد', 'صادقی طهمورساتی', 'امیرمحمد صادقی طهمورساتی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3541, '09132047929', '6219937181', '990414', 'وحید', 'شیرزادی', 'وحید شیرزادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3542, '09136961546', '1270098731', '990429', 'محمدعلی', 'ولی زاده خانه سر', 'محمدعلی ولی زاده خانه سر', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3543, '09333103254', '5650021600', '990404', 'محمد', 'صفری مارچه', 'محمد صفری مارچه', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3544, '09138142188', '1270704966', '990522', 'بهروز', 'احمدی فیروزآبادی', 'بهروز احمدی فیروزآبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3545, '09397257374', '1271469146', '990511', 'محسن', 'بیاضی', 'محسن بیاضی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3546, '09137963983', '1272942104', '990504', 'میثم', 'قاسمی', 'میثم قاسمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3547, '09136476316', '1272982149', '990502', 'میلاد', 'معصومی', 'میلاد معصومی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3548, '09918562589', '1293353329', '990519', 'سجاد', 'شریف پور', 'سجاد شریف پور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3549, '09137994177', '1293307971', '990529', 'محمود', 'عاشقی قلعه شاهرخی', 'محمود عاشقی قلعه شاهرخی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3550, '09136936953', '1270874251', '990606', 'سعید', 'عباسی خیادانی', 'سعید عباسی خیادانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3551, '09138092903', '5750042871', '990611', 'سید حسن', 'موسوی گشنیزجانی', 'سید حسن موسوی گشنیزجانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3552, '09928306822', '1271607573', '990604', 'محسن', 'کوچکی زفره', 'محسن کوچکی زفره', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3553, '09363754832', '1271903105', '990602', 'محمد', 'بدیعی', 'محمد بدیعی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3554, '09916057033', '1272181529', '990608', 'امیرحسین', 'محمدی', 'امیرحسین محمدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3555, '09134089207', '1271636662', '990605', 'سیدعلی', 'حسینی نژاد خوراسگانی', 'سیدعلی حسینی نژاد خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3556, '09134131288', '1293360015', '990607', 'بهزاد', 'بلالی', 'بهزاد بلالی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3557, '09368449665', '1272857123', '990721', 'علی', 'میرزائی', 'علی میرزائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3558, '09034264983', '5650037434', '991111', 'سعید', 'رمضان نائینی', 'سعید رمضان نائینی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3559, '09120997535', '1271043793', '400130', 'حمیدرضا', 'یزدانی', 'حمیدرضا یزدانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3560, '09135426438', '1120078512', '400212', 'فرزاد', 'کشوری', 'فرزاد کشوری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3561, '09397548982', '1272593576', '400208', 'حجت', 'قاسمی تودشکی', 'حجت قاسمی تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3562, '09137855673', '5650072884', '400131', 'محمدرضا', 'باقری', 'محمدرضا باقری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3563, '09138088122', '1189969394', '400218', 'قاسم', 'باقری', 'قاسم باقری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3564, '09137169071', '1120068843', '400219', 'محمد', 'خودسیانی', 'محمد خودسیانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3565, '09360501397', '1271958848', '400228', 'علی', 'سعادتی اسکندری', 'علی سعادتی اسکندری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3566, '09136092597', '1200213221', '400223', 'مرتضی', 'افشاری', 'مرتضی افشاری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3567, '09139331462', '6209939090', '400419', 'محمدعلی', 'بورونی کوپائی', 'محمدعلی بورونی کوپائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3568, '09132703502', '1271599562', '400620', 'سیدآروین', 'ابطحی', 'سیدآروین ابطحی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3569, '09139288603', '1271414007', '400709', 'رضا', 'آقاعلیان دستجردی', 'رضا آقاعلیان دستجردی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3570, '09134245842', '1270717987', '400711', 'امیرحسین', 'کریم ارجی خوراسگانی', 'امیرحسین کریم ارجی خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3571, '09135501638', '1130042634', '400708', 'علی', 'شیخیان بابوکانی', 'علی شیخیان بابوکانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3572, '09135345636', '1120019699', '400701', 'سید محمود', 'باقری', 'سید محمود باقری', '/uploads/1787119722595_79_avatar_3572.jpeg', 'online', '2026-08-22 14:07:00', 'admin', 0, 0, '2026-08-19 09:33:13'),
	(3573, '09389890196', '0410103616', '400724', 'احسان', 'سعادت', 'احسان سعادت', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3574, '09921928037', '1270609882', '400725', 'عباس', 'سعادت سعادت آبادی', 'عباس سعادت سعادت آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3575, '09132088600', '4623544230', '400906', 'سید محمدرضا', 'درخشنده قهفرخی', 'سید محمدرضا درخشنده قهفرخی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3576, '09923549851', '5750101061', '400904', 'علی', 'قاسمی', 'علی قاسمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3577, '09137165548', '6219944704', '400929', 'علی', 'عبداللهی', 'علی عبداللهی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3578, '09135569280', '1272510913', '400103', 'حسین', 'فاتحی پیکانی', 'حسین فاتحی پیکانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3579, '09134732257', '1271963949', '400111', 'رامین', 'حسین پناه اصفهانی', 'رامین حسین پناه اصفهانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3580, '09133669734', '1270618547', '401014', 'احمدرضا', 'شجاعی جشوقانی', 'احمدرضا شجاعی جشوقانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3581, '09136923313', '5650066647', '401016', 'علی', 'قاسمی تودشکی', 'علی قاسمی تودشکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3582, '09371867997', '1272610241', '401312', 'داود', 'امانی بنی', 'داود امانی بنی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3583, '09137406671', '1200091361', '401304', 'عباس', 'فانوسی', 'عباس فانوسی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3584, '09136860784', '1292264101', '401311', 'سعید', 'یادگار اصفهانی', 'سعید یادگار اصفهانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3585, '09165714265', '1130380491', '401310', 'محمد', 'کشوری', 'محمد کشوری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3586, '09199135620', '1271601257', '401414', 'محمدعلی', 'داروغه دفتر', 'محمدعلی داروغه دفتر', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3587, '09913889728', '1220064701', '401403', 'اسماعیل', 'اسدی قفری', 'اسماعیل اسدی قفری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3588, '09372511826', '1271502453', '401418', 'سعید', 'رضائی آدریان', 'سعید رضائی آدریان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3589, '09364507049', '1270337300', '401423', 'محمدرضا', 'فاتحی', 'محمدرضا فاتحی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3590, '09136431480', '1271885166', '401422', 'بهنام', 'آذرخش', 'بهنام آذرخش', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3591, '09133895363', '1286111447', '401501', 'مهدی', 'مهرآفرید', 'مهدی مهرآفرید', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3592, '09140280176', '1278034307', '401602', 'محمد', 'همدانی نیا', 'محمد همدانی نیا', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3593, '09139267634', '1288331789', '401905', 'حسین', 'کاظمیان', 'حسین کاظمیان', NULL, 'online', '2026-08-22 14:07:00', 'user', 0, 0, '2026-08-19 09:33:13'),
	(3594, '09103616296', '1273409450', '401924', 'احمدرضا', 'رحیمی', 'احمدرضا رحیمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3595, '09162039067', '1120096847', '401927', 'حسن', 'سوادکوهی', 'حسن سوادکوهی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3596, '09020241765', '1273559053', '401108', 'محمد', 'حیدریان خوراسگانی', 'محمد حیدریان خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3597, '09027644104', '1120168864', '401124', 'سید محمد', 'حبیبی', 'سید محمد حبیبی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3598, '09917327717', '1273308840', '401121', 'علیرضا', 'قدیری قهجاورستانی', 'علیرضا قدیری قهجاورستانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3599, '09139262741', '1288275943', '401144', 'روح اله', 'موذنی', 'روح اله موذنی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3600, '09355769006', '1272828646', '402101', 'امیرارسلان', 'یوسفی ظفرقندی', 'امیرارسلان یوسفی ظفرقندی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3601, '09213288091', '1272221741', '401408', 'پیمان', 'مسعودی', 'پیمان مسعودی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3602, '09162612403', '1271742624', '402224', 'مسعود', 'حیدریان خوراسگانی', 'مسعود حیدریان خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3603, '09139280843', '5759938606', '402216', 'ناصر', 'رضائی', 'ناصر رضائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3604, '09138347486', '5750024725', '402208', 'علی', 'رضائی', 'علی رضائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3605, '09139013848', '1270698427', '402204', 'مهرداد', 'طالبی', 'مهرداد طالبی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3606, '09136402878', '1273248090', '402130', 'علیرضا', 'مساحیان خوراسگانی', 'علیرضا مساحیان خوراسگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3607, '09162651675', '1190234602', '402116', 'فرید', 'قره خانی', 'فرید قره خانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3608, '09162316375', '1080307575', '402126', 'اسماعیل', 'رضائی خیرآبادی', 'اسماعیل رضائی خیرآبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3609, '09139020697', '5129980859', '402115', 'محمد', 'جانقربان لاریچه', 'محمد جانقربان لاریچه', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3610, '09130674292', '1273592581', '402206', 'محمد', 'بهرامی کرچی', 'محمد بهرامی کرچی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3611, '09371868997', '1120162701', '402217', 'سید علی', 'طهماسبی', 'سید علی طهماسبی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3612, '09133654264', '5659919340', '402218', 'رسول', 'مطیع جشوقانی', 'رسول مطیع جشوقانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3613, '09168887466', '1272451054', '402225', 'محمد', 'صادقی قهساره', 'محمد صادقی قهساره', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3614, '09139014035', '5659911692', '402307', 'حامد', 'حسنی سجزی', 'حامد حسنی سجزی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3615, '09138008037', '1273051416', '402514', 'عماد', 'سلیمانی', 'عماد سلیمانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3616, '09130912556', '5650039305', '402501', 'محمدرضا', 'توسلی کفرانی', 'محمدرضا توسلی کفرانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3617, '09136483476', '1272044165', '402702', 'محمدرضا', 'صدیقی مورنانی', 'محمدرضا صدیقی مورنانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3618, '09133095818', '1284892239', '402701', 'بهروز', 'صیادی نیا', 'بهروز صیادی نیا', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3619, '09133182242', '1289020841', '402703', 'آرمین', 'ابطحی', 'آرمین ابطحی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3620, '09305679347', '1870583310', '402801', 'محمد', 'پور منجزی', 'محمد پور منجزی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3621, '09106538223', '1270237306', '402813', 'مصطفی', 'نصری فروشانی', 'مصطفی نصری فروشانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3622, '09133292600', '1291539964', '402903', 'محمد', 'فروغی ابری', 'محمد فروغی ابری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3623, '09903329634', '1293225169', '402901', 'رشید', 'قاسمی', 'رشید قاسمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3624, '09139176754', '1287328644', '402106', 'هادی', 'هرندی جبلی', 'هادی هرندی جبلی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3625, '09131012441', '1284811549', '402108', 'مسعود', 'جمشیدی', 'مسعود جمشیدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3626, '09140376914', '1190306451', '402145', 'محمد جواد', 'عبدالهی', 'محمد جواد عبدالهی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3627, '09138578117', '1272945774', '402110', 'مهدی', 'منصوری شریف آبادی', 'مهدی منصوری شریف آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3628, '09227558494', '1272424731', '402113', 'احسان', 'نجار', 'احسان نجار', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3629, '09135450974', '1287254632', '402150', 'سید مصطفی', 'پهلوانی نژاد خوابجانی', 'سید مصطفی پهلوانی نژاد خوابجانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3630, '09131660242', '1291540741', '402146', 'سعید', 'زارعی اندوانی', 'سعید زارعی اندوانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3631, '09397655750', '1272577899', '402148', 'مجید', 'زاهدی', 'مجید زاهدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3632, '09138781791', '1159170495', '402151', 'روح اله', 'نصیری بابادگانی', 'روح اله نصیری بابادگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3633, '09900604057', '4210313009', '403210', 'مصطفی', 'یاراحمدی', 'مصطفی یاراحمدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3634, '09133863947', '1288198663', '403211', 'ناصر', 'جعفری کوپائی', 'ناصر جعفری کوپائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3635, '09134807146', '6210026206', '403131', 'وحید', 'ماندنی میر آبادی', 'وحید ماندنی میر آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3636, '09102006129', '0079755879', '403130', 'حسین', 'رستمی نصر آبادی', 'حسین رستمی نصر آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3637, '09391691508', '1249957494', '403119', 'مجتبی', 'صادقی', 'مجتبی صادقی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3638, '09130199771', '1273588681', '403124', 'مهدی', 'بهجت آبادی', 'مهدی بهجت آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3639, '09134107924', '1140186914', '403301', 'غلامرضا', 'صادقی خوزانی', 'غلامرضا صادقی خوزانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3640, '09357982602', '1282454595', '403319', 'مرتضی', 'قاسمی', 'مرتضی قاسمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3641, '09165715584', '1272198006', '403401', 'حسین', 'بوجار اصفهانی', 'حسین بوجار اصفهانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3642, '09137421800', '1273571207', '403515', 'سعید', 'امیری ماربینی', 'سعید امیری ماربینی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3643, '09137907300', '1292075120', '403506', 'ایمان', 'سلطانیان', 'ایمان سلطانیان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3644, '09133860731', '2360251147', '403501', 'نریمان', 'فخاری', 'نریمان فخاری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3645, '09135667097', '1120128358', '403419', 'مرتضی', 'آریایی', 'مرتضی آریایی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3646, '09132692966', '1283947900', '403420', 'داود', 'قاسمی اورگانی', 'داود قاسمی اورگانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3647, '09136937025', '1293450405', '403216', 'سید مسیب', 'هاشمی', 'سید مسیب هاشمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3648, '09133701002', '1270400304', '403527', 'ایمان', 'آیتی سجزی', 'ایمان آیتی سجزی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3649, '09376928488', '1272455491', '403623', 'امیر حسین', 'حق شناس', 'امیر حسین حق شناس', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3650, '09936999225', '1273091159', '403627', 'سجاد', 'کریمی حسن آبادی', 'سجاد کریمی حسن آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3651, '09132121707', '1292398851', '403625', 'امیر', 'شاه میرزائی جشوقانی', 'امیر شاه میرزائی جشوقانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3652, '09139607119', '1271465140', '403706', 'سعید', 'کیانی ابری', 'سعید کیانی ابری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3653, '09059057536', '1274223466', '403704', 'ابوالفضل', 'کریمی', 'ابوالفضل کریمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3654, '09399282814', '4610932814', '403816', 'مهدی', 'فتاحی وانانی', 'مهدی فتاحی وانانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3655, '09138055166', '1272717798', '403821', 'حسین', 'پورقناد', 'حسین پورقناد', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3656, '09130965469', '1273737946', '401301', 'یونس', 'سلیمانی مجد', 'یونس سلیمانی مجد', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3657, '09138321920', '1080232966', '403920', 'سید سعید', 'فریدون نژاد گل سفیدی', 'سید سعید فریدون نژاد گل سفیدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3658, '09138002649', '1281916439', '403918', 'عباسعلی', 'صادقی', 'عباسعلی صادقی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3659, '09130004653', '1290654328', '403926', 'حمید', 'مارانی', 'حمید مارانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3660, '09137188797', '1120010896', '403010', 'ابراهیم', 'جوادی خمسلوئی', 'ابراهیم جوادی خمسلوئی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3661, '09333100109', '1290621039', '403021', 'سید پژمان', 'غفاریان', 'سید پژمان غفاریان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3662, '09929536361', '1272443639', '403015', 'محمد', 'برق پیما', 'محمد برق پیما', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3663, '09037370913', '1272518825', '404201', 'مهدی', 'کیخائی', 'مهدی کیخائی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3664, '09138057585', '1271019205', '404127', 'محسن', 'غفارپناه', 'محسن غفارپناه', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3665, '09130567004', '1272459624', '404123', 'محمد حسین', 'باقری نهوجی', 'محمد حسین باقری نهوجی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3666, '09139890284', '1160074178', '404128', 'محسن', 'کریمیان کاکلکی', 'محسن کریمیان کاکلکی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3667, '09136960960', '1281790710', '404203', 'سعیدرضا', 'خرمیان اصفهانی', 'سعیدرضا خرمیان اصفهانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3668, '09133663735', '1290717478', '404117', 'حسن', 'زارعی قهجاورستانی', 'حسن زارعی قهجاورستانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3669, '09900801099', '1270625101', '404118', 'محمدحسین', 'آقاداودی', 'محمدحسین آقاداودی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3670, '09936938007', '1274043921', '404511', 'سعید', 'نصراصفهانی', 'سعید نصراصفهانی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3671, '09130882848', '3591346519', '404518', 'رضوان', 'شهکرم زهی', 'رضوان شهکرم زهی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3672, '09135564682', '1270889346', '404525', 'حامد', 'محمدیان کرویه', 'حامد محمدیان کرویه', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3673, '09026987001', '1273548191', '404711', 'مهدی', 'صادقی', 'مهدی صادقی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3674, '09012034354', '4210527221', '404714', 'مجتبی', 'یاراحمدی', 'مجتبی یاراحمدی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3675, '09198240811', '1293475297', '404705', 'محمد', 'پویان', 'محمد پویان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3676, '09134436014', '1273776781', '404216', 'احسان', 'حسین پور', 'احسان حسین پور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3677, '09907935704', '1274731976', '404729', 'سید عباس', 'هاشمی', 'سید عباس هاشمی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:13'),
	(3678, '09139654597', '1273615972', '404725', 'محمدحسین', 'فروغی ابری', 'محمدحسین فروغی ابری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:14'),
	(3679, '09922302994', '1273561066', '404810', 'مهرشاد', 'تقیان', 'مهرشاد تقیان', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:14'),
	(3680, '09137177231', '1274133769', '404918', 'علی', 'رئیسی اسدآبادی', 'علی رئیسی اسدآبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:14'),
	(3681, '09133884255', '1281880450', '860401', 'سید ابوالفضل', 'شیخانی شمس آبادی', 'سید ابوالفضل شیخانی شمس آبادی', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:14'),
	(3682, '09132666072', '5100116935', '405124', 'فائقه', 'حاتم پور', 'فائقه حاتم پور', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:14'),
	(3683, '09131697560', '1189969971', '405401', 'جواد', 'عامری', 'جواد عامری', NULL, 'offline', NULL, 'user', 0, 0, '2026-08-19 09:33:14');

-- Dumping structure for table messenger_db.user_sessions
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_active` datetime DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table messenger_db.user_sessions: ~0 rows (approximately)

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
