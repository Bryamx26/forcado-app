import { useState } from 'react';
import { api } from '../../api.js';
import { useBrand } from '../../brand.js';

export default function Login({ onLogin }) {
  const brand = useBrand();
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('staff-name') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const me = await api.login(name, password);
      try {
        localStorage.setItem('staff-name', name);
      } catch {}
      onLogin(me);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="logo logo-xl">{brand.name}</div>
        <div className="tagline">Espace employés</div>
        <label className="field">
          Votre prénom
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="username" placeholder="Ex. Ana" />
        </label>
        <label className="field">
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-block" disabled={busy || !password}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <a className="muted small back-link" href="/">← Retour au site</a>
      </form>
    </div>
  );
}
