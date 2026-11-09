import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choiceKey, defaultSelection, expandOptions, groupLimits, isSelectionComplete, limitsHint, toggleChoice } from '../shared/options.js';

const choices = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('les groupes d’une ancienne carte gardent leur sens', () => {
  assert.deepEqual(groupLimits({ type: 'single', required: true, choices }), { min: 1, max: 1 });
  assert.deepEqual(groupLimits({ type: 'single', required: false, choices }), { min: 0, max: 1 });
  assert.deepEqual(groupLimits({ type: 'multi', choices }), { min: 0, max: 3 });
  assert.deepEqual(groupLimits({ min: 1, max: 2, choices }), { min: 1, max: 2 });
});

test('la sélection de départ suit les choix par défaut et évite les ruptures', () => {
  const item = { options: [
    { id: 'lait', min: 1, max: 1, choices: [{ id: 'vache', soldOut: true }, { id: 'avoine' }] },
    { id: 'taille', min: 1, max: 1, choices: [{ id: 'normal' }, { id: 'grand', default: true }] },
    { id: 'extras', min: 0, max: 2, choices },
  ] };
  assert.deepEqual(defaultSelection(item), { lait: ['avoine'], taille: ['grand'], extras: [] });
});

test('on ne peut pas cocher plus que le maximum', () => {
  const group = { id: 'g', min: 0, max: 2, choices };
  let selected = toggleChoice({}, group, 'a');
  selected = toggleChoice(selected, group, 'b');
  assert.deepEqual(toggleChoice(selected, group, 'c'), selected);
  assert.deepEqual(toggleChoice(selected, group, 'a').g, ['b']);
});

test('les groupes partagés passent devant ceux de l’article', () => {
  const sets = [{ id: 'lait', name: 'Lait', choices }];
  const options = expandOptions({ optionSetIds: ['lait', 'disparu'], options: [{ id: 'sucre' }] }, sets);
  assert.deepEqual(options.map((g) => g.id), ['lait', 'sucre']);
  assert.equal(choiceKey('galao', options[0], 'a'), 'choice:set-lait/lait/a');
  assert.equal(choiceKey('galao', options[1], 'x'), 'choice:galao/sucre/x');
});

test('l’indication suit les limites', () => {
  assert.equal(limitsHint({ min: 1, max: 1, choices }).key, 'options.one');
  assert.deepEqual(limitsHint({ min: 0, max: 2, choices }), { key: 'options.upTo', vars: { max: 2 } });
});

test('la sélection est complète seulement entre min et max', () => {
  const item = { options: [{ id: 'g', min: 1, max: 2, choices }] };
  assert.equal(isSelectionComplete(item, { g: [] }), false);
  assert.equal(isSelectionComplete(item, { g: ['a'] }), true);
});
