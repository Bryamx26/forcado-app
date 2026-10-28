import { useState } from 'react';
import { api } from '../../api.js';
import { Alert, Logo } from '../../components/ui.jsx';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api.login(password));
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
        <Logo size="lg" />
        <h1 className="login-title">Espace employés</h1>
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
        {error && <Alert>{error}</Alert>}
        <button className="btn btn-lg btn-block" disabled={busy || !password} aria-busy={busy || undefined}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <a className="small back-link" href="/">← Retour au site</a>
      </form>
    </div>
  );
}
