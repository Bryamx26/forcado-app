import { euro } from '../../api.js';
import { useBrand } from '../../brand.js';
import { Alert, Modal } from '../../components/ui.jsx';
import { selectedChoiceNames } from '../../../shared/options.js';
import { useT } from '../../i18n.jsx';

function CartLine({ line, soldOut, onRemove }) {
  const t = useT();
  const choices = line.gone ? '' : selectedChoiceNames(line.item, line.options).join(', ');
  return (
    <li className="cart-line">
      <span className="cart-qty">{line.qty} ×</span>
      <div className="cart-info">
        <div className="cart-name">
          {line.item.name}
          {soldOut && <span className="status status-annulee tag">{t('menu.soldOut')}</span>}
          {line.gone && <span className="status status-annulee tag">{t('cart.gone')}</span>}
        </div>
        {choices && <div className="muted small">{choices}</div>}
        {line.note && <div className="muted small">« {line.note} »</div>}
      </div>
      <div className="cart-right">
        {!line.gone && <span className="price">{euro(line.price * line.qty)}</span>}
        <button type="button" className="link small" onClick={onRemove}>
          {t('cart.remove')}<span className="sr-only"> {line.item.name}</span>
        </button>
      </div>
    </li>
  );
}

// Panier : lignes chiffrées avec la carte actuelle, puis envoi de la commande.
export default function CartSheet({ title, lines, total, soldOutIds, error, sending, onRemove, onSubmit, onClose, children }) {
  const brand = useBrand();
  const t = useT();
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-lg btn-block" disabled={!lines.length || sending} aria-busy={sending || undefined} onClick={onSubmit}>
          {sending ? t('cart.sending') : t('cart.send', { total: euro(total) })}
        </button>
      }
    >
      {lines.length === 0 && <p className="muted">{t('cart.empty')}</p>}
      <ul className="cart-lines">
        {lines.map((line) => (
          <CartLine key={line.key} line={line} soldOut={soldOutIds.has(line.item.id)} onRemove={() => onRemove(line.key)} />
        ))}
      </ul>
      {children}
      {error && <Alert>{error}</Alert>}
      <div className="cart-total">
        <span>{t('common.total')}</span>
        <strong className="price">{euro(total)}</strong>
      </div>
      <p className="muted small">{brand.paymentNote}</p>
    </Modal>
  );
}
