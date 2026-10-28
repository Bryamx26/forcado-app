import { useEffect, useRef, useState } from 'react';
import { api, AuthError, euro } from '../../api.js';
import { useLiveEvents } from '../../live.js';
import { Alert, ConfirmDialog, StatusBadge } from '../../components/ui.jsx';
import OrderEditor from './OrderEditor.jsx';

const COLUMNS = [
  { status: 'nouvelle', title: 'Reçues', next: { status: 'en_cours', label: 'Démarrer' } },
  { status: 'en_cours', title: 'En préparation', next: { status: 'prete', label: 'Prête ✓' } },
  { status: 'prete', title: 'Prêtes', next: { status: 'servie', label: 'Servie' } },
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
    // Un contexte audio non fermé reste ouvert : au fil du service, le navigateur finit par les refuser.
    osc.onended = () => ctx.close();
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

// Ticket du comptoir (OrderTicket) : le numéro se lit en premier, une seule action principale.
function OrderCard({ order, column, now, onStatus, onEdit }) {
  const mins = minutesSince(order.createdAt, now);
  const late = mins >= 10 && order.status !== 'prete';
  return (
    <li>
      <article className={`ticket ${late ? 'ticket-late' : ''}`} aria-label={`Commande ${order.number}, table ${order.table}`}>
        <header className="ticket-head">
          <span className="ticket-number">#{order.number}</span>
          <span className="ticket-meta">
            Table {order.table} · {late ? `Depuis ${mins} min` : mins === 0 ? "à l'instant" : `${mins} min`}
          </span>
        </header>
        <StatusBadge status={order.status} comptoir />
        <ul className="ticket-lines">
          {order.lines.map((l, i) => (
            <li key={i}>
              <strong>{l.qty} ×</strong> {l.name}
              {l.options.length > 0 && <div className="ticket-opts">{l.options.map((o) => o.choice).join(' · ')}</div>}
              {l.note && (
                <div className="ticket-note">
                  <span aria-hidden="true">⚑</span> {l.note}
                </div>
              )}
            </li>
          ))}
        </ul>
        {order.handledBy && order.status !== 'nouvelle' && (
          <div className="ticket-by">Prise en charge par {order.handledBy}</div>
        )}
        {order.modifiedAt && (
          <div className="ticket-by">Modifiée{order.modifiedBy ? ` par ${order.modifiedBy}` : ''}</div>
        )}
        <button type="button" className="link small ticket-edit" onClick={() => onEdit(order)}>
          Modifier la commande
        </button>
        <div className="ticket-total">
          <span className="muted">Total</span>
          <span className="price">{euro(order.total)}</span>
        </div>
        <footer className="ticket-actions">
          {order.status === 'nouvelle' && (
            <button type="button" className="btn btn-ghost" onClick={() => onStatus(order, 'annulee')}>Annuler</button>
          )}
          {order.status === 'en_cours' && (
            <button
              type="button"
              className="btn btn-ghost"
              aria-label="Remettre en attente"
              title="Remettre en attente"
              onClick={() => onStatus(order, 'nouvelle')}
            >
              ↩
            </button>
          )}
          <button type="button" className="btn btn-comptoir btn-grow" onClick={() => onStatus(order, column.next.status)}>
            {column.next.label}
          </button>
        </footer>
      </article>
    </li>
  );
}

export default function Orders({ onAuthError }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showHistory, setShowHistory] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [editing, setEditing] = useState(null);
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

  useLiveEvents('/api/events?scope=staff', { orders: refresh });

  useEffect(() => {
    refresh();
    // Secours si le flux temps réel est coupé.
    const poll = setInterval(refresh, 15000);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  const onStatus = async (order, status, confirmed = false) => {
    if (status === 'annulee' && !confirmed) return setCancelling(order);
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await api.setStatus(order.id, status, order.status);
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      // Rafraîchir d'abord : refresh efface le message d'erreur.
      await refresh();
      return setError(e.message);
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

      {error && <Alert>{error}</Alert>}

      <div className="board">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          const titleId = `col-${col.status}`;
          return (
            <section key={col.status} className={`column column-${col.status}`} aria-labelledby={titleId}>
              <h2 id={titleId}>
                {col.title} <span className="column-count">({list.length})</span>
              </h2>
              <ul className="column-list" aria-live="polite">
                {list.map((o) => (
                  <OrderCard key={o.id} order={o} column={col} now={now} onStatus={onStatus} onEdit={setEditing} />
                ))}
              </ul>
              {list.length === 0 && <p className="muted center small empty">Aucune commande</p>}
            </section>
          );
        })}
      </div>

      <button type="button" className="btn btn-ghost btn-sm history-toggle" aria-expanded={showHistory} onClick={() => setShowHistory((s) => !s)}>
        {showHistory ? "Masquer l'historique" : "Voir l'historique"}
      </button>
      {showHistory && (
        <section className="panel">
          <h2>Historique</h2>
          {history.length === 0 && <p className="muted small">Rien pour l'instant.</p>}
          {history.map((o) => (
            <div key={o.id} className="history-row">
              <span>n° {o.number} · Table {o.table}</span>
              <span className="muted small">{o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</span>
              <StatusBadge status={o.status} />
            </div>
          ))}
        </section>
      )}

      {editing && (
        <OrderEditor
          order={editing}
          onAuthError={onAuthError}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {cancelling && (
        <ConfirmDialog
          title={`Annuler la commande n° ${cancelling.number} ?`}
          confirmLabel="Annuler la commande"
          cancelLabel="Garder"
          onCancel={() => setCancelling(null)}
          onConfirm={() => {
            const order = cancelling;
            setCancelling(null);
            onStatus(order, 'annulee', true);
          }}
        >
          <p>Table {cancelling.table}. Elle disparaîtra du comptoir et le client sera prévenu sur son téléphone.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
