// Calculs de la cuisine : urgence d'un ticket, quantités à sortir, temps d'attente estimé.
import { ORDER_STATUS } from './orderStatus.js';

export const URGENCY = Object.freeze({ OK: 'ok', WARN: 'warn', LATE: 'late' });

export const minutesBetween = (fromIso, toMs) => Math.max(0, Math.floor((toMs - new Date(fromIso).getTime()) / 60000));

// thresholds : { warnAfterMin, lateAfterMin } (configuration KITCHEN_WARN_MIN, KITCHEN_LATE_MIN).
export function urgencyOf(minutes, thresholds) {
  if (minutes >= thresholds.lateAfterMin) return URGENCY.LATE;
  if (minutes >= thresholds.warnAfterMin) return URGENCY.WARN;
  return URGENCY.OK;
}

const lineLabel = (line) => [line.name, ...line.options.map((o) => o.choice)].join(' · ');

// Total par article et par variante sur toutes les commandes à préparer (« 12 × Pastel de nata · Cannelle »).
export function countItemsToPrepare(orders) {
  const totals = new Map();
  for (const line of orders.flatMap((o) => o.lines)) {
    const label = lineLabel(line);
    totals.set(label, (totals.get(label) || 0) + line.qty);
  }
  return [...totals].map(([label, qty]) => ({ label, qty })).sort((a, b) => b.qty - a.qty || a.label.localeCompare(b.label));
}

const readyAt = (order) => order.statusHistory?.find((h) => h.status === ORDER_STATUS.READY)?.at;

// Temps moyen entre l'envoi et « prête » sur les dernières commandes ; null sans historique.
export function averagePrepMinutes(orders, sample = 20) {
  const durations = orders
    .filter(readyAt)
    .sort((a, b) => new Date(readyAt(b)) - new Date(readyAt(a)))
    .slice(0, sample)
    .map((o) => (new Date(readyAt(o)) - new Date(o.createdAt)) / 60000);
  if (!durations.length) return null;
  return durations.reduce((sum, d) => sum + d, 0) / durations.length;
}

const isWaiting = (order) => order.status === ORDER_STATUS.NEW || order.status === ORDER_STATUS.PREPARING;

// Estimation affichée au client : le temps moyen de préparation, plus la file devant lui partagée entre les
// commandes que la cuisine prépare en même temps (capacity), moins le temps déjà attendu. Une minute au moins.
export function estimateWaitMinutes(order, activeOrders, { averageMinutes, capacity, now }) {
  if (!isWaiting(order) || averageMinutes == null) return null;
  const ahead = activeOrders.filter((o) => isWaiting(o) && o.createdAt < order.createdAt).length;
  const elapsed = minutesBetween(order.createdAt, now);
  return Math.max(1, Math.round(averageMinutes + (ahead * averageMinutes) / capacity - elapsed));
}
