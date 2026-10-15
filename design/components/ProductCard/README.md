Carte d'un article de la carte : photo, nom, description courte, prix et bouton d'ajout, en grille 2 colonnes sur mobile.

## Anatomie

- Photo, ratio 4:3, radius `--radius-lg` en haut uniquement. Un emplacement neutre s'affiche si la photo manque.
- Nom en H3 (Fraunces 18 px), une ligne de description en `--ink-muted`.
- Allergènes en `small`, toujours visibles.
- Prix en `price`, chiffres tabulaires, et bouton `+` de 44 px en bas à droite.
- Si l'article a des options, le bouton ouvre la fiche produit au lieu d'ajouter directement.

## Règles

- Article indisponible : la carte reste visible, grisée à 60 % d'opacité, avec le libellé « Épuisé » (la couleur ne suffit pas).
- Ne jamais afficher le prix barré sans prix actuel à côté.
- Toute la carte est cliquable pour ouvrir la fiche ; le bouton `+` est un bouton séparé avec son propre `aria-label` (« Ajouter Pastel de nata »).

```jsx
export function ProductCard({ product, onOpen, onAdd }) {
  const soldOut = product.soldOut;
  return (
    <article className={`fc-product ${soldOut ? "is-sold-out" : ""}`}>
      <button className="fc-product__media" onClick={() => onOpen(product)} aria-label={product.name}>
        {product.image ? <img src={product.image} alt="" /> : <span className="fc-product__placeholder" aria-hidden="true" />}
      </button>
      <div className="fc-product__body">
        <h3 className="fc-product__name">{product.name}</h3>
        <p className="fc-product__desc">{product.description}</p>
        {product.allergens?.length > 0 && (
          <p className="fc-product__allergens">Allergènes : {product.allergens.join(", ")}</p>
        )}
        <div className="fc-product__footer">
          <span className="fc-price">{soldOut ? "Épuisé" : product.price}</span>
          <button
            className="fc-btn fc-btn--primary fc-btn--md"
            disabled={soldOut}
            onClick={() => onAdd(product)}
            aria-label={`Ajouter ${product.name}`}
          >+</button>
        </div>
      </div>
    </article>
  );
}
```

```css
.fc-product {
  background: var(--surface-card); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm); overflow: hidden; display: flex; flex-direction: column;
}
.fc-product__media { aspect-ratio: 4 / 3; background: var(--surface-sunken); border: 0; padding: 0; }
.fc-product__media img { width: 100%; height: 100%; object-fit: cover; }
.fc-product__body { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
.fc-product__name { font: 600 var(--text-h3)/var(--leading-h3) var(--font-display); color: var(--ink); margin: 0; }
.fc-product__desc, .fc-product__allergens { font: 400 var(--text-small)/var(--leading-small) var(--font-sans); color: var(--ink-muted); margin: 0; }
.fc-product__footer { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-2); }
.fc-price { font: 700 var(--text-body-lg)/var(--leading-body) var(--font-sans); font-variant-numeric: tabular-nums; }
.fc-product.is-sold-out { opacity: 0.6; }
```

## Accessibilité

Le nom du produit est un titre (H3) pour la navigation par lecteur d'écran. Les cibles tactiles font au moins 44 px. L'image est décorative (`alt=""`) puisque le nom est juste à côté.
