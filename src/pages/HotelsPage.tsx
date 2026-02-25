import { useState } from 'react';
import { searchHotels } from '../services/hotelsApi';
import { useCart } from '../context/CartContext';
import type { HotelOffer } from '../types';
import { useI18n } from '../context/I18nContext';
import { filterCitySuggestions } from '../data/searchSuggestions';

export const HotelsPage = () => {
  const { t } = useI18n();
  const { addHotel } = useCart();
  const [city, setCity] = useState('Lisbon');
  const [guests, setGuests] = useState(2);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86_400_000).toISOString().split('T')[0]);
  const [results, setResults] = useState<HotelOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityMatches = filterCitySuggestions(city);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchHotels(
        {
          city,
          checkInDate,
          checkOutDate,
          guests,
        },
        {}
      );
      setResults(data);
    } catch {
      setError(t('hotelsError'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout section-page-layout hotels-layout">
      <section className="section-page-header">
        <p className="hero-kicker">HOTELS</p>
        <h1>{t('hotelsTitle')}</h1>
        <p>{t('hotelsSubtitle')}</p>
      </section>

      <section className="card reservation-search-bar">
        <div className="reservation-grid">
          <label>
            {t('hotelsCity')}
            <input value={city} onChange={(e) => setCity(e.target.value)} list="hotels-city-list" />
          </label>
          <label>
            {t('hotelsCheckIn')}
            <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
          </label>
          <label>
            {t('hotelsCheckOut')}
            <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
          </label>
          <label>
            {t('hotelsGuests')}
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
              <option value={1}>01</option>
              <option value={2}>02</option>
              <option value={3}>03</option>
              <option value={4}>04</option>
            </select>
          </label>
          <button className="primary" onClick={runSearch} disabled={loading}>
            {loading ? t('commonLoading') : t('hotelsCheckAvailability')}
          </button>
        </div>
        <datalist id="hotels-city-list">
          {cityMatches.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="reservation-list">
        <h2>{t('hotelsRoomsAvailable')}</h2>
        {results.map((hotel) => (
          <article key={hotel.id} className="card hotel-room-card">
            <img src={`https://picsum.photos/seed/hotel-${hotel.id}/280/180`} alt={hotel.name} />
            <div className="hotel-room-main">
              <h3>{hotel.name}</h3>
              <p>
                {hotel.city} • {hotel.stars}★ • {t('hotelsRating')} {hotel.rating.toFixed(1)}
              </p>
              <small>
                {t('hotelsGuestsLabel', { count: guests })} • {hotel.nights} {t('hotelsNights')} • {t('hotelsBreakfast')}
              </small>
            </div>
            <div className="hotel-room-side">
              <strong>
                {hotel.pricePerNight} {hotel.currency}
              </strong>
              <span>{t('hotelsNight')}</span>
              <small>
                {t('hotelsTotalStay')}: {hotel.totalPrice} {hotel.currency}
              </small>
              <button className="primary" onClick={() => addHotel(hotel)}>
                {t('hotelsSelect')}
              </button>
            </div>
          </article>
        ))}
        {!loading && results.length === 0 && !error && (
          <article className="card empty-card">
            <p>{t('hotelsEmpty')}</p>
          </article>
        )}
      </section>
    </main>
  );
};
