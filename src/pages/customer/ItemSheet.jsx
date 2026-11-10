import { useState } from 'react';
import { euro } from '../../api.js';
import { Modal } from '../../components/ui.jsx';
import { MAX_LINE_QTY, MAX_NOTE_LENGTH } from '../../../shared/orderStatus.js';
import { defaultSelection, isSelectionComplete, isSingleChoice, limitsHint, toggleChoice, unitPrice } from '../../../shared/options.js';
import ProductVisual from './ProductVisual.jsx';
import { useT } from '../../i18n.jsx';
import AllergenInfo from './AllergenInfo.jsx';

function OptionChoice({ group, choice, checked, onToggle }) {
  const t = useT();
  const out = choice.soldOut;
  return (
    <label className={`opt ${checked ? 'opt-on' : ''} ${out ? 'opt-out' : ''}`}>
      <input
        type={isSingleChoice(group) ? 'radio' : 'checkbox'}
        name={group.id}
        checked={checked}
        disabled={out}
        onChange={() => onToggle(group, choice.id)}
      />
      <span>{choice.name}</span>
      {out && <span className="opt-soldout">{t('menu.soldOut')}</span>}
      {!out && choice.price !== 0 && <span className="opt-price">{choice.price > 0 ? '+' : ''}{euro(choice.price)}</span>}
    </label>
  );
}

function OptionGroup({ group, selected, onToggle }) {
  const t = useT();
  const hint = limitsHint(group);
  return (
    <fieldset className="opt-group">
      <legend>
        {group.name}
        <span className="opt-hint">{t(hint.key, hint.vars)}</span>
      </legend>
      {group.choices.map((choice) => (
        <OptionChoice key={choice.id} group={group} choice={choice} checked={(selected[group.id] || []).includes(choice.id)} onToggle={onToggle} />
      ))}
    </fieldset>
  );
}

function QuantityPicker({ qty, onChange }) {
  const t = useT();
  return (
    <div className="qty" role="group" aria-label={t('item.quantity')}>
      <button type="button" onClick={() => onChange(Math.max(1, qty - 1))} aria-label={t('item.less')}>−</button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => onChange(Math.min(MAX_LINE_QTY, qty + 1))} aria-label={t('item.more')}>+</button>
    </div>
  );
}

// Fiche d'un article : options, quantité et remarque, puis ajout au panier.
export default function ItemSheet({ item, onClose, onAdd }) {
  const t = useT();
  const [selected, setSelected] = useState(() => defaultSelection(item));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const price = unitPrice(item, selected);
  const toggle = (group, choiceId) => setSelected((s) => toggleChoice(s, group, choiceId));

  return (
    <Modal
      title={item.name}
      onClose={onClose}
      media={<ProductVisual item={item} className="sheet-visual" />}
      footer={
        <>
          <QuantityPicker qty={qty} onChange={setQty} />
          <button
            type="button"
            className="btn btn-lg btn-grow"
            disabled={!isSelectionComplete(item, selected)}
            onClick={() => onAdd({ key: crypto.randomUUID(), item, options: selected, qty, note })}
          >
            {t('item.addFor', { price: euro(price * qty) })}
          </button>
        </>
      }
    >
      {item.description && <p className="muted">{item.description}</p>}
      {item.options.map((group) => (
        <OptionGroup key={group.id} group={group} selected={selected} onToggle={toggle} />
      ))}
      <AllergenInfo item={item} />
      <label className="field note">
        {t('item.note')}
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={MAX_NOTE_LENGTH} placeholder={t('common.optional')} />
      </label>
    </Modal>
  );
}
