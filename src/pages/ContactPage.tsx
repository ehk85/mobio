import { useI18n } from '../context/I18nContext';

export const ContactPage = () => {
  const { t } = useI18n();

  return (
    <main className="layout section-page-layout contact-page-layout">
      <section className="contact-header-band">
        <p className="hero-kicker">{t('contactPlanTrip')}</p>
        <div className="contact-title-row">
          <h1>{t('contactTitle')}</h1>
          <p>{t('contactLeadText')}</p>
        </div>
      </section>

      <section className="contact-main-grid">
        <article className="card contact-form-card">
          <form className="contact-form-grid">
            <label>
              {t('contactName')}
              <input placeholder={t('contactNamePlaceholder')} />
            </label>
            <label>
              {t('commonEmail')}
              <input type="email" placeholder={t('contactEmailPlaceholder')} />
            </label>
            <label>
              {t('contactPhone')}
              <input placeholder={t('contactPhonePlaceholder')} />
            </label>
            <label>
              {t('contactTour')}
              <select defaultValue="">
                <option value="" disabled>
                  {t('contactTourPlaceholder')}
                </option>
                <option>Desert Tour</option>
                <option>City Tour</option>
                <option>Mountain Tour</option>
              </select>
            </label>
            <label>
              {t('contactPreferredDate')}
              <input type="date" />
            </label>
            <label>
              {t('contactTravelers')}
              <select defaultValue="">
                <option value="" disabled>
                  {t('contactTravelersPlaceholder')}
                </option>
                <option>1 adult</option>
                <option>2 adults</option>
                <option>2 adults, 1 child</option>
                <option>4 adults</option>
              </select>
            </label>
            <label className="contact-message-field">
              {t('contactSpecialRequests')}
              <textarea rows={4} placeholder={t('contactSpecialPlaceholder')} />
            </label>
            <button className="primary contact-submit" type="button">
              {t('contactReserveSpot')}
            </button>
          </form>
        </article>

        <article className="card contact-side-image">
          <img
            src="https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=900&q=80"
            alt="Travel destination"
          />
        </article>
      </section>

      <section className="contact-info-row">
        <article className="contact-info-item">
          <span>📞</span>
          <h3>{t('contactCallWhatsapp')}</h3>
          <p>+966 55 123 4567</p>
          <p>+966 53 987 6543</p>
        </article>
        <article className="contact-info-item">
          <span>🕒</span>
          <h3>{t('contactWorkingHours')}</h3>
          <p>{t('contactDailyHours')}</p>
          <p>{t('contactFridayClosed')}</p>
        </article>
        <article className="contact-info-item">
          <span>✉️</span>
          <h3>{t('contactWriteUs')}</h3>
          <p>info@mobio-travel.com</p>
          <p>booking@mobio-travel.com</p>
        </article>
      </section>

      <section className="card contact-discover-card">
        <div className="contact-discover-copy">
          <p className="hero-kicker">{t('contactStartNow')}</p>
          <h2>{t('contactDiscoverTitle')}</h2>
          <p>{t('contactDiscoverSubtitle')}</p>
        </div>
        <div className="contact-discover-images">
          <img
            src="https://images.unsplash.com/photo-1464822759844-d150baec0494?auto=format&fit=crop&w=800&q=80"
            alt="Desert mountain"
          />
          <img
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"
            alt="Desert landscape"
          />
        </div>
      </section>
    </main>
  );
};
