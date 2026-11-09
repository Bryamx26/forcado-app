// File d'attente vue de l'extérieur de la cuisine : temps d'attente estimé et numéros pour l'écran de salle.
import { store } from './store.js';
import { kitchen } from './config.js';
import { ORDER_STATUS } from '../shared/orderStatus.js';
import { estimateWaitMinutes } from '../shared/kitchen.js';

// L'écran de salle ignore les commandes oubliées de la veille.
const BOARD_WINDOW_MS = 12 * 60 * 60 * 1000;

async function averagePrepMinutes() {
  const times = await store.prepTimes();
  return times.length ? times.reduce((sum, t) => sum + t, 0) / times.length : kitchen.defaultPrepMin;
}

// { idCommande: minutes } pour les commandes données qui attendent encore.
export async function waitTimes(orders) {
  if (!orders.some((o) => o.status === ORDER_STATUS.NEW || o.status === ORDER_STATUS.PREPARING)) return {};
  const [active, averageMinutes] = await Promise.all([store.active(), averagePrepMinutes()]);
  const context = { averageMinutes, capacity: kitchen.capacity, now: Date.now() };
  return Object.fromEntries(orders.map((o) => [o.id, estimateWaitMinutes(o, active, context)]));
}

// Seulement des numéros : ni table, ni contenu, ni prix.
export async function boardNumbers() {
  const since = Date.now() - BOARD_WINDOW_MS;
  const recent = (await store.active()).filter((o) => new Date(o.createdAt).getTime() >= since);
  const numbersWith = (...statuses) => recent.filter((o) => statuses.includes(o.status)).map((o) => o.number);
  return {
    preparing: numbersWith(ORDER_STATUS.NEW, ORDER_STATUS.PREPARING),
    ready: numbersWith(ORDER_STATUS.READY),
  };
}
