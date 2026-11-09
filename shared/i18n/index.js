// Traductions partagées par le navigateur et le serveur.
import fr from './fr.js';

export const DEFAULT_LANGUAGE = 'fr';
const DICTIONARIES = { fr };

// {nom} dans le texte est remplacé par vars.nom. Une clé absente retombe sur le français, puis sur la clé elle-même.
export function translate(lang, key, vars = {}) {
  const text = DICTIONARIES[lang]?.[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}
