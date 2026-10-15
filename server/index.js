import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { storeKind } from './store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 3001;

// En production locale, Express sert aussi l'app React compilée.
// Chaque page publique a son propre HTML (titre, description) ; tables et comptoir utilisent app.html, non référencé.
const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { redirect: false }));
  app.get(/^(?!\/api).*/, (req, res) => {
    const page = path.join(dist, req.path.replace(/\/$/, ''), 'index.html');
    if (req.path !== '/' && /^\/[a-z-]+\/?$/.test(req.path) && fs.existsSync(page)) return res.sendFile(page);
    const appHtml = path.join(dist, 'app.html');
    if (/^\/(table|comptoir)(\/|$)/.test(req.path) && fs.existsSync(appHtml)) return res.sendFile(appHtml);
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => console.log(`Forcado sur http://localhost:${PORT} (stockage : ${storeKind})`));
