Champ de saisie avec libellé visible, aide facultative et message d'erreur. Utilisé pour la connexion employé et la gestion de la carte (nom, prix, description).

## Anatomie

- Libellé au-dessus, toujours visible (pas de placeholder seul).
- Champ de 48 px de haut, radius `--radius-sm`, bordure `--border-strong` (3:1).
- Aide en `small`, `--ink-muted`, reliée par `aria-describedby`.
- Erreur en `--danger` avec une icône et un texte précis : « Le prix doit être supérieur à 0 ».

## États

- Repos : bordure `--border-strong`, fond `--surface-card`.
- Focus : bordure 2 px `--brand-blue` + anneau de focus.
- Erreur : bordure `--danger`, message d'erreur lié par `aria-describedby` et `aria-invalid="true"`.
- Désactivé : fond `--surface-sunken`, texte `--ink-muted`.

## Règles

- Pour les prix, `inputmode="decimal"` et le symbole € affiché après le champ.
- Les mots de passe ont un bouton d'affichage de 44 px, libellé « Afficher le mot de passe ».
- Ne jamais effacer la saisie en cas d'erreur.

```jsx
export function Field({ id, label, hint, error, ...inputProps }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="fc-field">
      <label htmlFor={id} className="fc-field__label">{label}</label>
      <input
        id={id}
        className="fc-field__input"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...inputProps}
      />
      {hint && <p id={hintId} className="fc-field__hint">{hint}</p>}
      {error && <p id={errorId} className="fc-field__error" role="alert">⚠ {error}</p>}
    </div>
  );
}
```

```css
.fc-field { display: flex; flex-direction: column; gap: var(--space-1); }
.fc-field__label { font: 600 var(--text-small)/var(--leading-small) var(--font-sans); color: var(--ink); }
.fc-field__input {
  min-height: var(--touch-comptoir); padding: var(--space-3);
  border: 2px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--surface-card); color: var(--ink); font: 400 var(--text-body)/var(--leading-body) var(--font-sans);
}
.fc-field__input:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-color: var(--brand-blue); }
.fc-field__input[aria-invalid="true"] { border-color: var(--danger); }
.fc-field__input:disabled { background: var(--surface-sunken); color: var(--ink-muted); }
.fc-field__hint { font: 400 var(--text-small)/var(--leading-small) var(--font-sans); color: var(--ink-muted); margin: 0; }
.fc-field__error { font: 600 var(--text-small)/var(--leading-small) var(--font-sans); color: var(--danger); margin: 0; }
```

## Accessibilité

Le libellé est relié au champ par `htmlFor`. Le message d'erreur est annoncé (`role="alert"`). Bordure et texte d'erreur respectent 3:1 et 4.5:1.
