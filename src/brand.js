import { createContext, useContext } from 'react';

export const defaultBrand = {
  name: 'Forcado',
  tagline: 'Pastelaria portuguesa',
  primary: '#1d3f7a',
  accent: '#f2b43c',
  currency: 'EUR',
  locale: 'fr-BE',
  paymentNote: 'Paiement à la table ou au comptoir.',
  website: '',
};

export const BrandContext = createContext(defaultBrand);
export const useBrand = () => useContext(BrandContext);
