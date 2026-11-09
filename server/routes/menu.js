// Carte publique, photos et disponibilité des articles.
import { Router } from 'express';
import { getMenu, findItem, readImage } from '../catalog.js';
import { store } from '../store.js';
import { notify } from '../events.js';
import { requireStaff } from '../auth.js';
import { handle, noStore } from '../http.js';

export const menuRoutes = Router();

menuRoutes.get(
  '/menu',
  handle(async (_req, res) => {
    const soldOut = new Set(await store.soldOut());
    const menu = (await getMenu()).map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({ ...item, soldOut: soldOut.has(item.id) })),
    }));
    noStore(res).json(menu);
  }),
);

menuRoutes.put(
  '/menu/:itemId/availability',
  requireStaff,
  handle(async (req, res) => {
    if (!(await findItem(req.params.itemId))) return res.status(404).json({ error: 'Produit inconnu' });
    await store.setSoldOut(req.params.itemId, !req.body?.available);
    await notify('menu');
    res.json({ ok: true });
  }),
);

// Une photo ne change jamais (une nouvelle photo a une nouvelle adresse) : cache long.
menuRoutes.get(
  '/images/:id',
  handle(async (req, res) => {
    const image = await readImage(req.params.id);
    if (!image) return res.status(404).end();
    res.set({ 'Content-Type': image.type, 'Cache-Control': 'public, max-age=31536000, immutable' }).send(image.buffer);
  }),
);
