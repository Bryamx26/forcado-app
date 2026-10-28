import { useEffect, useRef } from 'react';

// Écoute le flux temps réel du serveur et appelle handlers[type] à chaque changement.
// Le navigateur se reconnecte tout seul si le flux se coupe ; la vérification régulière des écrans reste en secours.
export function useLiveEvents(url, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    let es;
    let retry;
    let opened = false;
    const connect = () => {
      es = new EventSource(url);
      for (const type of ['orders', 'menu']) es.addEventListener(type, () => ref.current[type]?.());
      // Après une coupure, on recharge pour ne rien manquer de ce qui s'est passé entre-temps.
      es.onopen = () => {
        if (opened) Object.values(ref.current).forEach((fn) => fn?.());
        opened = true;
      };
      // Si le serveur refuse le flux (trop de connexions, redémarrage), le navigateur abandonne pour de bon :
      // on retente nous-mêmes un peu plus tard, à un moment différent pour chaque écran.
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) retry = setTimeout(connect, 15000 + Math.random() * 15000);
      };
    };
    connect();
    return () => {
      clearTimeout(retry);
      es.close();
    };
  }, [url]);
}
