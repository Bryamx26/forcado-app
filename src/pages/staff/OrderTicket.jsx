import { euro } from '../../api.js';
import { useBrand } from '../../brand.js';
import { StatusBadge } from '../../components/ui.jsx';
import { ORDER_STATUS } from '../../../shared/orderStatus.js';
import { URGENCY, minutesBetween, urgencyOf } from '../../../shared/kitchen.js';

function waitLabel(minutes, urgency) {
  if (urgency !== URGENCY.OK) return `Depuis ${minutes} min`;
  return minutes === 0 ? "à l'instant" : `${minutes} min`;
}

function TicketLines({ lines }) {
  return (
    <ul className="ticket-lines">
      {lines.map((line, i) => (
        <li key={i}>
          <strong>{line.qty} ×</strong> {line.name}
          {line.options.length > 0 && <div className="ticket-opts">{line.options.map((o) => o.choice).join(' · ')}</div>}
          {line.note && (
            <div className="ticket-note">
              <span aria-hidden="true">⚑</span> {line.note}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// Ticket du comptoir (OrderTicket) : le numéro se lit en premier, une seule action principale.
// Une commande prête n'est plus « en retard » : elle attend d'être servie.
export default function OrderTicket({ order, now, showTotal = true, children }) {
  const { kitchen } = useBrand();
  const minutes = minutesBetween(order.createdAt, now);
  const urgency = order.status === ORDER_STATUS.READY ? URGENCY.OK : urgencyOf(minutes, kitchen);
  return (
    <article className={`ticket ticket-${urgency}`} aria-label={`Commande ${order.number}, table ${order.table}`}>
      <header className="ticket-head">
        <span className="ticket-number">#{order.number}</span>
        <span className="ticket-meta">
          Table {order.table} · {waitLabel(minutes, urgency)}
        </span>
      </header>
      <StatusBadge status={order.status} comptoir />
      <TicketLines lines={order.lines} />
      {order.modifiedAt && <div className="ticket-by">Modifiée par l'équipe</div>}
      {showTotal && (
        <div className="ticket-total">
          <span className="muted">Total</span>
          <span className="price">{euro(order.total)}</span>
        </div>
      )}
      {children}
    </article>
  );
}
