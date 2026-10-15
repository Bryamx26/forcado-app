# Carte du code

Vue d'ensemble des fichiers et de leurs liens, pour s'y retrouver avant de modifier l'app.

```mermaid
graph LR
  subgraph Navigateur
    main[src/main.jsx] --> App[src/App.jsx]
    App --> Home[pages/Home.jsx]
    App --> Customer[pages/Customer.jsx<br/>/table/N]
    App --> Staff[pages/Staff.jsx<br/>/comptoir]
    App --> Site[pages/site/*<br/>À propos, commerces, légal]
    App --> seo[src/seo.js<br/>titres et descriptions]
    Staff --> Orders[staff/Orders.jsx]
    Staff --> MenuAdmin[staff/MenuAdmin.jsx]
    Staff --> QrCodes[staff/QrCodes.jsx]
    Staff --> Login[staff/Login.jsx]
    Customer --> live[src/live.js<br/>temps réel]
    Orders --> live
    Customer --> api[src/api.js]
    Staff --> api
  end

  subgraph Serveur
    vercel[api/index.js<br/>Vercel] --> app[server/app.js<br/>routes /api]
    local[server/index.js<br/>local] --> app
    app --> auth[server/auth.js<br/>connexion employés]
    app --> events[server/events.js<br/>SSE + Redis pub/sub]
    app --> security[server/security.js<br/>en-têtes, limites]
    auth --> security
    app --> menu[server/menu.js<br/>carte]
    app --> store[server/store.js<br/>Redis ou fichier]
    app --> config[server/config.js<br/>marque, légal, éditeur]
  end

  api -- HTTP --> app
  live -- /api/events --> events
  build[scripts/seo.js<br/>après vite build] --> config
  build --> seo
```

| Besoin | Fichier |
| --- | --- |
| Changer le nom, les couleurs, les infos légales | `server/config.js` (ou variables `BRAND_*`, `LEGAL_*`, `VENDOR_*`) |
| Changer la carte | `server/menu.js` |
| Ajouter une route d'API | `server/app.js` |
| Ajouter une page publique | `src/pages/site/`, `SITE_PAGES` dans `src/App.jsx`, `src/seo.js`, rewrites de `vercel.json` |
| En-têtes de sécurité, limites anti-abus | `server/security.js` (et `vercel.json` pour les pages statiques) |
