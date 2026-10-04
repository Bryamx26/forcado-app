import { useEffect, useRef } from 'react';

// Écoute le flux temps réel du serveur et appelle handlers[type] à chaque changement.
// Le navigateur se reconnecte tout seul si le flux se coupe ; la vérification régulière des écrans reste en secours.
export function useLiveEvents(url, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(url);
    const types = ['orders', 'menu'];
    const listeners = types.map((type) => {
      const fn = () => ref.current[type]?.();
      es.addEventListener(type, fn);
      return [type, fn];
    });
    // Après une coupure, on recharge pour ne rien manquer de ce qui s'est passé entre-temps.
    let opened = false;
    es.onopen = () => {
      if (opened) Object.values(ref.current).forEach((fn) => fn?.());
      opened = true;
    };
    return () => {
      listeners.forEach(([type, fn]) => es.removeEventListener(type, fn));
      es.close();
    };
  }, [url]);
}
