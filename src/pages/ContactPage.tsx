import { useI18n } from '../context/I18nContext';

export const ContactPage = () => {
  const { t } = useI18n();

  return (
    <main className="layout section-page-layout contact-page-layout">
      <section className="contact-booking-shell">
        <div className="contact-booking-left">
          <p className="hero-kicker">{t('contactPlanTrip')}</p>
          <h1>{t('contactTitle')}</h1>
          <p>{t('contactLeadText')}</p>

          <div className="contact-booking-infos">
            <p>
              ✉️ <strong>{t('commonEmail')}</strong>
            </p>
            <span>booking@mobio-travel.com</span>

            <p>
              📞 <strong>{t('contactPhone')}</strong>
            </p>
            <span>+33 1 40 00 00 00</span>
          </div>
        </div>

        <article className="card contact-booking-form-card">
          <form className="contact-booking-form">
            <label>
              {t('contactName')}
              <input placeholder={t('contactNamePlaceholder')} />
            </label>

            <label>
              {t('commonEmail')}
              <input type="email" placeholder={t('contactEmailPlaceholder')} />
            </label>

            <label>
              {t('contactTour')}
              <select defaultValue="">
                <option value="" disabled>
                  {t('contactTourPlaceholder')}
                </option>
                <option>{t('homeViewFlights')}</option>
                <option>{t('homeViewHotels')}</option>
                <option>Flight + Hotel</option>
                <option>Group Booking</option>
              </select>
            </label>

            <label>
              {t('contactMessage')}
              <textarea rows={4} placeholder={t('contactMessagePlaceholder')} />
            </label>

            <button className="primary contact-submit" type="button">
              {t('contactReserveSpot')}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
};
