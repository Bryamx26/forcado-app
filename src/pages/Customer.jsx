import { useEffect, useMemo, useRef, useState } from 'react';
import { api, euro, STATUS_LABELS } from '../api.js';
import { useBrand } from '../brand.js';
import { useLiveEvents } from '../live.js';
import { Alert, Logo, Modal, StatusBadge, useToast } from '../components/ui.jsx';

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
    <Modal
      title={item.name}
      onClose={onClose}
      media={<ProductVisual item={item} className="sheet-visual" />}
      footer={
        <>
          <div className="qty" role="group" aria-label="Quantité">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Retirer un">−</button>
            <span aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Ajouter un">+</button>
          </div>
          <button
            type="button"
            className="btn btn-lg btn-grow"
            onClick={() => onAdd({ key: crypto.randomUUID(), item, options: selected, qty, note, price })}
          >
            Ajouter · {euro(price * qty)}
          </button>
        </>
      }
    >
      {item.description && <p className="muted">{item.description}</p>}

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

      <label className="field note">
        Remarque (allergie, etc.)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Facultatif" />
      </label>
    </Modal>
  );
}

const STEPS = ['nouvelle', 'en_cours', 'prete'];
const STEP_ICONS = { nouvelle: '●', en_cours: '◐', prete: '✓' };

// Suivi en trois étapes : l'étape courante porte un libellé et une icône, jamais seulement une couleur.
function Progress({ status }) {
  const current = STEPS.indexOf(status);
  return (
    <ol className="progress">
      {STEPS.map((step, i) => (
        <li
          key={step}
          className={i < current ? 'done' : i === current ? `current step-${step}` : ''}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className="progress-dot" aria-hidden="true">{i <= current ? STEP_ICONS[step] : ''}</span>
          <span>{STATUS_LABELS[step]}</span>
        </li>
      ))}
    </ol>
  );
}

function OrderTracker({ table, live }) {
  const [orders, setOrders] = useState([]);
  const tickRef = useRef(() => {});
  const seen = useRef({});

  // Le client a lu l'avis d'annulation : la commande n'est plus suivie sur cet appareil.
  const dismiss = (id) => {
    localStorage.setItem(storageKey(table), JSON.stringify(readMyOrders(table).filter((x) => x !== id)));
    setOrders((list) => list.filter((o) => o.id !== id));
  };

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const ids = readMyOrders(table);
      if (!ids.length) return;
      try {
        const data = await api.track(ids);
        if (!alive) return;
        // Annulation vue pendant que la page est ouverte : petite vibration sur les téléphones qui le permettent.
        if (data.some((o) => o.status === 'annulee' && seen.current[o.id] && seen.current[o.id] !== 'annulee')) {
          navigator.vibrate?.([200, 100, 200]);
        }
        seen.current = Object.fromEntries(data.map((o) => [o.id, o.status]));
        // Les commandes annulées restent affichées jusqu'à ce que le client ferme l'avis.
        setOrders(data.filter((o) => o.status !== 'servie').reverse());
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
    <section className="tracker" aria-live="polite">
      <h2>Suivi de vos commandes</h2>
      {orders.map((o) =>
        o.status === 'annulee' ? (
          <div key={o.id} className="tracker-order tracker-cancelled" role="alert">
            <div className="tracker-head">
              <strong>Commande n° {o.number}</strong>
              <StatusBadge status="annulee" />
            </div>
            <p className="small">
              Votre commande a été annulée par l'équipe. Pour toute question, adressez-vous au comptoir.
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismiss(o.id)}>
              J'ai compris
            </button>
          </div>
        ) : (
          <div key={o.id} className="tracker-order">
            <div className="tracker-head">
              <strong>Commande n° {o.number}</strong>
            </div>
            <Progress status={o.status} />
            {o.status === 'prete' && <p className="small tracker-ready">Votre commande arrive à votre table.</p>}
          </div>
        ),
      )}
    </section>
  );
}

// Carte d'un article : toute la carte ouvre la fiche, le bouton + ajoute directement un article sans options.
function ProductCard({ item, onOpen, onQuickAdd }) {
  const out = item.soldOut;
  return (
    <article className={`product ${out ? 'product-out' : ''}`}>
      <ProductVisual item={item} className="product-media" />
      <div className="product-body">
        <h3 className="product-name">
          <button type="button" className="product-open" disabled={out} onClick={() => onOpen(item)}>
            {item.name}
          </button>
        </h3>
        {item.description && <p className="product-desc">{item.description}</p>}
      </div>
      <div className="product-footer">
        {out ? <span className="product-soldout">Épuisé</span> : <span className="price">{euro(item.price)}</span>}
        {!out && (
          <button
            type="button"
            className="btn btn-icon"
            aria-label={`Ajouter ${item.name}`}
            onClick={() => (item.options.length ? onOpen(item) : onQuickAdd(item))}
          >
            +
          </button>
        )}
      </div>
    </article>
  );
}

