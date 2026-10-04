// Stockage des commandes.
// Sur Vercel (pas de disque persistant) : Redis Upstash, activé dès que ses variables d'environnement existent.
// En local : fichier data/orders.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

function redisStore() {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  const KEY = 'forcado:orders';
  return {
    async list() {
      const all = (await redis.hgetall(KEY)) || {};
      return Object.values(all)
        .map((v) => (typeof v === 'string' ? JSON.parse(v) : v))
        .sort((a, b) => a.number - b.number);
    },
    async create(order) {
      order.number = await redis.incr('forcado:next-number');
      await redis.hset(KEY, { [order.id]: JSON.stringify(order) });
      return order;
    },
    async update(id, patch) {
      const raw = await redis.hget(KEY, id);
      if (!raw) return null;
      const order = { ...(typeof raw === 'string' ? JSON.parse(raw) : raw), ...patch };
      await redis.hset(KEY, { [id]: JSON.stringify(order) });
      return order;
    },
  };
}

function fileStore() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dataFile = path.join(root, 'data', 'orders.json');
  let db;
  try {
    db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    db = { nextNumber: 1, orders: [] };
  }
  const save = () => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
  };
  return {
    async list() {
      return db.orders;
    },
    async create(order) {
      order.number = db.nextNumber++;
      db.orders.push(order);
      save();
      return order;
    },
    async update(id, patch) {
      const order = db.orders.find((o) => o.id === id);
      if (!order) return null;
      Object.assign(order, patch);
      save();
      return order;
    },
  };
}

export const store = redisUrl && redisToken ? redisStore() : fileStore();
export const storeKind = redisUrl && redisToken ? 'redis' : 'fichier';
