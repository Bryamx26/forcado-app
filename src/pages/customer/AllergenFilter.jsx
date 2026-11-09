import { useState } from 'react';
import { Modal } from '../../components/ui.jsx';
import { useT } from '../../i18n.jsx';
import { ALLERGENS } from '../../../shared/allergens.js';

const STORAGE_KEY = 'forcado-allergies';

function readAvoided() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// Allergènes que le client veut éviter, gardés sur son téléphone pour sa prochaine visite.
export function useAvoidedAllergens() {
  const [avoided, setAvoided] = useState(readAvoided);
  const save = (next) => {
    setAvoided(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };
  return [avoided, save];
}

export default function AllergenFilter({ avoided, onChange, hiddenCount }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const toggle = (code) => onChange(avoided.includes(code) ? avoided.filter((c) => c !== code) : [...avoided, code]);

  return (
    <div className="allergen-filter">
      <button type="button" className={`btn btn-sm ${avoided.length ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setOpen(true)}>
        <span aria-hidden="true">⚠</span> {avoided.length ? `Allergies (${avoided.length})` : 'Allergies'}
      </button>
      {hiddenCount > 0 && <span className="small muted">{hiddenCount} article(s) masqué(s)</span>}
      {open && (
        <Modal
          title="J'évite"
          onClose={() => setOpen(false)}
          footer={
            <>
              {avoided.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => onChange([])}>Tout effacer</button>}
              <button type="button" className="btn btn-grow" onClick={() => setOpen(false)}>Voir la carte</button>
            </>
          }
        >
          <p className="small muted">Les articles qui contiennent ces allergènes sont masqués. En cas d'allergie sévère, parlez-en au comptoir.</p>
          <div className="allergen-grid">
            {ALLERGENS.map(({ code, icon }) => (
              <label key={code} className={`opt ${avoided.includes(code) ? 'opt-on' : ''}`}>
                <input type="checkbox" checked={avoided.includes(code)} onChange={() => toggle(code)} />
                <span aria-hidden="true">{icon}</span>
                <span>{t(`allergen.${code}`)}</span>
              </label>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
