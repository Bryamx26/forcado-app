// Réactions à un changement de statut d'une commande, regroupées en un seul endroit.
import { store } from './store.js';
import { notify } from './events.js';
import { ORDER_STATUS } from '../shared/orderStatus.js';
import { minutesBetween } from '../shared/kitchen.js';

export async function orderStatusChanged(order, previousStatus) {
  if (order.status === ORDER_STATUS.READY && previousStatus !== ORDER_STATUS.READY) {
    await store.addPrepTime(minutesBetween(order.createdAt, Date.now()));
  }
  await notify('orders');
}
