// Abonnement du téléphone aux notifications Web Push d'une commande.
import { api } from './api.js';

export const PUSH_STATE = Object.freeze({ UNSUPPORTED: 'unsupported', IOS_HOME_SCREEN: 'ios', DENIED: 'denied', ASK: 'ask', GRANTED: 'granted' });

// Sur iPhone, le push web n'existe que pour un site ajouté à l'écran d'accueil.
const isIosBrowserTab = () => /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

export function pushState(publicKey) {
  if (!publicKey) return PUSH_STATE.UNSUPPORTED;
  if (isIosBrowserTab()) return PUSH_STATE.IOS_HOME_SCREEN;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return PUSH_STATE.UNSUPPORTED;
  if (Notification.permission === 'denied') return PUSH_STATE.DENIED;
  return Notification.permission === 'granted' ? PUSH_STATE.GRANTED : PUSH_STATE.ASK;
}

// La clé publique VAPID arrive en base64url ; le navigateur la veut en octets.
function keyBytes(base64url) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function currentSubscription(publicKey) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  return existing || registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
}

// À appeler sur un geste du client si la permission n'est pas encore donnée. Renvoie true si c'est fait.
export async function subscribeOrder(orderId, publicKey) {
  if ((await Notification.requestPermission()) !== 'granted') return false;
  const subscription = await currentSubscription(publicKey);
  await api.subscribePush(orderId, subscription.toJSON());
  return true;
}
