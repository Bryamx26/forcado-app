// Réactions à un changement de statut d'une commande, regroupées en un seul endroit.
import { store } from './store.js';
import { notify } from './events.js';
import { notifyOrder } from './push.js';
import { ORDER_STATUS, isFinal } from '../shared/orderStatus.js';
import { minutesBetween } from '../shared/kitchen.js';
import { translate } from '../shared/i18n/index.js';

// Texte de la notification « prête », dans la langue choisie par le client.
export function readyMessage(order) {
  return {
    title: translate(order.lang, 'push.readyTitle', { number: order.number }),
    body: translate(order.lang, 'push.readyTable', { table: order.table }),
    url: `/table/${order.table}`,
    tag: order.id,
  };
}

export async function orderStatusChanged(order, previousStatus) {
  const becameReady = order.status === ORDER_STATUS.READY && previousStatus !== ORDER_STATUS.READY;
  if (becameReady) {
    await store.addPrepTime(minutesBetween(order.createdAt, Date.now()));
    await notifyOrder(order, readyMessage(order));
  }
  if (isFinal(order.status)) await store.dropPushSubscriptions(order.id);
  await notify('orders');
}
