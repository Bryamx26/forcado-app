import { useT } from '../../i18n.jsx';
import { allergenIcon } from '../../../shared/allergens.js';

function AllergenChips({ codes }) {
  const t = useT();
  return (
    <ul className="allergen-chips">
      {codes.map((code) => (
        <li key={code} className="allergen-chip">
          <span aria-hidden="true">{allergenIcon(code)}</span> {t(`allergen.${code}`)}
        </li>
      ))}
    </ul>
  );
}

// Allergènes d'un article, toujours avec leur libellé (jamais seulement une icône).
export default function AllergenInfo({ item }) {
  if (!Array.isArray(item.allergens)) {
    return <p className="allergen-unknown small">Allergènes non renseignés : demandez au comptoir.</p>;
  }
  const traces = item.mayContain || [];
  return (
    <section className="allergens" aria-label="Allergènes">
      <h3 className="allergens-title">Allergènes</h3>
      {item.allergens.length ? <AllergenChips codes={item.allergens} /> : <p className="small muted">Aucun des 14 allergènes réglementaires.</p>}
      {traces.length > 0 && (
        <>
          <h4 className="allergens-subtitle">Peut contenir des traces de</h4>
          <AllergenChips codes={traces} />
        </>
      )}
    </section>
  );
}
