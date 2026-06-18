<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets');

// GET /api/content/video
router.get('/video', (req, res) => {
  const dir = path.join(ASSETS, 'video');
  const files = fs.readdirSync(dir).filter(f =>
    ['.mp4', '.webm', '.mov'].includes(path.extname(f).toLowerCase())
  );
  if (!files.length)
    return res.status(404).json({ error: 'Відео не знайдено' });

  const filePath = path.join(dir, files[0]);
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// GET /api/content/pdf
router.get('/pdf', (req, res) => {
  const dir = path.join(ASSETS, 'pdf');
  const files = fs.readdirSync(dir).filter(f =>
    path.extname(f).toLowerCase() === '.pdf'
  );
  if (!files.length)
    return res.status(404).json({ error: 'PDF не знайдено' });

  const filePath = path.join(dir, files[0]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${files[0]}"`);
  fs.createReadStream(filePath).pipe(res);
});

// GET /api/content/article — HTML з вбудованими фото
router.get('/article', (req, res) => {
  const filePath = path.join(ASSETS, 'article.html');
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: 'Статтю не знайдено' });

  const html = fs.readFileSync(filePath, 'utf-8');
  res.json({ html });
});

=======
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets');

// GET /api/content/video
router.get('/video', (req, res) => {
  const dir = path.join(ASSETS, 'video');
  const files = fs.readdirSync(dir).filter(f =>
    ['.mp4', '.webm', '.mov'].includes(path.extname(f).toLowerCase())
  );
  if (!files.length)
    return res.status(404).json({ error: 'Відео не знайдено' });

  const filePath = path.join(dir, files[0]);
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// GET /api/content/pdf
router.get('/pdf', (req, res) => {
  const dir = path.join(ASSETS, 'pdf');
  const files = fs.readdirSync(dir).filter(f =>
    path.extname(f).toLowerCase() === '.pdf'
  );
  if (!files.length)
    return res.status(404).json({ error: 'PDF не знайдено' });

  const filePath = path.join(dir, files[0]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${files[0]}"`);
  fs.createReadStream(filePath).pipe(res);
});

// GET /api/content/article — HTML з вбудованими фото
router.get('/article', (req, res) => {
  const filePath = path.join(ASSETS, 'article.html');
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: 'Статтю не знайдено' });

  const html = fs.readFileSync(filePath, 'utf-8');
  res.json({ html });
});

>>>>>>> 993fc6f3d7613a6f5db0a18d707bf2a5bd7c4f4d
module.exports = router;