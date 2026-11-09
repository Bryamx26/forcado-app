// Stockage des commandes.
// Sur Vercel (pas de disque persistant) : Redis Upstash, activé dès que ses variables d'environnement existent.
// En local : fichier data/orders.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasRedis, redisClient } from './redis.js';
import { isFinal } from '../shared/orderStatus.js';

const ORDERS = 'forcado:orders';
const SOLD_OUT = 'forcado:sold-out';
const NEXT_NUMBER = 'forcado:next-number';
// Index des commandes en cours (ni servies ni annulées) : la cuisine, l'écran de salle et l'estimation d'attente
// le lisent sans parcourir tout l'historique.
const ACTIVE = 'forcado:orders:active';
const ACTIVE_READY = 'forcado:orders:active:v1';
const BACKFILL_MS = 36 * 60 * 60 * 1000;
// Durées de préparation des dernières commandes (minutes), pour estimer l'attente.
const PREP_TIMES = 'forcado:prep-times';
const PREP_SAMPLE = 20;

function redisStore() {
  const redis = redisClient();
  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
  let activeIndexChecked = false;

  async function readAll() {
    const all = (await redis.hgetall(ORDERS)) || {};
    return Object.values(all).map(parse);
  }

  // Les commandes passées avant l'index y sont ajoutées une seule fois.
  async function ensureActiveIndex() {
    if (activeIndexChecked) return;
    activeIndexChecked = true;
    if (await redis.get(ACTIVE_READY)) return;
    const since = Date.now() - BACKFILL_MS;
    const ids = (await readAll()).filter((o) => !isFinal(o.status) && new Date(o.createdAt).getTime() >= since).map((o) => o.id);
    if (ids.length) await redis.sadd(ACTIVE, ...ids);
    await redis.set(ACTIVE_READY, '1');
  }

  const store = {
    async get(ids) {
      if (!ids.length) return [];
      const values = await redis.hmget(ORDERS, ...ids);
      return Object.values(values || {}).filter(Boolean).map(parse);
    },
    async soldOut() {
      return (await redis.smembers(SOLD_OUT)) || [];
    },
    async setSoldOut(key, soldOut) {
      if (soldOut) await redis.sadd(SOLD_OUT, key);
      else await redis.srem(SOLD_OUT, key);
    },
    async list() {
      return (await readAll()).sort((a, b) => a.number - b.number);
    },
    async active() {
      await ensureActiveIndex();
      const ids = (await redis.smembers(ACTIVE)) || [];
      return (await store.get(ids)).sort((a, b) => a.number - b.number);
    },
    async addPrepTime(minutes) {
      await redis.lpush(PREP_TIMES, minutes);
      await redis.ltrim(PREP_TIMES, 0, PREP_SAMPLE - 1);
    },
    async prepTimes() {
      return ((await redis.lrange(PREP_TIMES, 0, -1)) || []).map(Number);
    },
    async create(order) {
      order.number = await redis.incr(NEXT_NUMBER);
      await redis.hset(ORDERS, { [order.id]: JSON.stringify(order) });
      await redis.sadd(ACTIVE, order.id);
      return order;
    },
    async update(id, patch) {
      const raw = await redis.hget(ORDERS, id);
      if (!raw) return null;
      const order = { ...parse(raw), ...patch };
      await redis.hset(ORDERS, { [id]: JSON.stringify(order) });
      if (isFinal(order.status)) await redis.srem(ACTIVE, id);
      return order;
    },
  };
  return store;
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
  db.prepTimes ??= [];
  const save = () => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
  };
  return {
    async list() {
      return db.orders;
    },
    async active() {
      return db.orders.filter((o) => !isFinal(o.status));
    },
    async get(ids) {
      return db.orders.filter((o) => ids.includes(o.id));
    },
    async soldOut() {
      return db.soldOut;
    },
    async setSoldOut(key, soldOut) {
      db.soldOut = db.soldOut.filter((k) => k !== key);
      if (soldOut) db.soldOut.push(key);
      save();
    },
    async addPrepTime(minutes) {
      db.prepTimes = [minutes, ...db.prepTimes].slice(0, PREP_SAMPLE);
      save();
    },
    async prepTimes() {
      return db.prepTimes;
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

export const store = hasRedis ? redisStore() : fileStore();
export const storeKind = hasRedis ? 'redis' : 'fichier';
