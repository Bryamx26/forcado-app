import { useMemo, useState } from 'react';
import { api, euro } from '../api.js';
import { useBrand } from '../brand.js';
import { Alert, Logo, useToast } from '../components/ui.jsx';
import { LanguagePicker, useErrorText, useLanguage, useT } from '../i18n.jsx';
import ItemSheet from './customer/ItemSheet.jsx';
import ProductCard from './customer/ProductCard.jsx';
import OrderTracker from './customer/OrderTracker.jsx';
import CartSheet from './customer/CartSheet.jsx';
import ReadyAlert from './customer/ReadyAlert.jsx';
import TakeawayFields from './customer/TakeawayFields.jsx';
import { formatTime } from '../time.js';
import { ORDER_MODE } from '../../shared/pickup.js';
import { useCustomerMenu } from './customer/useCustomerMenu.js';
import { rememberOrder } from './customer/myOrders.js';
import AllergenFilter, { useAvoidedAllergens } from './customer/AllergenFilter.jsx';
import { ALLERGEN_MATCH, allergenMatch } from '../../shared/allergens.js';
import { cartCount, cartTotal, priceCart, soldOutItemIds, toOrderLines } from './customer/cart.js';

function CategoryTabs({ menu, active, onSelect }) {
  const t = useT();
  if (!menu || menu.length < 2) return null;
  return (
    <nav className="tabs cat-tabs" aria-label={t('menu.categories')}>
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

function usePlacedText(order) {
  const t = useT();
  const { lang } = useLanguage();
  const { takeaway } = useBrand();
  const total = euro(order.total);
  if (order.mode !== ORDER_MODE.TAKEAWAY) return t('placed.table', { table: order.table, total });
  const when = order.pickupAt ? t('placed.at', { time: formatTime(order.pickupAt, takeaway.timeZone, lang) }) : t('placed.asap');
  return t('placed.takeaway', { when, name: order.customerName, total });
}

function PlacedNotice({ order, onClose }) {
  const t = useT();
  const text = usePlacedText(order);
  return (
    <div className="confirm" role="status">
      <div className="confirm-check" aria-hidden="true">✓</div>
      <div>
        <strong>{t('placed.title', { number: order.number })}</strong>
        <div>{text}</div>
        <ReadyAlert orderId={order.id} />
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.ok')}</button>
    </div>
  );
}

// Le prénom est obligatoire ; « plus tard » demande un créneau (pickupAt à undefined tant qu'il n'est pas choisi).
const isPickupComplete = ({ customerName, pickupAt }) => customerName.trim().length > 0 && pickupAt !== undefined && pickupAt !== '';

// table : numéro de la table (QR code de table) ; sans table, commande à emporter.
export default function Customer({ table = null }) {
  const isTakeaway = table == null;
  const place = isTakeaway ? ORDER_MODE.TAKEAWAY : table;
  const brand = useBrand();
  const toast = useToast();
  const t = useT();
  const errorText = useErrorText();
  const { lang } = useLanguage();
  const { menu, loadFailed, reloadMenu, ordersSignal } = useCustomerMenu(lang);
  const [activeCat, setActiveCat] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [pickup, setPickup] = useState({ customerName: '', pickupAt: null });
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
      const where = isTakeaway ? { mode: ORDER_MODE.TAKEAWAY, ...pickup } : { mode: ORDER_MODE.DINE_IN, table };
      const order = await api.createOrder({ ...where, lang, lines: toOrderLines(cart) });
      rememberOrder(place, order.id);
      setPlaced(order);
      setCart([]);
      setShowCart(false);
      setTrackerKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(errorText(e, { name: itemName(e.vars?.itemId) }));
      reloadMenu();
    } finally {
      setSending(false);
    }
  };

  const addLine = (line) => {
    setCart((c) => [...c, line]);
    setOpen(null);
    toast(t('menu.addedToCart', { name: `${line.qty > 1 ? `${line.qty} × ` : ''}${line.item.name}` }));
  };
  const quickAdd = (item) => addLine({ key: crypto.randomUUID(), item, options: {}, qty: 1, note: '' });
  const removeLine = (key) => setCart((c) => c.filter((l) => l.key !== key));
  const itemName = (id) => lines.find((l) => l.item.id === id)?.item.name || '';

  return (
    <div className="customer">
      <header className="c-header">
        <div>
          <Logo />
          <div className="tagline">{brand.tagline}</div>
        </div>
        <div className="c-header-side">
          {isTakeaway ? (
            <div className="table-badge takeaway-badge">
              <strong>{t('takeaway.badge')}</strong>
            </div>
          ) : (
            <div className="table-badge">
              <span>{t('common.table')}</span>
              <strong>{table}</strong>
            </div>
          )}
          <LanguagePicker />
        </div>
      </header>

      <CategoryTabs menu={visibleMenu} active={activeCat ?? visibleMenu?.[0]?.id} onSelect={goTo} />

      {placed && <PlacedNotice order={placed} onClose={() => setPlaced(null)} />}

      <OrderTracker key={trackerKey} place={place} live={ordersSignal} />

      {loadFailed && <Alert>{t('menu.loadError')}</Alert>}
      {!menu && !loadFailed && <p className="muted center">{t('menu.loading')}</p>}

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

      <p className="small muted center allergen-legal">{t('allergens.legal')}</p>

      <footer className="c-footer">
        {isTakeaway ? `${brand.name} · ${t('takeaway.badge')}` : t('menu.footer', { brand: brand.name, table })}
      </footer>

      {count > 0 && !showCart && (
        <button type="button" className="cart-bar" onClick={() => setShowCart(true)}>
          <span className="cart-count" aria-label={t('cart.count', { count })}>{count}</span>
          <span className="cart-label">{t('cart.open')}</span>
          <span className="price">{euro(total)}</span>
        </button>
      )}

      {open && <ItemSheet item={open} onClose={() => setOpen(null)} onAdd={addLine} />}

      {showCart && (
        <CartSheet
          title={isTakeaway ? t('takeaway.title') : t('cart.title', { table })}
          lines={lines}
          total={total}
          soldOutIds={soldOutIds}
          error={error}
          sending={sending}
          canSubmit={!isTakeaway || isPickupComplete(pickup)}
          onRemove={removeLine}
          onSubmit={submit}
          onClose={() => setShowCart(false)}
        >
          {isTakeaway && <TakeawayFields value={pickup} total={total} onChange={setPickup} />}
        </CartSheet>
      )}
    </div>
  );
}
