// Commandes : création par le client, suivi, et gestion par le comptoir.
import { Router } from 'express';
import { getMenu } from '../catalog.js';
import { store } from '../store.js';
import { notify } from '../events.js';
import { requireStaff } from '../auth.js';
import { handle, noStore } from '../http.js';
import { ORDER_STATUSES } from '../../shared/orderStatus.js';
import { OrderError, buildLines, editLines, newOrder, orderTotal, assertEditable, assertTransition } from '../orders.js';

// Nombre de tables de l'établissement : au-delà, la commande est refusée.
const MAX_TABLES = Math.min(999, parseInt(process.env.MAX_TABLES, 10) || 999);
// Les commandes de plus de 36 h restent stockées mais ne sont plus renvoyées au comptoir.
const RECENT_MS = 36 * 60 * 60 * 1000;
const MAX_TRACKED = 20;
const ORDER_ID = /^[0-9a-f-]{36}$/i;

export const orderRoutes = Router();

async function findOrder(id) {
  const [order] = await store.get([id]);
  if (!order) throw new OrderError('Commande introuvable', { status: 404, code: 'order_not_found' });
  return order;
}

function parseTable(raw) {
  const table = parseInt(raw, 10);
  if (!table || table < 1 || table > MAX_TABLES) throw new OrderError('Numéro de table invalide', { code: 'invalid_table' });
  return table;
}

async function assertAvailable(lines) {
  const soldOut = new Set(await store.soldOut());
  const unavailable = lines.find((line) => soldOut.has(line.itemId));
  if (unavailable) {
    throw new OrderError(`Désolé, « ${unavailable.name} » vient d'être épuisé. Retirez-le du panier.`, {
      status: 409,
      code: 'item_sold_out',
    });
  }
}

// Ce que le client voit de sa commande : le statut et le détail, rien de plus.
const publicView = ({ id, number, table, status, total, lines, modifiedAt }) => ({
  id,
  number,
  table,
  status,
  total,
  modifiedAt,
  lines: lines.map((l) => ({ qty: l.qty, name: l.name, options: l.options.map((o) => o.choice) })),
});

orderRoutes.get(
  '/track',
  handle(async (req, res) => {
    const ids = String(req.query.ids || '').split(',').filter((id) => ORDER_ID.test(id)).slice(0, MAX_TRACKED);
    const orders = await store.get(ids);
    noStore(res).json(orders.map(publicView));
  }),
);

orderRoutes.get(
  '/',
  requireStaff,
  handle(async (_req, res) => {
    const since = Date.now() - RECENT_MS;
    const orders = (await store.list()).filter((o) => new Date(o.createdAt).getTime() >= since);
    noStore(res).json(orders);
  }),
);

orderRoutes.post(
  '/',
  handle(async (req, res) => {
    const table = parseTable(req.body?.table);
    const lines = buildLines(req.body?.lines, await getMenu());
    await assertAvailable(lines);
    const order = await store.create(newOrder({ table, lines }));
    await notify('orders');
    res.status(201).json(order);
  }),
);

orderRoutes.patch(
  '/:id',
  requireStaff,
  handle(async (req, res) => {
    const { status, from } = req.body || {};
    if (!ORDER_STATUSES.includes(status)) throw new OrderError('Statut invalide');
    assertTransition(await findOrder(req.params.id), status, from);
    const order = await store.update(req.params.id, { status, updatedAt: new Date().toISOString() });
    await notify('orders');
    res.json(order);
  }),
);

// basedOn : la version (modifiedAt) que l'employé a ouverte. Les lignes gardées sont désignées par leur position :
// si un collègue a modifié la commande entre-temps, ces positions ne désignent plus les mêmes articles.
orderRoutes.put(
  '/:id/lines',
  requireStaff,
  handle(async (req, res) => {
    const order = await findOrder(req.params.id);
    assertEditable(order);
    if (req.body && 'basedOn' in req.body && (order.modifiedAt ?? null) !== req.body.basedOn) {
      throw new OrderError(
        `Un collègue vient de modifier la commande n° ${order.number}. Fermez et rouvrez-la pour repartir de la version à jour.`,
        { status: 409, code: 'order_changed' },
      );
    }
    const lines = editLines(order, req.body?.lines, await getMenu());
    const now = new Date().toISOString();
    const updated = await store.update(order.id, { lines, total: orderTotal(lines), modifiedAt: now, updatedAt: now });
    await notify('orders');
    res.json(updated);
  }),
);
