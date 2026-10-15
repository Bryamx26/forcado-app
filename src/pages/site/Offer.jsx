import { useState } from 'react';
import { useBrand } from '../../brand.js';
import SiteLayout from './Layout.jsx';

const FEATURES = [
  ['QR code par table', 'Le client scanne, la carte s’ouvre avec son numéro de table déjà rempli. Les QR codes s’impriment depuis l’espace employés.'],
  ['Carte avec options', 'Garnitures, tailles, laits végétaux, suppléments payants : chaque produit a ses choix, et le prix se met à jour.'],
  ['Commandes en direct', 'Reçue, en préparation, prête, servie : l’équipe fait avancer chaque commande sur un tableau, avec un bip à chaque nouvelle.'],
  ['Suivi côté client', 'Le client voit sur son téléphone quand sa commande est prise en charge puis prête.'],
  ['Ruptures en un clic', 'Un produit épuisé disparaît de la commande instantanément, sur tous les téléphones.'],
  ['Statistiques du jour', 'Nombre de commandes, chiffre du jour, commandes en attente : l’essentiel en haut de l’écran.'],
  ['À vos couleurs', 'Votre nom, vos couleurs, vos photos et votre carte. Vos clients ne voient que votre marque.'],
  ['Sûr par défaut', 'Espace employés protégé par mot de passe, prix toujours recalculés par le serveur, protection contre les commandes en masse.'],
];

const FAQ = [
  ['Mes clients doivent-ils installer une application ?', 'Non. Le QR code ouvre une page web sur leur téléphone, sans compte ni téléchargement.'],
  ['De quel matériel ai-je besoin ?', 'Une tablette, un ordinateur ou un téléphone derrière le comptoir pour voir les commandes, et une imprimante pour les QR codes.'],
  ['Et le paiement ?', 'Vos clients paient comme aujourd’hui, à table ou au comptoir. L’app ne prend aucune commission sur vos ventes.'],
  ['Puis-je modifier ma carte ?', 'Oui : produits, prix, options et photos. Les produits épuisés se désactivent en un clic pendant le service.'],
  ['Où sont mes données ?', 'Chaque commerce a sa propre installation et sa propre base de données. Vos commandes ne sont partagées avec personne.'],
];

export default function Offer() {
  const brand = useBrand();
  const vendor = brand.vendor || {};
  return (
    <SiteLayout wide>
      <section className="offer-hero">
        <p className="tagline">Pour cafés, pâtisseries, bars et restaurants</p>
        <h1>Vos clients commandent depuis leur table. Votre équipe sert plus vite.</h1>
        <p className="lead">
          Un QR code sur chaque table, une carte à vos couleurs sur le téléphone du client, et toutes les commandes en
          direct derrière le comptoir. Sans application à installer.
        </p>
        <div className="offer-cta">
          <a className="btn" href="#contact">Demander une démo</a>
          {vendor.demoUrl && (
            <a className="btn btn-ghost" href={vendor.demoUrl} target="_blank" rel="noreferrer">Essayer côté client</a>
          )}
        </div>
        <p className="muted small">Déjà utilisé au quotidien chez {brand.name}.</p>
      </section>

      <section>
        <h2>Ce que ça change</h2>
        <div className="benefits">
          <div><strong>Moins d’attente</strong><span>Le client commande dès qu’il est assis, sans attendre qu’on passe le voir.</span></div>
          <div><strong>Moins d’erreurs</strong><span>Chaque option est écrite noir sur blanc sur le ticket : plus de commande mal comprise.</span></div>
          <div><strong>Plus de temps</strong><span>L’équipe prépare et sert au lieu de prendre les commandes une par une.</span></div>
        </div>
      </section>

      <section>
        <h2>Fonctionnalités</h2>
        <div className="features">
          {FEATURES.map(([title, text]) => (
            <div key={title} className="feature">
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Comment ça se passe</h2>
        <ol className="steps">
          <li><span>1</span>On échange sur votre établissement, votre carte et vos couleurs.</li>
          <li><span>2</span>On met en ligne votre app avec votre carte et vos photos.</li>
          <li><span>3</span>Vous imprimez les QR codes, vous les posez sur les tables, et c’est parti.</li>
        </ol>
      </section>

      <section className="pricing">
        <h2>Tarif</h2>
        <div className="price">{vendor.price || 'Sur devis'}</div>
        <p className="muted">Aucune commission sur vos ventes : vos clients paient chez vous, comme aujourd’hui.</p>
      </section>

      <section>
        <h2>Questions fréquentes</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="faq">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <Contact vendor={vendor} />
    </SiteLayout>
  );
}

// Le formulaire prépare un e-mail dans la messagerie du visiteur : rien n'est envoyé ni stocké par le site.
function Contact({ vendor }) {
  const [form, setForm] = useState({ name: '', business: '', phone: '', message: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!vendor.email && !vendor.phone) return null;

  const send = (e) => {
    e.preventDefault();
    const subject = `Démo commande à table${form.business ? ` · ${form.business}` : ''}`;
    const body = [
      `Nom : ${form.name}`,
      `Établissement : ${form.business}`,
      form.phone && `Téléphone : ${form.phone}`,
      '',
      form.message,
    ]
      .filter((l) => l !== false && l !== undefined)
      .join('\n');
    window.location.href = `mailto:${vendor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section id="contact" className="contact">
      <h2>Parlons de votre établissement</h2>
      <p className="muted">
        Laissez-nous quelques mots, on vous recontacte pour une démo.
        {vendor.phone && (
          <>
            {' '}Ou appelez-nous au <a href={`tel:${vendor.phone.replace(/\s/g, '')}`}>{vendor.phone}</a>.
          </>
        )}
      </p>
      {vendor.email && (
        <form className="contact-form" onSubmit={send}>
          <label className="field">
            Votre nom
            <input value={form.name} onChange={set('name')} required maxLength={80} autoComplete="name" />
          </label>
          <label className="field">
            Votre établissement
            <input value={form.business} onChange={set('business')} required maxLength={80} autoComplete="organization" />
          </label>
          <label className="field">
            Téléphone (facultatif)
            <input value={form.phone} onChange={set('phone')} maxLength={30} autoComplete="tel" type="tel" />
          </label>
          <label className="field">
            Message
            <textarea value={form.message} onChange={set('message')} rows={4} maxLength={1500} placeholder="Nombre de tables, type de carte, questions…" />
          </label>
          <button className="btn btn-block">Écrire à {vendor.name}</button>
          <p className="muted small">
            Le bouton ouvre votre messagerie avec un e-mail prêt à envoyer à {vendor.email}. Le site ne conserve rien.
          </p>
        </form>
      )}
    </section>
  );
}
