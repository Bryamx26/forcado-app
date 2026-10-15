import express from 'express';
import { getMenu, findItem, catalog, saveImage, readImage, CatalogError } from './catalog.js';
import { store } from './store.js';
import { brand } from './config.js';
import { mountAuth, requireStaff } from './auth.js';
import { mountEvents, notify } from './events.js';

const STATUSES = ['nouvelle', 'en_cours', 'prete', 'servie', 'annulee'];
const round = (n) => Math.round(n * 100) / 100;

// Recalcule chaque ligne côté serveur à partir de la carte : le client ne fixe jamais les prix.
function buildLine(raw, menu) {
  const item = menu.flatMap((c) => c.items).find((i) => i.id === raw?.itemId);
  if (!item) throw new Error('Produit inconnu');
  const qty = Math.max(1, Math.min(20, parseInt(raw.qty, 10) || 1));
  const chosen = raw.options || {};
  const options = [];
  let unit = item.price;
  for (const group of item.options) {
    let ids = chosen[group.id] ?? [];
    if (!Array.isArray(ids)) ids = [ids];
    if (group.type === 'single') ids = ids.slice(0, 1);
    const choices = ids.map((id) => group.choices.find((c) => c.id === id)).filter(Boolean);
    if (group.required && choices.length === 0) throw new Error(`Choix manquant : ${item.name} / ${group.name}`);
    for (const c of choices) {
      unit += c.price;
      options.push({ group: group.name, choice: c.name });
    }
  }
  return {
    itemId: item.id,
    name: item.name,
    emoji: item.emoji,
    qty,
    options,
    note: String(raw.note || '').slice(0, 200),
    unitPrice: round(unit),
    total: round(unit * qty),
  };
}

const app = express();
app.use(express.json({ limit: '1mb' }));
mountAuth(app);
mountEvents(app);

// Les commandes de plus de 36 h restent stockées mais ne sont plus renvoyées au comptoir.
const RECENT_MS = 36 * 60 * 60 * 1000;

app.get('/api/config', (_req, res) => res.json(brand));

app.get('/api/menu', async (_req, res, next) => {
  try {
    const soldOut = new Set(await store.soldOut());
    res.set('Cache-Control', 'no-store').json(
      (await getMenu()).map((cat) => ({
        ...cat,
        items: cat.items.map((i) => ({ ...i, soldOut: soldOut.has(i.id) })),
      })),
    );
  } catch (e) {
    next(e);
  }
});

app.put('/api/menu/:itemId/availability', requireStaff, async (req, res, next) => {
  try {
    if (!(await findItem(req.params.itemId))) return res.status(404).json({ error: 'Produit inconnu' });
    await store.setSoldOut(req.params.itemId, !req.body?.available);
    await notify('menu');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Gestion de la carte par les employés : chaque route renvoie l'élément modifié et prévient les écrans.
const admin = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req);
    await notify('menu');
    res.json(result);
  } catch (e) {
    if (e instanceof CatalogError) return res.status(e.status).json({ error: e.message });
    next(e);
  }
};
app.post('/api/admin/categories', requireStaff, admin((req) => catalog.addCategory(req.body)));
app.patch('/api/admin/categories/:id', requireStaff, admin((req) => catalog.renameCategory(req.params.id, req.body)));
app.delete('/api/admin/categories/:id', requireStaff, admin((req) => catalog.deleteCategory(req.params.id)));
app.post('/api/admin/categories/:id/move', requireStaff, admin((req) => catalog.moveCategory(req.params.id, req.body?.dir)));
app.post('/api/admin/items', requireStaff, admin((req) => catalog.addItem(req.body)));
app.put('/api/admin/items/:id', requireStaff, admin((req) => catalog.updateItem(req.params.id, req.body)));
app.delete('/api/admin/items/:id', requireStaff, async (req, res, next) => {
  try {
    await catalog.deleteItem(req.params.id);
    await store.setSoldOut(req.params.id, false);
    await notify('menu');
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof CatalogError) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});
app.post('/api/admin/items/:id/move', requireStaff, admin((req) => catalog.moveItem(req.params.id, req.body?.dir)));

app.post('/api/admin/images', requireStaff, async (req, res, next) => {
  try {
    res.json(await saveImage(req.body?.dataUrl));
  } catch (e) {
    if (e instanceof CatalogError) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

// Une photo ne change jamais (une nouvelle photo a une nouvelle adresse) : cache long.
app.get('/api/images/:id', async (req, res, next) => {
  try {
    const image = await readImage(req.params.id);
    if (!image) return res.status(404).end();
    res.set({ 'Content-Type': image.type, 'Cache-Control': 'public, max-age=31536000, immutable' }).send(image.buffer);
  } catch (e) {
    next(e);
  }
});

// Suivi côté client : uniquement ses propres commandes, et seulement leur statut.
app.get('/api/orders/track', async (req, res, next) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 20);
  try {
    const orders = await store.get(ids);
    res.set('Cache-Control', 'no-store').json(
      orders.map(({ id, number, table, status, total }) => ({ id, number, table, status, total })),
    );
  } catch (e) {
    next(e);
  }
});

app.get('/api/orders', requireStaff, async (_req, res, next) => {
  try {
    const since = Date.now() - RECENT_MS;
    const orders = (await store.list()).filter((o) => new Date(o.createdAt).getTime() >= since);
    res.set('Cache-Control', 'no-store').json(orders);
  } catch (e) {
    next(e);
  }
});

app.post('/api/orders', async (req, res, next) => {
  const table = parseInt(req.body?.table, 10);
  if (!table || table < 1 || table > 999) return res.status(400).json({ error: 'Numéro de table invalide' });
  const lines = req.body?.lines;
  if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'Le panier est vide' });
  let built;
  try {
    const menu = await getMenu();
    built = lines.slice(0, 50).map((l) => buildLine(l, menu));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  try {
    const soldOut = new Set(await store.soldOut());
    const unavailable = built.find((l) => soldOut.has(l.itemId));
    if (unavailable) {
      return res.status(409).json({ error: `Désolé, « ${unavailable.name} » vient d'être épuisé. Retirez-le du panier.` });
    }
    const now = new Date().toISOString();
    const order = await store.create({
      id: crypto.randomUUID(),
      table,
      lines: built,
      total: round(built.reduce((s, l) => s + l.total, 0)),
      status: 'nouvelle',
      createdAt: now,
      updatedAt: now,
    });
    await notify('orders');
    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
});

app.patch('/api/orders/:id', requireStaff, async (req, res, next) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  const patch = { status, updatedAt: new Date().toISOString() };
  if (status === 'en_cours' && req.staff.name) patch.handledBy = req.staff.name;
  try {
    const order = await store.update(req.params.id, patch);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    await notify('orders');
    res.json(order);
  } catch (e) {
    next(e);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur du serveur' });
});

export default app;
