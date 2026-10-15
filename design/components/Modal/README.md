Fenêtre modale : fiche produit (sur mobile, en feuille basse) ou confirmation d'une action destructive.

## Variantes

- **Feuille** (mobile) : ancrée en bas, radius `--radius-lg` en haut, poignée de 40 × 4 px, hauteur max 90 %.
- **Dialogue** (tablette, comptoir) : centrée, largeur 480 px, radius `--radius-lg`, ombre `--shadow-lg`.
- **Confirmation** : dialogue court, titre qui nomme l'objet, deux boutons. Le bouton de confirmation est `danger`, mais le focus initial est sur « Annuler ».

## Règles

- Voile de fond : `rgba(21, 32, 46, 0.6)`.
- Focus piégé à l'intérieur ; `Échap` ferme ; le focus revient au déclencheur à la fermeture.
- Un titre en H2 relié par `aria-labelledby`, rôle `dialog` et `aria-modal="true"`.
- Bouton de fermeture de 44 px, en haut à droite, avec `aria-label="Fermer"`.
- Animation : glissement de 200 ms maximum, supprimée si `prefers-reduced-motion`.

```jsx
import { useEffect, useRef } from "react";

export function Modal({ open, title, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector("[data-autofocus], button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fc-modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fc-modal-title"
        className="fc-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fc-modal__header">
          <h2 id="fc-modal-title">{title}</h2>
          <button className="fc-modal__close" onClick={onClose} aria-label="Fermer">×</button>
        </header>
        <div className="fc-modal__body">{children}</div>
        {footer && <footer className="fc-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
```

```css
.fc-modal-overlay { position: fixed; inset: 0; background: rgba(21, 32, 46, 0.6); display: grid; place-items: end center; z-index: 50; }
.fc-modal {
  background: var(--surface-card); color: var(--ink); width: 100%; max-height: 90vh; overflow: auto;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0; box-shadow: var(--shadow-lg); padding: var(--space-5);
}
@media (min-width: 768px) {
  .fc-modal-overlay { place-items: center; }
  .fc-modal { width: 480px; border-radius: var(--radius-lg); }
}
.fc-modal__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
.fc-modal__header h2 { font: 600 var(--text-h2)/var(--leading-h2) var(--font-display); margin: 0; }
.fc-modal__close { min-width: var(--touch-min); min-height: var(--touch-min); background: transparent; border: 0; color: var(--ink); font-size: 24px; }
.fc-modal__footer { display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-5); }
.fc-modal__close:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

## Accessibilité

Le focus est piégé dans la modale et revient au déclencheur à la fermeture. Le fond est inerte (`inert` ou `aria-hidden` sur le reste de l'application). Le bouton de confirmation d'une suppression n'est jamais le premier focalisé.
