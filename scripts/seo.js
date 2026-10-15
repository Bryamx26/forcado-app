// Après `vite build` : écrit une page HTML par adresse publique, avec son titre, sa description et ses données
// structurées, pour que Google les lise sans exécuter JavaScript. Écrit aussi sitemap.xml, robots.txt, l'icône
// et le manifeste, à partir de l'identité de l'établissement (server/config.js ou variables BRAND_*).
import fs from 'node:fs';
import path from 'node:path';
import { brand, siteUrl } from '../server/config.js';
import { publicPages, PRIVATE_PATHS } from '../src/seo.js';

const dist = path.resolve('dist');
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const abs = (p) => (siteUrl ? siteUrl + p : p);

function structuredData(page) {
  if (page.path === '/') {
    return {
      '@context': 'https://schema.org',
      '@type': brand.type,
      name: brand.name,
      description: brand.description,
      url: siteUrl || brand.website || undefined,
      sameAs: brand.website ? [brand.website] : undefined,
      image: abs('/produits/accueil.jpg'),
      address: brand.legal.address || brand.city || undefined,
      telephone: brand.legal.phone || undefined,
    };
  }
  if (page.path === '/commerces') {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: brand.vendor.name,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: page.description,
      url: abs('/commerces'),
    };
  }
  return null;
}

// Remplace le titre et le contenu des balises meta (name ou property) du modèle.
function setMeta(html, values) {
  for (const [key, value] of Object.entries(values)) {
    if (key === 'title') {
      html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${value}</title>`);
    } else {
      const re = new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*`);
      html = html.replace(re, (_, start) => start + value);
    }
  }
  return html;
}

function render(page) {
  const title = esc(page.title);
  const desc = esc(page.description);
  const data = structuredData(page);
  const html = setMeta(template, {
    title,
    description: desc,
    'og:title': title,
    'og:description': desc,
    'og:site_name': esc(brand.name),
    'og:locale': esc(brand.locale.replace('-', '_')),
    'og:image': esc(abs('/produits/accueil.jpg')),
    'theme-color': esc(brand.primary),
  });
  const extra = [];
  if (siteUrl) {
    extra.push(`<link rel="canonical" href="${esc(abs(page.path))}" />`);
    extra.push(`<meta property="og:url" content="${esc(abs(page.path))}" />`);
  }
  if (data) extra.push(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);
  return html.replace('  </head>', () => `${extra.map((l) => `    ${l}\n`).join('')}  </head>`);
}

const pages = publicPages(brand);
for (const page of pages) {
  const file = page.path === '/' ? path.join(dist, 'index.html') : path.join(dist, page.path.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, render(page));
}

// Les pages des tables et l'espace employés partagent un modèle non référencé.
fs.writeFileSync(
  path.join(dist, 'app.html'),
  setMeta(template, { title: esc(brand.name), robots: 'noindex, nofollow', 'theme-color': esc(brand.primary) }),
);

fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  ['User-agent: *', ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`), siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml` : '', ''].join('\n'),
);

if (siteUrl) {
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(
    path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .map((p) => `  <url><loc>${esc(abs(p.path))}</loc><lastmod>${today}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`,
  );
} else {
  console.warn('SITE_URL non défini : pas de sitemap ni de balise canonique.');
}

const initial = esc(brand.name.trim().charAt(0).toUpperCase() || '•');
fs.writeFileSync(
  path.join(dist, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${esc(brand.primary)}"/><text x="32" y="45" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="38" fill="${esc(brand.accent)}">${initial}</text></svg>\n`,
);

fs.writeFileSync(
  path.join(dist, 'site.webmanifest'),
  JSON.stringify(
    {
      name: brand.name,
      short_name: brand.name,
      description: brand.description,
      start_url: '/',
      display: 'standalone',
      background_color: '#fbf6ec',
      theme_color: brand.primary,
      icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
    null,
    2,
  ),
);

console.log(`SEO : ${pages.length} pages publiques, robots.txt${siteUrl ? ', sitemap.xml' : ''}, favicon et manifeste écrits.`);
