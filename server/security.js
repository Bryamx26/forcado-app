// Protections communes : en-têtes de sécurité, adresse IP fiable et limite de requêtes.
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Sur Vercel, x-real-ip est posé par la plateforme et ne peut pas être falsifié par le client.
// Ailleurs, on ne fait confiance qu'à l'adresse de la connexion (x-forwarded-for se falsifie librement).
export function clientIp(req) {
  if (process.env.VERCEL) {
    const ip = req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0];
    if (ip) return String(ip).trim();
  }
  return req.socket?.remoteAddress || 'inconnue';
}

// Compteur par fenêtre fixe. Avec Redis, la limite vaut pour toutes les instances Vercel à la fois.
const local = new Map();
export async function hit(key, windowSec) {
  const k = `forcado:rl:${key}`;
  if (redis) {
    try {
      const count = await redis.incr(k);
      if (count === 1) await redis.expire(k, windowSec);
      return count;
    } catch (e) {
      console.error('Limite de requêtes indisponible', e);
    }
  }
  const now = Date.now();
  let entry = local.get(k);
  if (!entry || entry.reset < now) {
    entry = { count: 0, reset: now + windowSec * 1000 };
    local.set(k, entry);
  }
  if (local.size > 10000) for (const [key2, e] of local) if (e.reset < now) local.delete(key2);
  return ++entry.count;
}

export async function clear(key) {
  const k = `forcado:rl:${key}`;
  local.delete(k);
  if (redis) await redis.del(k).catch(() => {});
}

// Middleware : refuse au-delà de `limit` requêtes par IP sur `windowSec` secondes.
export function rateLimit(name, limit, windowSec, message = 'Trop de requêtes. Réessayez dans un instant.') {
  return async (req, res, next) => {
    try {
      const count = await hit(`${name}:${clientIp(req)}`, windowSec);
      if (count > limit) {
        res.set('Retry-After', String(windowSec));
        return res.status(429).json({ error: message });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

// Mêmes règles que les en-têtes de vercel.json, pour le serveur Express lancé hors Vercel.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(_req, res, next) {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
}

// Refuse les écritures venant d'un autre site (en plus du cookie SameSite=Lax).
export function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {}
  res.status(403).json({ error: 'Origine refusée' });
}
