// Langue de l'interface client. Le comptoir reste en français.
import { createContext, useCallback, useContext } from 'react';
import { DEFAULT_LANGUAGE, translate } from '../shared/i18n/index.js';

export const LanguageContext = createContext({ lang: DEFAULT_LANGUAGE, setLang: () => {} });

export const useLanguage = () => useContext(LanguageContext);

// t('cle', { var }) dans la langue choisie.
export function useT() {
  const { lang } = useLanguage();
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}
