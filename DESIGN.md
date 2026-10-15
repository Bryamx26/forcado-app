# DESIGN.md — Forcado

Système de design de l'application de commande à table de **Forcado**, pâtisserie portugaise à Bruxelles (pastéis de nata, viennoiseries, cafés). Il sert aussi de base à la revente à d'autres commerces : **toute l'identité passe par des variables CSS et des tokens**, pour qu'un autre commerce change couleurs, logo et polices sans toucher aux composants.

---

## 1. Principes

1. **Chaleureux, artisanal, lisible.** Crème et caramel pour l'accueil, bleu azulejo pour les repères. Les motifs restent décoratifs, jamais dans le chemin d'une action.
2. **Lisible d'abord.** Corps de texte à 16 px minimum sur mobile, 18 px sur comptoir. Un écran = une intention.
3. **Le statut se lit de loin.** Sur le comptoir, un statut se reconnaît par sa couleur *et* son libellé *et* sa position (colonne).
4. **Le tactile est généreux.** Cible minimale 44 × 44 px, 48 px pour les actions principales et les écrans de comptoir.
5. **Remplaçable.** Aucune couleur, police ou image de marque n'est codée en dur dans les composants.

---

## 2. Tokens (variables CSS)

Les valeurs ci-dessous sont celles de [`design/tokens.json`](design/tokens.json). L'app n'a qu'un thème, clair : pas de mode sombre, même si l'appareil en utilise un.

```css
:root {
  color-scheme: light;

  /* — Surfaces — */
  --surface-page: #FBF6EC;
  --surface-raised: #F3EADB;
  --surface-card: #FFFFFF;
  --surface-sunken: #E8DCC6;
  --border-soft: #E3D6BF;
  --border-strong: #7A6A58;

  /* — Texte — */
  --ink: #2A1F17;
  --ink-muted: #5E5044;
  --ink-on-brand: #FFFFFF;

  /* — Marque (azulejo) — */
  --brand-blue: #1F4E8C;
  --brand-blue-strong: #0E2F5A;
  --brand-blue-tint: #DCE7F5;
  --accent-caramel: #B9722E;        /* décor uniquement */
  --accent-caramel-strong: #8A4F1A; /* texte et boutons secondaires */
  --accent-caramel-tint: #F6E6CF;
  --tile-yellow: #E9B949;           /* décor uniquement */
  --tile-blue-light: #9CBDE3;       /* décor uniquement */

  /* — États — */
  --success: #2E6B3F;
  --success-tint: #DDEFE0;
  --danger: #A13A2A;
  --danger-tint: #F7DDD7;
  --focus-ring: #1F4E8C;

  /* — Typographie — */
  --font-display: "Fraunces", Georgia, "Times New Roman", serif;
  --font-logo: "Playfair Display", Georgia, serif; /* nom de l'établissement, italique 600 */
  --font-sans: "Figtree", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --text-caption: 12px;  --leading-caption: 16px;
  --text-small: 14px;    --leading-small: 20px;
  --text-body: 16px;     --leading-body: 24px;
  --text-body-lg: 18px;  --leading-body-lg: 26px;
  --text-h3: 18px;       --leading-h3: 24px;
  --text-h2: 22px;       --leading-h2: 28px;
  --text-h1: 28px;       --leading-h1: 34px;
  --text-display: 36px;  --leading-display: 42px;
  --text-ticket: 32px;   --leading-ticket: 36px;

  /* — Espacements (échelle 4 px) — */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px;  --space-10: 40px;
  --space-12: 48px;

  /* — Rayons — */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-pill: 999px;

  /* — Ombres — */
  --shadow-sm: 0 1px 2px rgba(42, 31, 23, 0.08);
  --shadow-md: 0 6px 16px rgba(42, 31, 23, 0.12);
  --shadow-lg: 0 16px 40px rgba(14, 47, 90, 0.20);

  /* — Mouvement — */
  --motion-fast: 120ms;
  --motion-base: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* — Tactile — */
  --touch-min: 44px;
  --touch-comptoir: 48px;
}

body {
  background: var(--surface-page);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  line-height: var(--leading-body);
}
```

### Marque remplaçable

Pour un autre commerce, on ne change que le bloc `:root` (couleurs, polices), le fichier de logo et le nom. Les composants consomment uniquement les noms `--brand-*`, `--accent-*`, `--font-*`. Les noms sémantiques (`--success`, `--danger`) ne changent pas.

---

## 3. Typographie

