// Protections communes : en-têtes de sécurité et limitation du nombre de requêtes.
// Sur Vercel, les en-têtes des pages statiques sont dans vercel.json ; ceux-ci couvrent l'API et le serveur local.
import { Redis } from '@upstash/redis';

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export function securityHeaders(_req, res, next) {
  res.set(SECURITY_HEADERS);
  next();
}

// Adresse du client. Sur Vercel, x-forwarded-for est réécrit par la plateforme ; ailleurs, il peut être inventé
// par le client, donc on ne le croit que si TRUST_PROXY est défini (serveur derrière un proxy de confiance).
export function clientIp(req) {
  if (process.env.VERCEL || process.env.TRUST_PROXY) {
    const fwd = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '');
    if (fwd) return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'inconnu';
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Compteurs par fenêtre de temps. Avec Redis, ils sont partagés entre toutes les instances Vercel.
const memory = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memory) if (v.reset <= now) memory.delete(k);
}, 60 * 1000).unref();

// Compte une tentative et renvoie true si la limite est dépassée.
export async function overLimit(key, limit, windowSec) {
  const k = `forcado:rl:${key}`;
  if (redis) {
    try {
      const count = await redis.incr(k);
      if (count === 1) await redis.expire(k, windowSec);
      return count > limit;
    } catch (e) {
      console.error('Limiteur indisponible', e);
    }
  }
  const now = Date.now();
  let entry = memory.get(k);
  if (!entry || entry.reset <= now) {
    entry = { count: 0, reset: now + windowSec * 1000 };
    memory.set(k, entry);
  }
  entry.count++;
  return entry.count > limit;
}

export async function resetLimit(key) {
  const k = `forcado:rl:${key}`;
  memory.delete(k);
  if (redis) await redis.del(k).catch(() => {});
}

// Middleware : au-delà de `limit` requêtes par `windowSec` secondes et par adresse, répond 429.
export function rateLimit(name, limit, windowSec, message) {
  return async (req, res, next) => {
    if (await overLimit(`${name}:${clientIp(req)}`, limit, windowSec)) {
      res.set('Retry-After', String(windowSec));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
