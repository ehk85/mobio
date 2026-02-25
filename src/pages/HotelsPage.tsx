import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchHotelSuggestions, searchHotels } from '../services/hotelsApi';
import { useCart } from '../context/CartContext';
import type { HotelOffer, HotelSuggestion } from '../types';
import { useI18n } from '../context/I18nContext';

export const HotelsPage = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { addHotel } = useCart();
  const [city, setCity] = useState('Lisbon');
  const [guests, setGuests] = useState(2);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86_400_000).toISOString().split('T')[0]);
  const [results, setResults] = useState<HotelOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const queryCity = searchParams.get('city');
    const queryGuests = Number(searchParams.get('guests') ?? '2');
    const queryCheckIn = searchParams.get('checkInDate');
    const queryCheckOut = searchParams.get('checkOutDate');

    if (!queryCity || !queryCheckIn || !queryCheckOut) {
      return;
    }

    const normalizedGuests = Number.isFinite(queryGuests) && queryGuests > 0 ? queryGuests : 2;
    setCity(queryCity);
    setGuests(normalizedGuests);
    setCheckInDate(queryCheckIn);
    setCheckOutDate(queryCheckOut);

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchHotels(
          {
            city: queryCity,
            checkInDate: queryCheckIn,
            checkOutDate: queryCheckOut,
            guests: normalizedGuests,
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
    })();
  }, [searchParams, t]);

  useEffect(() => {
    const keyword = city.trim();
    if (keyword.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const data = await fetchHotelSuggestions(keyword);
        setSuggestions(data);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
  }, [city]);

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
            <div className="hotel-city-field">
              <input
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 120);
                }}
                placeholder="Lisbon"
                autoComplete="off"
              />
              {showSuggestions && (suggestionsLoading || suggestions.length > 0) && (
                <div className="hotel-suggestions-panel">
                  {suggestionsLoading && <p className="hotel-suggestions-loading">{t('commonLoading')}</p>}
                  {!suggestionsLoading &&
                    suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="hotel-suggestion-item"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setCity(suggestion.city);
                          setShowSuggestions(false);
                        }}
                      >
                        <span className={`hotel-suggestion-kind ${suggestion.type}`}>
                          {suggestion.type === 'hotel' ? 'Hotel' : 'City'}
                        </span>
                        <span className="hotel-suggestion-content">
                          <strong>{suggestion.label}</strong>
                          <small>
                            {suggestion.city} · {suggestion.cityCode}
                          </small>
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
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
