import { useEffect, useMemo, useRef, useState } from 'react';
import { api, euro, STATUS_LABELS } from '../api.js';
import { useBrand } from '../brand.js';
import { useLiveEvents } from '../live.js';

const storageKey = (table) => `forcado-orders-table-${table}`;

function readMyOrders(table) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(table))) || [];
  } catch {
    return [];
  }
}

function unitPrice(item, selected) {
  let price = item.price;
  for (const group of item.options) {
    for (const id of selected[group.id] || []) {
      price += group.choices.find((c) => c.id === id)?.price || 0;
    }
  }
  return price;
}

function optionSummary(item, selected) {
  return item.options
    .flatMap((g) => (selected[g.id] || []).map((id) => g.choices.find((c) => c.id === id)?.name))
    .filter(Boolean)
    .join(', ');
}

// Photo du produit si public/produits/<id>.jpg existe, sinon l'emoji.
function ProductVisual({ item, className }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={className}>
      {item.image && !failed ? <img src={item.image} alt="" loading="lazy" onError={() => setFailed(true)} /> : item.emoji}
    </span>
  );
}

function ItemSheet({ item, onClose, onAdd }) {
  const [selected, setSelected] = useState(() => {
    const init = {};
    for (const g of item.options) init[g.id] = g.required ? [g.choices[0].id] : [];
    return init;
  });
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const toggle = (group, choiceId) => {
    setSelected((s) => {
      if (group.type === 'single') return { ...s, [group.id]: [choiceId] };
      const cur = s[group.id] || [];
      return { ...s, [group.id]: cur.includes(choiceId) ? cur.filter((x) => x !== choiceId) : [...cur, choiceId] };
    });
  };

  const price = unitPrice(item, selected);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Fermer">×</button>
        <ProductVisual item={item} className="sheet-emoji" />
        <h2>{item.name}</h2>
        <p className="muted">{item.description}</p>

        {item.options.map((group) => (
          <fieldset key={group.id} className="opt-group">
            <legend>
              {group.name}
              <span className="opt-hint">{group.type === 'single' ? 'Un choix' : 'Facultatif'}</span>
            </legend>
            {group.choices.map((c) => {
              const checked = (selected[group.id] || []).includes(c.id);
              return (
                <label key={c.id} className={`opt ${checked ? 'opt-on' : ''}`}>
                  <input
                    type={group.type === 'single' ? 'radio' : 'checkbox'}
                    name={group.id}
                    checked={checked}
                    onChange={() => toggle(group, c.id)}
                  />
                  <span>{c.name}</span>
                  {c.price !== 0 && <span className="opt-price">{c.price > 0 ? '+' : ''}{euro(c.price)}</span>}
                </label>
              );
            })}
          </fieldset>
        ))}

        <label className="note">
          Remarque (allergie, etc.)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Facultatif" />
        </label>

        <div className="sheet-footer">
          <div className="qty">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Moins">−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Plus">+</button>
          </div>
          <button
            className="btn btn-grow"
            onClick={() => onAdd({ key: crypto.randomUUID(), item, options: selected, qty, note, price })}
          >
            Ajouter · {euro(price * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderTracker({ table, live }) {
  const [orders, setOrders] = useState([]);
  const tickRef = useRef(() => {});

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const ids = readMyOrders(table);
      if (!ids.length) return;
      try {
        const data = await api.track(ids);
        if (alive) setOrders(data.filter((o) => o.status !== 'servie' && o.status !== 'annulee').reverse());
      } catch {}
    };
    tickRef.current = tick;
    tick();
    // Secours si le flux temps réel est coupé.
    const t = setInterval(tick, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [table]);

  useEffect(() => live.subscribe(() => tickRef.current()), [live]);

  if (!orders.length) return null;
  return (
    <section className="tracker">
      <h3>Vos commandes</h3>
      {orders.map((o) => (
        <div key={o.id} className="tracker-row">
          <span>Commande n° {o.number}</span>
          <span className={`pill pill-${o.status}`}>{STATUS_LABELS[o.status]}</span>
        </div>
      ))}
    </section>
  );
}

export default function Customer({ table }) {
  const brand = useBrand();
  const [menu, setMenu] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const loadMenu = useRef(() => {});
  const [ordersLive] = useState(() => {
    const subs = new Set();
    return {
      subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)),
      emit: () => subs.forEach((fn) => fn()),
    };
  });
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [sending, setSending] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [trackerKey, setTrackerKey] = useState(0);

  useEffect(() => {
    const load = () =>
      api
        .menu()
        .then((m) => {
          setMenu(m);
          setActiveCat((c) => c || m[0]?.id);
        })
        .catch(() => setError('Impossible de charger la carte.'));
    loadMenu.current = load;
    load();
    // Secours si le flux temps réel est coupé.
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  useLiveEvents('/api/events', {
    menu: () => loadMenu.current(),
    orders: () => ordersLive.emit(),
  });

  const soldOutIds = useMemo(
    () => new Set((menu || []).flatMap((c) => c.items.filter((i) => i.soldOut).map((i) => i.id))),
    [menu],
  );

  const goTo = (catId) => {
    setActiveCat(catId);
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const total = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  const submit = async () => {
    setSending(true);
    setError('');
    try {
      const order = await api.createOrder({
        table,
        lines: cart.map((l) => ({ itemId: l.item.id, qty: l.qty, options: l.options, note: l.note })),
      });
      localStorage.setItem(storageKey(table), JSON.stringify([...readMyOrders(table), order.id].slice(-20)));
      setPlaced(order);
      setCart([]);
      setShowCart(false);
      setTrackerKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
      api.menu().then(setMenu).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="customer">
      <header className="c-header">
        <div>
          <div className="logo">{brand.name}</div>
          <div className="tagline">{brand.tagline}</div>
        </div>
        <div className="table-badge">
          <span>Table</span>
          <strong>{table}</strong>
        </div>
      </header>

      {menu && menu.length > 1 && (
        <nav className="cat-tabs">
          {menu.map((cat) => (
            <button key={cat.id} className={activeCat === cat.id ? 'on' : ''} onClick={() => goTo(cat.id)}>
              {cat.name}
            </button>
          ))}
        </nav>
      )}

      {placed && (
        <div className="confirm">
          <div className="confirm-check">✓</div>
          <div>
            <strong>Commande n° {placed.number} envoyée !</strong>
            <div>On vous l'apporte à la table {table}. Total : {euro(placed.total)}</div>
          </div>
          <button className="link" onClick={() => setPlaced(null)}>OK</button>
        </div>
      )}

      <OrderTracker key={trackerKey} table={table} live={ordersLive} />

      {error && <div className="error">{error}</div>}
      {!menu && !error && <p className="muted center">Chargement de la carte…</p>}

      {menu?.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="category">
          <h2>{cat.name}</h2>
          <div className="items">
            {cat.items.map((item) => (
              <button
                key={item.id}
                className={`item ${item.soldOut ? 'item-out' : ''}`}
                disabled={item.soldOut}
                onClick={() => setOpen(item)}
              >
                <ProductVisual item={item} className="item-emoji" />
                <span className="item-body">
                  <span className="item-name">{item.name}</span>
                  <span className="item-desc">{item.description}</span>
                  <span className="item-price">{item.soldOut ? 'Épuisé pour aujourd\'hui' : euro(item.price)}</span>
                </span>
                {!item.soldOut && <span className="item-add">+</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <footer className="c-footer">
        {brand.name} · Table {table}
      </footer>

      {count > 0 && !showCart && (
        <button className="cart-bar" onClick={() => setShowCart(true)}>
          <span className="cart-count">{count}</span>
          Voir ma commande
          <span>{euro(total)}</span>
        </button>
      )}

      {open && (
        <ItemSheet
          item={open}
          onClose={() => setOpen(null)}
          onAdd={(line) => {
            setCart((c) => [...c, line]);
            setOpen(null);
          }}
        />
      )}

      {showCart && (
        <div className="overlay" onClick={() => setShowCart(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-close" onClick={() => setShowCart(false)} aria-label="Fermer">×</button>
            <h2>Ma commande · table {table}</h2>
            {cart.length === 0 && <p className="muted">Votre panier est vide.</p>}
            {cart.map((l) => (
              <div key={l.key} className="cart-line">
                <span className="cart-qty">{l.qty}×</span>
                <div className="cart-info">
                  <div className="item-name">
                    {l.item.emoji} {l.item.name}
                    {soldOutIds.has(l.item.id) && <span className="pill pill-annulee tag">Épuisé</span>}
                  </div>
                  {optionSummary(l.item, l.options) && <div className="muted small">{optionSummary(l.item, l.options)}</div>}
                  {l.note && <div className="muted small">« {l.note} »</div>}
                </div>
                <div className="cart-right">
                  <div>{euro(l.price * l.qty)}</div>
                  <button className="link small" onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))}>Retirer</button>
                </div>
              </div>
            ))}
            {error && <div className="error">{error}</div>}
            <div className="cart-total">
              <span>Total</span>
              <strong>{euro(total)}</strong>
            </div>
            <p className="muted small">{brand.paymentNote}</p>
            <button className="btn btn-block" disabled={!cart.length || sending} onClick={submit}>
              {sending ? 'Envoi…' : 'Envoyer la commande'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
