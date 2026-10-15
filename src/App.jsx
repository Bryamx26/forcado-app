import { useEffect, useState } from 'react';
import { api, setMoneyFormat } from './api.js';
import { BrandContext, defaultBrand } from './brand.js';
import Customer from './pages/Customer.jsx';
import Staff from './pages/Staff.jsx';
import Home from './pages/Home.jsx';
import About from './pages/site/About.jsx';
import Offer from './pages/site/Offer.jsx';
import { LegalNotice, Privacy } from './pages/site/Legal.jsx';
import { publicPages } from './seo.js';

const SITE_PAGES = {
  '/a-propos': About,
  '/commerces': Offer,
  '/mentions-legales': LegalNotice,
  '/confidentialite': Privacy,
};

function applyBrand(brand) {
  const root = document.documentElement.style;
  root.setProperty('--blue', brand.primary);
  root.setProperty('--custard', brand.accent);
  setMoneyFormat(brand.locale, brand.currency);
}

export default function App() {
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    api
      .config()
      .catch(() => defaultBrand)
      .then((b) => {
        applyBrand(b);
        setBrand(b);
      });
  }, []);

  if (!brand) return null;

  const path = window.location.pathname.replace(/(.)\/$/, '$1');
  const meta = publicPages(brand).find((p) => p.path === path);
  const table = path.match(/^\/table\/(\d+)/);
  let page;
  if (table) {
    document.title = `${brand.name} · Table ${table[1]}`;
    page = <Customer table={parseInt(table[1], 10)} />;
  } else if (path.startsWith('/comptoir')) {
    document.title = `${brand.name} · Espace employés`;
    page = <Staff />;
  } else if (meta && SITE_PAGES[path]) {
    document.title = meta.title;
    const Page = SITE_PAGES[path];
    page = <Page />;
  } else {
    document.title = publicPages(brand)[0].title;
    page = <Home />;
  }
  return <BrandContext.Provider value={brand}>{page}</BrandContext.Provider>;
}
