const express = require('express');
const router = express.Router();
const db = require('../db');

const SECTIONS = ['video', 'pdf', 'article', 'general'];

function requireAuth(req, res, next) {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Потрібна авторизація' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизований' });
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Недостатньо прав' });
  next();
}

// GET /api/forum/:section
router.get('/:section', (req, res) => {
  const { section } = req.params;
  if (!SECTIONS.includes(section))
    return res.status(404).json({ error: 'Розділ не знайдено' });

  const topLevel = db.prepare(`
    SELECT c.id, c.text, c.created_at, c.user_id, c.hidden, u.username
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.section = ? AND c.parent_id IS NULL
    ORDER BY c.created_at ASC
  `).all(section);

  const replies = db.prepare(`
    SELECT c.id, c.parent_id, c.text, c.created_at, c.user_id, c.hidden, u.username
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.section = ? AND c.parent_id IS NOT NULL
    ORDER BY c.created_at ASC
  `).all(section);

  const result = topLevel.map(comment => ({
    ...comment,
    replies: replies.filter(r => r.parent_id === comment.id)
  }));

  res.json(result);
});

// POST /api/forum/:section
router.post('/:section', requireAuth, (req, res) => {
  const { section } = req.params;
  const { text, parent_id } = req.body;

  if (!SECTIONS.includes(section))
    return res.status(404).json({ error: 'Розділ не знайдено' });

  if (!text || !text.trim())
    return res.status(400).json({ error: 'Текст не може бути порожнім' });

  if (parent_id) {
    const parent = db.prepare(
      'SELECT id, parent_id FROM comments WHERE id = ? AND section = ?'
    ).get(parent_id, section);
    if (!parent)
      return res.status(400).json({ error: 'Батьківський коментар не знайдено' });
    if (parent.parent_id !== null)
      return res.status(400).json({ error: 'Відповідь на відповідь не дозволена' });
  }

  const result = db.prepare(
    'INSERT INTO comments (section, user_id, parent_id, text) VALUES (?, ?, ?, ?)'
  ).run(section, req.session.userId, parent_id || null, text.trim());

  res.json({ ok: true, id: result.lastInsertRowid });
});

// PUT /api/forum/comment/:id — редагувати свій коментар
router.put('/comment/:id', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ error: 'Текст не може бути порожнім' });

  const comment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Не знайдено' });
  if (comment.user_id !== req.session.userId)
    return res.status(403).json({ error: 'Не ваш коментар' });

  db.prepare('UPDATE comments SET text = ? WHERE id = ?').run(text.trim(), req.params.id);
  res.json({ ok: true });
});

// DELETE /api/forum/comment/:id — видалити (адмін або автор)
router.delete('/comment/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Не знайдено' });

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
  const isAdmin = user && user.role === 'admin';
  const isOwner = comment.user_id === req.session.userId;

  if (!isAdmin && !isOwner)
    return res.status(403).json({ error: 'Недостатньо прав' });

  // Видаляємо також всі відповіді
  db.prepare('DELETE FROM comments WHERE parent_id = ?').run(req.params.id);
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/forum/comment/:id/hide — приховати/показати (тільки адмін)
router.patch('/comment/:id/hide', requireAdmin, (req, res) => {
  const { hidden } = req.body;
  db.prepare('UPDATE comments SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

module.exports = router;