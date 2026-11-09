// Commandes passées depuis ce téléphone, gardées dans le navigateur (aucun compte client).
const MAX_REMEMBERED = 20;
const MAX_ACKS = 50;
const ACKS_KEY = 'forcado-modifications-lues';
const ordersKey = (place) => `forcado-orders-table-${place}`;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const readMyOrders = (place) => readJson(ordersKey(place), []);

export const rememberOrder = (place, id) => writeJson(ordersKey(place), [...readMyOrders(place), id].slice(-MAX_REMEMBERED));

export const forgetOrder = (place, id) => writeJson(ordersKey(place), readMyOrders(place).filter((x) => x !== id));

// Modifications de l'équipe déjà lues par le client : { idCommande: modifiedAt }.
export const readAcks = () => readJson(ACKS_KEY, {});

export function saveAck(acks, order) {
  const next = Object.fromEntries([...Object.entries(acks), [order.id, order.modifiedAt]].slice(-MAX_ACKS));
  writeJson(ACKS_KEY, next);
  return next;
}
