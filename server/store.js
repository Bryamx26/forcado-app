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
  const SOLD_OUT = 'forcado:sold-out';
  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
  return {
    async get(ids) {
      if (!ids.length) return [];
      const values = await redis.hmget(KEY, ...ids);
      return Object.values(values || {}).filter(Boolean).map(parse);
    },
    async soldOut() {
      return (await redis.smembers(SOLD_OUT)) || [];
    },
    async setSoldOut(itemId, soldOut) {
      if (soldOut) await redis.sadd(SOLD_OUT, itemId);
      else await redis.srem(SOLD_OUT, itemId);
    },
    async list() {
      const all = (await redis.hgetall(KEY)) || {};
      return Object.values(all)
        .map(parse)
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
      const order = { ...parse(raw), ...patch };
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
  db.soldOut ??= [];
  const save = () => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
  };
  return {
    async list() {
      return db.orders;
    },
    async get(ids) {
      return db.orders.filter((o) => ids.includes(o.id));
    },
    async soldOut() {
      return db.soldOut;
    },
    async setSoldOut(itemId, soldOut) {
      db.soldOut = db.soldOut.filter((id) => id !== itemId);
      if (soldOut) db.soldOut.push(itemId);
      save();
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
