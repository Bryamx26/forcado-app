// Connexion des employés : un mot de passe commun (STAFF_PASSWORD) et un cookie de session signé.
// Rien n'est stocké côté serveur, ce qui fonctionne aussi avec les fonctions Vercel.
import crypto from 'node:crypto';
import { clientIp, hit, clear } from './security.js';

const COOKIE = 'staff_session';
const MAX_AGE = 12 * 60 * 60; // 12 h, une journée de service

// Le mot de passe de démonstration n'existe qu'avec `npm run dev` : un serveur lancé avec `npm start` ou sur Vercel l'exige.
const isDev = process.argv.includes('--dev') && !process.env.VERCEL && process.env.NODE_ENV !== 'production';
const password = process.env.STAFF_PASSWORD || (isDev ? 'forcado' : null);
if (!process.env.STAFF_PASSWORD && isDev) {
  console.warn('STAFF_PASSWORD non défini : mot de passe de développement « forcado ».');
}

if (password && password.length < 10 && !isDev) {
  console.warn('STAFF_PASSWORD est court : utilisez au moins 10 caractères.');
}
if (password && !process.env.SESSION_SECRET && !isDev) {
  console.warn('SESSION_SECRET non défini : les sessions sont signées avec une clé dérivée du mot de passe.');
}

// Changer le mot de passe déconnecte toutes les sessions en cours.
// Sans SESSION_SECRET, la clé est dérivée lentement (scrypt) pour qu'un cookie volé ne permette pas de deviner le mot de passe.
const secret = process.env.SESSION_SECRET || (password ? crypto.scryptSync(password, 'forcado:session', 32) : 'aucune');

const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function makeToken(name, exp = Date.now() + MAX_AGE * 1000) {
  const payload = Buffer.from(JSON.stringify({ name, exp })).toString('base64url');
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

// Limite contre les essais en série : 10 échecs par IP sur 15 minutes, partagée entre instances via Redis.
const LOGIN_WINDOW = 15 * 60;
const LOGIN_MAX = 10;

export function staffFrom(req) {
  return readToken(getCookie(req, COOKIE));
}

export function requireStaff(req, res, next) {
  const staff = staffFrom(req);
  if (!staff) return res.status(401).json({ error: 'Connexion requise' });
  req.staff = staff;
  next();
}

const cleanName = (raw) => String(raw || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 30);

export function mountAuth(app) {
  app.post('/api/auth/login', async (req, res) => {
    if (!password) {
      return res.status(503).json({ error: "Connexion désactivée : la variable STAFF_PASSWORD n'est pas configurée." });
    }
    const key = `login:${clientIp(req)}`;
    // Chaque essai compte d'abord, ce qui empêche d'en lancer beaucoup en parallèle avant le blocage.
    if ((await hit(key, LOGIN_WINDOW)) > LOGIN_MAX) {
      return res.status(429).json({ error: 'Trop d\'essais. Réessayez dans quelques minutes.' });
    }
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: 'Indiquez votre prénom.' });
    if (!samePassword(req.body?.password || '')) {
      await new Promise((r) => setTimeout(r, 600));
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    await clear(key);
    setCookie(req, res, makeToken(name), MAX_AGE);
    res.json({ name });
  });

  app.post('/api/auth/logout', (req, res) => {
    setCookie(req, res, '', 0);
    res.json({ ok: true });
  });

  // Changement d'employé sur un appareil partagé (tablette du comptoir) : sans cela, tout ce qui est fait sur
  // l'appareil reste au nom de la première personne connectée. La session garde son expiration d'origine.
  app.post('/api/auth/name', requireStaff, (req, res) => {
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: 'Indiquez votre prénom.' });
    setCookie(req, res, makeToken(name, req.staff.exp), Math.max(0, Math.floor((req.staff.exp - Date.now()) / 1000)));
    res.json({ name });
  });

  app.get('/api/auth/me', (req, res) => {
    const staff = staffFrom(req);
    if (!staff) return res.status(401).json({ error: 'Connexion requise' });
    res.json({ name: staff.name });
  });
}