export default function Customer({ table }) {
  const brand = useBrand();
  const toast = useToast();
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
        .then((all) => {
          // Les catégories vides (en préparation côté employés) ne sont pas montrées aux clients.
          const m = all.filter((c) => c.items.length);
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setShowCart(false);
      setTrackerKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
      loadMenu.current();
    } finally {
      setSending(false);
    }
  };

  const addLine = (line) => {
    setCart((c) => [...c, line]);
    setOpen(null);
    toast(`${line.qty > 1 ? `${line.qty} × ` : ''}${line.item.name} ajouté au panier`);
  };

  return (
    <div className="customer">
      <header className="c-header">
        <div>
          <Logo />
          <div className="tagline">{brand.tagline}</div>
        </div>
        <div className="table-badge">
          <span>Table</span>
          <strong>{table}</strong>
        </div>
      </header>

      {menu && menu.length > 1 && (
        <nav className="tabs cat-tabs" aria-label="Catégories">
          {menu.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`tab ${activeCat === cat.id ? 'on' : ''}`}
              aria-current={activeCat === cat.id ? 'true' : undefined}
              onClick={() => goTo(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      )}

      {placed && (
        <div className="confirm" role="status">
          <div className="confirm-check" aria-hidden="true">✓</div>
          <div>
            <strong>Commande n° {placed.number} envoyée !</strong>
            <div>On vous l'apporte à la table {table}. Total : {euro(placed.total)}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlaced(null)}>OK</button>
        </div>
      )}

      <OrderTracker key={trackerKey} table={table} live={ordersLive} />

      {error && <Alert>{error}</Alert>}
      {!menu && !error && <p className="muted center">Chargement de la carte…</p>}

      {menu?.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="category">
          <h2>{cat.name}</h2>
          <div className="products">
            {cat.items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onOpen={setOpen}
                onQuickAdd={(i) => addLine({ key: crypto.randomUUID(), item: i, options: {}, qty: 1, note: '', price: i.price })}
              />
            ))}
          </div>
        </section>
      ))}

      <footer className="c-footer">
        {brand.name} · Table {table}
      </footer>

      {count > 0 && !showCart && (
        <button type="button" className="cart-bar" onClick={() => setShowCart(true)}>
          <span className="cart-count" aria-label={`${count} article${count > 1 ? 's' : ''}`}>{count}</span>
          <span className="cart-label">Voir mon panier</span>
          <span className="price">{euro(total)}</span>
        </button>
      )}

      {open && <ItemSheet item={open} onClose={() => setOpen(null)} onAdd={addLine} />}

      {showCart && (
        <Modal
          title={`Ma commande · table ${table}`}
          onClose={() => setShowCart(false)}
          footer={
            <button type="button" className="btn btn-lg btn-block" disabled={!cart.length || sending} aria-busy={sending || undefined} onClick={submit}>
              {sending ? 'Envoi…' : `Envoyer la commande · ${euro(total)}`}
            </button>
          }
        >
          {cart.length === 0 && <p className="muted">Votre panier est vide.</p>}
          <ul className="cart-lines">
            {cart.map((l) => (
              <li key={l.key} className="cart-line">
                <span className="cart-qty">{l.qty} ×</span>
                <div className="cart-info">
                  <div className="cart-name">
                    {l.item.name}
                    {soldOutIds.has(l.item.id) && <span className="status status-annulee tag">Épuisé</span>}
                  </div>
                  {optionSummary(l.item, l.options) && <div className="muted small">{optionSummary(l.item, l.options)}</div>}
                  {l.note && <div className="muted small">« {l.note} »</div>}
                </div>
                <div className="cart-right">
                  <span className="price">{euro(l.price * l.qty)}</span>
                  <button type="button" className="link small" onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))}>
                    Retirer<span className="sr-only"> {l.item.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {error && <Alert>{error}</Alert>}
          <div className="cart-total">
            <span>Total</span>
            <strong className="price">{euro(total)}</strong>
          </div>
          <p className="muted small">{brand.paymentNote}</p>
        </Modal>
      )}
    </div>
  );
}
