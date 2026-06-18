const express = require('express');
const router = express.Router();
const db = require('../db');

const SECTIONS = ['video', 'pdf', 'article', 'general'];

// Middleware — перевірка авторизації
function requireAuth(req, res, next) {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Потрібна авторизація' });
  next();
}

// GET /api/forum/:section — отримати коментарі з відповідями
router.get('/:section', (req, res) => {
  const { section } = req.params;

  if (!SECTIONS.includes(section))
    return res.status(404).json({ error: 'Розділ не знайдено' });

  // Головні коментарі (parent_id IS NULL)
  const topLevel = db.prepare(`
    SELECT c.id, c.text, c.created_at, u.username
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.section = ? AND c.parent_id IS NULL
    ORDER BY c.created_at ASC
  `).all(section);

  // Відповіді (parent_id NOT NULL)
  const replies = db.prepare(`
    SELECT c.id, c.parent_id, c.text, c.created_at, u.username
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.section = ? AND c.parent_id IS NOT NULL
    ORDER BY c.created_at ASC
  `).all(section);

  // Вкладаємо відповіді під батьківські коментарі
  const result = topLevel.map(comment => ({
    ...comment,
    replies: replies.filter(r => r.parent_id === comment.id)
  }));

  res.json(result);
});

// POST /api/forum/:section — додати коментар або відповідь
router.post('/:section', requireAuth, (req, res) => {
  const { section } = req.params;
  const { text, parent_id } = req.body;

  if (!SECTIONS.includes(section))
    return res.status(404).json({ error: 'Розділ не знайдено' });

  if (!text || !text.trim())
    return res.status(400).json({ error: 'Текст не може бути порожнім' });

  // Якщо є parent_id — перевіряємо що він існує і є головним
  if (parent_id) {
    const parent = db.prepare(
      'SELECT id, parent_id FROM comments WHERE id = ? AND section = ?'
    ).get(parent_id, section);

    if (!parent)
      return res.status(400).json({ error: 'Батьківський коментар не знайдено' });

    if (parent.parent_id !== null)
      return res.status(400).json({ error: 'Відповідь на відповідь не дозволена' });
  }

  const stmt = db.prepare(
    'INSERT INTO comments (section, user_id, parent_id, text) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(section, req.session.userId, parent_id || null, text.trim());

  res.json({ ok: true, id: result.lastInsertRowid });
});

module.exports = router;