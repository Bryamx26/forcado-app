// Stockage des commandes.
// Sur Vercel (pas de disque persistant) : Redis Upstash, activé dès que ses variables d'environnement existent.
// En local : fichier data/orders.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasRedis, redisClient } from './redis.js';
import { isFinal } from '../shared/orderStatus.js';
import { zonedParts } from '../shared/pickup.js';
import { timeZone } from './config.js';

const ORDERS = 'forcado:orders';
const SOLD_OUT = 'forcado:sold-out';
const NEXT_NUMBER = 'forcado:next-number';
// Index des commandes en cours (ni servies ni annulées) : la cuisine, l'écran de salle et l'estimation d'attente
// le lisent sans parcourir tout l'historique.
const ACTIVE = 'forcado:orders:active';
const ACTIVE_READY = 'forcado:orders:active:v1';
const BACKFILL_MS = 36 * 60 * 60 * 1000;
// Index des commandes par jour (heure de l'établissement), pour le comptoir et les statistiques.
const DAY_PREFIX = 'forcado:orders:day:';
const DAY_READY = 'forcado:orders:day:v1';
const orderDay = (order) => zonedParts(Date.parse(order.createdAt), timeZone).date;
// Durées de préparation des dernières commandes (minutes), pour estimer l'attente.
const PREP_TIMES = 'forcado:prep-times';
const PREP_SAMPLE = 20;
// Abonnements aux notifications d'une commande : quelques téléphones au plus, oubliés après une journée.
const PUSH_PREFIX = 'forcado:push:';
const PUSH_TTL_SEC = 24 * 60 * 60;
const MAX_PUSH_PER_ORDER = 3;

function redisStore() {
  const redis = redisClient();
  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
  let activeIndexChecked = false;
  let dayIndexChecked = false;

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

  // Les commandes passées avant l'index par jour y sont rangées une seule fois.
  async function ensureDayIndex() {
    if (dayIndexChecked) return;
    dayIndexChecked = true;
    if (await redis.get(DAY_READY)) return;
    const byDay = {};
    for (const order of await readAll()) (byDay[orderDay(order)] ||= []).push(order.id);
    for (const [day, ids] of Object.entries(byDay)) await redis.sadd(DAY_PREFIX + day, ...ids);
    await redis.set(DAY_READY, '1');
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
    // days : jours AAAA-MM-JJ ; commandes triées par numéro.
    async listByDays(days) {
      await ensureDayIndex();
      const idLists = await Promise.all(days.map((day) => redis.smembers(DAY_PREFIX + day)));
      return (await store.get(idLists.flat())).sort((a, b) => a.number - b.number);
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
    async addPushSubscription(orderId, subscription) {
      const key = PUSH_PREFIX + orderId;
      if ((await redis.scard(key)) >= MAX_PUSH_PER_ORDER) return;
      await redis.sadd(key, JSON.stringify(subscription));
      await redis.expire(key, PUSH_TTL_SEC);
    },
    async pushSubscriptions(orderId) {
      return ((await redis.smembers(PUSH_PREFIX + orderId)) || []).map(parse);
    },
    async removePushSubscription(orderId, subscription) {
      await redis.srem(PUSH_PREFIX + orderId, JSON.stringify(subscription));
    },
    async dropPushSubscriptions(orderId) {
      await redis.del(PUSH_PREFIX + orderId);
    },
    async create(order) {
      order.number = await redis.incr(NEXT_NUMBER);
      await redis.hset(ORDERS, { [order.id]: JSON.stringify(order) });
      await redis.sadd(ACTIVE, order.id);
      await redis.sadd(DAY_PREFIX + orderDay(order), order.id);
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
  // En local, les abonnements aux notifications restent en mémoire.
  const pushByOrder = new Map();
  const save = () => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
  };
  return {
    async listByDays(days) {
      return db.orders.filter((o) => days.includes(orderDay(o)));
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
    async addPushSubscription(orderId, subscription) {
      const list = pushByOrder.get(orderId) || [];
      if (list.length < MAX_PUSH_PER_ORDER) pushByOrder.set(orderId, [...list, subscription]);
    },
    async pushSubscriptions(orderId) {
      return pushByOrder.get(orderId) || [];
    },
    async removePushSubscription(orderId, subscription) {
      pushByOrder.set(orderId, (pushByOrder.get(orderId) || []).filter((s) => s.endpoint !== subscription.endpoint));
    },
    async dropPushSubscriptions(orderId) {
      pushByOrder.delete(orderId);
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
