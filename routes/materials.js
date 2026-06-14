const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизований' });
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Недостатньо прав' });
  next();
}

// GET /api/materials?sectionId=1 — список матеріалів секції
router.get('/', (req, res) => {
  const { sectionId } = req.query;
  if (!sectionId) return res.status(400).json({ error: 'Потрібен sectionId' });

  const materials = db.prepare(
    'SELECT * FROM materials WHERE section_id = ? ORDER BY created_at ASC'
  ).all(sectionId);

  res.json(materials);
});

// GET /api/materials/:id — один матеріал
router.get('/:id', (req, res) => {
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Не знайдено' });
  res.json(material);
});

// POST /api/materials — додати матеріал (тільки адмін)
router.post('/', requireAdmin, (req, res) => {
  const { section_id, title, type, filename } = req.body;
  if (!section_id || !title || !type || !filename)
    return res.status(400).json({ error: 'Заповніть усі поля' });

  if (!['video', 'pdf', 'article'].includes(type))
    return res.status(400).json({ error: 'Невірний тип' });

  const result = db.prepare(
    'INSERT INTO materials (section_id, title, type, filename) VALUES (?, ?, ?, ?)'
  ).run(section_id, title, type, filename);

  res.json({ ok: true, id: result.lastInsertRowid });
});

// PUT /api/materials/:id — редагувати (тільки адмін)
router.put('/:id', requireAdmin, (req, res) => {
  const { title, filename } = req.body;
  db.prepare(
    'UPDATE materials SET title = COALESCE(?, title), filename = COALESCE(?, filename) WHERE id = ?'
  ).run(title, filename, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/materials/:id — видалити (тільки адмін)
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
