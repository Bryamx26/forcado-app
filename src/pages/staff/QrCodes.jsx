import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useBrand } from '../../brand.js';

export default function QrCodes() {
  const brand = useBrand();
  const [count, setCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem('qr-count'), 10) || 10;
    } catch {
      return 10;
    }
  });
  const [codes, setCodes] = useState([]);
  const base = window.location.origin;

  useEffect(() => {
    try {
      localStorage.setItem('qr-count', String(count));
    } catch {}
    const n = Math.max(1, Math.min(200, count || 1));
    Promise.all(
      Array.from({ length: n }, (_, i) =>
        QRCode.toDataURL(`${base}/table/${i + 1}`, { width: 480, margin: 1, color: { dark: brand.primary } }).then(
          (src) => ({ table: i + 1, src }),
        ),
      ),
    ).then(setCodes);
  }, [count, base, brand.primary]);

  return (
    <section className="panel">
      <div className="qr-toolbar no-print">
        <div>
          <h2>QR codes des tables</h2>
          <p className="muted small">
            Chaque code ouvre la carte avec le numéro de table déjà rempli ({base}/table/…). Imprimez la page et
            posez un code par table.
          </p>
        </div>
        <label className="field field-inline">
          Nombre de tables
          <input type="number" min="1" max="200" value={count} onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)} />
        </label>
        <button className="btn" onClick={() => window.print()}>Imprimer</button>
      </div>
      <div className="qr-grid">
        {codes.map((c) => (
          <div key={c.table} className="qr-card">
            <div className="logo">{brand.name}</div>
            <img src={c.src} alt={`QR code table ${c.table}`} />
            <div className="qr-table">Table {c.table}</div>
            <div className="small">Scannez pour commander</div>
            <a className="small no-print" href={c.src} download={`table-${c.table}.png`}>Télécharger</a>
          </div>
        ))}
      </div>
    </section>
  );
}
