const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    nickname TEXT,
    coin TEXT,
    network TEXT,
    wallet TEXT,
    phone TEXT,
    bank TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Безопасные миграции для уже существующей базы.
  db.run("ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'", () => {});
  db.get("SELECT value FROM settings WHERE key = 'stopped'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO settings (key, value) VALUES ('stopped', '0')");
    }
  });
  const defaults = { usdt_rate: '72', gram_rate: '85' };
  for (const [key, value] of Object.entries(defaults)) {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
});

module.exports = db;