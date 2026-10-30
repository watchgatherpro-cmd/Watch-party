CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  is_banned INTEGER DEFAULT 0,
  ban_reason TEXT,
  failed_login_count INTEGER DEFAULT 0,
  last_failed_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS device_fingerprints (
  fingerprint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  first_seen_at INTEGER,
  last_seen_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pwa_installs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  fingerprint TEXT,
  platform TEXT,
  installed_at INTEGER NOT NULL,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  closed_at INTEGER,
  is_active INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 20,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  left_at INTEGER,
  invited_by TEXT,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  reply_to_id TEXT,
  created_at INTEGER NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  deleted_by TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  target_id TEXT,
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  payload TEXT,
  severity TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_severity ON security_events(severity, created_at);

CREATE TABLE IF NOT EXISTS login_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  login_at INTEGER NOT NULL,
  success INTEGER DEFAULT 1,
  country TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_login_user ON login_history(user_id, login_at);
