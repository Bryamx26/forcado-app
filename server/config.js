// Identité de l'établissement. Pour vendre l'app à un autre commerce, il suffit de changer ces valeurs
// (ou les variables d'environnement correspondantes sur Vercel), puis la carte dans server/menu.js.
export const brand = {
  name: process.env.BRAND_NAME || 'Forcado',
  tagline: process.env.BRAND_TAGLINE || 'Pastelaria portuguesa',
  primary: process.env.BRAND_PRIMARY || '#1d3f7a',
  accent: process.env.BRAND_ACCENT || '#f2b43c',
  currency: process.env.BRAND_CURRENCY || 'EUR',
  locale: process.env.BRAND_LOCALE || 'fr-BE',
  paymentNote: process.env.BRAND_PAYMENT_NOTE || 'Paiement à la table ou au comptoir.',
  website: process.env.BRAND_WEBSITE || 'https://forcado.be',
};
