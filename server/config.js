// Identité de l'établissement. Pour vendre l'app à un autre commerce, il suffit de changer ces valeurs
// (ou les variables d'environnement correspondantes sur Vercel), puis la carte dans server/menu.js.
const env = process.env;

export const brand = {
  name: env.BRAND_NAME || 'Forcado',
  tagline: env.BRAND_TAGLINE || 'Pastelaria portuguesa',
  description:
    env.BRAND_DESCRIPTION ||
    'Pastelaria portugaise : pastéis de nata, viennoiseries et café. Commandez depuis votre table en scannant le QR code.',
  primary: env.BRAND_PRIMARY || '#1d3f7a',
  accent: env.BRAND_ACCENT || '#f2b43c',
  currency: env.BRAND_CURRENCY || 'EUR',
  locale: env.BRAND_LOCALE || 'fr-BE',
  paymentNote: env.BRAND_PAYMENT_NOTE || 'Paiement à la table ou au comptoir.',
  website: env.BRAND_WEBSITE || 'https://forcado.be',
  city: env.BRAND_CITY || 'Bruxelles',
  // Type d'établissement pour Google (schema.org) : Bakery, CafeOrCoffeeShop, Restaurant, BarOrPub…
  type: env.BRAND_TYPE || 'Bakery',
  // Texte de la page À propos : un paragraphe par ligne.
  about:
    env.BRAND_ABOUT ||
    [
      'Forcado est une pastelaria portugaise à Bruxelles. On y vient pour un pastel de nata encore tiède, une bica bien serrée ou un galão, comme à Lisbonne.',
      'Pour vous servir plus vite, nous avons installé la commande à table : scannez le QR code de votre table, choisissez, envoyez. Votre commande arrive directement au comptoir et nous vous l\'apportons dès qu\'elle est prête.',
    ].join('\n'),

  // Exploitant du site (mentions légales et responsable du traitement des données).
  legal: {
    company: env.LEGAL_COMPANY || '',
    address: env.LEGAL_ADDRESS || '',
    vat: env.LEGAL_VAT || '', // numéro d'entreprise BCE / TVA
    email: env.LEGAL_EMAIL || '',
    phone: env.LEGAL_PHONE || '',
  },

  // Éditeur de l'app, affiché sur les pages À propos et Pour les commerces.
  vendor: {
    name: env.VENDOR_NAME || 'Commande à table',
    email: env.VENDOR_EMAIL || '',
    phone: env.VENDOR_PHONE || '',
    website: env.VENDOR_WEBSITE || '',
    price: env.VENDOR_PRICE || '',
    demoUrl: env.VENDOR_DEMO_URL || '', // une installation de démo, pour ne pas mêler ses commandes à celles d'un vrai commerce
    showOffer: env.VENDOR_SHOW_OFFER !== 'false',
  },
};

// Adresse publique du site, pour le référencement (balise canonique, sitemap). Sur Vercel, le domaine de production
// est utilisé si SITE_URL n'est pas défini.
export const siteUrl = (
  env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/$/, '');
