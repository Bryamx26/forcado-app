import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../shared/i18n/fr.js';
import nl from '../shared/i18n/nl.js';
import en from '../shared/i18n/en.js';
import pt from '../shared/i18n/pt.js';
import { localize, pickLanguage, translate } from '../shared/i18n/index.js';

test('chaque langue a toutes les clés du français', () => {
  for (const [name, dict] of Object.entries({ nl, en, pt })) {
    const missing = Object.keys(fr).filter((key) => !(key in dict));
    assert.deepEqual(missing, [], `clés manquantes en ${name}`);
  }
});

test('les variables sont remplacées', () => {
  assert.equal(translate('nl', 'tracker.order', { number: 12 }), 'Bestelling nr. 12');
});

test('une traduction de la carte manquante retombe sur le français', () => {
  assert.equal(localize({ fr: 'Lait', nl: 'Melk' }, 'nl'), 'Melk');
  assert.equal(localize({ fr: 'Lait' }, 'pt'), 'Lait');
  assert.equal(localize('Ancienne carte', 'en'), 'Ancienne carte');
});

test('la langue du navigateur est choisie si elle est proposée', () => {
  assert.equal(pickLanguage(['nl-BE', 'fr'], ['fr', 'nl', 'en']), 'nl');
  assert.equal(pickLanguage(['de-DE'], ['fr', 'nl']), 'fr');
});
