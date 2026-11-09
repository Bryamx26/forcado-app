// Traductions partagées par le navigateur et le serveur.
import fr from './fr.js';
import nl from './nl.js';
import en from './en.js';
import pt from './pt.js';

export const DEFAULT_LANGUAGE = 'fr';
const DICTIONARIES = { fr, nl, en, pt };
export const SUPPORTED_LANGUAGES = Object.keys(DICTIONARIES);

export const isSupported = (lang) => SUPPORTED_LANGUAGES.includes(lang);

// {nom} dans le texte est remplacé par vars.nom. Une clé absente retombe sur le français, puis sur la clé elle-même.
export function translate(lang, key, vars = {}) {
  const text = DICTIONARIES[lang]?.[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

// Texte de la carte : une chaîne (ancienne carte, en français) ou { fr, nl, en, pt }.
// Une traduction manquante retombe sur le français, puis sur la première langue remplie.
export function localize(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value[DEFAULT_LANGUAGE] || Object.values(value).find(Boolean) || '';
}

// Langue préférée parmi celles proposées : la première langue du navigateur qui correspond.
export function pickLanguage(candidates, offered) {
  for (const candidate of candidates) {
    const base = String(candidate || '').slice(0, 2).toLowerCase();
    if (offered.includes(base)) return base;
  }
  return offered.includes(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : offered[0];
}
