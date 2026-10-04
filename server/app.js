import express from 'express';
import { menu, findItem } from './menu.js';
import { store } from './store.js';
import { brand } from './config.js';
import { mountAuth, requireStaff } from './auth.js';

const STATUSES = ['nouvelle', 'en_cours', 'prete', 'servie', 'annulee'];
const round = (n) => Math.round(n * 100) / 100;

// Recalcule chaque ligne côté serveur à partir de la carte : le client ne fixe jamais les prix.
function buildLine(raw) {
  const item = findItem(raw?.itemId);
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
app.use(express.json());
mountAuth(app);

// Les commandes de plus de 36 h restent stockées mais ne sont plus renvoyées au comptoir.
const RECENT_MS = 36 * 60 * 60 * 1000;

app.get('/api/config', (_req, res) => res.json(brand));

app.get('/api/menu', async (_req, res, next) => {
  try {
    const soldOut = new Set(await store.soldOut());
    res.set('Cache-Control', 'no-store').json(
      menu.map((cat) => ({
        ...cat,
        items: cat.items.map((i) => ({ ...i, image: i.image ?? `/produits/${i.id}.jpg`, soldOut: soldOut.has(i.id) })),
      })),
    );
  } catch (e) {
    next(e);
  }
});

app.put('/api/menu/:itemId/availability', requireStaff, async (req, res, next) => {
  if (!findItem(req.params.itemId)) return res.status(404).json({ error: 'Produit inconnu' });
  try {
    await store.setSoldOut(req.params.itemId, !req.body?.available);
    res.json({ ok: true });
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
    built = lines.slice(0, 50).map(buildLine);
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
