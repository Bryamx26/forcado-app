Bouton d'action avec quatre variantes : primaire, secondaire, fantôme et danger.

## Variantes

| Variante | Fond | Texte | Usage |
|---|---|---|---|
| primary | `--brand-blue` | `--ink-on-brand` | Une par écran : Ajouter, Envoyer, Se connecter |
| secondary | `--accent-caramel-tint` | `--accent-caramel-strong` | Action complémentaire : Imprimer les QR |
| ghost | transparent | `--brand-blue` | Annuler, retour, actions tertiaires |
| danger | `--danger` | `--ink-on-brand` | Supprimer, confirmer une suppression |

## Tailles

- `md` : 44 px (minimum tactile, mobile)
- `lg` : 48 px (défaut sur mobile et sur tablette)
- `comptoir` : 56 px (écran de comptoir, libellé en 18 px)

## Règles

- Libellé en verbe, court : « Ajouter · 3,60 € », « Démarrer ».
- Un seul bouton primaire par écran ou par carte.
- État désactivé : `opacity: 0.5` et `cursor: not-allowed`, mais le libellé reste lisible.
- État chargement : le libellé reste, un spinner remplace l'icône, `aria-busy="true"`.

```jsx
export function Button({ variant = "primary", size = "lg", loading = false, children, ...props }) {
  return (
    <button
      className={`fc-btn fc-btn--${variant} fc-btn--${size}`}
      aria-busy={loading || undefined}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <span className="fc-spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
```

```css
.fc-btn {
  min-height: var(--touch-min);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font: 600 var(--text-body)/var(--leading-body) var(--font-sans);
  border: 2px solid transparent;
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  transition: background var(--motion-fast) var(--ease-standard);
}
.fc-btn--lg { min-height: var(--touch-comptoir); }
.fc-btn--comptoir { min-height: 56px; font-size: var(--text-body-lg); }
.fc-btn--primary { background: var(--brand-blue); color: var(--ink-on-brand); }
.fc-btn--primary:hover { background: var(--brand-blue-strong); }
.fc-btn--secondary { background: var(--accent-caramel-tint); color: var(--accent-caramel-strong); }
.fc-btn--ghost { background: transparent; color: var(--brand-blue); }
.fc-btn--danger { background: var(--danger); color: var(--ink-on-brand); }
.fc-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.fc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

## Accessibilité

Contraste texte sur fond : 4.5:1 minimum. Le focus est un anneau de 2 px décalé de 2 px. Un bouton qui n'est qu'une icône doit avoir un `aria-label`.
