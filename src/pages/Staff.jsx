import { useEffect, useRef, useState } from 'react';
import { api, euro, STATUS_LABELS } from '../api.js';

const COLUMNS = [
  { status: 'nouvelle', title: 'Nouvelles', next: { status: 'en_cours', label: 'Commencer' } },
  { status: 'en_cours', title: 'En préparation', next: { status: 'prete', label: 'Marquer prête' } },
  { status: 'prete', title: 'Prêtes à servir', next: { status: 'servie', label: 'Servie' } },
];

function minutesSince(iso, now) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

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
      <footer className="ticket-foot">
        <span className="muted">{euro(order.total)}</span>
        <div className="ticket-actions">
          {order.status === 'nouvelle' && (
            <button className="btn btn-ghost btn-sm" onClick={() => onStatus(order, 'annulee')}>Annuler</button>
          )}
          {order.status === 'en_cours' && (
            <button className="btn btn-ghost btn-sm" onClick={() => onStatus(order, 'nouvelle')}>↩</button>
          )}
          <button className="btn btn-sm" onClick={() => onStatus(order, column.next.status)}>{column.next.label}</button>
        </div>
      </footer>
    </article>
  );
}

export default function Staff() {
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
    } catch {
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
      setError(e.message);
    }
    refresh();
  };

  const history = orders.filter((o) => o.status === 'servie' || o.status === 'annulee').reverse().slice(0, 30);

  return (
    <div className="staff">
      <header className="s-header">
        <div className="logo">Forcado <span className="s-sub">· Comptoir</span></div>
        <div className="s-stats">
          {COLUMNS.map((c) => (
            <span key={c.status} className={`pill pill-${c.status}`}>
              {orders.filter((o) => o.status === c.status).length} {c.title.toLowerCase()}
            </span>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory((s) => !s)}>
            {showHistory ? 'Masquer' : 'Historique'}
          </button>
        </div>
      </header>
      {error && <div className="error">{error}</div>}

      <div className="board">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className={`column column-${col.status}`}>
              <h2>
                {col.title} <span className="column-count">{list.length}</span>
              </h2>
              {list.length === 0 && <p className="muted center small">Aucune commande</p>}
              {list.map((o) => (
                <OrderCard key={o.id} order={o} column={col} now={now} onStatus={onStatus} />
              ))}
            </section>
          );
        })}
      </div>

      {showHistory && (
        <section className="history">
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
    </div>
  );
}
