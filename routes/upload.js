const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const db       = require('../db');

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизований' });
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Недостатньо прав' });
  next();
}

const ALLOWED = {
  video:   { exts: ['.mp4', '.webm', '.mov'], dir: 'assets/video' },
  pdf:     { exts: ['.pdf'],                  dir: 'assets/pdf'   },
  article: { exts: ['.html'],                 dir: 'assets'       },
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const type = req.body.type || req.query.type || 'article';
    const conf  = ALLOWED[type] || ALLOWED.article;
    cb(null, path.join(__dirname, '..', conf.dir));
  },
  filename(req, file, cb) {
    // Зберігаємо оригінальне ім'я (UTF-8)
    const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, original);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter(req, file, cb) {
    const type = req.body.type || req.query.type || 'article';
    const conf  = ALLOWED[type];
    if (!conf) return cb(new Error('Невідомий тип'));
    const ext = path.extname(file.originalname).toLowerCase();
    if (!conf.exts.includes(ext)) return cb(new Error(`Дозволені формати: ${conf.exts.join(', ')}`));
    cb(null, true);
  }
});

// POST /api/upload?type=video|pdf|article
router.post('/', requireAdmin, (req, res) => {
  const type = req.query.type || 'article';
  const conf  = ALLOWED[type];
  if (!conf) return res.status(400).json({ error: 'Невідомий тип' });

  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл не отримано' });

    const original = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const dirMap   = { video: '/assets/video/', pdf: '/assets/pdf/', article: '/assets/' };
    const filename = dirMap[type] + original;

    res.json({ ok: true, filename });
  });
});

module.exports = router;
