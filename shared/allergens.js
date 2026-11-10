// Les 14 allergènes à déclarer (règlement UE 1169/2011, annexe II).
// Les libellés traduits sont dans shared/i18n (clés allergen.<code>).
export const ALLERGENS = [
  { code: 'gluten', icon: '🌾' },
  { code: 'crustaces', icon: '🦐' },
  { code: 'oeufs', icon: '🥚' },
  { code: 'poisson', icon: '🐟' },
  { code: 'arachides', icon: '🥜' },
  { code: 'soja', icon: '🫘' },
  { code: 'lait', icon: '🥛' },
  { code: 'fruits_coque', icon: '🌰' },
  { code: 'celeri', icon: '🥬' },
  { code: 'moutarde', icon: '🟡' },
  { code: 'sesame', icon: '⚪' },
  { code: 'sulfites', icon: '🍷' },
  { code: 'lupin', icon: '🌼' },
  { code: 'mollusques', icon: '🐚' },
];

export const ALLERGEN_CODES = ALLERGENS.map((a) => a.code);
export const allergenIcon = (code) => ALLERGENS.find((a) => a.code === code)?.icon || '';

// Ce que l'article représente pour un client qui évite certains allergènes.
export const ALLERGEN_MATCH = Object.freeze({ SAFE: 'safe', CONTAINS: 'contains', TRACES: 'traces', UNKNOWN: 'unknown' });

// allergens à null : la fiche n'a pas été remplie. On ne dit jamais « aucun allergène » par défaut.
export function allergenMatch(item, avoided) {
  if (!avoided.length) return ALLERGEN_MATCH.SAFE;
  if (!Array.isArray(item.allergens)) return ALLERGEN_MATCH.UNKNOWN;
  if (item.allergens.some((code) => avoided.includes(code))) return ALLERGEN_MATCH.CONTAINS;
  if ((item.mayContain || []).some((code) => avoided.includes(code))) return ALLERGEN_MATCH.TRACES;
  return ALLERGEN_MATCH.SAFE;
}
