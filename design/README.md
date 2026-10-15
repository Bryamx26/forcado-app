# Forcado — Design System

Ce système de design régit l'application de commande à table de Forcado, pâtisserie portugaise à Bruxelles. Il est conçu pour être réutilisé et revendu à d'autres commerces : la marque se change à un seul endroit.

## Ce que contient ce dossier

- `../DESIGN.md` (à la racine du dépôt) : le document de référence (principes, tokens CSS, typographie, accessibilité, écrans clés).
- `tokens.json` : les mêmes tokens, au format lisible par les outils de design.
- `components/` : un guide par composant, avec exemples JSX.

## Pour une nouvelle marque

1. Remplacer les valeurs `--brand-*`, `--accent-*` et `--font-*` dans le bloc `:root` de `src/theme.css` (ou les variables `BRAND_*`, voir la section 10 de `DESIGN.md`).
2. Vérifier les contrastes du tableau d'accessibilité avec les nouvelles couleurs (texte 4.5:1, contrôles 3:1).
3. Remplacer le logo par le fichier de la marque, à une hauteur de 64 px sur la connexion et de 32 px dans l'en-tête.
4. Ne jamais toucher aux noms sémantiques (`--success`, `--danger`, `--focus-ring`) : ils restent les mêmes pour toutes les marques.

## Règles d'or

- Pas de couleur codée en dur dans un composant : toujours une variable.
- Le statut est toujours montré par la couleur, un libellé et une icône.
- Le texte courant ne descend jamais sous 16 px sur mobile.