| Rôle | Police | Taille / interligne | Usage |
|---|---|---|---|
| Logo | Playfair Display (600 italique) | 28 / 34, 36 / 42 en accueil | Nom de l'établissement (en-têtes, accueil, connexion, QR codes) |
| Display | Fraunces (600) | 36 / 42 | Titre d'accueil |
| H1 | Fraunces (600) | 28 / 34 | Titre d'écran |
| H2 | Fraunces (600) | 22 / 28 | Nom de catégorie |
| H3 | Fraunces (600) | 18 / 24 | Titre de carte produit |
| Corps large | Figtree (400) | 18 / 26 | Descriptions, comptoir |
| Corps | Figtree (400) | 16 / 24 | Texte courant (minimum mobile) |
| Corps gras | Figtree (600) | 16 / 24 | Libellés, boutons |
| Petit | Figtree (400) | 14 / 20 | Métadonnées, allergènes |
| Caption | Figtree (600) | 12 / 16 | Étiquettes en majuscules espacées (seulement) |
| Prix | Figtree (700) | 18 / 24 | Prix affichés, chiffres tabulaires |
| Numéro de ticket | Figtree (700) | 32 / 36 | Comptoir |

Règles : les chiffres de prix utilisent `font-variant-numeric: tabular-nums`. Pas plus de deux familles par écran, en plus du logo. Fraunces n'est jamais utilisé en dessous de 18 px.

---

## 4. Espacements, rayons, ombres

- **Échelle 4 px** : 4, 8, 12, 16, 20, 24, 32, 40, 48.
- **Gouttière mobile** : 16 px de chaque côté, jamais de scroll horizontal.
- **Rayons** : 6 px (champs), 12 px (boutons, badges), 20 px (cartes, modales), pill (onglets, quantités).
- **Ombres** : `sm` au repos, `md` au survol et pour les toasts, `lg` pour les modales et le panneau de panier.

---

## 5. Motif azulejo

Le motif est un **filet** de 4 px en bas des en-têtes (alternance `tile-blue-light` / `tile-yellow`) et un **carreau** de fond sur l'écran d'accueil uniquement, à 8 % d'opacité. Il ne figure jamais derrière du texte courant, ni dans les zones de statut ou de paiement.

---

## 6. Accessibilité

### Contrastes (WCAG 2.2 AA)

| Combinaison | Contraste | Exigence |
|---|---|---|
| Texte `ink` sur `surface-page` | ≈ 13:1 | 4.5:1 |
| Texte `ink-muted` sur `surface-card` | ≈ 7:1 | 4.5:1 |
| Texte blanc sur `brand-blue` (bouton) | ≈ 8:1 | 4.5:1 |
| Texte `accent-caramel-strong` sur `surface-page` | ≈ 6:1 | 4.5:1 |
| Texte `success` sur `success-tint` | ≈ 5.6:1 | 4.5:1 |
| Texte `danger` sur `danger-tint` | ≈ 5.4:1 | 4.5:1 |
| Bordure `border-strong` sur `surface-card` | ≈ 4.6:1 | 3:1 (contrôles) |
| Anneau de focus sur fond | ≥ 3:1 | 3:1 |

Ne jamais utiliser `accent-caramel` (≈ 3.5:1 sur crème) ni `tile-*` pour du texte.

### Règles

- **Couleur jamais seule** : chaque statut a un libellé et une icône en plus de sa couleur ; chaque erreur a un texte.
- **Cibles tactiles** : 44 px minimum, 48 px sur les actions principales et le comptoir. Espacement d'au moins 8 px entre deux cibles.
- **Focus visible** : anneau de 2 px `focus-ring` décalé de 2 px, sur tous les éléments interactifs, y compris dans les modales.
- **Mouvement** : pas d'animation de plus de 200 ms ; respecter `prefers-reduced-motion` (suppression des transitions de position).
- **Texte** : redimensionnement jusqu'à 200 % sans perte de contenu ; pas de hauteur fixe sur les textes.
- **Sémantique** : onglets en `role="tablist"`, modales avec focus piégé et `Échap` pour fermer, toasts dans une région `aria-live="polite"`, colonnes du comptoir en listes avec titre.
- **Langue** : `lang="fr"` par défaut ; les noms portugais (pastéis de nata) restent en `lang="pt"` quand ils sont isolés.

---

## 7. Composants

Voir [`design/components/`](design/components/) pour le détail de chacun, avec exemples JSX.

| Composant | Rôle |
|---|---|
| Button | Action : primaire, secondaire, fantôme, danger |
| ProductCard | Article de la carte (photo, nom, prix, options) |
| StatusBadge | Statut de commande : Reçue, En préparation, Prête |
| Field | Champ de saisie avec libellé, aide et erreur |
| Tabs | Navigation entre catégories ou espaces |
| Modal | Fiche produit, confirmation de suppression |
| Toast | Confirmation brève (ajouté au panier, commande envoyée) |
| OrderTicket | Carte de commande sur l'écran comptoir |

---

## 8. Écrans clés

Les maquettes sont schématiques : elles montrent la hiérarchie, pas le pixel.

### 8.1 Client — accueil après scan du QR code (mobile, 390 px)

