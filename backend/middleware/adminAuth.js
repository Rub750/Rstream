const crypto = require('crypto');

const SESSION_COOKIE = 'rstream_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const sessions = new Map();
const attempts = new Map();

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || '_51Rr120318@#51_';
}

function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a), 'utf8').digest();
  const right = crypto.createHash('sha256').update(String(b), 'utf8').digest();
  return crypto.timingSafeEqual(left, right);
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index === -1) return cookies;
    const key = part.slice(0, index).trim();
    const value = decodeURIComponent(part.slice(index + 1).trim());
    if (key) cookies[key] = value;
    return cookies;
  }, {});
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function getSession(req) {
  const token = parseCookies(req.headers.cookie || '')[SESSION_COOKIE];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function isAuthenticated(req) {
  return Boolean(getSession(req));
}

function requireAdmin(req, res, next) {
  if (isAuthenticated(req)) return next();
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  return res.redirect('/admin');
}

function requireAdminPage(req, res, next) {
  if (isAuthenticated(req)) return next();
  return res.redirect('/admin');
}

function adminWriteGuard(req, res, next) {
  // Public view counters remain writable from the streaming site.
  if (req.method === 'POST' && /\/views\/?$/.test(req.path)) return next();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return requireAdmin(req, res, next);
  return next();
}

function login(req, res) {
  const password = getAdminPassword();
  if (!password) {
    return res.status(503).json({ error: 'ADMIN_PASSWORD is not configured on the server.' });
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const current = attempts.get(ip);
  if (current && current.lockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  const supplied = req.body?.password || '';
  if (!safeEqual(supplied, password)) {
    const next = current && current.windowUntil > Date.now()
      ? { count: current.count + 1, windowUntil: current.windowUntil, lockedUntil: current.lockedUntil }
      : { count: 1, windowUntil: Date.now() + LOCKOUT_MS, lockedUntil: 0 };

    if (next.count >= MAX_LOGIN_ATTEMPTS) next.lockedUntil = Date.now() + LOCKOUT_MS;
    attempts.set(ip, next);
    return res.status(next.lockedUntil ? 429 : 401).json({
      error: next.lockedUntil ? 'Too many login attempts. Try again later.' : 'Invalid admin password.'
    });
  }

  attempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS });
  setSessionCookie(res, token);
  return res.json({ authenticated: true, expiresIn: SESSION_TTL_MS });
}

function logout(req, res) {
  const session = getSession(req);
  if (session) sessions.delete(session.token);
  clearSessionCookie(res);
  res.json({ authenticated: false });
}

function sessionStatus(req, res) {
  const session = getSession(req);
  res.json({ authenticated: Boolean(session), expiresAt: session?.expiresAt || null });
}

setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
  for (const [ip, attempt] of attempts) {
    if (attempt.lockedUntil <= now && attempt.windowUntil <= now) attempts.delete(ip);
  }
}, 10 * 60 * 1000).unref();

module.exports = {
  requireAdmin,
  requireAdminPage,
  adminWriteGuard,
  login,
  logout,
  sessionStatus,
  isAuthenticated
};
