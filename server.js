const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use('/assets', express.static('assets'));

app.use(session({
  secret: 'mysite-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/content',   require('./routes/content'));
app.use('/api/forum',     require('./routes/forum'));
app.use('/api/sections',  require('./routes/sections'));
app.use('/api/materials', require('./routes/materials'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
