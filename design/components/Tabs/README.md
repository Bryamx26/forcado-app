Onglets horizontaux en forme de pilules, pour passer d'une catégorie à l'autre (carte client, carte employé) ou d'un espace à l'autre.

## Règles

- Hauteur 44 px par onglet, pill (`--radius-pill`), défilement horizontal si nécessaire, sans barre visible.
- Onglet actif : fond `--brand-blue`, texte `--ink-on-brand` (ou `--brand-blue` sur fond clair en mode fantôme).
- Onglet inactif : fond `--surface-raised`, texte `--ink`.
- Compteur facultatif entre parenthèses, par exemple « Nata (12) ».
- Au plus 6 onglets visibles ; au-delà, défilement.
- Navigation au clavier : flèches gauche et droite, `Début` et `Fin`.

```jsx
export function Tabs({ items, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="fc-tabs">
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`fc-tab ${selected ? "is-active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}{item.count != null ? ` (${item.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}
```

```css
.fc-tabs { display: flex; gap: var(--space-2); overflow-x: auto; scrollbar-width: none; padding: var(--space-1) 0; }
.fc-tab {
  min-height: var(--touch-min); padding: 0 var(--space-4); border-radius: var(--radius-pill);
  border: 0; background: var(--surface-raised); color: var(--ink); white-space: nowrap;
  font: 600 var(--text-small)/var(--leading-small) var(--font-sans);
}
.fc-tab.is-active { background: var(--brand-blue); color: var(--ink-on-brand); }
.fc-tab:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

## Accessibilité

Rôles ARIA `tablist`, `tab` et `aria-selected`. Le contraste de l'onglet actif est de 8:1 en clair. Un onglet sans sélection visible ne doit jamais être utilisé.
