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
  const t = useT();
  if (!Array.isArray(item.allergens)) {
    return <p className="allergen-unknown small">{t('allergens.unknown')}</p>;
  }
  const traces = item.mayContain || [];
  return (
    <section className="allergens" aria-label={t('allergens.title')}>
      <h3 className="allergens-title">{t('allergens.title')}</h3>
      {item.allergens.length ? <AllergenChips codes={item.allergens} /> : <p className="small muted">{t('allergens.none')}</p>}
      {traces.length > 0 && (
        <>
          <h4 className="allergens-subtitle">{t('allergens.traces')}</h4>
          <AllergenChips codes={traces} />
        </>
      )}
    </section>
  );
}
