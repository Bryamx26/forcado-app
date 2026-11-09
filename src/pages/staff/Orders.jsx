import { useState } from 'react';
import { euro } from '../../api.js';
import { Alert, ConfirmDialog, StatusBadge } from '../../components/ui.jsx';
import { useNow } from '../../useNow.js';
import { ORDER_STATUS, isFinal } from '../../../shared/orderStatus.js';
import OrderEditor from './OrderEditor.jsx';
import OrderTicket from './OrderTicket.jsx';
import { useStaffOrders } from './useStaffOrders.js';
import { usePlaceLabel } from './place.js';

const COLUMNS = [
  { status: ORDER_STATUS.NEW, title: 'Reçues', next: { status: ORDER_STATUS.PREPARING, label: 'Démarrer' } },
  { status: ORDER_STATUS.PREPARING, title: 'En préparation', next: { status: ORDER_STATUS.READY, label: 'Prête ✓' } },
  { status: ORDER_STATUS.READY, title: 'Prêtes', next: { status: ORDER_STATUS.SERVED, label: 'Servie' } },
];
const HISTORY_SIZE = 50;

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

function OrderCard({ order, column, now, onStatus, onEdit }) {
  return (
    <li>
      <OrderTicket order={order} now={now}>
        <button type="button" className="link small ticket-edit" onClick={() => onEdit(order)}>
          Modifier la commande
        </button>
        <footer className="ticket-actions">
          {order.status === ORDER_STATUS.NEW && (
            <button type="button" className="btn btn-ghost" onClick={() => onStatus(order, ORDER_STATUS.CANCELLED)}>Annuler</button>
          )}
          {order.status === ORDER_STATUS.PREPARING && (
            <button
              type="button"
              className="btn btn-ghost"
              aria-label="Remettre en attente"
              title="Remettre en attente"
              onClick={() => onStatus(order, ORDER_STATUS.NEW)}
            >
              ↩
            </button>
          )}
          <button type="button" className="btn btn-comptoir btn-grow" onClick={() => onStatus(order, column.next.status)}>
            {column.next.label}
          </button>
        </footer>
      </OrderTicket>
    </li>
  );
}

// Précommandes pas encore en cuisine : elles y entrent seules avant l'heure de retrait (PREP_LEAD_MIN).
function ScheduledOrders({ orders, placeLabel, onStatus }) {
  if (!orders.length) return null;
  return (
    <section className="panel scheduled" aria-labelledby="scheduled-title">
      <h2 id="scheduled-title">Précommandes ({orders.length})</h2>
      {orders.map((o) => (
        <div key={o.id} className="history-row">
          <span>n° {o.number} · {placeLabel(o)}</span>
          <span className="muted small">{o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</span>
          <span className="admin-tools">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onStatus(o, ORDER_STATUS.CANCELLED)}>Annuler</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onStatus(o, ORDER_STATUS.NEW)}>Envoyer en cuisine</button>
          </span>
        </div>
      ))}
    </section>
  );
}

// Chiffres du jour en tête du comptoir.
function todaySummary(orders) {
  const today = orders.filter((o) => isToday(o.createdAt) && o.status !== ORDER_STATUS.CANCELLED);
  const served = today.filter((o) => o.status === ORDER_STATUS.SERVED);
  const avgMinutes = served.length
    ? Math.round(served.reduce((s, o) => s + (new Date(o.updatedAt) - new Date(o.createdAt)), 0) / served.length / 60000)
    : null;
  return {
    count: today.length,
    revenue: today.reduce((s, o) => s + o.total, 0),
    waiting: orders.filter((o) => o.status === ORDER_STATUS.NEW).length,
    avgMinutes,
  };
}

export default function Orders({ onAuthError }) {
  const { orders, error, refresh, setStatus } = useStaffOrders(onAuthError);
  const now = useNow();
  const [showHistory, setShowHistory] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [editing, setEditing] = useState(null);

  const onStatus = (order, status) => (status === ORDER_STATUS.CANCELLED ? setCancelling(order) : setStatus(order, status));
  const summary = todaySummary(orders);
  const placeLabel = usePlaceLabel();
  const scheduled = orders.filter((o) => o.status === ORDER_STATUS.SCHEDULED).sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));
  const history = orders.filter((o) => isFinal(o.status)).reverse().slice(0, HISTORY_SIZE);

  return (
    <>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">{summary.count}</span>
          <span className="stat-label">Commandes aujourd'hui</span>
        </div>
        <div className="stat">
          <span className="stat-value">{euro(summary.revenue)}</span>
          <span className="stat-label">Chiffre du jour</span>
        </div>
        <div className={`stat ${summary.waiting ? 'stat-alert' : ''}`}>
          <span className="stat-value">{summary.waiting}</span>
          <span className="stat-label">En attente</span>
        </div>
        <div className="stat">
          <span className="stat-value">{summary.avgMinutes === null ? '–' : `${summary.avgMinutes} min`}</span>
          <span className="stat-label">Temps moyen de service</span>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      <ScheduledOrders orders={scheduled} placeLabel={placeLabel} onStatus={onStatus} />

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
              <span>n° {o.number} · {placeLabel(o)}</span>
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
            setStatus(order, ORDER_STATUS.CANCELLED);
          }}
        >
          <p>{placeLabel(cancelling)}. Elle disparaîtra du comptoir et le client sera prévenu sur son téléphone.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
