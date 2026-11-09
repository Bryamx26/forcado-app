import { useMemo, useState } from 'react';
import { api, euro } from '../api.js';
import { useBrand } from '../brand.js';
import { Alert, Logo, useToast } from '../components/ui.jsx';
import ItemSheet from './customer/ItemSheet.jsx';
import ProductCard from './customer/ProductCard.jsx';
import OrderTracker from './customer/OrderTracker.jsx';
import CartSheet from './customer/CartSheet.jsx';
import { useCustomerMenu } from './customer/useCustomerMenu.js';
import { rememberOrder } from './customer/myOrders.js';
import AllergenFilter, { useAvoidedAllergens } from './customer/AllergenFilter.jsx';
import { ALLERGEN_MATCH, allergenMatch } from '../../shared/allergens.js';
import { cartCount, cartTotal, priceCart, soldOutItemIds, toOrderLines } from './customer/cart.js';

function CategoryTabs({ menu, active, onSelect }) {
  if (!menu || menu.length < 2) return null;
  return (
    <nav className="tabs cat-tabs" aria-label="Catégories">
      {menu.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`tab ${active === cat.id ? 'on' : ''}`}
          aria-current={active === cat.id ? 'true' : undefined}
          onClick={() => onSelect(cat.id)}
        >
          {cat.name}
        </button>
      ))}
    </nav>
  );
}

// Masque les articles qui contiennent un allergène évité ; les autres gardent leur avertissement éventuel.
function filterMenu(menu, avoided) {
  if (!menu) return { visibleMenu: null, hiddenCount: 0 };
  const rated = menu.map((cat) => ({ ...cat, items: cat.items.map((item) => ({ item, match: allergenMatch(item, avoided) })) }));
  const isHidden = ({ match }) => match === ALLERGEN_MATCH.CONTAINS;
  const hiddenCount = rated.flatMap((cat) => cat.items).filter(isHidden).length;
  const visibleMenu = rated
    .map((cat) => ({ ...cat, items: cat.items.filter((entry) => !isHidden(entry)) }))
    .filter((cat) => cat.items.length);
  return { visibleMenu, hiddenCount };
}

function PlacedNotice({ order, table, onClose }) {
  return (
    <div className="confirm" role="status">
      <div className="confirm-check" aria-hidden="true">✓</div>
      <div>
        <strong>Commande n° {order.number} envoyée !</strong>
        <div>On vous l'apporte à la table {table}. Total : {euro(order.total)}</div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>OK</button>
    </div>
  );
}

export default function Customer({ table }) {
  const brand = useBrand();
  const toast = useToast();
  const { menu, loadError, reloadMenu, ordersSignal } = useCustomerMenu();
  const [activeCat, setActiveCat] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [sending, setSending] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [trackerKey, setTrackerKey] = useState(0);
  const [avoided, setAvoided] = useAvoidedAllergens();
  const { visibleMenu, hiddenCount } = useMemo(() => filterMenu(menu, avoided), [menu, avoided]);

  const lines = useMemo(() => priceCart(cart, menu), [cart, menu]);
  const soldOutIds = useMemo(() => soldOutItemIds(menu), [menu]);
  const total = cartTotal(lines);
  const count = cartCount(cart);

  const goTo = (catId) => {
    setActiveCat(catId);
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    setSending(true);
    setError('');
    try {
      const order = await api.createOrder({ table, lines: toOrderLines(cart) });
      rememberOrder(table, order.id);
      setPlaced(order);
      setCart([]);
      setShowCart(false);
      setTrackerKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e.message);
      reloadMenu();
    } finally {
      setSending(false);
    }
  };

  const addLine = (line) => {
    setCart((c) => [...c, line]);
    setOpen(null);
    toast(`${line.qty > 1 ? `${line.qty} × ` : ''}${line.item.name} ajouté au panier`);
  };
  const quickAdd = (item) => addLine({ key: crypto.randomUUID(), item, options: {}, qty: 1, note: '' });
  const removeLine = (key) => setCart((c) => c.filter((l) => l.key !== key));

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

      <CategoryTabs menu={visibleMenu} active={activeCat ?? visibleMenu?.[0]?.id} onSelect={goTo} />

      {placed && <PlacedNotice order={placed} table={table} onClose={() => setPlaced(null)} />}

      <OrderTracker key={trackerKey} place={table} live={ordersSignal} />

      {loadError && <Alert>{loadError}</Alert>}
      {!menu && !loadError && <p className="muted center">Chargement de la carte…</p>}

      {menu && <AllergenFilter avoided={avoided} onChange={setAvoided} hiddenCount={hiddenCount} />}

      {visibleMenu?.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="category">
          <h2>{cat.name}</h2>
          <div className="products">
            {cat.items.map(({ item, match }) => (
              <ProductCard key={item.id} item={item} allergenMatch={match} onOpen={setOpen} onQuickAdd={quickAdd} />
            ))}
          </div>
        </section>
      ))}

      <p className="small muted center allergen-legal">Informations sur les allergènes : touchez un article, ou demandez au comptoir.</p>

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
        <CartSheet
          title={`Ma commande · table ${table}`}
          lines={lines}
          total={total}
          soldOutIds={soldOutIds}
          error={error}
          sending={sending}
          onRemove={removeLine}
          onSubmit={submit}
          onClose={() => setShowCart(false)}
        />
      )}
    </div>
  );
}
