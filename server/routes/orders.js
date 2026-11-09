// Commandes : création par le client, suivi, et gestion par le comptoir.
import { Router } from 'express';
import { getMenu } from '../catalog.js';
import { customerMenu } from '../availability.js';
import { boardNumbers, waitTimes } from '../queue.js';
import { orderStatusChanged } from '../orderEvents.js';
import { cleanSubscription, pushEnabled } from '../push.js';
import { availableSlots, promoteDueOrders, takeawayFields } from '../takeaway.js';
import { ORDER_MODE, zonedParts } from '../../shared/pickup.js';
import { timeZone } from '../config.js';
import { store } from '../store.js';
import { notify } from '../events.js';
import { requireStaff } from '../auth.js';
import { handle, noStore } from '../http.js';
import { ORDER_STATUSES, isFinal } from '../../shared/orderStatus.js';
import { DEFAULT_LANGUAGE, isSupported } from '../../shared/i18n/index.js';
import { OrderError, buildLines, editLines, newOrder, orderTotal, assertEditable, assertTransition, statusChange } from '../orders.js';

// Nombre de tables de l'établissement : au-delà, la commande est refusée.
const MAX_TABLES = Math.min(999, parseInt(process.env.MAX_TABLES, 10) || 999);
// Les commandes de plus de 36 h restent stockées mais ne sont plus renvoyées au comptoir.
const RECENT_MS = 36 * 60 * 60 * 1000;
const MAX_TRACKED = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

// Jours (heure de l'établissement) couverts par les 36 dernières heures.
const recentDays = (now = Date.now()) => [...new Set([0, 1, 2].map((n) => zonedParts(now - n * DAY_MS, timeZone).date))];
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

// Sur place (numéro de table) ou à emporter (prénom et créneau éventuel).
async function placementOf(body, total) {
  if (body?.mode === ORDER_MODE.TAKEAWAY) return takeawayFields(body, total);
  return { mode: ORDER_MODE.DINE_IN, table: parseTable(body?.table) };
}

// Ce que le client voit de sa commande : le statut et le détail, rien de plus.
const publicView = ({ id, number, table, mode, customerName, pickupAt, status, total, lines, modifiedAt }, waitMinutes) => ({
  id,
  number,
  table,
  mode,
  customerName,
  pickupAt,
  status,
  total,
  modifiedAt,
  waitMinutes,
  lines: lines.map((l) => ({ qty: l.qty, name: l.name, options: l.options.map((o) => o.choice) })),
});

orderRoutes.get(
  '/track',
  handle(async (req, res) => {
    const ids = String(req.query.ids || '').split(',').filter((id) => ORDER_ID.test(id)).slice(0, MAX_TRACKED);
    const orders = await store.get(ids);
    const waits = await waitTimes(orders);
    noStore(res).json(orders.map((o) => publicView(o, waits[o.id] ?? null)));
  }),
);

// Le téléphone du client s'abonne aux notifications de sa commande (l'identifiant de commande fait office de preuve).
orderRoutes.post(
  '/:id/push',
  handle(async (req, res) => {
    if (!pushEnabled) return res.status(404).json({ error: 'Notifications non configurées' });
    if (!ORDER_ID.test(req.params.id)) throw new OrderError('Commande introuvable', { status: 404, code: 'order_not_found' });
    const order = await findOrder(req.params.id);
    if (isFinal(order.status)) throw new OrderError('Cette commande est terminée.', { status: 409, code: 'order_closed' });
    await store.addPushSubscription(order.id, cleanSubscription(req.body?.subscription));
    res.status(201).json({ ok: true });
  }),
);

orderRoutes.get(
  '/board',
  handle(async (_req, res) => {
    await promoteDueOrders();
    noStore(res).json(await boardNumbers());
  }),
);

orderRoutes.get(
  '/pickup-slots',
  handle(async (_req, res) => noStore(res).json(await availableSlots())),
);

orderRoutes.get(
  '/',
  requireStaff,
  handle(async (_req, res) => {
    await promoteDueOrders();
    const since = Date.now() - RECENT_MS;
    const orders = (await store.listByDays(recentDays())).filter((o) => new Date(o.createdAt).getTime() >= since);
    noStore(res).json(orders);
  }),
);

orderRoutes.post(
  '/',
  handle(async (req, res) => {
    const mode = req.body?.mode === ORDER_MODE.TAKEAWAY ? ORDER_MODE.TAKEAWAY : ORDER_MODE.DINE_IN;
    const lines = buildLines(req.body?.lines, await customerMenu(DEFAULT_LANGUAGE), mode);
    const placement = await placementOf(req.body, orderTotal(lines));
    const lang = isSupported(req.body?.lang) ? req.body.lang : DEFAULT_LANGUAGE;
    const order = await store.create(newOrder({ placement, lines, lang }));
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
    const current = await findOrder(req.params.id);
    assertTransition(current, status, from);
    const order = await store.update(current.id, statusChange(current, status));
    await orderStatusChanged(order, current.status);
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
