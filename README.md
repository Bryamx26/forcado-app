# Forcado · Commande à table

Le client scanne le QR code de sa table, choisit ses pâtisseries et boissons (avec options), et envoie la commande sans passer au comptoir. Le comptoir voit toutes les commandes et les fait avancer : **Nouvelle → En préparation → Prête → Servie**.

## Lancer

Il faut Node.js 20 ou plus récent.

```bash
npm install
npm run build      # compile l'app React
npm start          # serveur sur http://localhost:3001
```

- Client : `http://<adresse>:3001/table/5` (le QR code de la table 5 ouvre cette page)
- Comptoir : `http://<adresse>:3001/comptoir` (sur la tablette ou l'écran derrière le comptoir ; un bip sonne à chaque nouvelle commande, après un premier clic sur la page)

Pour développer avec rechargement à chaud : `npm run dev` puis ouvrir `http://localhost:5173`.

## QR codes des tables

```bash
npm run qr -- http://192.168.1.20:3001 12
```

Remplacez l'adresse par celle du serveur (l'IP de l'ordinateur sur le Wi-Fi de la boutique, ou le nom de domaine une fois en ligne) et `12` par le nombre de tables. Les images sont dans `qr/`, et `qr/index.html` est une page prête à imprimer.

## La carte

La carte est dans `server/menu.js` : produits, prix, emoji et options (choix unique ou multiple, avec supplément éventuel). **Les prix actuels sont des exemples**, à remplacer par les vrais. Les prix sont toujours recalculés par le serveur, le client ne peut pas les modifier.

## Stockage

En local, les commandes sont enregistrées dans `data/orders.json` (créé automatiquement). Pour repartir de zéro, supprimez ce fichier et redémarrez le serveur.

Si les variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_URL` et `KV_REST_API_TOKEN`) existent, les commandes vont dans Redis à la place. C'est obligatoire sur Vercel, qui n'a pas de disque permanent.

## Mettre en ligne sur Vercel

1. Mettre ce dossier dans un dépôt GitHub.
2. Sur vercel.com : **Add New → Project**, importer le dépôt, cliquer sur **Deploy** (les réglages sont dans `vercel.json`).
3. Dans le projet Vercel : **Storage → Create Database → Upstash for Redis** (offre gratuite), puis le relier au projet. Vercel ajoute les variables tout seul.
4. **Deployments → Redeploy** pour prendre en compte la base.
5. Générer les QR codes avec l'adresse Vercel : `npm run qr -- https://votre-projet.vercel.app 12`.
