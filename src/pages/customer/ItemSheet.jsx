import { useState } from 'react';
import { euro } from '../../api.js';
import { Modal } from '../../components/ui.jsx';
import { MAX_LINE_QTY, MAX_NOTE_LENGTH } from '../../../shared/orderStatus.js';
import { defaultSelection, isSingleChoice, toggleChoice, unitPrice } from '../../../shared/options.js';
import ProductVisual from './ProductVisual.jsx';
import AllergenInfo from './AllergenInfo.jsx';

function OptionGroup({ group, selected, onToggle }) {
  const single = isSingleChoice(group);
  return (
    <fieldset className="opt-group">
      <legend>
        {group.name}
        <span className="opt-hint">{single ? 'Un choix' : 'Facultatif'}</span>
      </legend>
      {group.choices.map((choice) => {
        const checked = (selected[group.id] || []).includes(choice.id);
        return (
          <label key={choice.id} className={`opt ${checked ? 'opt-on' : ''}`}>
            <input type={single ? 'radio' : 'checkbox'} name={group.id} checked={checked} onChange={() => onToggle(group, choice.id)} />
            <span>{choice.name}</span>
            {choice.price !== 0 && <span className="opt-price">{choice.price > 0 ? '+' : ''}{euro(choice.price)}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

function QuantityPicker({ qty, onChange }) {
  return (
    <div className="qty" role="group" aria-label="Quantité">
      <button type="button" onClick={() => onChange(Math.max(1, qty - 1))} aria-label="Retirer un">−</button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => onChange(Math.min(MAX_LINE_QTY, qty + 1))} aria-label="Ajouter un">+</button>
    </div>
  );
}

// Fiche d'un article : options, quantité et remarque, puis ajout au panier.
export default function ItemSheet({ item, onClose, onAdd }) {
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
            onClick={() => onAdd({ key: crypto.randomUUID(), item, options: selected, qty, note })}
          >
            Ajouter · {euro(price * qty)}
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
        Remarque (allergie, etc.)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={MAX_NOTE_LENGTH} placeholder="Facultatif" />
      </label>
    </Modal>
  );
}
