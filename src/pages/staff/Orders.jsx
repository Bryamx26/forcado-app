import { useEffect, useRef, useState } from 'react';
import { api, AuthError, euro, STATUS_LABELS } from '../../api.js';

const COLUMNS = [
  { status: 'nouvelle', title: 'Nouvelles', next: { status: 'en_cours', label: 'Commencer' } },
  { status: 'en_cours', title: 'En préparation', next: { status: 'prete', label: 'Marquer prête' } },
  { status: 'prete', title: 'Prêtes à servir', next: { status: 'servie', label: 'Servie' } },
];

function minutesSince(iso, now) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function OrderCard({ order, column, now, onStatus }) {
  const mins = minutesSince(order.createdAt, now);
  return (
    <article className={`ticket ticket-${order.status} ${mins >= 10 && order.status !== 'prete' ? 'ticket-late' : ''}`}>
      <header className="ticket-head">
        <span className="ticket-table">Table {order.table}</span>
        <span className="ticket-meta">
          n° {order.number} · {mins === 0 ? "à l'instant" : `il y a ${mins} min`}
        </span>
      </header>
      <ul className="ticket-lines">
        {order.lines.map((l, i) => (
          <li key={i}>
            <strong>{l.qty}×</strong> {l.name}
            {l.options.length > 0 && <div className="ticket-opts">{l.options.map((o) => o.choice).join(' · ')}</div>}
            {l.note && <div className="ticket-note">⚠ {l.note}</div>}
          </li>
        ))}
      </ul>
      {order.handledBy && order.status !== 'nouvelle' && (
        <div className="ticket-by">Prise en charge par {order.handledBy}</div>
      )}
      <footer className="ticket-foot">
        <span className="muted">{euro(order.total)}</span>
        <div className="ticket-actions">
          {order.status === 'nouvelle' && (
            <button className="btn btn-ghost btn-sm" onClick={() => onStatus(order, 'annulee')}>Annuler</button>
          )}
          {order.status === 'en_cours' && (
            <button className="btn btn-ghost btn-sm" title="Remettre en attente" onClick={() => onStatus(order, 'nouvelle')}>↩</button>
          )}
          <button className="btn btn-sm" onClick={() => onStatus(order, column.next.status)}>{column.next.label}</button>
        </div>
      </footer>
    </article>
  );
}

export default function Orders({ onAuthError }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showHistory, setShowHistory] = useState(false);
  const known = useRef(null);

  const refresh = async () => {
    try {
      const data = await api.orders();
      const ids = new Set(data.map((o) => o.id));
      if (known.current && data.some((o) => !known.current.has(o.id) && o.status === 'nouvelle')) beep();
      known.current = ids;
      setOrders(data);
      setError('');
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      setError('Connexion au serveur perdue, nouvelle tentative…');
    }
  };

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 3000);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  const onStatus = async (order, status) => {
    if (status === 'annulee' && !confirm(`Annuler la commande n° ${order.number} (table ${order.table}) ?`)) return;
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await api.setStatus(order.id, status);
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      setError(e.message);
    }
    refresh();
  };

  const today = orders.filter((o) => isToday(o.createdAt) && o.status !== 'annulee');
  const revenue = today.reduce((s, o) => s + o.total, 0);
  const waiting = orders.filter((o) => o.status === 'nouvelle').length;
  const served = today.filter((o) => o.status === 'servie');
  const avgMinutes = served.length
    ? Math.round(
        served.reduce((s, o) => s + (new Date(o.updatedAt) - new Date(o.createdAt)), 0) / served.length / 60000,
      )
    : null;
  const history = orders.filter((o) => o.status === 'servie' || o.status === 'annulee').reverse().slice(0, 50);

  return (
    <>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">{today.length}</span>
          <span className="stat-label">Commandes aujourd'hui</span>
        </div>
        <div className="stat">
          <span className="stat-value">{euro(revenue)}</span>
          <span className="stat-label">Chiffre du jour</span>
        </div>
        <div className={`stat ${waiting ? 'stat-alert' : ''}`}>
          <span className="stat-value">{waiting}</span>
          <span className="stat-label">En attente</span>
        </div>
        <div className="stat">
          <span className="stat-value">{avgMinutes === null ? '–' : `${avgMinutes} min`}</span>
          <span className="stat-label">Temps moyen de service</span>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="board">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className={`column column-${col.status}`}>
              <h2>
                {col.title} <span className="column-count">{list.length}</span>
              </h2>
              {list.length === 0 && <p className="muted center small empty">Aucune commande</p>}
              {list.map((o) => (
                <OrderCard key={o.id} order={o} column={col} now={now} onStatus={onStatus} />
              ))}
            </section>
          );
        })}
      </div>

      <button className="btn btn-ghost btn-sm history-toggle" onClick={() => setShowHistory((s) => !s)}>
        {showHistory ? "Masquer l'historique" : "Voir l'historique"}
      </button>
      {showHistory && (
        <section className="panel">
          <h2>Historique</h2>
          {history.length === 0 && <p className="muted small">Rien pour l'instant.</p>}
          {history.map((o) => (
            <div key={o.id} className="history-row">
              <span>n° {o.number} · Table {o.table}</span>
              <span className="muted small">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}</span>
              <span className={`pill pill-${o.status}`}>{STATUS_LABELS[o.status]}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
