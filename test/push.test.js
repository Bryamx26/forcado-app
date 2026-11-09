import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSubscription } from '../server/push.js';
import { readyMessage } from '../server/orderEvents.js';

const keys = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };

test('un abonnement d’un service de push connu est accepté', () => {
  const sub = cleanSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys, extra: 'ignoré' });
  assert.deepEqual(Object.keys(sub), ['endpoint', 'keys']);
  assert.doesNotThrow(() => cleanSubscription({ endpoint: 'https://web.push.apple.com/QG', keys }));
});

test('une adresse quelconque est refusée', () => {
  for (const endpoint of ['http://fcm.googleapis.com/x', 'https://evil.example/x', 'https://169.254.169.254/latest', 'pas une url']) {
    assert.throws(() => cleanSubscription({ endpoint, keys }), { code: 'invalid_push' });
  }
  assert.throws(() => cleanSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'x', auth: '' } }), { code: 'invalid_push' });
});

test('la notification est dans la langue du client', () => {
  assert.equal(readyMessage({ id: 'o', number: 7, table: 3, lang: 'nl' }).title, 'Bestelling nr. 7 is klaar');
  assert.equal(readyMessage({ id: 'o', number: 7, table: 3, lang: 'fr' }).body, 'On vous l’apporte à la table 3.');
});
