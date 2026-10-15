Carte de commande affichée sur l'écran de comptoir : numéro de ticket, table, articles, heure et une action de passage au statut suivant. Une carte par commande, rangée dans la colonne de son statut.

## Anatomie

- En-tête : numéro de ticket (`ticket-number`, 32 px, gras) à gauche, table et heure à droite.
- StatusBadge en taille comptoir.
- Liste des articles : quantité en gras (« 2 × »), nom, notes (ex. « sans sucre »). Notes en `--accent-caramel-strong`, avec l'icône ⚑ pour qu'elles ne se perdent pas.
- Ancienneté : affichée en minutes. Au-delà de 10 minutes dans « Reçue », la carte passe en bordure `--accent-caramel`, avec le libellé « Depuis 12 min ».
- Une action : le bouton `comptoir` (56 px) porte le verbe de l'étape suivante : « Démarrer », « Prête ✓ », « Servie ».

## Règles

- Texte minimum 18 px ; le numéro de ticket est la première information lue.
- Largeur de colonne 320 px minimum ; plusieurs colonnes côte à côte en paysage.
- Pas de glisser-déposer obligatoire : le bouton fait foi.
- Mise à jour en temps réel : une carte qui change de statut est annoncée une seule fois (`aria-live="polite"` sur la colonne, pas sur chaque carte).
- Sur écran de comptoir, pas d'interaction au-delà de la carte affichée : pas de survol nécessaire.

```jsx
export function OrderTicket({ order, onAdvance, nextLabel }) {
  return (
    <article className="fc-ticket" aria-label={`Commande ${order.number}, table ${order.table}`}>
      <header className="fc-ticket__header">
        <span className="fc-ticket__number">#{order.number}</span>
        <span className="fc-ticket__meta">Table {order.table} · {order.minutesAgo} min</span>
      </header>
      <StatusBadge status={order.status} comptoir />
      <ul className="fc-ticket__items">
        {order.items.map((item) => (
          <li key={item.id}>
            <strong>{item.qty} ×</strong> {item.name}
            {item.note && <span className="fc-ticket__note"> ⚑ {item.note}</span>}
          </li>
        ))}
      </ul>
      {nextLabel && (
        <button className="fc-btn fc-btn--primary fc-btn--comptoir" onClick={() => onAdvance(order)}>
          {nextLabel}
        </button>
      )}
    </article>
  );
}
```

```css
.fc-ticket {
  background: var(--surface-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
  padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3);
  border-left: 6px solid var(--border-soft);
}
.fc-ticket.is-late { border-left-color: var(--accent-caramel); }
.fc-ticket__header { display: flex; justify-content: space-between; align-items: baseline; }
.fc-ticket__number { font: 700 var(--text-ticket)/var(--leading-ticket) var(--font-sans); font-variant-numeric: tabular-nums; }
.fc-ticket__meta { font: 600 var(--text-body)/var(--leading-body) var(--font-sans); color: var(--ink-muted); }
.fc-ticket__items { list-style: none; padding: 0; margin: 0; font: 400 var(--text-body-lg)/var(--leading-body-lg) var(--font-sans); display: flex; flex-direction: column; gap: var(--space-2); }
.fc-ticket__note { color: var(--accent-caramel-strong); font-size: var(--text-small); }
```

## Accessibilité

Le numéro, la table et le statut sont lus dans cet ordre grâce à l'`aria-label` et à la structure en liste. La bordure d'ancienneté n'est jamais le seul signal : le libellé « Depuis 12 min » la double. Contraste des notes : 6:1 sur fond blanc.
