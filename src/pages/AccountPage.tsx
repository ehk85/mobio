import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getCurrentUser, signIn, signOut, signUp } from '../services/auth';
import type { UserAccount } from '../types';

export const AccountPage = () => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const updatedUser =
        mode === 'signin'
          ? await signIn(email, password)
          : await signUp(email, password, displayName || email.split('@')[0]);
      setUser(updatedUser);
      setMessage('Connexion réussie.');
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const logout = () => {
    signOut();
    setUser(null);
    setMessage('Déconnecté.');
  };

  return (
    <main className="layout account-layout">
      <section className="account-panel">
        <div className="account-header">
          <p className="hero-kicker">MEMBER SPACE</p>
          <h1>Votre compte voyageur</h1>
          <p>Connectez-vous pour réserver, payer et suivre vos itinéraires en temps réel.</p>
        </div>

        <div className="account-grid">
          <aside className="account-side">
            <h2>Pourquoi créer un compte ?</h2>
            <ul>
              <li>Historique de vos réservations vols et hôtels</li>
              <li>Paiement plus rapide à la prochaine commande</li>
              <li>Accès centralisé sur mobile et desktop</li>
            </ul>
          </aside>

          <section className="card account-card">
            {user ? (
              <div className="account-connected">
                <h3>Bonjour {user.displayName}</h3>
                <p>{user.email}</p>
                <button className="primary" onClick={logout}>
                  Se déconnecter
                </button>
              </div>
            ) : (
              <>
                <div className="switch-row">
                  <button
                    className={mode === 'signin' ? 'active' : ''}
                    onClick={() => setMode('signin')}
                    type="button"
                  >
                    Connexion
                  </button>
                  <button
                    className={mode === 'signup' ? 'active' : ''}
                    onClick={() => setMode('signup')}
                    type="button"
                  >
                    Inscription
                  </button>
                </div>
                <form onSubmit={submit} className="grid">
                  {mode === 'signup' && (
                    <label>
                      Nom affiché
                      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </label>
                  )}
                  <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </label>
                  <label>
                    Mot de passe
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </label>
                  <button className="primary" type="submit">
                    {mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
                  </button>
                </form>
              </>
            )}
            {message && <p className="status-msg">{message}</p>}
          </section>
        </div>
      </section>
    </main>
  );
};
