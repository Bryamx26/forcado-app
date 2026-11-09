// Stockage des commandes et des ruptures de stock.
// Postgres si DATABASE_URL existe, sinon Redis Upstash, sinon fichier data/orders.json (voir backend.js).
// Toutes les versions offrent les mêmes fonctions : les routes ne savent pas laquelle tourne.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';
import { redisConfig, dataKind, commerceId } from './backend.js';
import { pool, ensureCommerce } from './db/pool.js';

const isRecent = (since) => (o) => !since || new Date(o.createdAt).getTime() >= since;

// Une ligne de la table orders, remise dans la forme utilisée par l'app.
const fromRow = (r) => ({
  id: r.id,
  number: r.number,
  table: r.table_number,
  status: r.status,
  total: r.total,
  lines: r.lines,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
  ...(r.modified_at && { modifiedAt: r.modified_at.toISOString() }),
});

// Champs qu'une modification peut changer, et leur colonne.
const COLUMNS = { status: 'status', lines: 'lines', total: 'total', updatedAt: 'updated_at', modifiedAt: 'modified_at' };

function pgStore() {
  const q = async (sql, params) => {
    await ensureCommerce();
    return (await pool.query(sql, params)).rows;
  };
  return {
    async get(ids) {
      if (!ids.length) return [];
      return (await q('SELECT * FROM orders WHERE commerce_id = $1 AND id = ANY($2::uuid[])', [commerceId, ids])).map(fromRow);
    },
    async soldOut() {
      return (await q('SELECT item_id FROM sold_out WHERE commerce_id = $1', [commerceId])).map((r) => r.item_id);
    },
    async setSoldOut(itemId, soldOut) {
      await q(
        soldOut
          ? 'INSERT INTO sold_out (commerce_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING'
          : 'DELETE FROM sold_out WHERE commerce_id = $1 AND item_id = $2',
        [commerceId, itemId],
      );
    },
    // since : ne renvoie que les commandes créées après cet instant (en ms). Le tri se fait dans la base.
    async list({ since } = {}) {
      return (
        await q('SELECT * FROM orders WHERE commerce_id = $1 AND created_at >= $2 ORDER BY number', [
          commerceId,
          new Date(since || 0),
        ])
      ).map(fromRow);
    },
    // Le numéro est réservé et la commande insérée dans la même requête : deux commandes simultanées
    // ne peuvent pas recevoir le même numéro.
    async create(order) {
      const [row] = await q(
        `WITH n AS (
           UPDATE commerces SET next_number = next_number + 1 WHERE id = $1 RETURNING next_number - 1 AS number
         )
         INSERT INTO orders (id, commerce_id, number, table_number, status, total, lines, created_at, updated_at)
         SELECT $2, $1, n.number, $3, $4, $5, $6, $7, $8 FROM n
         RETURNING *`,
        [commerceId, order.id, order.table, order.status, order.total, JSON.stringify(order.lines), order.createdAt, order.updatedAt],
      );
      return fromRow(row);
    },
    // Une seule requête UPDATE : pas de lecture puis réécriture, donc pas de geste d'un collègue écrasé.
    async update(id, patch) {
      const sets = [];
      const params = [commerceId, id];
      for (const [key, column] of Object.entries(COLUMNS)) {
        if (!(key in patch)) continue;
        params.push(key === 'lines' ? JSON.stringify(patch[key]) : patch[key]);
        sets.push(`${column} = $${params.length}`);
      }
      if (!sets.length) return (await this.get([id]))[0] ?? null;
      const [row] = await q(`UPDATE orders SET ${sets.join(', ')} WHERE commerce_id = $1 AND id = $2 RETURNING *`, params);
      return row ? fromRow(row) : null;
    },
  };
}

function redisStore() {
  const redis = new Redis(redisConfig);
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
    async list({ since } = {}) {
      const all = (await redis.hgetall(KEY)) || {};
      return Object.values(all)
        .map(parse)
        .filter(isRecent(since))
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
    async list({ since } = {}) {
      return db.orders.filter(isRecent(since));
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

const stores = { postgres: pgStore, redis: redisStore, fichier: fileStore };
export const store = stores[dataKind]();
export const storeKind = dataKind;
