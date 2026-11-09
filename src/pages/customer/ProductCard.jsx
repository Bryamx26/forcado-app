import { euro } from '../../api.js';
import ProductVisual from './ProductVisual.jsx';
import { ALLERGEN_MATCH } from '../../../shared/allergens.js';
import { useT } from '../../i18n.jsx';

// Avertissement quand le client a indiqué ses allergies.
const ALLERGEN_FLAGS = {
  [ALLERGEN_MATCH.TRACES]: { key: 'allergens.flagTraces', className: 'product-flag-traces' },
  [ALLERGEN_MATCH.UNKNOWN]: { key: 'allergens.flagUnknown', className: '' },
};

// Carte d'un article : toute la carte ouvre la fiche, le bouton + ajoute directement un article sans options.
export default function ProductCard({ item, allergenMatch, onOpen, onQuickAdd }) {
  const t = useT();
  const out = item.soldOut;
  const flag = ALLERGEN_FLAGS[allergenMatch];
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
        {flag && <span className={`product-flag ${flag.className}`}>⚠ {t(flag.key)}</span>}
      </div>
      <div className="product-footer">
        {out ? <span className="product-soldout">{t('menu.soldOut')}</span> : <span className="price">{euro(item.price)}</span>}
        {!out && (
          <button
            type="button"
            className="btn btn-icon"
            aria-label={t('menu.add', { name: item.name })}
            onClick={() => (item.options.length ? onOpen(item) : onQuickAdd(item))}
          >
            +
          </button>
        )}
      </div>
    </article>
  );
}
