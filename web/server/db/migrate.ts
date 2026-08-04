import fs from "fs";
import path from "path";

console.log("=========================================");
console.log("🚀 Running Database Migrations...");
console.log("=========================================");

export const MIGRATION_SQL = `
-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  username VARCHAR(64) NOT NULL UNIQUE,
  first_name VARCHAR(128),
  last_name VARCHAR(128),
  display_name VARCHAR(256) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  status VARCHAR(20) DEFAULT 'offline',
  last_seen VARCHAR(64),
  role VARCHAR(32) DEFAULT 'user',
  is_banned BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  device_name VARCHAR(256),
  ip_address VARCHAR(64),
  browser VARCHAR(128),
  last_active VARCHAR(64),
  is_current BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: contacts
CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  contact_user_id VARCHAR(64) NOT NULL,
  custom_name VARCHAR(256),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: rooms_groups_channels
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(32) NOT NULL, -- 'direct' | 'group' | 'channel'
  title VARCHAR(256) NOT NULL,
  username VARCHAR(64) UNIQUE,
  avatar_url TEXT,
  description TEXT,
  invite_link VARCHAR(256),
  is_private BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  unread_count INT DEFAULT 0,
  member_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: room_members
CREATE TABLE IF NOT EXISTS room_members (
  id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) DEFAULT 'user',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_muted BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  chat_id VARCHAR(64) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) DEFAULT 'text',
  content TEXT,
  status VARCHAR(32) DEFAULT 'sent',
  is_pinned BOOLEAN DEFAULT FALSE,
  reply_to_id VARCHAR(64),
  forward_from_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: attachments
CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64),
  file_name VARCHAR(256) NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INT NOT NULL,
  type VARCHAR(32) NOT NULL,
  duration_seconds INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Table: forbidden_words
CREATE TABLE IF NOT EXISTS forbidden_words (
  id VARCHAR(64) PRIMARY KEY,
  word VARCHAR(128) NOT NULL UNIQUE,
  category VARCHAR(64) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: sms_settings
CREATE TABLE IF NOT EXISTS sms_settings (
  id VARCHAR(64) PRIMARY KEY,
  provider_id VARCHAR(64) NOT NULL,
  api_key TEXT,
  sender_number VARCHAR(64),
  pattern_code VARCHAR(64),
  is_enabled BOOLEAN DEFAULT TRUE
);

-- Table: push_settings
CREATE TABLE IF NOT EXISTS push_settings (
  id VARCHAR(64) PRIMARY KEY,
  vapid_public_key TEXT,
  vapid_private_key TEXT,
  is_enabled BOOLEAN DEFAULT TRUE
);

-- Table: system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  registration_enabled BOOLEAN DEFAULT TRUE,
  login_enabled BOOLEAN DEFAULT TRUE,
  otp_enabled BOOLEAN DEFAULT TRUE,
  channels_enabled BOOLEAN DEFAULT TRUE,
  groups_enabled BOOLEAN DEFAULT TRUE,
  calls_enabled BOOLEAN DEFAULT FALSE,
  edit_message_enabled BOOLEAN DEFAULT TRUE,
  delete_message_enabled BOOLEAN DEFAULT TRUE,
  max_file_size_mb INT DEFAULT 25,
  allowed_file_extensions TEXT
);

-- Table: system_audit_logs
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_name VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  details TEXT,
  level VARCHAR(32) DEFAULT 'info',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: message_seens (Dedicated Message Read Receipt Table)
CREATE TABLE IF NOT EXISTS message_seens (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  room_id VARCHAR(64) NOT NULL,
  seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT unique_message_user_seen UNIQUE (message_id, user_id)
);

-- Table: message_reactions (Dedicated Message Reaction Table)
CREATE TABLE IF NOT EXISTS message_reactions (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  emoji VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_message_user_emoji UNIQUE (message_id, user_id, emoji)
);
`;

async function runMigration() {
  try {
    const dbDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const schemaFile = path.join(dbDir, "schema.sql");
    fs.writeFileSync(schemaFile, MIGRATION_SQL, "utf-8");
    console.log("✅ Database schema migrated successfully!");
    console.log("📁 Migration SQL saved to:", schemaFile);
    console.log("=========================================");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
