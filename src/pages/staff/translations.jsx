// Saisie des traductions de la carte au comptoir. Le français est la langue de référence, saisie dans les champs
// principaux ; les autres langues se remplissent ici et retombent sur le français tant qu'elles sont vides.
import { useBrand } from '../../brand.js';
import { DEFAULT_LANGUAGE, localize, translate } from '../../../shared/i18n/index.js';

// Texte de la carte sous forme { fr, nl, … } (une ancienne carte a de simples chaînes).
export const toLocalized = (value) => (typeof value === 'object' && value !== null ? { ...value } : { [DEFAULT_LANGUAGE]: value || '' });

// Libellé français, pour l'affichage au comptoir.
export const frenchText = (value) => localize(value, DEFAULT_LANGUAGE);

export function useOtherLanguages() {
  const brand = useBrand();
  return (brand.languages || []).filter((lang) => lang !== DEFAULT_LANGUAGE);
}

function TranslationRow({ label, value, max, languages, onChange }) {
  return (
    <div className="translation-row">
      <span className="translation-label">{label || '—'}</span>
      {languages.map((lang) => (
        <input
          key={lang}
          className="editor-input"
          lang={lang}
          value={value[lang] || ''}
          maxLength={max}
          placeholder={translate(lang, 'language.name')}
          aria-label={`${label} : ${translate(lang, 'language.name')}`}
          onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        />
      ))}
    </div>
  );
}

// rows : [{ id, value, max, onChange }] ; chaque ligne est intitulée par son texte français.
export function TranslationsEditor({ rows }) {
  const languages = useOtherLanguages();
  if (!languages.length) return null;
  const missing = rows.filter((row) => row.value.fr && languages.some((lang) => !row.value[lang])).length;
  return (
    <details className="translations">
      <summary>
        Traductions ({languages.map((l) => l.toUpperCase()).join(', ')})
        {missing > 0 && <span className="muted small"> · {missing} texte(s) à traduire</span>}
      </summary>
      <p className="muted small">Un texte non traduit s'affiche en français.</p>
      {rows.map((row) => (
        <TranslationRow key={row.id} label={row.value.fr} value={row.value} max={row.max} languages={languages} onChange={row.onChange} />
      ))}
    </details>
  );
}
