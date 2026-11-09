// Notifications Web Push : prévenir le client que sa commande est prête, même page fermée.
// Désactivé tant que VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY ne sont pas définies (npx web-push generate-vapid-keys).
import webpush from 'web-push';
import { push as pushConfig } from './config.js';
import { store } from './store.js';
import { OrderError } from './orders.js';

export const pushEnabled = Boolean(pushConfig.publicKey && pushConfig.privateKey);
if (pushEnabled) webpush.setVapidDetails(pushConfig.subject, pushConfig.publicKey, pushConfig.privateKey);

// Le serveur envoie une requête à l'adresse fournie par le navigateur : on n'accepte que les services de push connus,
// pour qu'elle ne puisse pas viser autre chose.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /\.notify\.windows\.com$/];
const KEY = /^[A-Za-z0-9_-]{16,200}={0,2}$/;
// Abonnement expiré ou retiré par le navigateur : inutile de le garder.
const GONE = [404, 410];

export function cleanSubscription(raw) {
  let url;
  try {
    url = new URL(String(raw?.endpoint || ''));
  } catch {
    throw new OrderError('Abonnement aux notifications invalide', { code: 'invalid_push' });
  }
  const knownHost = url.protocol === 'https:' && PUSH_HOSTS.some((host) => host.test(url.hostname));
  if (!knownHost || url.href.length > 1000 || !KEY.test(raw?.keys?.p256dh || '') || !KEY.test(raw?.keys?.auth || '')) {
    throw new OrderError('Abonnement aux notifications invalide', { code: 'invalid_push' });
  }
  return { endpoint: url.href, keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth } };
}

async function sendOne(orderId, subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 });
  } catch (e) {
    if (GONE.includes(e.statusCode)) await store.removePushSubscription(orderId, subscription);
    else console.error('Notification non envoyée', e.statusCode || e.message);
  }
}

export async function notifyOrder(order, payload) {
  if (!pushEnabled) return;
  const subscriptions = await store.pushSubscriptions(order.id);
  await Promise.all(subscriptions.map((subscription) => sendOne(order.id, subscription, payload)));
}
