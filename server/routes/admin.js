// Gestion de la carte par les employés : chaque route renvoie l'élément modifié et prévient les écrans.
import { Router } from 'express';
import { catalog, saveImage } from '../catalog.js';
import { store } from '../store.js';
import { notify } from '../events.js';
import { requireStaff } from '../auth.js';
import { handle } from '../http.js';

export const adminRoutes = Router();
adminRoutes.use(requireStaff);

const changeMenu = (fn) =>
  handle(async (req, res) => {
    const result = await fn(req);
    await notify('menu');
    res.json(result);
  });

adminRoutes.post('/categories', changeMenu((req) => catalog.addCategory(req.body)));
adminRoutes.patch('/categories/:id', changeMenu((req) => catalog.renameCategory(req.params.id, req.body)));
adminRoutes.delete('/categories/:id', changeMenu((req) => catalog.deleteCategory(req.params.id)));
adminRoutes.post('/categories/:id/move', changeMenu((req) => catalog.moveCategory(req.params.id, req.body?.dir)));
adminRoutes.post('/items', changeMenu((req) => catalog.addItem(req.body)));
adminRoutes.put('/items/:id', changeMenu((req) => catalog.updateItem(req.params.id, req.body)));
adminRoutes.delete(
  '/items/:id',
  changeMenu(async (req) => {
    await catalog.deleteItem(req.params.id);
    await store.setSoldOut(req.params.id, false);
    return { ok: true };
  }),
);
adminRoutes.post('/items/:id/move', changeMenu((req) => catalog.moveItem(req.params.id, req.body?.dir)));

adminRoutes.post(
  '/images',
  handle(async (req, res) => res.json(await saveImage(req.body?.dataUrl))),
);
