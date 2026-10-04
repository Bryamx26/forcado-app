// Connexion des employés : un mot de passe commun (STAFF_PASSWORD) et un cookie de session signé.
// Rien n'est stocké côté serveur, ce qui fonctionne aussi avec les fonctions Vercel.
import crypto from 'node:crypto';

const COOKIE = 'staff_session';
const MAX_AGE = 12 * 60 * 60; // 12 h, une journée de service

const isProd = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
const password = process.env.STAFF_PASSWORD || (isProd ? null : 'forcado');
if (!process.env.STAFF_PASSWORD && !isProd) {
  console.warn('STAFF_PASSWORD non défini : mot de passe de développement « forcado ».');
}

// Changer le mot de passe déconnecte toutes les sessions en cours.
const secret = process.env.SESSION_SECRET || crypto.createHash('sha256').update(`session:${password}`).digest('hex');

const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function makeToken(name) {
  const payload = Buffer.from(JSON.stringify({ name, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || !password) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setCookie(req, res, value, maxAge) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
  );
}

function samePassword(given) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(password).digest();
  return crypto.timingSafeEqual(a, b);
}

// Limite simple contre les essais en série (par instance).
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const entry = attempts.get(ip) || { count: 0, since: now };
  if (now - entry.since > 15 * 60 * 1000) Object.assign(entry, { count: 0, since: now });
  return entry.count >= 10;
}
function recordFailure(ip) {
  const entry = attempts.get(ip) || { count: 0, since: Date.now() };
  entry.count++;
  attempts.set(ip, entry);
}

export function staffFrom(req) {
  return readToken(getCookie(req, COOKIE));
}

export function requireStaff(req, res, next) {
  const staff = staffFrom(req);
  if (!staff) return res.status(401).json({ error: 'Connexion requise' });
  req.staff = staff;
  next();
}

export function mountAuth(app) {
  app.post('/api/auth/login', async (req, res) => {
    if (!password) {
      return res.status(503).json({ error: "Connexion désactivée : la variable STAFF_PASSWORD n'est pas configurée." });
    }
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (tooManyAttempts(ip)) return res.status(429).json({ error: 'Trop d\'essais. Réessayez dans quelques minutes.' });
    const name = String(req.body?.name || '').trim().slice(0, 30);
    if (!samePassword(req.body?.password || '')) {
      recordFailure(ip);
      await new Promise((r) => setTimeout(r, 600));
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    attempts.delete(ip);
    setCookie(req, res, makeToken(name), MAX_AGE);
    res.json({ name });
  });

  app.post('/api/auth/logout', (req, res) => {
    setCookie(req, res, '', 0);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const staff = staffFrom(req);
    if (!staff) return res.status(401).json({ error: 'Connexion requise' });
    res.json({ name: staff.name });
  });
}
