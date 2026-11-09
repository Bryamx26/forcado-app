import { Alert } from '../../components/ui.jsx';
import { useNow } from '../../useNow.js';
import { ORDER_STATUS } from '../../../shared/orderStatus.js';
import { countItemsToPrepare } from '../../../shared/kitchen.js';
import OrderTicket from './OrderTicket.jsx';
import { useStaffOrders } from './useStaffOrders.js';

const NEXT_STEP = {
  [ORDER_STATUS.NEW]: { status: ORDER_STATUS.PREPARING, label: 'Démarrer' },
  [ORDER_STATUS.PREPARING]: { status: ORDER_STATUS.READY, label: 'Prête ✓' },
};

// La plus ancienne d'abord : c'est elle qu'on sert en premier.
const toPrepare = (orders) =>
  orders.filter((o) => NEXT_STEP[o.status]).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

function ItemsToPrepare({ orders }) {
  const items = countItemsToPrepare(orders);
  return (
    <aside className="kitchen-totals panel" aria-labelledby="kitchen-totals-title">
      <h2 id="kitchen-totals-title">À sortir</h2>
      {items.length === 0 && <p className="muted small">Rien à préparer.</p>}
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <strong>{item.qty} ×</strong> {item.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}

// Écran cuisine : grandes cartes, triées par ancienneté, une seule action par commande.
export default function Kitchen({ onAuthError }) {
  const { orders, error, setStatus } = useStaffOrders(onAuthError);
  const now = useNow(15000);
  const queue = toPrepare(orders);

  return (
    <section className="kitchen">
      <div className="kitchen-head">
        <h2>
          Cuisine <span className="column-count">({queue.length})</span>
        </h2>
        <a className="btn btn-ghost btn-sm" href="/ecran" target="_blank" rel="noopener">
          Ouvrir l'écran de la salle ↗
        </a>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="kitchen-layout">
        <ol className="kitchen-queue" aria-live="polite">
          {queue.map((order) => (
            <li key={order.id}>
              <OrderTicket order={order} now={now} showTotal={false}>
                <button type="button" className="btn btn-comptoir btn-block" onClick={() => setStatus(order, NEXT_STEP[order.status].status)}>
                  {NEXT_STEP[order.status].label}
                </button>
              </OrderTicket>
            </li>
          ))}
          {queue.length === 0 && <p className="muted center">Aucune commande en attente.</p>}
        </ol>
        <ItemsToPrepare orders={queue} />
      </div>
    </section>
  );
}
