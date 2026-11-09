// Copie les données actuelles (Redis Upstash, ou à défaut les fichiers de data/) dans Postgres, pour un commerce.
// Rien n'est effacé à la source : on peut relancer le script, les commandes déjà copiées sont ignorées.
// Usage : DATABASE_URL=postgres://… UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=… COMMERCE_ID=forcado npm run db:import
import fs from 'node:fs';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { redisConfig, commerceId } from '../server/backend.js';
import { pool, ensureCommerce, transaction } from '../server/db/pool.js';

if (!pool) {
  console.error('DATABASE_URL (ou POSTGRES_URL) manquant.');
  process.exit(1);
}

async function fromRedis() {
  const redis = new Redis({ ...redisConfig, automaticDeserialization: false });
  const parse = (v) => (v ? JSON.parse(v) : null);
  const orders = Object.values((await redis.hgetall('forcado:orders')) || {}).map(parse);
  const images = {};
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, { match: 'forcado:image:*', count: 200 });
    for (const key of keys) images[key.slice('forcado:image:'.length)] = await redis.get(key);
    cursor = String(next);
  } while (cursor !== '0');
  return {
    orders,
    menu: parse(await redis.get('forcado:menu')),
    soldOut: (await redis.smembers('forcado:sold-out')) || [],
    nextNumber: Number(await redis.get('forcado:next-number')) + 1,
    images,
  };
}

function fromFiles() {
  const dir = path.resolve('data');
  const read = (f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch {
      return null;
    }
  };
  const db = read('orders.json') || { nextNumber: 1, orders: [] };
  const images = {};
  const imageDir = path.join(dir, 'images');
  if (fs.existsSync(imageDir)) {
    for (const f of fs.readdirSync(imageDir)) images[f.replace(/\.jpg$/, '')] = fs.readFileSync(path.join(imageDir, f)).toString('base64');
  }
  return { orders: db.orders, menu: read('menu.json'), soldOut: db.soldOut || [], nextNumber: db.nextNumber, images };
}

const source = redisConfig ? 'Redis' : 'data/';
const data = redisConfig ? await fromRedis() : fromFiles();
await ensureCommerce();

const copied = await transaction(async (db) => {
  let count = 0;
  for (const o of data.orders) {
    const { rowCount } = await db.query(
      `INSERT INTO orders (id, commerce_id, number, table_number, status, total, lines, created_at, updated_at, modified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
      [o.id, commerceId, o.number, o.table, o.status, o.total, JSON.stringify(o.lines), o.createdAt, o.updatedAt || o.createdAt, o.modifiedAt || null],
    );
    count += rowCount;
  }
  if (data.menu) {
    await db.query(
      `INSERT INTO menus (commerce_id, data) VALUES ($1, $2)
       ON CONFLICT (commerce_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [commerceId, JSON.stringify(data.menu)],
    );
  }
  for (const itemId of data.soldOut) {
    await db.query('INSERT INTO sold_out (commerce_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [commerceId, itemId]);
  }
  for (const [id, base64] of Object.entries(data.images)) {
    if (!base64) continue;
    await db.query('INSERT INTO images (id, commerce_id, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [
      id,
      commerceId,
      Buffer.from(base64, 'base64'),
    ]);
  }
  // Les prochains numéros continuent après les commandes copiées.
  await db.query(
    `UPDATE commerces SET next_number = GREATEST(next_number, $2, (SELECT COALESCE(MAX(number), 0) + 1 FROM orders WHERE commerce_id = $1))
     WHERE id = $1`,
    [commerceId, data.nextNumber || 1],
  );
  return count;
});

await pool.end();
console.log(
  `Depuis ${source} vers le commerce « ${commerceId} » : ${copied} commande(s) copiée(s) sur ${data.orders.length}, ` +
    `carte ${data.menu ? 'copiée' : 'absente'}, ${data.soldOut.length} rupture(s), ${Object.keys(data.images).length} photo(s).`,
);
