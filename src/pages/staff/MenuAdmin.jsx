import { useEffect, useState } from 'react';
import { api, AuthError, euro } from '../../api.js';

export default function MenuAdmin({ onAuthError }) {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.menu().then(setMenu).catch(() => setError('Impossible de charger la carte.'));
  }, []);

  const toggle = async (item) => {
    const available = item.soldOut;
    setMenu((m) => m.map((c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, soldOut: !available } : i)) })));
    try {
      await api.setAvailable(item.id, available);
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      setError(e.message);
      api.menu().then(setMenu);
    }
  };

  return (
    <section className="panel">
      <h2>Disponibilité des produits</h2>
      <p className="muted small">
        Un produit marqué épuisé reste visible pour les clients mais ne peut plus être commandé. Pensez à le
        remettre disponible le lendemain.
      </p>
      {error && <div className="error">{error}</div>}
      {menu?.map((cat) => (
        <div key={cat.id} className="admin-cat">
          <h3>{cat.name}</h3>
          {cat.items.map((item) => (
            <div key={item.id} className={`admin-row ${item.soldOut ? 'admin-out' : ''}`}>
              <span className="admin-emoji">{item.emoji}</span>
              <span className="admin-name">
                {item.name}
                <span className="muted small"> · {euro(item.price)}</span>
              </span>
              <label className="switch">
                <input type="checkbox" checked={!item.soldOut} onChange={() => toggle(item)} />
                <span className="switch-track" />
                <span className="switch-label">{item.soldOut ? 'Épuisé' : 'Disponible'}</span>
              </label>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
