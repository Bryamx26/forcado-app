import { useBrand } from '../brand.js';

export default function Home() {
  const brand = useBrand();
  return (
    <div className="home">
      <div className="home-card">
        <img
          className="home-hero"
          src="/produits/accueil.jpg"
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="logo logo-xl">{brand.name}</div>
        <div className="tagline">{brand.tagline}</div>
        <div className="home-qr" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
          </svg>
        </div>
        <h1>Commandez depuis votre table</h1>
        <ol className="steps">
          <li><span>1</span>Scannez le QR code posé sur votre table.</li>
          <li><span>2</span>Choisissez vos pâtisseries et boissons.</li>
          <li><span>3</span>Envoyez : on vous apporte tout à table.</li>
        </ol>
        {brand.website && (
          <a className="btn btn-ghost" href={brand.website} target="_blank" rel="noreferrer">
            Découvrir {brand.name}
          </a>
        )}
      </div>
      <a className="staff-link" href="/comptoir">Espace employés</a>
    </div>
  );
}
