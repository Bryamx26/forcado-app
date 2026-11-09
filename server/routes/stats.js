// Statistiques de ventes pour l'équipe, et export CSV pour le comptable.
import { Router } from 'express';
import { store } from '../store.js';
import { timeZone } from '../config.js';
import { requireStaff } from '../auth.js';
import { handle, noStore } from '../http.js';
import { OrderError } from '../orders.js';
import { daysBetween, ordersCsv, summarize } from '../../shared/stats.js';

const MAX_DAYS = 92;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const statsRoutes = Router();
statsRoutes.use(requireStaff);

// ?from=AAAA-MM-JJ&to=AAAA-MM-JJ, trois mois au plus.
function periodOf(query) {
  const { from, to } = query;
  if (!DAY.test(from || '') || !DAY.test(to || '') || from > to) throw new OrderError('Période invalide');
  const days = daysBetween(from, to);
  if (days.length > MAX_DAYS) throw new OrderError(`Période limitée à ${MAX_DAYS} jours`);
  return days;
}

statsRoutes.get(
  '/',
  handle(async (req, res) => {
    const days = periodOf(req.query);
    const orders = await store.listByDays(days);
    noStore(res).json(summarize(orders, { days, timeZone }));
  }),
);

statsRoutes.get(
  '/orders.csv',
  handle(async (req, res) => {
    const days = periodOf(req.query);
    const csv = ordersCsv(await store.listByDays(days), timeZone);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="commandes-${days[0]}-${days.at(-1)}.csv"`,
      'Cache-Control': 'no-store',
    });
    // Le BOM permet à Excel de lire les accents.
    res.send(`﻿${csv}`);
  }),
);
