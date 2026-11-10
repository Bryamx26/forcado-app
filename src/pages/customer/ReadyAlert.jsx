import { useEffect, useState } from 'react';
import { useBrand } from '../../brand.js';
import { useT } from '../../i18n.jsx';
import { PUSH_STATE, pushState, subscribeOrder } from '../../push.js';

const MESSAGES = {
  [PUSH_STATE.IOS_HOME_SCREEN]: 'push.iosHint',
  [PUSH_STATE.DENIED]: 'push.denied',
};

// « Me prévenir quand c'est prêt » sous la confirmation de commande. Si le client a déjà accepté les
// notifications lors d'une commande précédente, l'abonnement se fait sans lui redemander.
export default function ReadyAlert({ orderId }) {
  const { pushPublicKey } = useBrand();
  const t = useT();
  const [state, setState] = useState(() => pushState(pushPublicKey));
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  const subscribe = async () => {
    try {
      const ok = await subscribeOrder(orderId, pushPublicKey);
      setDone(ok);
      if (!ok) setState(pushState(pushPublicKey));
    } catch {
      setFailed(true);
    }
  };

  useEffect(() => {
    if (state === PUSH_STATE.GRANTED) subscribe();
  }, [orderId]);

  if (state === PUSH_STATE.UNSUPPORTED) return null;
  if (failed) return <p className="small muted">{t('push.failed')}</p>;
  if (done) return <p className="small ready-alert-done">✓ {t('push.subscribed')}</p>;
  if (MESSAGES[state]) return <p className="small muted">{t(MESSAGES[state])}</p>;
  if (state === PUSH_STATE.GRANTED) return null;
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={subscribe}>
      <span aria-hidden="true">🔔</span> {t('push.subscribe')}
    </button>
  );
}
