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
import { ToastProvider } from './components/ui.jsx';

const SITE_PAGES = {
  '/a-propos': About,
  '/commerces': Offer,
  '/mentions-legales': LegalNotice,
  '/confidentialite': Privacy,
};

// Couleurs du design system par défaut (src/theme.css) : rien à surcharger tant que la marque les garde.
const DEFAULT_PRIMARY = '#1f4e8c';
const DEFAULT_ACCENT = '#b9722e';
const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c);
const safeFont = (f) => (typeof f === 'string' ? f.replace(/[;{}<>\\]/g, '') : '');

// Marque d'un autre commerce (BRAND_PRIMARY, BRAND_ACCENT, BRAND_FONT_*) : remplace les tokens --brand-*, --accent-*
// et --font-*, en clair comme en sombre. Les nuances sont dérivées de la couleur choisie.
function brandCss(brand) {
  const light = [];
  const dark = [];
  const p = brand.primary;
  if (isColor(p) && p.toLowerCase() !== DEFAULT_PRIMARY) {
    light.push(
      `--brand-blue: ${p}`,
      `--brand-blue-strong: color-mix(in oklab, ${p} 65%, black)`,
      `--brand-blue-tint: color-mix(in oklab, ${p} 16%, white)`,
      `--focus-ring: ${p}`,
    );
    dark.push(
      `--brand-blue: color-mix(in oklab, ${p} 45%, white)`,
      `--brand-blue-strong: color-mix(in oklab, ${p} 25%, white)`,
      `--brand-blue-tint: color-mix(in oklab, ${p} 35%, #15202E)`,
    );
  }
  const a = brand.accent;
  if (isColor(a) && a.toLowerCase() !== DEFAULT_ACCENT) {
    light.push(
      `--accent-caramel: ${a}`,
      `--accent-caramel-strong: color-mix(in oklab, ${a} 70%, black)`,
      `--accent-caramel-tint: color-mix(in oklab, ${a} 18%, white)`,
    );
    dark.push(
      `--accent-caramel: color-mix(in oklab, ${a} 65%, white)`,
      `--accent-caramel-strong: color-mix(in oklab, ${a} 65%, white)`,
      `--accent-caramel-tint: color-mix(in oklab, ${a} 25%, #15202E)`,
    );
  }
  if (safeFont(brand.fontDisplay)) light.push(`--font-display: ${safeFont(brand.fontDisplay)}`);
  if (safeFont(brand.fontSans)) light.push(`--font-sans: ${safeFont(brand.fontSans)}`);
  if (!light.length) return '';
  const block = (decls) => decls.map((d) => `  ${d};`).join('\n');
  let css = `:root {\n${block(light)}\n}\n`;
  if (dark.length) {
    css += `@media screen and (prefers-color-scheme: dark) {\n:root:not([data-theme="light"]) {\n${block(dark)}\n}\n}\n`;
    css += `:root[data-theme="dark"] {\n${block(dark)}\n}\n`;
  }
  return css;
}

function applyBrand(brand) {
  const css = brandCss(brand);
  if (css) {
    const style = document.createElement('style');
    style.id = 'brand-theme';
    style.textContent = css;
    document.head.appendChild(style);
  }
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
  return (
    <BrandContext.Provider value={brand}>
      <ToastProvider>{page}</ToastProvider>
    </BrandContext.Provider>
  );
}
