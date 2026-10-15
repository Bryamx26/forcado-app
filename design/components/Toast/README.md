Message bref qui confirme une action sans bloquer l'écran : « Ajouté au panier », « Commande envoyée », « Article supprimé ».

## Règles

- Position : en bas de l'écran sur mobile (au-dessus de la barre d'action), en haut à droite sur tablette et comptoir.
- Durée : 4 secondes pour une information, 6 secondes si l'action propose « Annuler ». Pas de disparition automatique pour une erreur.
- Une seule ligne de texte, plus un bouton d'action facultatif de 44 px.
- Variantes : succès (`--success-tint`), information (`--brand-blue-tint`), erreur (`--danger-tint`). Chaque variante a une icône et un texte.
- Région `aria-live="polite"` pour les succès et informations, `role="alert"` pour les erreurs.
- Maximum trois toasts empilés ; les plus anciens disparaissent d'abord.

```jsx
const TONES = {
  success: { icon: "✓", className: "is-success", live: "polite" },
  info: { icon: "i", className: "is-info", live: "polite" },
  error: { icon: "⚠", className: "is-error", live: "assertive" },
};

export function Toast({ tone = "info", message, actionLabel, onAction, onClose }) {
  const t = TONES[tone];
  return (
    <div className={`fc-toast ${t.className}`} role={tone === "error" ? "alert" : "status"} aria-live={t.live}>
      <span className="fc-toast__icon" aria-hidden="true">{t.icon}</span>
      <p className="fc-toast__text">{message}</p>
      {actionLabel && <button className="fc-toast__action" onClick={onAction}>{actionLabel}</button>}
      <button className="fc-toast__close" onClick={onClose} aria-label="Fermer la notification">×</button>
    </div>
  );
}
```

```css
.fc-toast {
  display: flex; align-items: center; gap: var(--space-3);
  min-height: var(--touch-min); padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md); box-shadow: var(--shadow-md);
  background: var(--surface-card); color: var(--ink);
  font: 400 var(--text-small)/var(--leading-small) var(--font-sans);
}
.fc-toast.is-success { background: var(--success-tint); color: var(--success); }
.fc-toast.is-info { background: var(--brand-blue-tint); color: var(--brand-blue-strong); }
.fc-toast.is-error { background: var(--danger-tint); color: var(--danger); }
.fc-toast__text { margin: 0; flex: 1; }
.fc-toast__action, .fc-toast__close { min-height: var(--touch-min); min-width: var(--touch-min); background: transparent; border: 0; color: inherit; font-weight: 600; }
.fc-toast__action:focus-visible, .fc-toast__close:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

## Accessibilité

Le texte garde 4.5:1 sur sa teinte dans les deux thèmes. Un toast ne contient jamais l'unique information critique : une commande refusée reste aussi visible dans la liste. Les toasts n'interceptent pas le focus.
