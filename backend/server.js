const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const db = require('./models/database');
const { requireAdminPage, adminWriteGuard, login, logout, sessionStatus, isAuthenticated } = require('./middleware/adminAuth');
const githubStorage = require('./services/githubStorage');

const app = express();
const PORT = Number(process.env.PORT) || 3002;
const DATABASE_PATH = path.join(__dirname, '../rstream.db');
let persistenceQueue = Promise.resolve();

const queueDatabasePersistence = () => {
  persistenceQueue = persistenceQueue
    .then(() => githubStorage.persistDatabase(DATABASE_PATH))
    .catch(error => console.error('GitHub database persistence failed:', error.message));
  return persistenceQueue;
};

app.disable('x-powered-by');

// CORS configuration - Allow all origins in development for simplicity
const isProduction = process.env.NODE_ENV === 'production';

// In production, use configured origins. In development, allow all.
const corsOptions = isProduction ? {
  origin: (process.env.RSTREAM_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean),
  credentials: true
} : {
  origin: true, // Allow all origins in development
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));
app.use(fileUpload({
  createParentPath: true,
  abortOnLimit: true,
  limits: { fileSize: 500 * 1024 * 1024 }
}));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Also serve uploads from root for direct access
app.use(express.static(path.join(__dirname, 'public/uploads')));

const contentRoutes = require('./routes/content');
const categoryRoutes = require('./routes/category');
const settingsRoutes = require('./routes/settings');

app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/session', sessionStatus);

const persistSuccessfulApiWrite = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300 && githubStorage.isConfigured()) {
      queueDatabasePersistence();
    }
  });
  next();
};

app.use('/api/content', persistSuccessfulApiWrite, adminWriteGuard, contentRoutes);
app.use('/api/categories', persistSuccessfulApiWrite, adminWriteGuard, categoryRoutes);
app.use('/api/settings', persistSuccessfulApiWrite, adminWriteGuard, settingsRoutes);

if (!githubStorage.isConfigured()) {
  console.warn('GitHub persistence is disabled: set GITHUB_TOKEN on Render to keep admin uploads and database changes across restarts.');
}

app.use('/streaming', express.static(path.join(__dirname, '../frontend/streaming'), { extensions: ['html'] }));

const adminRoot = path.join(__dirname, '../frontend/admin');
const adminLoginPage = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rstream Admin — Connexion</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101114;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{width:min(420px,calc(100% - 32px));padding:32px;border-radius:18px;background:#1b1d22;box-shadow:0 20px 60px #0008}h1{margin:0 0 8px;font-size:26px}p{color:#aeb4c0;margin:0 0 24px}label{display:block;margin-bottom:8px;font-weight:600}input{width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid #3a3e47;background:#121419;color:#fff;font-size:16px}button{width:100%;margin-top:16px;padding:13px;border:0;border-radius:10px;background:#ff5733;color:#fff;font-weight:700;font-size:16px;cursor:pointer}button:disabled{opacity:.6;cursor:wait}.error{min-height:20px;color:#ff8d7a;margin-top:14px}</style></head>
<body><main class="card"><h1>Rstream Admin</h1><p>Connectez-vous pour accéder au panneau d’administration.</p><form id="login"><label for="password">Mot de passe administrateur</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button id="submit" type="submit">Se connecter</button><div id="error" class="error" role="alert"></div></form></main>
<script>const form=document.getElementById('login'),password=document.getElementById('password'),button=document.getElementById('submit'),error=document.getElementById('error');form.addEventListener('submit',async e=>{e.preventDefault();error.textContent='';button.disabled=true;try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({password:password.value})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Connexion impossible');window.location.replace('/admin/')}catch(err){error.textContent=err.message;password.select()}finally{button.disabled=false}});</script></body></html>`;

app.get('/admin', (req, res) => {
  if (isAuthenticated(req)) {
    res.set('Cache-Control', 'no-store');
    return res.sendFile(path.join(adminRoot, 'index.html'));
  }
  res.set('Cache-Control', 'no-store');
  return res.status(401).send(adminLoginPage);
});
app.get('/admin/', (req, res) => {
  if (isAuthenticated(req)) {
    res.set('Cache-Control', 'no-store');
    return res.sendFile(path.join(adminRoot, 'index.html'));
  }
  res.set('Cache-Control', 'no-store');
  return res.status(401).send(adminLoginPage);
});
app.use('/admin', requireAdminPage, (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, express.static(adminRoot, { extensions: ['html'] }));

app.get('/', (req, res) => res.redirect('/streaming/'));
app.get('/api', (req, res) => res.json({ message: 'Rstream API', version: '1.0.0' }));

// Keep SPA/static paths predictable when users open the directories directly.
app.get('/streaming', (req, res) => res.sendFile(path.join(__dirname, '../frontend/streaming/index.html')));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route not found' });
  res.status(404).send('Page not found');
});

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (maximum 500 MB).' });
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

db.initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Streaming site: http://localhost:${PORT}/streaming/`);
      console.log(`Admin site: http://localhost:${PORT}/admin/`);
    });
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

module.exports = app;
