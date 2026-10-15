// Carte modifiable : catégories, articles, options et photos, stockés dans Redis (ou en local dans data/).
// La carte est un seul document JSON (elle reste petite) ; les photos sont stockées à part.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';
import { defaultMenu } from './menu.js';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const MENU_KEY = 'forcado:menu';
const IMAGE_PREFIX = 'forcado:image:';
const MAX_IMAGE_BYTES = 600 * 1024;

function redisBackend() {
  const redis = new Redis({ url: redisUrl, token: redisToken, automaticDeserialization: false });
  return {
    async readMenu() {
      const raw = await redis.get(MENU_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    async writeMenu(menu) {
      await redis.set(MENU_KEY, JSON.stringify(menu));
    },
    async readImage(id) {
      return redis.get(IMAGE_PREFIX + id);
    },
    async writeImage(id, base64) {
      await redis.set(IMAGE_PREFIX + id, base64);
    },
    async deleteImage(id) {
      await redis.del(IMAGE_PREFIX + id);
    },
  };
}

function fileBackend() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
  const menuFile = path.join(root, 'menu.json');
  const imageDir = path.join(root, 'images');
  return {
    async readMenu() {
      try {
        return JSON.parse(fs.readFileSync(menuFile, 'utf8'));
      } catch {
        return null;
      }
    },
    async writeMenu(menu) {
      fs.mkdirSync(root, { recursive: true });
      fs.writeFileSync(menuFile, JSON.stringify(menu, null, 2));
    },
    async readImage(id) {
      try {
        return fs.readFileSync(path.join(imageDir, `${id}.jpg`)).toString('base64');
      } catch {
        return null;
      }
    },
    async writeImage(id, base64) {
      fs.mkdirSync(imageDir, { recursive: true });
      fs.writeFileSync(path.join(imageDir, `${id}.jpg`), Buffer.from(base64, 'base64'));
    },
    async deleteImage(id) {
      fs.rmSync(path.join(imageDir, `${id}.jpg`), { force: true });
    },
  };
}

const backend = redisUrl && redisToken ? redisBackend() : fileBackend();

export class CatalogError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const newId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
const round = (n) => Math.round(n * 100) / 100;

export async function getMenu() {
  const menu = await backend.readMenu();
  if (menu) return menu;
  const seeded = structuredClone(defaultMenu);
  await backend.writeMenu(seeded);
  return seeded;
}

export async function findItem(id) {
  for (const cat of await getMenu()) {
    const item = cat.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}

// --- Validation -----------------------------------------------------------

function text(value, label, max, { required = false } = {}) {
  const v = String(value ?? '').trim();
  if (required && !v) throw new CatalogError(`${label} est obligatoire`);
  if (v.length > max) throw new CatalogError(`${label} : ${max} caractères maximum`);
  return v;
}

function price(value, label, min, max) {
  const n = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n < min || n > max) throw new CatalogError(`${label} invalide`);
  return round(n);
}

function cleanOptions(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > 10) throw new CatalogError('10 groupes d\'options maximum');
  return raw.map((g, gi) => {
    const name = text(g?.name, `Nom du groupe d'options n° ${gi + 1}`, 40, { required: true });
    const type = g?.type === 'multi' ? 'multi' : 'single';
    const choices = Array.isArray(g?.choices) ? g.choices : [];
    if (!choices.length) throw new CatalogError(`Le groupe « ${name} » doit avoir au moins un choix`);
    if (choices.length > 20) throw new CatalogError(`Le groupe « ${name} » : 20 choix maximum`);
    const ids = new Set();
    return {
      id: g?.id && /^[\w-]{1,40}$/.test(g.id) ? g.id : newId('opt'),
      name,
      type,
      required: type === 'single' ? g?.required !== false : false,
      choices: choices.map((c, ci) => {
        let id = c?.id && /^[\w-]{1,40}$/.test(c.id) && !ids.has(c.id) ? c.id : newId('choix');
        ids.add(id);
        return {
          id,
          name: text(c?.name, `Choix n° ${ci + 1} du groupe « ${name} »`, 40, { required: true }),
          price: price(c?.price ?? 0, `Supplément de « ${c?.name || ci + 1} »`, -100, 100),
        };
      }),
    };
  });
}

function cleanImage(value) {
  if (value == null || value === '') return null;
  const v = String(value);
  if (/^\/api\/images\/[\w-]+$/.test(v) || /^\/produits\/[\w.-]+$/.test(v)) return v;
  throw new CatalogError('Photo invalide');
}

