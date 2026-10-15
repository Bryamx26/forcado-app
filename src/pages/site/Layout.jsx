import { useBrand } from '../../brand.js';

// Cadre des pages publiques : en-tête avec le nom de l'établissement, pied de page avec les liens légaux.
export default function SiteLayout({ children, wide = false }) {
  const brand = useBrand();
  return (
    <div className="site">
      <header className="site-header">
        <a className="logo" href="/">{brand.name}</a>
        <nav className="site-nav">
          <a href="/a-propos">À propos</a>
          {brand.vendor?.showOffer && <a href="/commerces">Pour les commerces</a>}
        </nav>
      </header>
      <main className={wide ? 'site-main site-wide' : 'site-main'}>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  const brand = useBrand();
  return (
    <footer className="site-footer">
      <nav>
        <a href="/a-propos">À propos</a>
        <a href="/mentions-legales">Mentions légales</a>
        <a href="/confidentialite">Confidentialité</a>
        {brand.vendor?.showOffer && <a href="/commerces">Vous avez un commerce ?</a>}
      </nav>
      <div className="muted small">
        © {new Date().getFullYear()} {brand.legal?.company || brand.name}
      </div>
    </footer>
  );
}
