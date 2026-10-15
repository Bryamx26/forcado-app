import { useBrand } from '../../brand.js';
import SiteLayout from './Layout.jsx';

export default function About() {
  const brand = useBrand();
  const paragraphs = (brand.about || brand.description || '').split('\n').filter(Boolean);
  return (
    <SiteLayout>
      <img
        className="site-hero"
        src="/produits/accueil.jpg"
        alt={brand.name}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <h1>À propos de {brand.name}</h1>
      <p className="tagline">
        {brand.tagline}
        {brand.city && ` · ${brand.city}`}
      </p>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}

      <h2>Commander à table</h2>
      <ol className="steps">
        <li><span>1</span>Scannez le QR code posé sur votre table avec l'appareil photo de votre téléphone.</li>
        <li><span>2</span>Choisissez vos produits et leurs options, puis envoyez la commande.</li>
        <li><span>3</span>Suivez son avancement sur votre écran : on vous l'apporte dès qu'elle est prête.</li>
      </ol>
      <p className="muted">
        Aucune application à installer et aucun compte à créer. {brand.paymentNote}
      </p>

      {(brand.website || brand.legal?.address || brand.legal?.phone) && (
        <>
          <h2>Nous trouver</h2>
          {brand.legal?.address && <p>{brand.legal.address}</p>}
          {brand.legal?.phone && (
            <p>
              <a href={`tel:${brand.legal.phone.replace(/\s/g, '')}`}>{brand.legal.phone}</a>
            </p>
          )}
          {brand.website && (
            <p>
              <a href={brand.website} target="_blank" rel="noreferrer">
                {brand.website.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}
        </>
      )}
    </SiteLayout>
  );
}
