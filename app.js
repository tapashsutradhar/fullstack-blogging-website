// app.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'altriveo.db');
const SALT_ROUNDS = 10;

console.log('[DEBUG] Altriveo starting');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// open DB
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[ERROR] Opening DB', err);
    process.exit(1);
  }
  console.log('[DEBUG] SQLite DB opened at', DB_PATH);
});

// create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('[DEBUG] Ensured tables exist');
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'replace-with-strong-secret-for-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 3600 * 1000 }
}));

// serve public folder, but we'll protect /admin.html route manually
app.use(express.static(path.join(__dirname, 'public')));

// helper: require auth
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// API: register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('[DEBUG] Register attempt for', username);
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    db.run('INSERT INTO users (username, password_hash) VALUES (?,?)', [username, hash], function(err) {
      if (err) {
        console.error('[ERROR] register insert', err.message);
        return res.status(400).json({ error: 'Username taken' });
      }
      console.log('[DEBUG] New user id=', this.lastID);
      res.json({ success: true });
    });
  } catch (e) {
    console.error('[ERROR] register', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('[DEBUG] Login attempt', username);
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('[ERROR] login db', err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.user = { id: user.id, username: user.username };
    console.log('[DEBUG] User logged in:', user.username);
    res.json({ success: true });
  });
});

// API: logout
app.post('/api/logout', (req, res) => {
  const username = req.session.user && req.session.user.username;
  req.session.destroy(() => {
    console.log('[DEBUG] User logged out:', username);
    res.json({ success: true });
  });
});

// API: check login
app.get('/api/check-login', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.user), user: req.session.user || null });
});

// PROTECT admin.html route (serve only if logged in)
app.get('/admin.html', (req, res, next) => {
  if (req.session && req.session.user) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    res.redirect('/login.html');
  }
});

// API: create post
app.post('/api/posts', requireAuth, (req, res) => {
  const { title, content } = req.body;
  console.log('[DEBUG] Creating post by', req.session.user.username);
  if (!title || !content) return res.status(400).json({ error: 'Missing fields' });

  db.run('INSERT INTO posts (title, content) VALUES (?, ?)', [title, content], function(err) {
    if (err) {
      console.error('[ERROR] insert post', err);
      return res.status(500).json({ error: 'DB error' });
    }
    console.log('[DEBUG] Post inserted id=', this.lastID);
    res.json({ success: true, id: this.lastID });
  });
});

// API: list posts (for homepage) - newest first
app.get('/api/posts', (req, res) => {
  db.all('SELECT id, title, content, created_at, updated_at FROM posts ORDER BY datetime(created_at) DESC', (err, rows) => {
    if (err) {
      console.error('[ERROR] list posts', err);
      return res.status(500).json([]);
    }
    res.json(rows);
  });
});

// API: get single post
app.get('/api/posts/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT id, title, content, created_at, updated_at FROM posts WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      console.error('[ERROR] get post', err);
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(row);
  });
});

// API: update post
app.put('/api/posts/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const { title, content } = req.body;
  console.log('[DEBUG] Update post', id, 'by', req.session.user.username);
  db.run('UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, content, id], function(err) {
    if (err) {
      console.error('[ERROR] update post', err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

// API: delete post
app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  console.log('[DEBUG] Delete post', id, 'by', req.session.user.username);
  db.run('DELETE FROM posts WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('[ERROR] delete post', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json({ success: true });
  });
});

// Serve single-post page (static file); front-end will fetch /api/posts/:id
app.get('/post.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'post.html')));

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[DEBUG] Server running at http://localhost:${PORT}`));
