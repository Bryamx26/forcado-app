// Créneaux de retrait pour l'emporter et la précommande, calculés à l'heure de l'établissement (fuseau horaire),
// pas à celle du serveur (UTC sur Vercel).

const DAY_NAMES = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const MINUTES_PER_DAY = 24 * 60;

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m || +m[1] > 24 || +m[2] > 59) throw new Error(`Heure invalide : « ${hhmm} »`);
  return +m[1] * 60 + +m[2];
};

function dayRange(text) {
  const [from, to = from] = text.split('-').map((d) => DAY_NAMES.indexOf(d.trim().toLowerCase()));
  if (from < 0 || to < 0) throw new Error(`Jour invalide : « ${text} »`);
  const days = [];
  for (let d = from; ; d = (d + 1) % 7) {
    days.push(d);
    if (d === to) return days;
  }
}

// « lun-ven 08:00-12:00,14:00-19:00; sam 09:00-17:00 » → { 1: [[480, 720], [840, 1140]], …, 6: [[540, 1020]] }
// (jour de la semaine 0 = dimanche, minutes depuis minuit). Un jour absent est fermé.
export function parseOpeningHours(text) {
  const week = {};
  for (const entry of text.split(';').map((e) => e.trim()).filter(Boolean)) {
    const [days, ranges] = entry.split(/\s+/);
    const intervals = ranges.split(',').map((range) => range.split('-').map(toMinutes));
    for (const day of dayRange(days)) week[day] = [...(week[day] || []), ...intervals];
  }
  return week;
}

// Date, jour de la semaine et minute de la journée d'un instant, dans le fuseau de l'établissement.
export function zonedParts(ms, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
    minutes: +parts.hour * 60 + +parts.minute,
  };
}

// Instant UTC d'une heure locale (date AAAA-MM-JJ + minutes) dans le fuseau donné, heure d'été comprise.
export function zonedTimeToMs(date, minutes, timeZone) {
  const [y, m, d] = date.split('-').map(Number);
  const wallClock = Date.UTC(y, m - 1, d, 0, minutes);
  let guess = wallClock;
  for (let i = 0; i < 2; i++) {
    const seen = zonedParts(guess, timeZone);
    const [sy, sm, sd] = seen.date.split('-').map(Number);
    guess += wallClock - Date.UTC(sy, sm - 1, sd, 0, seen.minutes);
  }
  return guess;
}

// Créneaux du jour encore réservables : dans les heures d'ouverture, au moins leadMin après maintenant.
// taken : { instant ISO: nombre de commandes déjà prévues }.
export function pickupSlots({ now, week, timeZone, slotMin, leadMin, capacity, taken = {} }) {
  const today = zonedParts(now, timeZone);
  const earliest = today.minutes + leadMin;
  const slots = [];
  for (const [open, close] of week[today.weekday] || []) {
    const first = Math.max(open, Math.ceil(earliest / slotMin) * slotMin);
    for (let minute = first; minute < close && minute < MINUTES_PER_DAY; minute += slotMin) {
      const at = new Date(zonedTimeToMs(today.date, minute, timeZone)).toISOString();
      slots.push({ at, full: (taken[at] || 0) >= capacity });
    }
  }
  return slots;
}

export const ORDER_MODE = Object.freeze({ DINE_IN: 'sur_place', TAKEAWAY: 'emporter' });
export const MAX_CUSTOMER_NAME = 30;
