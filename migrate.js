const db = require('./db');

const cols = db.prepare('PRAGMA table_info(materials)').all().map(c => c.name);

if (!cols.includes('description')) {
  db.exec("ALTER TABLE materials ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  console.log('+ description');
}
if (!cols.includes('active')) {
  db.exec('ALTER TABLE materials ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  console.log('+ active');
}
if (!cols.includes('sort_order')) {
  db.exec('ALTER TABLE materials ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  console.log('+ sort_order');
}

console.log('Колонки:', db.prepare('PRAGMA table_info(materials)').all().map(c => c.name));
