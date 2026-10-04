import { useEffect, useState } from 'react';
import { api, setMoneyFormat } from './api.js';
import { BrandContext, defaultBrand } from './brand.js';
import Customer from './pages/Customer.jsx';
import Staff from './pages/Staff.jsx';
import Home from './pages/Home.jsx';

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

  const path = window.location.pathname;
  const table = path.match(/^\/table\/(\d+)/);
  let page;
  if (table) {
    document.title = `${brand.name} · Table ${table[1]}`;
    page = <Customer table={parseInt(table[1], 10)} />;
  } else if (path.startsWith('/comptoir')) {
    document.title = `${brand.name} · Espace employés`;
    page = <Staff />;
  } else {
    document.title = `${brand.name} · Commande à table`;
    page = <Home />;
  }
  return <BrandContext.Provider value={brand}>{page}</BrandContext.Provider>;
}
