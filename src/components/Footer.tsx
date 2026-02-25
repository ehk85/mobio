import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

export const Footer = () => {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-company">
          <h3>{t('footerCompany')}</h3>
          <p>{t('footerTagline')}</p>
          <p>{t('footerAddress')}</p>
          <p>{t('footerPhone')}</p>
          <p>{t('footerEmail')}</p>
        </div>

        <div className="footer-links">
          <h4>{t('footerLinksTitle')}</h4>
          <ul>
            <li>
              <Link to="/flights">{t('navFlights')}</Link>
            </li>
            <li>
              <Link to="/hotels">{t('navHotels')}</Link>
            </li>
            <li>
              <Link to="/contact">{t('navContact')}</Link>
            </li>
            <li>
              <Link to="/cart">{t('cartTitle')}</Link>
            </li>
          </ul>
        </div>

        <div className="footer-legal">
          <h4>{t('footerLegalTitle')}</h4>
          <ul>
            <li>
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                {t('footerPrivacy')}
              </a>
            </li>
            <li>
              <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">
                {t('footerTerms')}
              </a>
            </li>
            <li>{t('footerSupport')}</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">{t('footerCopyright', { year })}</div>
    </footer>
  );
};
