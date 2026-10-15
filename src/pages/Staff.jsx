import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Login from './staff/Login.jsx';
import Orders from './staff/Orders.jsx';
import MenuAdmin from './staff/MenuAdmin.jsx';
import QrCodes from './staff/QrCodes.jsx';
import { Logo } from '../components/ui.jsx';

const TABS = [
  { path: '/comptoir', label: 'Commandes' },
  { path: '/comptoir/carte', label: 'Carte' },
  { path: '/comptoir/qr', label: 'QR codes' },
];

export default function Staff() {
  const [me, setMe] = useState(undefined);
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/comptoir');

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (me === undefined) return null;
  if (!me) return <Login onLogin={setMe} />;

  const go = (p) => {
    window.history.pushState(null, '', p);
    setPath(p);
  };
  const logout = async () => {
    await api.logout().catch(() => {});
    setMe(null);
  };
  const lost = () => setMe(null);

  return (
    <div className="staff">
      <header className="s-header no-print">
        <div className="s-brand">
          <Logo size="sm" />
          <span className="s-sub">Espace employés</span>
        </div>
        <nav className="tabs s-tabs" aria-label="Espace employés">
          {TABS.map((t) => (
            <button
              key={t.path}
              type="button"
              className={`tab ${path === t.path ? 'on' : ''}`}
              aria-current={path === t.path ? 'page' : undefined}
              onClick={() => go(t.path)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="s-user">
          {me.name && <span className="muted small">{me.name}</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Déconnexion</button>
        </div>
      </header>
      {path === '/comptoir/carte' ? (
        <MenuAdmin onAuthError={lost} />
      ) : path === '/comptoir/qr' ? (
        <QrCodes />
      ) : (
        <Orders onAuthError={lost} />
      )}
    </div>
  );
}
