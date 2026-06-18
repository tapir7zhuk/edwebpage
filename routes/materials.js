const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизований' });
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Недостатньо прав' });
  next();
}

<<<<<<< HEAD
// GET /api/materials?sectionId=1 — активні матеріали секції (для всіх)
=======
// GET /api/materials?sectionId=1 — список матеріалів секції
>>>>>>> 993fc6f3d7613a6f5db0a18d707bf2a5bd7c4f4d
router.get('/', (req, res) => {
  const { sectionId } = req.query;
  if (!sectionId) return res.status(400).json({ error: 'Потрібен sectionId' });

  const materials = db.prepare(
<<<<<<< HEAD
    'SELECT * FROM materials WHERE section_id = ? AND active = 1 ORDER BY sort_order ASC, created_at ASC'
  ).all(sectionId);

  res.json(materials);
});

// GET /api/materials/all?sectionId=1 — всі матеріали включно з прихованими (тільки адмін)
router.get('/all', requireAdmin, (req, res) => {
  const { sectionId } = req.query;
  if (!sectionId) return res.status(400).json({ error: 'Потрібен sectionId' });

  const materials = db.prepare(
    'SELECT * FROM materials WHERE section_id = ? ORDER BY sort_order ASC, created_at ASC'
=======
    'SELECT * FROM materials WHERE section_id = ? ORDER BY created_at ASC'
>>>>>>> 993fc6f3d7613a6f5db0a18d707bf2a5bd7c4f4d
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
<<<<<<< HEAD
  const { section_id, title, description, type, filename } = req.body;
=======
  const { section_id, title, type, filename } = req.body;
>>>>>>> 993fc6f3d7613a6f5db0a18d707bf2a5bd7c4f4d
  if (!section_id || !title || !type || !filename)
    return res.status(400).json({ error: 'Заповніть усі поля' });

  if (!['video', 'pdf', 'article'].includes(type))
    return res.status(400).json({ error: 'Невірний тип' });

<<<<<<< HEAD
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM materials WHERE section_id = ?').get(section_id);
  const result = db.prepare(
    'INSERT INTO materials (section_id, title, description, type, filename, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(section_id, title, description || '', type, filename, (maxOrder.max || 0) + 1);
=======
  const result = db.prepare(
    'INSERT INTO materials (section_id, title, type, filename) VALUES (?, ?, ?, ?)'
  ).run(section_id, title, type, filename);
>>>>>>> 993fc6f3d7613a6f5db0a18d707bf2a5bd7c4f4d

  res.json({ ok: true, id: result.lastInsertRowid });
});

// PUT /api/materials/:id — редагувати (тільки адмін)
router.put('/:id', requireAdmin, (req, res) => {
<<<<<<< HEAD
  const { title, description, filename, active } = req.body;
  db.prepare(`
    UPDATE materials SET
      title       = COALESCE(?, title),
      description = COALESCE(?, description),
      filename    = COALESCE(?, filename),
      active      = COALESCE(?, active)
    WHERE id = ?
  `).run(title, description, filename, active !== undefined ? (active ? 1 : 0) : null, req.params.id);
=======
  const { title, filename } = req.body;
  db.prepare(
    'UPDATE materials SET title = COALESCE(?, title), filename = COALESCE(?, filename) WHERE id = ?'
  ).run(title, filename, req.params.id);
>>>>>>> 993fc6f3d7613a6f5db0a18d707bf2a5bd7c4f4d
  res.json({ ok: true });
});

// DELETE /api/materials/:id — видалити (тільки адмін)
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

<<<<<<< HEAD
module.exports = router;
=======
module.exports = router;
>>>>>>> 993fc6f3d7613a6f5db0a18d707bf2a5bd7c4f4d
