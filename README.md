# Forcado · Commande à table

Le client scanne le QR code de sa table, choisit ses pâtisseries et boissons (avec options), et envoie la commande sans passer au comptoir. L'espace employés, protégé par mot de passe, affiche toutes les commandes et les fait avancer : **Nouvelle → En préparation → Prête → Servie**.

## Pages

| Adresse | Pour qui | Contenu |
| --- | --- | --- |
| `/` | Public | Page d'accueil |
| `/a-propos` | Public | Présentation de l'établissement et de la commande à table |
| `/commerces` | Commerçants (prospects) | Présentation de l'app, tarif, FAQ, contact |
| `/mentions-legales`, `/confidentialite` | Public | Pages légales (Belgique, RGPD) |
| `/table/5` | Clients (QR code de la table 5) | Carte, panier, suivi de la commande |
| `/comptoir` | Employés (connexion) | Commandes en direct, stats du jour |
| `/comptoir/carte` | Employés | Marquer un produit épuisé ou disponible |
| `/comptoir/qr` | Employés | QR codes des tables, prêts à imprimer |

## Connexion des employés

Le mot de passe commun se règle avec la variable d'environnement `STAFF_PASSWORD`. Chaque employé indique aussi son prénom, affiché sur les commandes qu'il prend en charge. La session dure 12 heures. Changer le mot de passe déconnecte tout le monde.

- **Sur Vercel**, `STAFF_PASSWORD` est obligatoire : sans elle, la connexion est désactivée. Ajoutez-la dans **Settings → Environment Variables**, puis redéployez.
- **Avec `npm start`** (serveur hors Vercel), `STAFF_PASSWORD` est aussi obligatoire.
- **Avec `npm run dev`** seulement, sans variable, le mot de passe de démonstration est `forcado`.
- Choisissez un mot de passe d'au moins 10 caractères, et ajoutez `SESSION_SECRET` (une longue chaîne aléatoire, par exemple `openssl rand -hex 32`) pour signer les sessions.

## Sécurité

- Prix toujours recalculés par le serveur à partir de la carte.
- Connexion limitée à 10 essais par adresse IP toutes les 15 minutes ; commandes limitées à 20 par adresse IP toutes les 10 minutes. Avec Redis, ces limites valent pour tout le site.
- `MAX_TABLES` (facultatif) : nombre de tables de l'établissement ; une commande pour une table au-delà est refusée.
- Polices servies par le site lui-même : aucun appel à Google, donc aucune adresse IP de visiteur transmise.
- En-têtes de sécurité (CSP, anti-iframe, HSTS) dans `vercel.json` et `server/security.js`. Si vous ajoutez un service externe (paiement, statistiques), autorisez son domaine dans la CSP des deux fichiers.

## Lancer

Il faut Node.js 20 ou plus récent.

```bash
npm install
npm run build      # compile l'app React
npm start          # serveur sur http://localhost:3001
```