```
┌───────────────────────────────┐
│ ▬▬▬▬▬▬ filet azulejo ▬▬▬▬▬▬▬▬ │
│  Forcado            Table 7   │  logo Playfair italique · caption table
│                               │
│  Bom dia ! Que vous fait      │  display 28 px
│  envie aujourd'hui ?          │
│                               │
│  ┌─────────────────────────┐  │
│  │ [photo] Pastéis de nata │  │  carte de catégorie, 20 px radius
│  │         12 pièces       │  │
│  └─────────────────────────┘  │
│  ┌─────────────────────────┐  │
│  │ [photo] Viennoiseries   │  │
│  └─────────────────────────┘  │
│  ┌─────────────────────────┐  │
│  │ [photo] Cafés           │  │
│  └─────────────────────────┘  │
│                               │
│ ┌───────────────────────────┐ │
│ │  Voir mon panier  · 14,50 €│ │  bouton primaire 48 px, collé en bas
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

Une seule action principale par écran. Le bouton panier n'apparaît que s'il contient au moins un article.

### 8.2 Client — carte d'une catégorie (mobile)

```
┌───────────────────────────────┐
│ ←  Pastéis de nata            │  H2 · retour en 44 px
│ [Tous][Nata][Sans gluten]→    │  Tabs, pill, scroll horizontal
│                               │
│ ┌──────────────┬────────────┐ │
│ │ [photo]      │ Pastel de  │ │  ProductCard, grille 2 colonnes
│ │              │ nata       │ │  H3 + prix tabulaire
│ │              │ 1,80 €  (+)│ │  bouton + 44 px
│ └──────────────┴────────────┘ │
│ ┌──────────────┬────────────┐ │
│ │ [photo]      │ Pastel au  │ │
│ │              │ chocolat   │ │
│ └──────────────┴────────────┘ │
└───────────────────────────────┘
```

### 8.3 Client — fiche produit avec options (modale ou feuille basse)

```
┌───────────────────────────────┐
│           ───                 │  poignée
│ [photo large, radius 20]      │
│ Pastel de nata                │  H1
│ Crème à la vanille, pâte      │  body, ink-muted
│ feuilletée maison.            │
│ Allergènes : gluten, œufs     │  small, ink-muted
│                               │
│ Quantité                      │
│ (−)   2   (+)                 │  boutons 48 px, pill
│                               │
│ Options                       │
│ ◉ Nature        ○ Cannelle    │  radio, label visible
│ ☐ Réchauffé                   │  +0,30 €
│                               │
│ ┌───────────────────────────┐ │
│ │ Ajouter · 3,60 €          │ │  primaire 48 px
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

### 8.4 Client — panier et suivi de commande

```
┌───────────────────────────────┐
│ Ma commande · Table 7         │
│ ┌───────────────────────────┐ │
│ │ 2 × Pastel de nata  3,60 €│ │  OrderLine
│ │ 1 × Café crème      2,20 €│ │
│ └───────────────────────────┘ │
│ Total                  5,80 € │  price, tabular
│ ┌───────────────────────────┐ │
│ │ Envoyer la commande       │ │  primaire
│ └───────────────────────────┘ │
│                               │
│  Suivi                        │
│  ● Reçue  ─── ○ En préparation ─── ○ Prête │  StatusBadge + barre de progression
│                               │
│  Votre commande arrive        │  aria-live
│  bientôt à votre table.       │
└───────────────────────────────┘
```

Le suivi est une liste de trois étapes. L'étape courante porte un libellé et une icône, jamais seulement une couleur.

### 8.5 Employés — connexion (tablette, 768 px)

