import { useEffect, useState } from 'react';
import { api, AuthError, euro } from '../../api.js';
import { Alert, Modal } from '../../components/ui.jsx';

// Choix par défaut d'un article : le premier choix de chaque groupe obligatoire.
const defaultOptions = (item) =>
  Object.fromEntries(item.options.filter((g) => g.required).map((g) => [g.id, [g.choices[0].id]]));

function unitPrice(item, options) {
  let price = item.price;
  for (const g of item.options) for (const id of options[g.id] || []) price += g.choices.find((c) => c.id === id)?.price || 0;
  return price;
}

// Ajout d'un article de la carte, avec ses options.
function AddLine({ menu, onAdd }) {
  const items = menu.flatMap((c) => c.items);
  const [itemId, setItemId] = useState('');
  const [options, setOptions] = useState({});
  const item = items.find((i) => i.id === itemId);

  const pick = (id) => {
    setItemId(id);
    const next = items.find((i) => i.id === id);
    setOptions(next ? defaultOptions(next) : {});
  };
  const toggle = (g, id) =>
    setOptions((o) => {
      if (g.type === 'single') return { ...o, [g.id]: [id] };
      const cur = o[g.id] || [];
      return { ...o, [g.id]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  return (
    <div className="order-add">
      <label className="field">
        Ajouter un article
        <select value={itemId} onChange={(e) => pick(e.target.value)}>
          <option value="">Choisir…</option>
          {menu.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {c.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} · {euro(i.price)}
                  {i.soldOut ? ' (épuisé)' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {item?.options.map((g) => (
        <fieldset key={g.id} className="order-add-group">
          <legend className="small">{g.name}</legend>
          {g.choices.map((c) => (
            <label key={c.id} className="order-add-choice">
              <input
                type={g.type === 'single' ? 'radio' : 'checkbox'}
                name={`add-${g.id}`}
                checked={(options[g.id] || []).includes(c.id)}
                onChange={() => toggle(g, c.id)}
              />
              {c.name}
              {c.price !== 0 && <span className="muted small"> {c.price > 0 ? '+' : ''}{euro(c.price)}</span>}
            </label>
          ))}
        </fieldset>
      ))}
      {item && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onAdd({ item, options, unitPrice: unitPrice(item, options) });
            pick('');
          }}
        >
          + Ajouter {item.name} · {euro(unitPrice(item, options))}
        </button>
      )}
    </div>
  );
}

// Modification d'une commande par l'équipe : quantités, retrait et ajout d'articles.
export default function OrderEditor({ order, onClose, onSaved, onAuthError }) {
  const [lines, setLines] = useState(() =>
    order.lines.map((l, i) => ({ key: `old-${i}`, keep: i, qty: l.qty, name: l.name, opts: l.options.map((o) => o.choice), unitPrice: l.unitPrice })),
  );
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.menu().then(setMenu).catch(() => setError('Impossible de charger la carte.'));
  }, []);

  const setQty = (key, qty) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(20, qty)) } : l)));
  const remove = (key) => setLines((ls) => ls.filter((l) => l.key !== key));
  const add = ({ item, options, unitPrice: price }) =>
    setLines((ls) => [
      ...ls,
      {
        key: crypto.randomUUID(),
        itemId: item.id,
        options,
        qty: 1,
        name: item.name,
        opts: item.options.flatMap((g) => (options[g.id] || []).map((id) => g.choices.find((c) => c.id === id)?.name)).filter(Boolean),
        unitPrice: price,
      },
    ]);

  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const body = lines.map((l) => (l.keep !== undefined ? { keep: l.keep, qty: l.qty } : { itemId: l.itemId, qty: l.qty, options: l.options }));
      onSaved(await api.editOrder(order.id, body, order.modifiedAt ?? null));
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Modifier la commande n° ${order.number}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="btn" disabled={busy || !lines.length} onClick={save}>
            {busy ? 'Enregistrement…' : `Enregistrer · ${euro(total)}`}
          </button>
        </>
      }
    >
      <p className="muted small">Table {order.table}. Le client verra la commande modifiée et le nouveau total sur son téléphone.</p>
      <ul className="order-edit-lines">
        {lines.map((l) => (
          <li key={l.key}>
            <div className="order-edit-name">
              <strong>{l.name}</strong>
              {l.opts.length > 0 && <div className="muted small">{l.opts.join(' · ')}</div>}
            </div>
            <div className="qty" role="group" aria-label={`Quantité de ${l.name}`}>
              <button type="button" onClick={() => setQty(l.key, l.qty - 1)} disabled={l.qty <= 1} aria-label="Moins">−</button>
              <span>{l.qty}</span>
              <button type="button" onClick={() => setQty(l.key, l.qty + 1)} aria-label="Plus">+</button>
            </div>
            <span className="price">{euro(l.unitPrice * l.qty)}</span>
            <button type="button" className="link small danger" onClick={() => remove(l.key)}>Retirer</button>
          </li>
        ))}
      </ul>
      {!lines.length && <p className="small">La commande doit garder au moins un article. Pour tout retirer, annulez-la.</p>}
      {menu && <AddLine menu={menu} onAdd={add} />}
      {error && <Alert>{error}</Alert>}
    </Modal>
  );
}
