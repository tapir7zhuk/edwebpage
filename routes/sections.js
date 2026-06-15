const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизований' });
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Недостатньо прав' });
  next();
}

// GET /api/sections — всі активні секції (для всіх)
router.get('/', (req, res) => {
  const sections = db.prepare(
    'SELECT * FROM sections WHERE active = 1 ORDER BY sort_order ASC'
  ).all();
  res.json(sections);
});

// GET /api/sections/all — всі секції включно з прихованими (тільки адмін)
router.get('/all', requireAdmin, (req, res) => {
  const sections = db.prepare('SELECT * FROM sections ORDER BY sort_order ASC').all();
  res.json(sections);
});

// POST /api/sections — створити нову секцію (тільки адмін)
router.post('/', requireAdmin, (req, res) => {
  const { title, description, link, color } = req.body;
  if (!title || !description || !link)
    return res.status(400).json({ error: 'Заповніть усі поля' });

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM sections').get();
  const result = db.prepare(
    'INSERT INTO sections (title, description, link, color, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description, link, color || '#4f8ef7', (maxOrder.max || 0) + 1);

  res.json({ ok: true, id: result.lastInsertRowid });
});

// PUT /api/sections/:id — оновити секцію (тільки адмін)
router.put('/:id', requireAdmin, (req, res) => {
  const { title, description, link, color, active } = req.body;
  const { id } = req.params;

  db.prepare(`
    UPDATE sections SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      link = COALESCE(?, link),
      color = COALESCE(?, color),
      active = COALESCE(?, active)
    WHERE id = ?
  `).run(title, description, link, color, active !== undefined ? (active ? 1 : 0) : null, id);

  res.json({ ok: true });
});

// DELETE /api/sections/:id — видалити секцію (тільки адмін)
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM sections WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
