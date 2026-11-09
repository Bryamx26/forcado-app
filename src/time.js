// Heure d'un instant dans le fuseau de l'établissement (« 10:45 »), quel que soit le fuseau du téléphone.
export function formatTime(iso, timeZone, locale = 'fr-BE') {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
