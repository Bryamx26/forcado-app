// À emporter et précommande : créneaux de retrait, validation, et entrée en cuisine au bon moment.
import { takeaway } from './config.js';
import { store } from './store.js';
import { OrderError, statusChange } from './orders.js';
import { notify } from './events.js';
import { ORDER_STATUS } from '../shared/orderStatus.js';
import { MAX_CUSTOMER_NAME, ORDER_MODE, parseOpeningHours, pickupSlots } from '../shared/pickup.js';

const week = parseOpeningHours(takeaway.openingHours);

function slotLoad(activeOrders) {
  const taken = {};
  for (const order of activeOrders) if (order.pickupAt) taken[order.pickupAt] = (taken[order.pickupAt] || 0) + 1;
  return taken;
}

export async function availableSlots(now = Date.now()) {
  return pickupSlots({
    now,
    week,
    timeZone: takeaway.timeZone,
    slotMin: takeaway.slotMin,
    leadMin: takeaway.leadMin,
    capacity: takeaway.slotCapacity,
    taken: slotLoad(await store.active()),
  });
}

function cleanName(raw) {
  const name = String(raw ?? '').trim().slice(0, MAX_CUSTOMER_NAME);
  if (!name) throw new OrderError('Prénom manquant', { code: 'name_required' });
  return name;
}

async function cleanPickupAt(raw, total) {
  if (raw == null || raw === '') return null;
  const slot = (await availableSlots()).find((s) => s.at === raw);
  if (!slot || slot.full) throw new OrderError('Ce créneau n\'est plus disponible.', { status: 409, code: 'slot_unavailable' });
  if (total > takeaway.preorderMaxTotal) {
    throw new OrderError(`Précommande limitée à ${takeaway.preorderMaxTotal} €.`, {
      code: 'preorder_too_large',
      vars: { max: takeaway.preorderMaxTotal },
    });
  }
  return slot.at;
}

// Une précommande dont la préparation n'a pas encore à commencer attend en « planifiée ».
function initialStatus(pickupAt, now = Date.now()) {
  if (!pickupAt) return ORDER_STATUS.NEW;
  const startsAt = Date.parse(pickupAt) - takeaway.prepLeadMin * 60000;
  return startsAt > now ? ORDER_STATUS.SCHEDULED : ORDER_STATUS.NEW;
}

// Champs d'une commande à emporter : prénom, créneau (facultatif) et statut de départ.
export async function takeawayFields(body, total) {
  if (!takeaway.enabled) throw new OrderError('La commande à emporter n\'est pas ouverte.', { code: 'takeaway_closed' });
  const customerName = cleanName(body?.customerName);
  const pickupAt = await cleanPickupAt(body?.pickupAt, total);
  return { mode: ORDER_MODE.TAKEAWAY, table: null, customerName, pickupAt, status: initialStatus(pickupAt) };
}

// Fait entrer en cuisine les précommandes dont c'est l'heure. Appelée quand le comptoir ou l'écran de salle
// relisent les commandes : pas besoin de tâche planifiée sur le serveur.
export async function promoteDueOrders(now = Date.now()) {
  const due = (await store.active()).filter((o) => o.status === ORDER_STATUS.SCHEDULED && initialStatus(o.pickupAt, now) === ORDER_STATUS.NEW);
  for (const order of due) await store.update(order.id, statusChange(order, ORDER_STATUS.NEW));
  if (due.length) await notify('orders');
}