```
┌──────────────────────────────────────────┐
│                                          │
│            [logo Forcado]                │  logo remplaçable, 64 px
│                                          │
│   ┌──────────────────────────────────┐   │
│   │ Identifiant                      │   │  Field, 48 px
│   └──────────────────────────────────┘   │
│   ┌──────────────────────────────────┐   │
│   │ Mot de passe                 👁  │   │
│   └──────────────────────────────────┘   │
│   Identifiant incorrect. Vérifiez…       │  erreur danger + texte
│                                          │
│   ┌──────────────────────────────────┐   │
│   │ Se connecter                     │   │  primaire pleine largeur
│   └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### 8.6 Employés — tableau de bord comptoir (tablette paysage / écran de comptoir)

```
┌───────────────────────────────────────────────────────────────┐
│ Forcado · Comptoir                     Table 7 · 12:41 [⚙]     │
├──────────────────┬──────────────────┬─────────────────────────┤
│ REÇUES (3)       │ EN PRÉPARATION (2)│ PRÊTES (1)              │  colonnes, titres caption
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌─────────────────────┐ │
│ │ #148  T7     │ │ │ #145  T3     │ │ │ #143  T1            │ │  OrderTicket
│ │ 2× Nata      │ │ │ 1× Croissant │ │ │ 3× Nata, 1× Café    │ │
│ │ ● Reçue      │ │ │ ◐ En prépa.  │ │ │ ✓ Prête             │ │  StatusBadge
│ │ [Démarrer]   │ │ │ [Prête ✓]    │ │ │ [Servie]            │ │  bouton 56 px
│ └──────────────┘ │ └──────────────┘ │ └─────────────────────┘ │
└──────────────────┴──────────────────┴─────────────────────────┘
```

Les colonnes sont dans l'ordre du flux. Une commande passe de colonne en colonne par son bouton d'action. Pas de glisser-déposer obligatoire.

### 8.7 Employés — gestion de la carte

```
┌───────────────────────────────────────────────────────┐
│ Carte                                 [+ Nouvel article]│  H1 + primaire
│ [Pâtisseries][Viennoiseries][Cafés][+ Catégorie]       │  Tabs
│ ┌─────────────────────────────────────────────────────┐│
│ │ [img] Pastel de nata   1,80 €   Visible  [✎] [🗑]   ││  ligne, 56 px
│ │ [img] Pastel chocolat  2,00 €   Masqué   [✎] [🗑]   ││
│ └─────────────────────────────────────────────────────┘│
│ QR codes : [Imprimer les QR des tables]                │  secondaire
└───────────────────────────────────────────────────────┘
```

Suppression : une modale de confirmation (`danger`) qui nomme l'article. Le bouton de confirmation n'est jamais le premier focalisé.

### 8.8 Site public — accueil et offre commerces

```
┌────────────────────────────────────────────────────────┐
│ [logo]   À propos   Pour les commerces   Mentions       │  en-tête, filet azulejo
├────────────────────────────────────────────────────────┤
│  Une pâtisserie portugaise au cœur de Bruxelles.       │  display, Fraunces
│  Commandez à votre table, sans attendre.               │  body-lg
│  [ Découvrir la carte ]   [ Pour les commerces ]       │  primaire · secondaire
├────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  trois cartes, surface-card
│  │ QR table │  │ Comptoir │  │ Carte    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
├────────────────────────────────────────────────────────┤
│  Mentions légales · Accessibilité · Contact            │  small, ink-muted
└────────────────────────────────────────────────────────┘
```

---

## 9. Ce qui reste à faire

- Logo et photos produits définitifs (un emplacement neutre est prévu tant qu'ils ne sont pas fournis).
- Validation de la police Fraunces et Figtree dans les langues utilisées (français, néerlandais, portugais).
- Test au lecteur d'écran sur le flux de commande complet.
- Texte légal définitif pour les mentions légales (non rédigé ici).

---

## 10. Dans ce dépôt

Ce document vient du design system créé avec Claude Design. Voici où chaque partie vit dans le code.

| Partie | Fichier |
|---|---|
| Tokens (thème clair unique) | `src/theme.css`, copie exacte du bloc de la section 2 |
| Styles des écrans | `src/styles.css`, qui n'utilise que les variables |
| Composants partagés : StatusBadge, Modal, ConfirmDialog, Toast, Logo, Alert | `src/components/ui.jsx` |
| ProductCard, fiche produit, suivi | `src/pages/Customer.jsx` |
| OrderTicket et colonnes du comptoir | `src/pages/staff/Orders.jsx` |
| Polices Fraunces, Figtree et Playfair Display (logo), servies par le site | `src/main.jsx` (paquets `@fontsource`) |
| Marque d'un autre commerce | `server/config.js` ou variables `BRAND_*` (voir ci-dessous) |

Les classes CSS gardent les noms de l'app (`.btn`, `.ticket`, `.pill`…) ; elles suivent les règles des composants ci-dessus. Correspondance : Button = `.btn` (`.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-lg`, `.btn-comptoir`), ProductCard = `.product`, StatusBadge = `.status`, Field = `.field`, Tabs = `.tabs` / `.tab`, Modal = `.modal`, Toast = `.toast`, OrderTicket = `.ticket`.

### Changer de marque sans toucher au CSS

| Variable | Effet |
|---|---|
| `BRAND_PRIMARY` | Remplace `--brand-blue`. Les nuances `-strong` et `-tint` sont calculées. |
| `BRAND_ACCENT` | Remplace `--accent-caramel` et ses nuances. |
| `BRAND_FONT_DISPLAY`, `BRAND_FONT_SANS`, `BRAND_FONT_LOGO` | Remplacent `--font-display`, `--font-sans` et `--font-logo` (la police doit être ajoutée dans `src/main.jsx`). |
| `BRAND_LOGO` | Chemin d'une image (ex. `/produits/logo.svg`) affichée à la place du nom. |

Après un changement de couleur, vérifier les contrastes du tableau de la section 6 : les nuances calculées sont une base, pas une garantie.
