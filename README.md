# Forcado · Commande à table

Le client scanne le QR code de sa table, choisit ses pâtisseries et boissons (avec options), et envoie la commande sans passer au comptoir. L'espace employés, protégé par mot de passe, affiche toutes les commandes et les fait avancer : **Nouvelle → En préparation → Prête → Servie**.

## Pages

| Adresse | Pour qui | Contenu |
| --- | --- | --- |
| `/` | Public | Page d'accueil |
| `/table/5` | Clients (QR code de la table 5) | Carte, panier, suivi de la commande |
| `/comptoir` | Employés (connexion) | Commandes en direct, stats du jour |
| `/comptoir/carte` | Employés | Marquer un produit épuisé ou disponible |
| `/comptoir/qr` | Employés | QR codes des tables, prêts à imprimer |

## Connexion des employés

Le mot de passe commun se règle avec la variable d'environnement `STAFF_PASSWORD`. Chaque employé indique aussi son prénom, affiché sur les commandes qu'il prend en charge. La session dure 12 heures. Changer le mot de passe déconnecte tout le monde.

- **Sur Vercel**, `STAFF_PASSWORD` est obligatoire : sans elle, la connexion est désactivée. Ajoutez-la dans **Settings → Environment Variables**, puis redéployez.
- **En local**, sans variable, le mot de passe est `forcado`.

## Lancer

Il faut Node.js 20 ou plus récent.

```bash
npm install
npm run build      # compile l'app React
npm start          # serveur sur http://localhost:3001
```

- Client : `http://<adresse>:3001/table/5` (le QR code de la table 5 ouvre cette page)
- Comptoir : `http://<adresse>:3001/comptoir` (sur la tablette ou l'écran derrière le comptoir ; un bip sonne à chaque nouvelle commande, après un premier clic sur la page)
- Mot de passe local : `forcado`, ou `STAFF_PASSWORD=monmotdepasse npm start`

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

- **Identité** dans `server/config.js` ou par variables d'environnement : `BRAND_NAME`, `BRAND_TAGLINE`, `BRAND_PRIMARY` (couleur principale), `BRAND_ACCENT`, `BRAND_CURRENCY`, `BRAND_LOCALE`, `BRAND_PAYMENT_NOTE`, `BRAND_WEBSITE`.
- **Carte** dans `server/menu.js`.

Un nouveau client = une copie du dépôt, un projet Vercel, une base Upstash, ses variables `BRAND_*` et son `STAFF_PASSWORD`.

## La carte

La carte est dans `server/menu.js` : produits, prix, emoji et options (choix unique ou multiple, avec supplément éventuel). **Les prix actuels sont des exemples**, à remplacer par les vrais. Les prix sont toujours recalculés par le serveur, le client ne peut pas les modifier.

## Temps réel

Les écrans se mettent à jour dès qu'une commande arrive ou change de statut, ou qu'un produit est épuisé (en moins d'une seconde). Le serveur garde une connexion ouverte avec chaque écran (`/api/events`, Server-Sent Events) et la renouvelle toutes les 50 secondes. Sur Vercel, le signal passe par Redis (pub/sub). Une vérification régulière reste active en secours si la connexion se coupe.

## Stockage

En local, les commandes sont enregistrées dans `data/orders.json` (créé automatiquement). Pour repartir de zéro, supprimez ce fichier et redémarrez le serveur.

Si les variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_URL` et `KV_REST_API_TOKEN`) existent, les commandes vont dans Redis à la place. C'est obligatoire sur Vercel, qui n'a pas de disque permanent.

## Mettre en ligne sur Vercel

1. Mettre ce dossier dans un dépôt GitHub.
2. Sur vercel.com : **Add New → Project**, importer le dépôt, cliquer sur **Deploy** (les réglages sont dans `vercel.json`).
3. Dans **Settings → Environment Variables**, ajouter `STAFF_PASSWORD` (le mot de passe des employés).
4. Dans le projet Vercel : **Storage → Create Database → Upstash for Redis** (offre gratuite), puis le relier au projet. Vercel ajoute les variables tout seul.
5. **Deployments → Redeploy** pour prendre en compte la base.
6. Imprimer les QR codes depuis **Espace employés → QR codes**.
