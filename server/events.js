// Mises à jour en temps réel : le serveur prévient les écrans ouverts dès qu'une commande ou la carte change,
// au lieu d'attendre leur prochaine vérification.
// Sur Vercel, chaque requête peut tourner sur une instance différente : le signal passe donc par Redis (pub/sub).
// En local, un simple émetteur d'événements suffit.
import { EventEmitter } from 'node:events';
import { Redis } from '@upstash/redis';
import { staffFrom } from './auth.js';

const CHANNEL = 'forcado:events';
// Vercel coupe une fonction après sa durée maximale : on ferme avant, le navigateur se reconnecte tout seul.
const STREAM_MS = 50 * 1000;
const HEARTBEAT_MS = 20 * 1000;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const local = new EventEmitter();
local.setMaxListeners(0);

// type : 'orders' ou 'menu'. Les écrans rechargent eux-mêmes ce qui les concerne.
export async function notify(type) {
  if (redis) {
    try {
      await redis.publish(CHANNEL, type);
    } catch (e) {
      console.error('Publication temps réel impossible', e);
    }
  } else {
    local.emit('event', type);
  }
}

function subscribe(onEvent) {
  if (!redis) {
    local.on('event', onEvent);
    return () => local.off('event', onEvent);
  }
  const sub = redis.subscribe([CHANNEL]);
  sub.on('message', ({ message }) => onEvent(String(message)));
  sub.on('error', (e) => console.error('Abonnement temps réel interrompu', e));
  return () => sub.unsubscribe().catch(() => {});
}

export function mountEvents(app) {
  // ?scope=staff : flux des employés (connexion requise). Sans scope : flux public, sans aucune donnée de commande.
  app.get('/api/events', (req, res) => {
    if (req.query.scope === 'staff' && !staffFrom(req)) return res.status(401).end();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 1000\n\n');

    const send = (type) => res.write(`event: ${type}\ndata: ${Date.now()}\n\n`);
    const unsubscribe = subscribe(send);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    const timeout = setTimeout(() => res.end(), STREAM_MS);

    res.on('close', () => {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      unsubscribe();
    });
  });
}
