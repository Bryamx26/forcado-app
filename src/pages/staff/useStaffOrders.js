import { useEffect, useRef, useState } from 'react';
import { api, AuthError } from '../../api.js';
import { useLiveEvents } from '../../live.js';
import { beep } from '../../sound.js';
import { ORDER_STATUS } from '../../../shared/orderStatus.js';

const POLL_MS = 15000;

// Commandes du comptoir, tenues à jour par le flux temps réel (et une vérification régulière en secours).
// Un bip signale chaque nouvelle commande. Partagé par les onglets Commandes et Cuisine.
export function useStaffOrders(onAuthError) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  // Statut de chaque commande au dernier chargement : une commande qui arrive en « reçue » (nouvelle, ou
  // précommande qui entre en cuisine) fait biper le comptoir.
  const known = useRef(null);

  const refresh = async () => {
    try {
      const data = await api.orders();
      const arrived = (o) => known.current && o.status === ORDER_STATUS.NEW && known.current.get(o.id) !== ORDER_STATUS.NEW;
      if (data.some(arrived)) beep();
      known.current = new Map(data.map((o) => [o.id, o.status]));
      setOrders(data);
      setError('');
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      setError('Connexion au serveur perdue, nouvelle tentative…');
    }
  };

  useLiveEvents('/api/events?scope=staff', { orders: refresh });

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    return () => clearInterval(poll);
  }, []);

  // Mise à jour immédiate à l'écran ; si un collègue a changé la commande entre-temps, le serveur refuse
  // et on affiche son message après avoir rechargé.
  const setStatus = async (order, status) => {
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await api.setStatus(order.id, status, order.status);
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      await refresh();
      return setError(e.message);
    }
    refresh();
  };

  return { orders, error, refresh, setStatus };
}
