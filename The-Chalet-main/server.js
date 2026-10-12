const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'please-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');
if (!fs.existsSync(USERS_FILE)) {
  const seedUser = process.env.ADMIN_USERNAME || 'admin';
  const seedPass = process.env.ADMIN_PASSWORD || 'changeme';
  const hash = bcrypt.hashSync(seedPass, 10);
  fs.writeFileSync(USERS_FILE, JSON.stringify([{ username: seedUser, passwordHash: hash }]));
  console.log('Seeded admin account "' + seedUser + '". Set ADMIN_USERNAME / ADMIN_PASSWORD env vars before first run to choose your own, or add more later with add-admin.js.');
}

function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) { return []; }
}
function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return {}; }
}
function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store));
}

// --- Auth routes (public) ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.user = username;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.user), username: req.session && req.session.user });
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- Everything below this line requires a logged-in session ---
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'not authenticated' });
  return res.redirect('/login.html');
}
app.use(requireAuth);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/kv/:key', (req, res) => {
  const store = readStore();
  const key = req.params.key;
  if (!(key in store)) return res.status(404).json({ error: 'not found' });
  res.json({ key, value: store[key] });
});

app.put('/api/kv/:key', (req, res) => {
  const store = readStore();
  store[req.params.key] = req.body.value;
  writeStore(store);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Chalet booking server listening on port ' + PORT));
