import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLine, buildLines, editLines, assertTransition, assertEditable, OrderError } from '../server/orders.js';

const menu = [
  {
    id: 'cat',
    items: [
      {
        id: 'galao',
        name: 'Galão',
        price: 3.2,
        options: [
          { id: 'lait', name: 'Lait', type: 'single', required: true, choices: [
            { id: 'vache', name: 'Entier', price: 0 },
            { id: 'avoine', name: 'Avoine', price: 0.4 },
          ] },
          { id: 'extras', name: 'Extras', type: 'multi', choices: [
            { id: 'double', name: 'Double', price: 0.6 },
            { id: 'cannelle', name: 'Cannelle', price: 0 },
          ] },
        ],
      },
    ],
  },
];

test('le prix vient de la carte, jamais du client', () => {
  const line = buildLine({ itemId: 'galao', qty: 2, price: 0.01, options: { lait: ['avoine'], extras: ['double'] } }, menu);
  assert.equal(line.unitPrice, 4.2);
  assert.equal(line.total, 8.4);
});

test('un groupe obligatoire sans choix est refusé', () => {
  assert.throws(() => buildLine({ itemId: 'galao', options: {} }, menu), (e) => e instanceof OrderError && e.code === 'choice_missing');
});

test('un groupe « un choix » refuse deux choix', () => {
  assert.throws(() => buildLine({ itemId: 'galao', options: { lait: ['vache', 'avoine'] } }, menu), { code: 'too_many_choices' });
});

test('minimum et maximum de choix', () => {
  const pastry = { id: 'p', name: 'P', price: 2, options: [{ id: 'g', name: 'Garnitures', min: 1, max: 2, choices: [
    { id: 'a', name: 'A', price: 0.5 }, { id: 'b', name: 'B', price: 0.5 }, { id: 'c', name: 'C', price: 0 },
  ] }] };
  const m = [{ items: [pastry] }];
  assert.throws(() => buildLine({ itemId: 'p', options: { g: [] } }, m), { code: 'choice_missing' });
  assert.throws(() => buildLine({ itemId: 'p', options: { g: ['a', 'b', 'c'] } }, m), { code: 'too_many_choices' });
  assert.equal(buildLine({ itemId: 'p', options: { g: ['a', 'b', 'a'] } }, m).unitPrice, 3);
});

test('un article ou un choix épuisé est refusé', () => {
  const soldOutMenu = structuredClone(menu);
  soldOutMenu[0].items[0].options[0].choices[1].soldOut = true;
  assert.throws(() => buildLine({ itemId: 'galao', options: { lait: ['avoine'] } }, soldOutMenu), { code: 'choice_sold_out', status: 409 });
  soldOutMenu[0].items[0].soldOut = true;
  assert.throws(() => buildLine({ itemId: 'galao', options: { lait: ['vache'] } }, soldOutMenu), { code: 'item_sold_out' });
});

test('la quantité est bornée entre 1 et 20', () => {
  assert.equal(buildLine({ itemId: 'galao', qty: 99, options: { lait: 'vache' } }, menu).qty, 20);
  assert.equal(buildLine({ itemId: 'galao', qty: -3, options: { lait: 'vache' } }, menu).qty, 1);
});

test('un article inconnu ou un panier vide sont refusés', () => {
  assert.throws(() => buildLine({ itemId: 'x' }, menu), { code: 'item_gone' });
  assert.throws(() => buildLines([], menu), { code: 'empty_cart' });
});

test('une ligne gardée conserve son prix d’origine', () => {
  const order = { lines: [{ itemId: 'galao', unitPrice: 1, qty: 1, total: 1 }] };
  const [kept] = editLines(order, [{ keep: 0, qty: 3 }], menu);
  assert.equal(kept.total, 3);
});

test('un changement de statut fait par un collègue est protégé', () => {
  const order = { number: 4, status: 'en_cours' };
  assert.throws(() => assertTransition(order, 'prete', 'nouvelle'), { status: 409 });
  assert.doesNotThrow(() => assertTransition(order, 'prete', 'en_cours'));
  assert.throws(() => assertTransition({ number: 4, status: 'servie' }, 'prete'), { status: 409 });
  assert.throws(() => assertEditable({ status: 'annulee' }), { code: 'order_closed' });
});
