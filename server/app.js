import express from 'express';
import { menu, findItem } from './menu.js';
import { store } from './store.js';

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

app.get('/api/menu', (_req, res) => res.json(menu));

app.get('/api/orders', async (req, res, next) => {
  try {
    let orders = await store.list();
    if (req.query.ids) {
      const ids = String(req.query.ids).split(',');
      orders = orders.filter((o) => ids.includes(o.id));
    }
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
  const now = new Date().toISOString();
  try {
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

app.patch('/api/orders/:id', async (req, res, next) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  try {
    const order = await store.update(req.params.id, { status, updatedAt: new Date().toISOString() });
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
