import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOpeningHours, pickupSlots, zonedParts, zonedTimeToMs } from '../shared/pickup.js';

const TZ = 'Europe/Brussels';

test('les horaires d’ouverture se lisent jour par jour', () => {
  const week = parseOpeningHours('lun-ven 08:00-12:00,14:00-19:00; sam 09:00-17:00');
  assert.deepEqual(week[1], [[480, 720], [840, 1140]]);
  assert.deepEqual(week[6], [[540, 1020]]);
  assert.equal(week[0], undefined);
  assert.deepEqual(Object.keys(parseOpeningHours('sam-lun 10:00-11:00')).sort(), ['0', '1', '6']);
  assert.throws(() => parseOpeningHours('lundi 08:00-10:00'));
});

test('l’heure locale tient compte de l’heure d’été', () => {
  assert.equal(new Date(zonedTimeToMs('2026-07-01', 10 * 60, TZ)).toISOString(), '2026-07-01T08:00:00.000Z');
  assert.equal(new Date(zonedTimeToMs('2026-11-09', 10 * 60, TZ)).toISOString(), '2026-11-09T09:00:00.000Z');
  assert.deepEqual(zonedParts(Date.parse('2026-11-09T23:30:00Z'), TZ), { date: '2026-11-10', weekday: 2, minutes: 30 });
});

test('les créneaux partent après le délai et s’arrêtent à la fermeture', () => {
  const week = parseOpeningHours('lun-dim 08:00-11:00');
  const now = Date.parse('2026-11-09T09:07:00Z'); // 10:07 à Bruxelles
  const slots = pickupSlots({ now, week, timeZone: TZ, slotMin: 15, leadMin: 20, capacity: 2, taken: { '2026-11-09T09:30:00.000Z': 2 } });
  assert.deepEqual(slots.map((s) => s.at), ['2026-11-09T09:30:00.000Z', '2026-11-09T09:45:00.000Z']);
  assert.equal(slots[0].full, true);
  assert.equal(slots[1].full, false);
});

test('aucun créneau un jour de fermeture', () => {
  const week = parseOpeningHours('lun-sam 08:00-19:00');
  assert.deepEqual(pickupSlots({ now: Date.parse('2026-11-08T09:00:00Z'), week, timeZone: TZ, slotMin: 15, leadMin: 20, capacity: 5 }), []);
});
