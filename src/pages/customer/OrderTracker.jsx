import { useEffect, useRef, useState } from 'react';
import { api, euro } from '../../api.js';
import { StatusBadge } from '../../components/ui.jsx';
import { ORDER_STATUS } from '../../../shared/orderStatus.js';
import { useT } from '../../i18n.jsx';
import { forgetOrder, readAcks, readMyOrders, saveAck } from './myOrders.js';

const POLL_MS = 20000;
const STEPS = [ORDER_STATUS.NEW, ORDER_STATUS.PREPARING, ORDER_STATUS.READY];
const STEP_ICONS = { [ORDER_STATUS.NEW]: '●', [ORDER_STATUS.PREPARING]: '◐', [ORDER_STATUS.READY]: '✓' };

// Suivi en trois étapes : l'étape courante porte un libellé et une icône, jamais seulement une couleur.
function Progress({ status }) {
  const t = useT();
  const current = STEPS.indexOf(status);
  const stepClass = (i, step) => (i < current ? 'done' : i === current ? `current step-${step}` : '');
  return (
    <ol className="progress">
      {STEPS.map((step, i) => (
        <li key={step} className={stepClass(i, step)} aria-current={i === current ? 'step' : undefined}>
          <span className="progress-dot" aria-hidden="true">{i <= current ? STEP_ICONS[step] : ''}</span>
          <span>{t(`status.${step}`)}</span>
        </li>
      ))}
    </ol>
  );
}

// Annulation ou modification vue pendant que la page est ouverte.
function hasNews(order, before) {
  if (!before) return false;
  const cancelled = order.status === ORDER_STATUS.CANCELLED && before.status !== ORDER_STATUS.CANCELLED;
  return cancelled || order.modifiedAt !== before.modifiedAt;
}

// Interroge le serveur sur les commandes de ce téléphone, au rythme du flux temps réel (live) et en secours toutes les 20 s.
function useTrackedOrders(place, live) {
  const [orders, setOrders] = useState([]);
  const tickRef = useRef(() => {});
  const seen = useRef({});

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      // Une commande servie ne bouge plus : inutile de la redemander au serveur.
      const ids = readMyOrders(place).filter((id) => seen.current[id]?.status !== ORDER_STATUS.SERVED);
      if (!ids.length) return;
      try {
        const data = await api.track(ids);
        if (!alive) return;
        if (data.some((o) => hasNews(o, seen.current[o.id]))) navigator.vibrate?.([200, 100, 200]);
        seen.current = { ...seen.current, ...Object.fromEntries(data.map((o) => [o.id, o])) };
        // Les commandes annulées restent affichées jusqu'à ce que le client ferme l'avis.
        setOrders(data.filter((o) => o.status !== ORDER_STATUS.SERVED).reverse());
      } catch {}
    };
    tickRef.current = tick;
    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [place]);

  // Chaque changement au comptoir prévient tous les téléphones de la salle : on regroupe les signaux rapprochés
  // et on étale les demandes pour ne pas les envoyer toutes au même instant.
  useEffect(() => {
    let timer;
    const unsubscribe = live.subscribe(() => {
      timer ??= setTimeout(() => {
        timer = undefined;
        tickRef.current();
      }, 500 + Math.random() * 1500);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [live]);

  const remove = (id) => setOrders((list) => list.filter((o) => o.id !== id));
  return [orders, remove];
}

function CancelledOrder({ order, onDismiss }) {
  const t = useT();
  return (
    <div className="tracker-order tracker-cancelled" role="alert">
      <div className="tracker-head">
        <strong>{t('tracker.order', { number: order.number })}</strong>
        <StatusBadge status={ORDER_STATUS.CANCELLED} label={t('status.annulee')} />
      </div>
      <p className="small">{t('tracker.cancelled')}</p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>{t('tracker.understood')}</button>
    </div>
  );
}

function ModifiedNotice({ order, onAck }) {
  const t = useT();
  return (
    <div className="tracker-modified" role="alert">
      <strong>{t('tracker.modified')}</strong>
      <ul className="small">
        {order.lines.map((l, i) => (
          <li key={i}>
            {l.qty} × {l.name}
            {l.options.length > 0 && <span className="muted"> ({l.options.join(', ')})</span>}
          </li>
        ))}
      </ul>
      <p className="small">
        {t('tracker.newTotal')} <strong>{euro(order.total)}</strong>
      </p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onAck}>{t('common.ok')}</button>
    </div>
  );
}

export default function OrderTracker({ place, live }) {
  const [orders, removeOrder] = useTrackedOrders(place, live);
  const [acks, setAcks] = useState(readAcks);
  const t = useT();

  // Le client a lu l'avis d'annulation : la commande n'est plus suivie sur cet appareil.
  const dismiss = (id) => {
    forgetOrder(place, id);
    removeOrder(id);
  };

  if (!orders.length) return null;
  return (
    <section className="tracker" aria-live="polite">
      <h2>{t('tracker.title')}</h2>
      {orders.map((o) =>
        o.status === ORDER_STATUS.CANCELLED ? (
          <CancelledOrder key={o.id} order={o} onDismiss={() => dismiss(o.id)} />
        ) : (
          <div key={o.id} className="tracker-order">
            <div className="tracker-head">
              <strong>{t('tracker.order', { number: o.number })}</strong>
            </div>
            {o.modifiedAt && acks[o.id] !== o.modifiedAt && <ModifiedNotice order={o} onAck={() => setAcks(saveAck(acks, o))} />}
            <Progress status={o.status} />
            {o.waitMinutes != null && <p className="small tracker-wait">{t('tracker.wait', { minutes: o.waitMinutes })}</p>}
            {o.status === ORDER_STATUS.READY && <p className="small tracker-ready">{t('tracker.readyTable')}</p>}
          </div>
        ),
      )}
    </section>
  );
}
