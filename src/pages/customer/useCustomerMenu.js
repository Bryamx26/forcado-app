import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import { useLiveEvents } from '../../live.js';

const MENU_POLL_MS = 60000;

// Petit diffuseur : le suivi des commandes s'abonne aux signaux « orders » du flux temps réel.
function createSignal() {
  const subscribers = new Set();
  return {
    subscribe: (fn) => (subscribers.add(fn), () => subscribers.delete(fn)),
    emit: () => subscribers.forEach((fn) => fn()),
  };
}

// Carte visible par le client, dans sa langue, rechargée à chaque changement au comptoir et en secours toutes les minutes.
export function useCustomerMenu(lang) {
  const [menu, setMenu] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [ordersSignal] = useState(createSignal);
  const loadRef = useRef(() => {});

  useEffect(() => {
    const load = () =>
      api
        .menu(lang)
        // Les catégories vides (en préparation côté employés) ne sont pas montrées aux clients.
        .then((all) => {
          setMenu(all.filter((c) => c.items.length));
          setLoadFailed(false);
        })
        .catch(() => setLoadFailed(true));
    loadRef.current = load;
    load();
    const timer = setInterval(load, MENU_POLL_MS);
    return () => clearInterval(timer);
  }, [lang]);

  useLiveEvents('/api/events', {
    menu: () => loadRef.current(),
    orders: () => ordersSignal.emit(),
  });

  return { menu, loadFailed, reloadMenu: () => loadRef.current(), ordersSignal };
}
