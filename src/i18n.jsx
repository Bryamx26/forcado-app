// Langue de l'interface client. Le comptoir reste en français.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, pickLanguage, translate } from '../shared/i18n/index.js';

const STORAGE_KEY = 'forcado-langue';

const LanguageContext = createContext({ lang: DEFAULT_LANGUAGE, languages: [DEFAULT_LANGUAGE], setLang: () => {} });

function readStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Ordre de préférence : ?lang= dans l'adresse, le choix déjà fait sur ce téléphone, puis la langue du navigateur.
function initialLanguage(languages) {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  return pickLanguage([fromUrl, readStoredLanguage(), ...(navigator.languages || [navigator.language])], languages);
}

export function LanguageProvider({ languages, children }) {
  const [lang, setLangState] = useState(() => initialLanguage(languages));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const setLang = (next) => {
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
    };
    return { lang, languages, setLang };
  }, [lang, languages]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

// t('cle', { var }) dans la langue choisie.
export function useT() {
  const { lang } = useLanguage();
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}

// Message d'une erreur du serveur dans la langue du client ; à défaut, le texte français du serveur.
export function useErrorText() {
  const { lang } = useLanguage();
  return useCallback(
    (error, vars = {}) => {
      const key = `error.${error?.code}`;
      const text = translate(lang, key, { ...error?.vars, ...vars });
      return text === key ? error?.message || translate(lang, 'error.generic') : text;
    },
    [lang],
  );
}

export function LanguagePicker() {
  const { lang, languages, setLang } = useLanguage();
  const t = useT();
  if (languages.length < 2) return null;
  return (
    <label className="lang-picker">
      <span className="sr-only">{t('language.choose')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value)}>
        {languages.map((code) => (
          <option key={code} value={code} lang={code}>
            {translate(code, 'language.name')}
          </option>
        ))}
      </select>
    </label>
  );
}
