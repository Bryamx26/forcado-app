import Customer from './pages/Customer.jsx';
import Staff from './pages/Staff.jsx';

export default function App() {
  const path = window.location.pathname;
  const table = path.match(/^\/table\/(\d+)/);
  if (table) return <Customer table={parseInt(table[1], 10)} />;
  if (path.startsWith('/comptoir')) return <Staff />;

  return (
    <div className="home">
      <h1 className="logo">Forcado</h1>
      <p className="tagline">Pastelaria portuguesa</p>
      <p>Scannez le QR code posé sur votre table pour commander.</p>
      <div className="home-links">
        <a className="btn" href="/table/1">Essayer comme client (table 1)</a>
        <a className="btn btn-ghost" href="/comptoir">Écran du comptoir</a>
      </div>
    </div>
  );
}
