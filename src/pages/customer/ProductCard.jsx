import { euro } from '../../api.js';
import ProductVisual from './ProductVisual.jsx';

// Carte d'un article : toute la carte ouvre la fiche, le bouton + ajoute directement un article sans options.
export default function ProductCard({ item, onOpen, onQuickAdd }) {
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
