import { ALLERGENS } from '../../../shared/allergens.js';
import { translate } from '../../../shared/i18n/index.js';

const LEVELS = [
  { value: 'none', label: '—' },
  { value: 'contains', label: 'Contient' },
  { value: 'traces', label: 'Traces' },
];

// Valeur du formulaire : { known, levels: { code: 'contains' | 'traces' } }.
export function allergenFormState(item) {
  const levels = {};
  for (const code of item?.mayContain || []) levels[code] = 'traces';
  for (const code of item?.allergens || []) levels[code] = 'contains';
  return { known: Array.isArray(item?.allergens), levels };
}

// Ce que le serveur attend : allergens à null tant que la fiche n'est pas vérifiée.
export function allergenPayload({ known, levels }) {
  const codesAt = (level) => ALLERGENS.map((a) => a.code).filter((code) => levels[code] === level);
  return { allergens: known ? codesAt('contains') : null, mayContain: known ? codesAt('traces') : [] };
}

export default function AllergenEditor({ value, onChange }) {
  const setLevel = (code, level) => onChange({ ...value, levels: { ...value.levels, [code]: level } });
  return (
    <fieldset className="editor-group">
      <legend className="editor-title">Allergènes</legend>
      <label className="switch">
        <input type="checkbox" checked={value.known} onChange={(e) => onChange({ ...value, known: e.target.checked })} />
        <span className="switch-track" />
        <span className="switch-label">{value.known ? 'Fiche allergènes vérifiée' : 'Pas encore renseignés'}</span>
      </label>
      {value.known ? (
        <div className="allergen-editor">
          {ALLERGENS.map(({ code, icon }) => (
            <label key={code}>
              <span>
                <span aria-hidden="true">{icon}</span> {translate('fr', `allergen.${code}`)}
              </span>
              <select className="editor-input" value={value.levels[code] || 'none'} onChange={(e) => setLevel(code, e.target.value)}>
                {LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : (
        <p className="muted small">Le client verra « Allergènes non renseignés : demandez au comptoir ».</p>
      )}
    </fieldset>
  );
}
