import { createContext, useContext } from 'react';

export const defaultBrand = {
  name: 'Forcado',
  tagline: 'Pastelaria portuguesa',
  primary: '#1F4E8C',
  accent: '#B9722E',
  fontDisplay: '',
  fontSans: '',
  fontLogo: '',
  logo: '',
  currency: 'EUR',
  locale: 'fr-BE',
  paymentNote: 'Paiement à la table ou au comptoir.',
  website: '',
  description: '',
  city: '',
  about: '',
  legal: { company: '', address: '', vat: '', email: '', phone: '' },
  vendor: { name: 'Commande à table', email: '', phone: '', website: '', price: '', demoUrl: '', showOffer: true },
};

export const BrandContext = createContext(defaultBrand);
export const useBrand = () => useContext(BrandContext);
