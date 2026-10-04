import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { storeKind } from './store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 3001;

// En production locale, Express sert aussi l'app React compilée.
const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => console.log(`Forcado sur http://localhost:${PORT} (stockage : ${storeKind})`));
