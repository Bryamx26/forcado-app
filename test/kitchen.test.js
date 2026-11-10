import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averagePrepMinutes, countItemsToPrepare, estimateWaitMinutes, urgencyOf, URGENCY } from '../shared/kitchen.js';

const at = (min) => new Date(Date.UTC(2026, 10, 9, 10, min)).toISOString();

test('urgence selon les seuils', () => {
  const thresholds = { warnAfterMin: 7, lateAfterMin: 12 };
  assert.equal(urgencyOf(3, thresholds), URGENCY.OK);
  assert.equal(urgencyOf(7, thresholds), URGENCY.WARN);
  assert.equal(urgencyOf(15, thresholds), URGENCY.LATE);
});

test('les quantités à sortir sont regroupées par variante', () => {
  const nata = (qty, choice) => ({ name: 'Nata', qty, options: [{ choice }] });
  const orders = [{ lines: [nata(2, 'Cannelle'), nata(1, 'Nature')] }, { lines: [nata(3, 'Cannelle')] }];
  assert.deepEqual(countItemsToPrepare(orders), [
    { label: 'Nata · Cannelle', qty: 5 },
    { label: 'Nata · Nature', qty: 1 },
  ]);
});

test('temps moyen de préparation à partir de l’historique', () => {
  const done = (start, ready) => ({ createdAt: at(start), statusHistory: [{ status: 'prete', at: at(ready) }] });
  assert.equal(averagePrepMinutes([done(0, 4), done(10, 16)]), 5);
  assert.equal(averagePrepMinutes([{ createdAt: at(0) }]), null);
});

test('le temps d’attente tient compte de la file et du temps déjà passé', () => {
  const orders = [
    { id: 'a', status: 'en_cours', createdAt: at(0) },
    { id: 'b', status: 'nouvelle', createdAt: at(1) },
    { id: 'c', status: 'nouvelle', createdAt: at(2) },
  ];
  const now = new Date(at(2)).getTime();
  assert.equal(estimateWaitMinutes(orders[2], orders, { averageMinutes: 6, capacity: 2, now }), 12);
  assert.equal(estimateWaitMinutes({ status: 'prete' }, orders, { averageMinutes: 6, capacity: 2, now }), null);
});
