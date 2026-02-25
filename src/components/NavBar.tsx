import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { signOut } from '../services/auth';

interface NavBarProps {
  userName?: string;
}

export const NavBar = ({ userName }: NavBarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { count } = useCart();
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();
  const isConnected = Boolean(userName);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
    };
  }, []);

  const closeMenu = () => {
    setMobileOpen(false);
    setAccountMenuOpen(false);
  };

  const handleSignOut = () => {
    setAccountMenuOpen(false);
    signOut();
    closeMenu();
    navigate('/');
  };

  const openPurchaseHistory = () => {
    setAccountMenuOpen(false);
    navigate('/purchase-history');
  };

  return (
    <header className={`topbar ${mobileOpen ? 'mobile-open' : ''}`}>
      <Link to="/" className="brand">
        {t('brand')}
      </Link>
      <button
        className="burger-btn"
        onClick={() => setMobileOpen((value) => !value)}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={`menu menu-main ${mobileOpen ? 'open' : ''}`}>
        <NavLink to="/flights" onClick={closeMenu}>
          {t('navFlights')}
        </NavLink>
        <NavLink to="/hotels" onClick={closeMenu}>
          {t('navHotels')}
        </NavLink>
        <NavLink to="/contact" onClick={closeMenu}>
          {t('navContact')}
        </NavLink>
      </nav>
      <div className={`menu menu-actions ${mobileOpen ? 'open' : ''}`}>
        <label className="language-picker">
          <span className="sr-only">{t('languageLabel')}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="de">Deutsch</option>
            <option value="zh">中文</option>
          </select>
        </label>
        <NavLink
          to="/cart"
          className="ghost-link cart-icon-link"
          onClick={closeMenu}
          aria-label={t('navCartAria', { count })}
        >
          <span className="cart-icon" aria-hidden="true">
            🛒
          </span>
          <span className="cart-badge" aria-hidden="true">
            {count}
          </span>
          <span className="sr-only">Panier</span>
        </NavLink>
        {isConnected ? (
          <>
            <div className="account-menu" ref={accountMenuRef}>
              <button
                type="button"
                className="account-circle-btn"
                aria-label={t('navProfileAria')}
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((value) => !value)}
              >
                <span aria-hidden="true">👤</span>
              </button>

              {accountMenuOpen && (
                <div className="account-bubble" role="menu" aria-label={t('navProfileAria')}>
                  <div className="account-actions-list">
                    <button type="button" className="account-item" role="menuitem">
                      <span aria-hidden="true">📊</span>
                      {t('navActivityTracking')}
                    </button>
                    <button type="button" className="account-item" role="menuitem" onClick={openPurchaseHistory}>
                      <span aria-hidden="true">🧾</span>
                      {t('navPurchaseHistory')}
                    </button>
                    <button type="button" className="account-item" role="menuitem" onClick={handleSignOut}>
                      <span aria-hidden="true">🚪</span>
                      {t('navLogout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <NavLink to="/signup" className="ghost-link" onClick={closeMenu}>
              {t('navSignUp')}
            </NavLink>
            <NavLink to="/signin" className="signin-btn" onClick={closeMenu}>
              {t('navSignIn')}
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
};
