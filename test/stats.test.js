import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, ordersCsv, summarize } from '../shared/stats.js';

const TZ = 'Europe/Brussels';
const order = (createdAt, total, extra = {}) => ({
  createdAt,
  total,
  status: 'servie',
  lines: [{ name: 'Nata', qty: 2, total, options: [] }],
  ...extra,
});

test('chiffre d’affaires, panier moyen et annulations', () => {
  const orders = [
    order('2026-11-09T08:10:00Z', 4),
    order('2026-11-09T08:40:00Z', 6, { mode: 'emporter', customerName: 'Ana' }),
    order('2026-11-09T09:00:00Z', 10, { status: 'annulee' }),
  ];
  const stats = summarize(orders, { days: ['2026-11-09'], timeZone: TZ });
  assert.equal(stats.revenue, 10);
  assert.equal(stats.averageTicket, 5);
  assert.equal(stats.cancelled, 1);
  assert.equal(stats.takeaway, 1);
  assert.equal(stats.byHour[9], 2); // 08:10 UTC = 09:10 à Bruxelles
  assert.deepEqual(stats.topItems[0], { name: 'Nata', qty: 4, revenue: 10 });
});

test('les jours sans vente apparaissent à zéro', () => {
  const stats = summarize([order('2026-11-08T23:30:00Z', 3)], { days: daysBetween('2026-11-08', '2026-11-10'), timeZone: TZ });
  assert.deepEqual(stats.byDay.map((d) => d.count), [0, 1, 0]); // 23:30 UTC le 8 = 00:30 le 9 à Bruxelles
});

test('l’export CSV échappe les guillemets et utilise la virgule décimale', () => {
  const csv = ordersCsv([order('2026-11-09T08:10:00Z', 4.5, { number: 3, table: 2, lines: [{ name: 'Thé "vert"', qty: 1, options: [] }] })], TZ);
  const [, row] = csv.split('\r\n');
  assert.equal(row, '"2026-11-09";"09:10";"3";"sur_place";"2";"servie";"1 × Thé ""vert""";"4,5"');
});
