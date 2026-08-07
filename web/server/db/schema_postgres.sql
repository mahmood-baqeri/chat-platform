-- PostgreSQL Database Schema for Messenger Platform

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(32) NOT NULL UNIQUE,
  username VARCHAR(64) NOT NULL UNIQUE,
  first_name VARCHAR(128),
  last_name VARCHAR(128),
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  status VARCHAR(32) DEFAULT 'offline',
  last_seen TIMESTAMP,
  role VARCHAR(32) DEFAULT 'user',
  is_banned INTEGER DEFAULT 0,
  is_muted INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(255),
  ip_address VARCHAR(64),
  browser VARCHAR(255),
  last_active TIMESTAMP,
  is_current INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  username VARCHAR(64) UNIQUE,
  avatar_url TEXT,
  description TEXT,
  invite_link VARCHAR(255),
  is_private INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  owner_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_members (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) DEFAULT 'user',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_muted INTEGER DEFAULT 0,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(32) DEFAULT 'text',
  content TEXT,
  status VARCHAR(32) DEFAULT 'sent',
  is_pinned INTEGER DEFAULT 0,
  reply_to_id INTEGER,
  forward_from_id INTEGER,
  attachments TEXT,
  forwarded_from TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_seens (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS forbidden_words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(128) NOT NULL UNIQUE,
  category VARCHAR(64) NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_settings (
  id SERIAL PRIMARY KEY,
  vapid_public_key TEXT,
  vapid_private_key TEXT,
  is_enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  subscription_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  registration_enabled INTEGER DEFAULT 1,
  login_enabled INTEGER DEFAULT 1,
  otp_enabled INTEGER DEFAULT 1,
  channels_enabled INTEGER DEFAULT 1,
  groups_enabled INTEGER DEFAULT 1,
  calls_enabled INTEGER DEFAULT 0,
  edit_message_enabled INTEGER DEFAULT 1,
  delete_message_enabled INTEGER DEFAULT 1,
  max_file_size_mb INTEGER DEFAULT 25,
  allowed_file_extensions TEXT,
  push_policy VARCHAR(64) DEFAULT 'always'
);

CREATE TABLE IF NOT EXISTS system_audit_logs (
  id SERIAL PRIMARY KEY,
  actor_name VARCHAR(128) NOT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  level VARCHAR(32) DEFAULT 'info',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