function cleanItem(raw) {
  return {
    name: text(raw?.name, 'Le nom', 60, { required: true }),
    description: text(raw?.description, 'La description', 200),
    price: price(raw?.price, 'Prix', 0, 1000),
    emoji: text(raw?.emoji, "L'emoji", 8) || '🍽️',
    image: cleanImage(raw?.image),
    options: cleanOptions(raw?.options),
  };
}

// --- Modifications ---------------------------------------------------------

async function mutate(fn) {
  const menu = await getMenu();
  const result = await fn(menu);
  await backend.writeMenu(menu);
  return result;
}

function locate(menu, itemId) {
  for (const cat of menu) {
    const index = cat.items.findIndex((i) => i.id === itemId);
    if (index !== -1) return { cat, index, item: cat.items[index] };
  }
  throw new CatalogError('Article introuvable', 404);
}

function category(menu, id) {
  const cat = menu.find((c) => c.id === id);
  if (!cat) throw new CatalogError('Catégorie introuvable', 404);
  return cat;
}

function move(list, index, dir) {
  const to = index + (dir === 'up' ? -1 : 1);
  if (to < 0 || to >= list.length) return;
  [list[index], list[to]] = [list[to], list[index]];
}

// Supprime une photo envoyée depuis l'app quand plus aucun article ne l'utilise.
async function dropImage(url, menu) {
  const m = /^\/api\/images\/([\w-]+)$/.exec(url || '');
  if (!m) return;
  if (menu.some((c) => c.items.some((i) => i.image === url))) return;
  await backend.deleteImage(m[1]);
}

export const catalog = {
  addCategory: (raw) =>
    mutate((menu) => {
      const cat = { id: newId('cat'), name: text(raw?.name, 'Le nom de la catégorie', 40, { required: true }), items: [] };
      menu.push(cat);
      return cat;
    }),

  renameCategory: (id, raw) =>
    mutate((menu) => {
      const cat = category(menu, id);
      cat.name = text(raw?.name, 'Le nom de la catégorie', 40, { required: true });
      return cat;
    }),

  deleteCategory: (id) =>
    mutate((menu) => {
      const cat = category(menu, id);
      if (cat.items.length) throw new CatalogError('Videz la catégorie avant de la supprimer', 409);
      menu.splice(menu.indexOf(cat), 1);
      return { ok: true };
    }),

  moveCategory: (id, dir) =>
    mutate((menu) => {
      move(menu, menu.indexOf(category(menu, id)), dir);
      return { ok: true };
    }),

  addItem: (raw) =>
    mutate((menu) => {
      const cat = category(menu, raw?.categoryId);
      const item = { id: newId('art'), ...cleanItem(raw) };
      cat.items.push(item);
      return item;
    }),

  updateItem: (id, raw) =>
    mutate(async (menu) => {
      const found = locate(menu, id);
      const oldImage = found.item.image;
      const item = { id, ...cleanItem(raw) };
      const target = raw?.categoryId ? category(menu, raw.categoryId) : found.cat;
      if (target === found.cat) {
        found.cat.items[found.index] = item;
      } else {
        found.cat.items.splice(found.index, 1);
        target.items.push(item);
      }
      if (oldImage !== item.image) await dropImage(oldImage, menu);
      return item;
    }),

  deleteItem: (id) =>
    mutate(async (menu) => {
      const { cat, index, item } = locate(menu, id);
      cat.items.splice(index, 1);
      await dropImage(item.image, menu);
      return { ok: true };
    }),

  moveItem: (id, dir) =>
    mutate((menu) => {
      const { cat, index } = locate(menu, id);
      move(cat.items, index, dir);
      return { ok: true };
    }),
};

// Photo envoyée par l'app (déjà réduite par le navigateur), en data URL JPEG/PNG/WebP.
export async function saveImage(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new CatalogError('Format de photo non pris en charge (JPG, PNG ou WebP)');
  if (Buffer.byteLength(m[2], 'base64') > MAX_IMAGE_BYTES) throw new CatalogError('Photo trop lourde');
  const id = `${m[1]}-${crypto.randomBytes(8).toString('hex')}`;
  await backend.writeImage(id, m[2]);
  return { url: `/api/images/${id}` };
}

export async function readImage(id) {
  if (!/^(jpeg|png|webp)-[a-f0-9]{16}$/.test(id)) return null;
  const data = await backend.readImage(id);
  return data ? { type: `image/${id.split('-')[0]}`, buffer: Buffer.from(data, 'base64') } : null;
}
