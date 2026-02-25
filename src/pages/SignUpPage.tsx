import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../services/auth';
import { useI18n } from '../context/I18nContext';

export const SignUpPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await signUp(email, password, displayName || email.split('@')[0]);
      navigate('/');
    } catch {
      setMessage(t('authError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout section-page-layout auth-reference-layout">
      <div className="auth-palette" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <section className="auth-reference-grid">
        <article className="card auth-reference-card muted">
          <h2>{t('authLoginTitle')}</h2>
          <p>{t('authLoginText')}</p>
          <Link to="/signin" className="signin-btn auth-switch-link">
            {t('authGoSignIn')}
          </Link>
        </article>

        <article className="card auth-reference-card active">
          <h1>{t('authCreateTitle')}</h1>
          <p>{t('authCreateText')}</p>
          <form onSubmit={submit} className="grid auth-form-grid">
            <label>
              {t('authFullName')}
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </label>
            <label>
              {t('commonEmail')}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              {t('commonPassword')}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? t('authCreating') : t('authSignUpBtn')}
            </button>
          </form>
          {message && <p className="status-msg">{message}</p>}
          <p>
            {t('authHaveAccount')} <Link to="/signin">{t('authLoginBtn')}</Link>
          </p>
        </article>
      </section>
    </main>
  );
};
