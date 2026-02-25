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
            <li>{t('navFlights')}</li>
            <li>{t('navHotels')}</li>
            <li>{t('navContact')}</li>
            <li>{t('cartTitle')}</li>
          </ul>
        </div>

        <div className="footer-legal">
          <h4>{t('footerLegalTitle')}</h4>
          <ul>
            <li>{t('footerPrivacy')}</li>
            <li>{t('footerTerms')}</li>
            <li>{t('footerSupport')}</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">{t('footerCopyright', { year })}</div>
    </footer>
  );
};
