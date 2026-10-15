Badge de statut d'une commande : trois états, Reçue, En préparation et Prête. Chaque état combine une couleur, une icône et un libellé.

## États

| Statut | Icône | Fond | Texte | Sens |
|---|---|---|---|---|
| Reçue | ● | `--brand-blue-tint` | `--brand-blue-strong` | Commande enregistrée, pas encore lancée |
| En préparation | ◐ | `--accent-caramel-tint` | `--accent-caramel-strong` | En cours en cuisine |
| Prête | ✓ | `--success-tint` | `--success` | Peut être servie |

## Règles

- Le libellé est toujours affiché, même sur le comptoir. L'icône seule n'est jamais suffisante.
- Hauteur 28 px sur mobile, 36 px sur le comptoir, radius `--radius-md`, texte `caption` (12 px) sur mobile et 16 px sur le comptoir.
- Sur le suivi client, le statut courant est annoncé par `aria-live="polite"` au changement.
- Les trois états ne doivent jamais se ressembler : la teinte caramel n'est pas utilisée pour « Prête ».

```jsx
const STATUS = {
  received: { label: "Reçue", icon: "●", className: "is-received" },
  preparing: { label: "En préparation", icon: "◐", className: "is-preparing" },
  ready: { label: "Prête", icon: "✓", className: "is-ready" },
};

export function StatusBadge({ status, comptoir = false }) {
  const s = STATUS[status];
  return (
    <span className={`fc-status ${s.className} ${comptoir ? "fc-status--comptoir" : ""}`}>
      <span aria-hidden="true">{s.icon}</span> {s.label}
    </span>
  );
}
```

```css
.fc-status {
  display: inline-flex; align-items: center; gap: var(--space-1);
  min-height: 28px; padding: 0 var(--space-3); border-radius: var(--radius-md);
  font: 600 var(--text-caption)/var(--leading-caption) var(--font-sans);
}
.fc-status--comptoir { min-height: 36px; font-size: var(--text-body); }
.fc-status.is-received { background: var(--brand-blue-tint); color: var(--brand-blue-strong); }
.fc-status.is-preparing { background: var(--accent-caramel-tint); color: var(--accent-caramel-strong); }
.fc-status.is-ready { background: var(--success-tint); color: var(--success); }
```

## Accessibilité

Contraste texte sur teinte : au moins 4.5:1 dans les deux thèmes. Le badge n'est jamais un bouton ; l'action de changement de statut est un bouton séparé de l'OrderTicket.
