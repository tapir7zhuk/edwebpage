const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'database.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'user',
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    section     TEXT    NOT NULL,
    user_id     INTEGER NOT NULL,
    parent_id   INTEGER DEFAULT NULL,
    text        TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)   REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id)
  );

  CREATE TABLE IF NOT EXISTS sections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL,
    link        TEXT    NOT NULL,
    color       TEXT    NOT NULL DEFAULT '#4f8ef7',
    active      INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS materials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id  INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    type        TEXT    NOT NULL,
    filename    TEXT    NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (section_id) REFERENCES sections(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    action      TEXT    NOT NULL,
    details     TEXT,
    created_at  TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Адмін — тільки якщо ще немає
const adminExists = db.prepare(
  "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
).get();

if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(
    "INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, 'admin')"
  ).run('admin', 'admin@admin.com', hash);
  console.log('Admin created: admin@admin.com / admin123');
}

// Дефолтні секції — тільки якщо ще немає
const sectionsExist = db.prepare('SELECT id FROM sections LIMIT 1').get();
if (!sectionsExist) {
  const insert = db.prepare(
    'INSERT INTO sections (title, description, link, sort_order) VALUES (?, ?, ?, ?)'
  );
  insert.run('Відео', 'Відео-лекція з можливістю перемотки та зупинки', '/section.html?id=1', 1);
  insert.run('PDF', 'Документ для читання та завантаження', '/section.html?id=2', 2);
  insert.run('Стаття', 'Текстовий матеріал з ілюстраціями', '/section.html?id=3', 3);
  console.log('Default sections created');
}

module.exports = db;

// Міграції — додаємо нові колонки якщо їх ще немає
const materialCols = db.prepare('PRAGMA table_info(materials)').all().map(c => c.name);
if (!materialCols.includes('description')) {
  db.exec("ALTER TABLE materials ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  console.log('Migration: added materials.description');
}
if (!materialCols.includes('active')) {
  db.exec('ALTER TABLE materials ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  console.log('Migration: added materials.active');
}
if (!materialCols.includes('sort_order')) {
  db.exec('ALTER TABLE materials ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  console.log('Migration: added materials.sort_order');
}

const commentCols = db.prepare('PRAGMA table_info(comments)').all().map(c => c.name);
if (!commentCols.includes('hidden')) {
  db.exec('ALTER TABLE comments ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0');
  console.log('Migration: added comments.hidden');
}
