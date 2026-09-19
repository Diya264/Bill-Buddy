const Database = require('better-sqlite3');
const path = require('path');

// Create/connect to database file
const db = new Database(path.join(__dirname, 'billbuddy.db'));

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    upi_id TEXT,
    avatar TEXT DEFAULT 'U',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Groups table
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '👥',
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- Group members table
  CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Bills table
  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT DEFAULT 'Other',
    date TEXT NOT NULL,
    note TEXT,
    paid_by INTEGER NOT NULL,
    group_id INTEGER,
    split_type TEXT DEFAULT 'equal',
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paid_by) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );

  -- Bill members table
  CREATE TABLE IF NOT EXISTS bill_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    share REAL NOT NULL,
    is_paid INTEGER DEFAULT 0,
    paid_at DATETIME,
    note TEXT,
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Notifications table
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_user_id INTEGER NOT NULL,
    from_user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    bill_id INTEGER,
    type TEXT DEFAULT 'reminder',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (to_user_id) REFERENCES users(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (bill_id) REFERENCES bills(id)
  );
`);

console.log('✅ Database connected and tables created');

module.exports = db;