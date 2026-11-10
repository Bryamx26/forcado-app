import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allergenMatch, ALLERGEN_MATCH, ALLERGEN_CODES } from '../shared/allergens.js';
import { translate } from '../shared/i18n/index.js';

test('les 14 allergènes réglementaires ont un libellé', () => {
  assert.equal(ALLERGEN_CODES.length, 14);
  for (const code of ALLERGEN_CODES) assert.notEqual(translate('fr', `allergen.${code}`), `allergen.${code}`);
});

test('un article non renseigné n’est jamais présenté comme sûr', () => {
  assert.equal(allergenMatch({ allergens: null }, ['lait']), ALLERGEN_MATCH.UNKNOWN);
  assert.equal(allergenMatch({}, ['lait']), ALLERGEN_MATCH.UNKNOWN);
});

test('contient, traces ou sûr selon la fiche', () => {
  const nata = { allergens: ['gluten', 'lait'], mayContain: ['fruits_coque'] };
  assert.equal(allergenMatch(nata, ['lait']), ALLERGEN_MATCH.CONTAINS);
  assert.equal(allergenMatch(nata, ['fruits_coque']), ALLERGEN_MATCH.TRACES);
  assert.equal(allergenMatch(nata, ['soja']), ALLERGEN_MATCH.SAFE);
  assert.equal(allergenMatch(nata, []), ALLERGEN_MATCH.SAFE);
});
