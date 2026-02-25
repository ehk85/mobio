import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from '../services/auth';
import { useI18n } from '../context/I18nContext';

export const SignInPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await signIn(email, password);
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
        <article className="card auth-reference-card active">
          <h1>{t('authLoginTitle')}</h1>
          <p>{t('authLoginText')}</p>
          <form onSubmit={submit} className="grid auth-form-grid">
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
              {loading ? t('authConnecting') : t('authLoginBtn')}
            </button>
          </form>
          {message && <p className="status-msg">{message}</p>}
          <p>
            {t('authNoAccount')} <Link to="/signup">{t('navSignUp')}</Link>
          </p>
        </article>

        <article className="card auth-reference-card muted">
          <h2>{t('authCreateTitle')}</h2>
          <p>{t('authCreateText')}</p>
          <Link to="/signup" className="signin-btn auth-switch-link">
            {t('authGoSignUp')}
          </Link>
        </article>
      </section>
    </main>
  );
};
