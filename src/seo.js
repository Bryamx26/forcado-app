// Titre et description de chaque page publique. Utilisé par l'app (titre de l'onglet)
// et par scripts/seo.js, qui écrit une page HTML par adresse pour les moteurs de recherche.
export function publicPages(brand) {
  const pages = [
    {
      path: '/',
      title: `${brand.name} · ${brand.tagline}`,
      description: brand.description,
    },
    {
      path: '/a-propos',
      title: `À propos · ${brand.name}`,
      description: `${brand.name}, ${brand.tagline.toLowerCase()}${brand.city ? ` à ${brand.city}` : ''}. Notre histoire et la commande à table par QR code.`,
    },
    {
      path: '/mentions-legales',
      title: `Mentions légales · ${brand.name}`,
      description: `Informations légales sur l'exploitant du site ${brand.name}.`,
    },
    {
      path: '/confidentialite',
      title: `Politique de confidentialité · ${brand.name}`,
      description: `Quelles données ${brand.name} collecte lors d'une commande à table, pourquoi, et vos droits.`,
    },
  ];
  if (brand.vendor?.showOffer) {
    pages.push({
      path: '/commerces',
      title: offerTitle(brand.vendor.name),
      description:
        'Vos clients commandent depuis leur table en scannant un QR code, votre équipe reçoit les commandes en direct. Sans application à installer, sur la tablette que vous avez déjà, à vos couleurs.',
    });
  }
  return pages;
}

function offerTitle(vendorName) {
  const base = 'Commande à table par QR code pour cafés et restaurants';
  return vendorName && !base.startsWith(vendorName) ? `${base} · ${vendorName}` : base;
}

// Adresses à ne pas référencer : pages des tables et espace employés.
export const PRIVATE_PATHS = ['/table/', '/comptoir', '/api/'];
