const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

function logAction(userId, action, details = null) {
  db.prepare(
    'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)'
  ).run(userId, action, details);
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизований' });
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Недостатньо прав' });
  next();
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Заповніть усі поля' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Пароль мінімум 6 символів' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')"
    ).run(username, email, hash);

    req.session.userId = result.lastInsertRowid;
    req.session.role = 'user';
    logAction(result.lastInsertRowid, 'register');
    res.json({ ok: true, username, role: 'user' });
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(400).json({ error: 'Такий email або username вже існує' });
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Заповніть усі поля' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Невірний email або пароль' });

  req.session.userId = user.id;
  req.session.role = user.role;
  logAction(user.id, 'login');
  res.json({ ok: true, username: user.username, role: user.role });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Не авторизований' });

  const user = db.prepare(
    'SELECT id, username, email, role, created_at FROM users WHERE id = ?'
  ).get(req.session.userId);

  if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });
  res.json(user);
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  if (req.session.userId) logAction(req.session.userId, 'logout');
  req.session.destroy();
  res.json({ ok: true });
});

// GET /api/auth/users — список користувачів (тільки адмін)
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// POST /api/auth/users/:id/role — змінити роль (тільки адмін)
router.post('/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  const { id } = req.params;

  if (!['admin', 'user'].includes(role))
    return res.status(400).json({ error: 'Невірна роль' });

  // Не можна змінити роль першого адміна
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'Користувача не знайдено' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  logAction(req.session.userId, 'change_role', `user_id:${id} role:${role}`);
  res.json({ ok: true });
});

// GET /api/auth/activity — лог дій (тільки адмін)
router.get('/activity', requireAdmin, (req, res) => {
  const { userId } = req.query;
  const query = userId
    ? `SELECT a.*, u.username FROM activity_log a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 100`
    : `SELECT a.*, u.username FROM activity_log a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 200`;

  const logs = userId
    ? db.prepare(query).all(userId)
    : db.prepare(query).all();

  res.json(logs);
});

// GET /api/auth/stats — статистика (тільки адмін)
router.get('/stats', requireAdmin, (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get();
  const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
  const activityByHour = db.prepare(`
    SELECT strftime('%H', created_at) as hour, COUNT(*) as count
    FROM activity_log
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY hour ORDER BY hour
  `).all();

  res.json({
    users: totalUsers.count,
    admins: totalAdmins.count,
    activityByHour
  });
});

module.exports = router;