- Client : `http://<adresse>:3001/table/5` (le QR code de la table 5 ouvre cette page)
- Comptoir : `http://<adresse>:3001/comptoir` (sur la tablette ou l'écran derrière le comptoir ; un bip sonne à chaque nouvelle commande, après un premier clic sur la page)
- Mot de passe : `STAFF_PASSWORD=monmotdepasse npm start`

Pour développer avec rechargement à chaud : `npm run dev` puis ouvrir `http://localhost:5173`.

## QR codes des tables

Le plus simple : **Espace employés → QR codes**, choisir le nombre de tables, puis **Imprimer**. Les codes utilisent automatiquement l'adresse du site.

En ligne de commande :

```bash
npm run qr -- http://192.168.1.20:3001 12
```

Remplacez l'adresse par celle du serveur (l'IP de l'ordinateur sur le Wi-Fi de la boutique, ou le nom de domaine une fois en ligne) et `12` par le nombre de tables. Les images sont dans `qr/`, et `qr/index.html` est une page prête à imprimer.

## Revendre l'app à un autre établissement

Tout ce qui est propre à Forcado est réglable sans toucher au code de l'interface :

- **Identité** dans `server/config.js` ou par variables d'environnement : `BRAND_NAME`, `BRAND_TAGLINE`, `BRAND_PRIMARY` (couleur principale), `BRAND_ACCENT`, `BRAND_FONT_DISPLAY`, `BRAND_FONT_SANS`, `BRAND_LOGO`, `BRAND_CURRENCY`, `BRAND_LOCALE`, `BRAND_PAYMENT_NOTE`, `BRAND_WEBSITE`.
- **Carte** depuis l'espace employés, onglet **Carte** (la carte de départ de `server/menu.js` n'est chargée qu'une fois, dans une base vide).

- **Pages légales** : `LEGAL_COMPANY`, `LEGAL_ADDRESS`, `LEGAL_VAT` (numéro BCE), `LEGAL_EMAIL`, `LEGAL_PHONE`. Tant qu'elles manquent, les pages affichent « à compléter ».
- **Page Pour les commerces** : `VENDOR_NAME`, `VENDOR_EMAIL` (le formulaire de contact n'apparaît qu'avec lui), `VENDOR_PHONE`, `VENDOR_PRICE` (sinon « Sur devis »), `VENDOR_DEMO_URL` (une installation de démo, pour que les essais ne tombent pas dans les commandes d'un vrai commerce). `VENDOR_SHOW_OFFER=false` masque la page et ses liens.
- **Référencement** : `SITE_URL` (ex. `https://commande.forcado.be`), `BRAND_DESCRIPTION`, `BRAND_CITY`, `BRAND_TYPE` (Bakery, CafeOrCoffeeShop, Restaurant…), `BRAND_ABOUT` (texte de la page À propos, un paragraphe par ligne).

Un nouveau client = une copie du dépôt, un projet Vercel, une base Upstash, ses variables `BRAND_*` et son `STAFF_PASSWORD`.

## La carte

La carte se gère dans **Espace employés → Carte** :

- créer, renommer, réordonner et supprimer des catégories (une catégorie doit être vide pour être supprimée ; une catégorie vide n'est pas montrée aux clients) ;
- créer, modifier, réordonner et supprimer des articles : nom, description, prix, emoji, photo et options (un seul choix obligatoire ou plusieurs choix facultatifs, avec supplément éventuel) ;
- marquer un article épuisé pour la journée.

Les changements apparaissent immédiatement chez les clients. Les photos sont réduites par le navigateur (800 px) puis stockées dans Redis (`data/images/` en local). Supprimer un article ne change pas les commandes déjà passées.

Au premier démarrage sur une base vide, la carte d'exemple de `server/menu.js` est chargée. **Ses prix sont des exemples**, à remplacer. Les prix sont toujours recalculés par le serveur, le client ne peut pas les modifier.

## Référencement (SEO)

`npm run build` lance `scripts/seo.js` après Vite : chaque page publique reçoit son propre HTML avec titre, description, balises Open Graph, balise canonique et données structurées schema.org (établissement sur l'accueil, logiciel sur `/commerces`). Le script écrit aussi `sitemap.xml`, `robots.txt` (tables, comptoir et API exclus), l'icône aux couleurs de la marque et le manifeste. Les pages des tables et du comptoir sont marquées `noindex`.

Sans `SITE_URL`, le domaine de production Vercel est utilisé ; ailleurs, sans `SITE_URL`, pas de sitemap ni de balise canonique. Une fois en ligne, déclarez le site dans Google Search Console et soumettez `/sitemap.xml`.

## Temps réel

Les écrans se mettent à jour dès qu'une commande arrive ou change de statut, ou qu'un produit est épuisé (en moins d'une seconde). Le serveur garde une connexion ouverte avec chaque écran (`/api/events`, Server-Sent Events) et la renouvelle toutes les 50 secondes. Sur Vercel, le signal passe par Redis (pub/sub). Une vérification régulière reste active en secours si la connexion se coupe.

## Stockage

En local, les commandes sont enregistrées dans `data/orders.json` (créé automatiquement). Pour repartir de zéro, supprimez ce fichier et redémarrez le serveur.

Si les variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_URL` et `KV_REST_API_TOKEN`) existent, les commandes vont dans Redis à la place. C'est obligatoire sur Vercel, qui n'a pas de disque permanent.

## Mettre en ligne sur Vercel

1. Mettre ce dossier dans un dépôt GitHub.
2. Sur vercel.com : **Add New → Project**, importer le dépôt, cliquer sur **Deploy** (les réglages sont dans `vercel.json`).
3. Dans **Settings → Environment Variables**, ajouter `STAFF_PASSWORD` (le mot de passe des employés), `SESSION_SECRET` (longue chaîne aléatoire), `SITE_URL` et les variables `LEGAL_*`.
4. Dans le projet Vercel : **Storage → Create Database → Upstash for Redis** (offre gratuite), puis le relier au projet. Vercel ajoute les variables tout seul.
5. **Deployments → Redeploy** pour prendre en compte la base.
6. Imprimer les QR codes depuis **Espace employés → QR codes**.

## Carte du code

Voir [docs/CARTE-DU-CODE.md](docs/CARTE-DU-CODE.md).

## Design system

Couleurs, polices, composants et règles d'accessibilité sont décrits dans [DESIGN.md](DESIGN.md) (guides détaillés dans [`design/`](design/)). Les tokens vivent dans `src/theme.css` ; l'app a un seul thème, clair.
