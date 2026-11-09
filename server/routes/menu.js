// Carte publique, photos et disponibilité des articles.
import { Router } from 'express';
import { getMenu, getRawMenu, findItem, readImage } from '../catalog.js';
import { DEFAULT_LANGUAGE, isSupported } from '../../shared/i18n/index.js';
import { store } from '../store.js';
import { notify } from '../events.js';
import { requireStaff } from '../auth.js';
import { handle, noStore } from '../http.js';

export const menuRoutes = Router();

async function withAvailability(menu) {
  const soldOut = new Set(await store.soldOut());
  return menu.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({ ...item, soldOut: soldOut.has(item.id) })),
  }));
}

// ?lang=nl : la carte traduite, prête à afficher.
menuRoutes.get(
  '/menu',
  handle(async (req, res) => {
    const lang = isSupported(req.query.lang) ? req.query.lang : DEFAULT_LANGUAGE;
    noStore(res).json(await withAvailability(await getMenu(lang)));
  }),
);

// Carte avec toutes ses traductions, pour l'onglet Carte des employés.
menuRoutes.get(
  '/admin/menu',
  requireStaff,
  handle(async (_req, res) => noStore(res).json(await withAvailability(await getRawMenu()))),
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
