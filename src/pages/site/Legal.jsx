import { useBrand } from '../../brand.js';
import SiteLayout from './Layout.jsx';

// Valeur venant de la configuration (variables LEGAL_*), signalée tant qu'elle n'est pas remplie.
function Field({ value, name }) {
  return value ? <>{value}</> : <span className="todo">[à compléter : {name}]</span>;
}

function Email({ value }) {
  return value ? <a href={`mailto:${value}`}>{value}</a> : <Field name="LEGAL_EMAIL" />;
}

const updated = '15 octobre 2026';

export function LegalNotice() {
  const brand = useBrand();
  const legal = brand.legal || {};
  return (
    <SiteLayout>
      <h1>Mentions légales</h1>

      <h2>Exploitant du site</h2>
      <p>
        Le site {brand.name} est exploité par <Field value={legal.company} name="LEGAL_COMPANY" />.
      </p>
      <ul className="plain">
        <li>Adresse : <Field value={legal.address} name="LEGAL_ADDRESS" /></li>
        <li>Numéro d'entreprise (BCE) / TVA : <Field value={legal.vat} name="LEGAL_VAT" /></li>
        <li>E-mail : <Email value={legal.email} /></li>
        {legal.phone && <li>Téléphone : {legal.phone}</li>}
      </ul>

      <h2>Hébergement</h2>
      <p>
        Site hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com). Base de
        données des commandes fournie par Upstash, Inc. (upstash.com).
      </p>

      <h2>Prix et commandes</h2>
      <p>
        Les prix affichés sont en {brand.currency === 'EUR' ? 'euros' : brand.currency}, toutes taxes comprises. Une
        commande envoyée depuis une table est transmise à l'équipe, qui la prépare. {brand.paymentNote}
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, photos, logos et la marque {brand.name} appartiennent à leur exploitant. Toute reproduction sans
        autorisation est interdite.
      </p>

      <p className="muted small">Dernière mise à jour : {updated}.</p>
    </SiteLayout>
  );
}

export function Privacy() {
  const brand = useBrand();
  const legal = brand.legal || {};
  return (
    <SiteLayout>
      <h1>Politique de confidentialité</h1>
      <p>
        Nous collectons le strict minimum pour prendre votre commande. Vous n'avez besoin ni de compte, ni de nom, ni
        d'adresse e-mail pour commander.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        <Field value={legal.company} name="LEGAL_COMPANY" />, <Field value={legal.address} name="LEGAL_ADDRESS" />.
        Contact : <Email value={legal.email} />.
      </p>

      <h2>Ce que nous collectons, et pourquoi</h2>
      <table className="legal-table">
        <thead>
          <tr><th>Données</th><th>Pourquoi</th><th>Base légale</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Numéro de table, produits choisis et options, remarque éventuelle, heure de la commande</td>
            <td>Préparer et servir votre commande, tenir notre comptabilité</td>
            <td>Exécution de votre commande (art. 6.1.b RGPD) et obligations légales (art. 6.1.c)</td>
          </tr>
          <tr>
            <td>Identifiants de vos commandes, gardés dans votre navigateur</td>
            <td>Afficher le suivi de vos commandes sur votre téléphone</td>
            <td>Exécution de votre commande (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Adresse IP, de façon temporaire</td>
            <td>Bloquer les envois massifs de fausses commandes et les tentatives de connexion répétées</td>
            <td>Intérêt légitime : sécurité du service (art. 6.1.f)</td>
          </tr>
          <tr>
            <td>Prénom des employés, cookie de session</td>
            <td>Réserver l'espace employés au personnel et savoir qui prépare quoi</td>
            <td>Intérêt légitime : organisation du service (art. 6.1.f)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Évitez d'écrire des informations personnelles dans le champ « remarque » : il ne sert qu'à préciser votre
        commande.
      </p>

      <h2>Combien de temps</h2>
      <ul>
        <li>Commandes : le temps nécessaire à notre gestion et à nos obligations comptables.</li>
        <li>Suivi dans votre navigateur : jusqu'à ce que vous effaciez les données de ce site.</li>
        <li>Compteurs liés à l'adresse IP : 15 minutes au plus.</li>
        <li>Session des employés : 12 heures.</li>
      </ul>

      <h2>Cookies et traceurs</h2>
      <p>
        Aucun cookie publicitaire, aucune mesure d'audience, aucun traceur tiers. Le seul cookie est celui de connexion
        de l'espace employés, indispensable à son fonctionnement. Les polices de caractères sont servies par le site
        lui-même, sans appel à Google. C'est pourquoi aucun bandeau de consentement ne vous est demandé.
      </p>

      <h2>Qui y a accès</h2>
      <p>
        Notre équipe, et nos prestataires techniques qui hébergent le site (Vercel) et la base de données (Upstash),
        uniquement pour faire fonctionner le service. Ces prestataires peuvent traiter des données hors de l'Union
        européenne, avec les garanties prévues par le RGPD (clauses contractuelles types de la Commission européenne
        ou cadre de protection des données UE–États-Unis). Nous ne vendons ni ne partageons vos données.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l'accès à vos données, leur rectification ou leur effacement, limiter leur traitement ou
        vous y opposer, et demander leur portabilité, en écrivant à <Email value={legal.email} />. Nous répondons dans
        un délai d'un mois.
      </p>
      <p>
        Vous pouvez aussi introduire une plainte auprès de l'Autorité de protection des données, rue de la Presse 35,
        1000 Bruxelles (autoriteprotectiondonnees.be).
      </p>

      <p className="muted small">Dernière mise à jour : {updated}.</p>
    </SiteLayout>
  );
}
