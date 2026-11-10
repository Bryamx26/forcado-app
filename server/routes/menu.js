// Carte publique, photos et disponibilité des articles et des choix.
import { Router } from 'express';
import { getRawMenu, getOptionSets, findItem, readImage } from '../catalog.js';
import { customerMenu, isKnownChoice, soldOutSet } from '../availability.js';
import { store } from '../store.js';
import { notify } from '../events.js';
import { requireStaff } from '../auth.js';
import { handle, noStore } from '../http.js';
import { DEFAULT_LANGUAGE, isSupported } from '../../shared/i18n/index.js';

export const menuRoutes = Router();

// ?lang=nl : la carte traduite, prête à afficher.
menuRoutes.get(
  '/menu',
  handle(async (req, res) => {
    const lang = isSupported(req.query.lang) ? req.query.lang : DEFAULT_LANGUAGE;
    noStore(res).json(await customerMenu(lang));
  }),
);

// Carte avec toutes ses traductions et ses groupes partagés, pour l'onglet Carte des employés.
menuRoutes.get(
  '/admin/menu',
  requireStaff,
  handle(async (_req, res) => {
    const [menu, optionSets, soldOut] = await Promise.all([getRawMenu(), getOptionSets(), soldOutSet()]);
    const categories = menu.map((cat) => ({ ...cat, items: cat.items.map((item) => ({ ...item, soldOut: soldOut.has(item.id) })) }));
    noStore(res).json({ categories, optionSets, soldOut: [...soldOut] });
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

// key : clé du choix (voir choiceKey dans shared/options.js).
menuRoutes.put(
  '/menu/choices/availability',
  requireStaff,
  handle(async (req, res) => {
    const key = String(req.body?.key || '');
    if (!(await isKnownChoice(key))) return res.status(404).json({ error: 'Choix inconnu' });
    await store.setSoldOut(key, !req.body?.available);
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
