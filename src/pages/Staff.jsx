import { useEffect, useState } from 'react';
import { api, AuthError } from '../api.js';
import Login from './staff/Login.jsx';
import Orders from './staff/Orders.jsx';
import MenuAdmin from './staff/MenuAdmin.jsx';
import QrCodes from './staff/QrCodes.jsx';
import { Alert, Logo, Modal } from '../components/ui.jsx';

const TABS = [
  { path: '/comptoir', label: 'Commandes' },
  { path: '/comptoir/carte', label: 'Carte' },
  { path: '/comptoir/qr', label: 'QR codes' },
];

export default function Staff() {
  const [me, setMe] = useState(undefined);
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/comptoir');

  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const check = () => api.me().then(setMe).catch(() => setMe(null));
    check();
    const onPop = () => setPath(window.location.pathname);
    // La session est partagée par tous les onglets du navigateur : un collègue a pu changer de nom dans un autre.
    const onVisible = () => document.visibilityState === 'visible' && check();
    window.addEventListener('popstate', onPop);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('visibilitychange', onVisible);
    };
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
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            title="Changer d'employé"
            aria-label={`${me.name || 'Employé sans nom'} : changer d'employé`}
            onClick={() => setSwitching(true)}
          >
            {me.name || 'Votre prénom ?'} <span aria-hidden="true">⇄</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Déconnexion</button>
        </div>
      </header>
      {path === '/comptoir/carte' ? (
        <MenuAdmin onAuthError={lost} />
      ) : path === '/comptoir/qr' ? (
        <QrCodes />
      ) : (
        <Orders staffName={me.name} onAuthError={lost} />
      )}
      {switching && (
        <SwitchStaff
          current={me.name}
          onDone={(next) => {
            if (next) setMe(next);
            setSwitching(false);
          }}
          onAuthError={() => {
            setSwitching(false);
            lost();
          }}
        />
      )}
    </div>
  );
}

// Sur la tablette du comptoir, chacun indique son prénom avant de prendre des commandes,
// sans retaper le mot de passe : c'est ce nom qui apparaît sur les commandes qu'il démarre.
function SwitchStaff({ current, onDone, onAuthError }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const me = await api.switchStaff(name);
      try {
        localStorage.setItem('staff-name', me.name);
      } catch {}
      onDone(me);
    } catch (err) {
      if (err instanceof AuthError) return onAuthError();
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      as="form"
      title="Changer d'employé"
      onClose={() => onDone(null)}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => onDone(null)}>Annuler</button>
          <button className="btn" disabled={busy || !name.trim()} aria-busy={busy || undefined}>
            {busy ? 'Changement…' : 'Continuer'}
          </button>
        </>
      }
    >
      {current && <p className="muted">Connecté en tant que {current}.</p>}
      <label className="field">
        Votre prénom
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Ex. Rui" required data-autofocus />
      </label>
      {error && <Alert>{error}</Alert>}
    </Modal>
  );
}
