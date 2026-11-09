// Outils communs aux routes Express.
import { CatalogError } from './catalog.js';
import { OrderError } from './orders.js';

const isBusinessError = (e) => e instanceof CatalogError || e instanceof OrderError;

// Exécute une route asynchrone : une erreur métier devient une réponse JSON lisible, le reste part en 500.
export const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (isBusinessError(e)) return res.status(e.status).json({ error: e.message, code: e.code, vars: e.vars });
    next(e);
  }
};

export const noStore = (res) => res.set('Cache-Control', 'no-store');
