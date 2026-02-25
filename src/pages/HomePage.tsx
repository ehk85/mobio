import { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchFlights } from '../services/amadeus';
import type { FlightOffer } from '../types';
import { useI18n } from '../context/I18nContext';
import { airportLabel, extractIataCode, filterAirportSuggestions } from '../data/searchSuggestions';

export const HomePage = () => {
  const { t } = useI18n();
  const [tripType, setTripType] = useState<'one-way' | 'round-trip' | 'multi-city'>('one-way');
  const [origin, setOrigin] = useState('Tokyo, Japan');
  const [destination, setDestination] = useState('Berlin, Germany');
  const [departureDate, setDepartureDate] = useState('2026-10-11');
  const [returnDate, setReturnDate] = useState('2026-12-15');
  const [results, setResults] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originSuggestions = filterAirportSuggestions(origin);
  const destinationSuggestions = filterAirportSuggestions(destination);

  const runSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchFlights(
        {
          origin: extractIataCode(origin, 'CDG'),
          destination: extractIataCode(destination, 'LIS'),
          departureDate,
          travelers: 1,
        },
        {
          directOnly: false,
        }
      );
      setResults(data);
    } catch {
      setError(t('flightsError'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout landing-layout">
      <section className="hero hero-design">
        <p className="hero-kicker">{t('homeKicker')}</p>
        <h1 className="hero-title">{t('homeTitle')}</h1>
        <img
          className="hero-plane"
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80"
          alt="Airplane"
        />

        <div className="search-box">
          <div className="trip-tabs">
            <button className={tripType === 'one-way' ? 'active' : ''} onClick={() => setTripType('one-way')}>
              {t('homeTripOneWay')}
            </button>
            <button
              className={tripType === 'round-trip' ? 'active' : ''}
              onClick={() => setTripType('round-trip')}
            >
              {t('homeTripRound')}
            </button>
            <button
              className={tripType === 'multi-city' ? 'active' : ''}
              onClick={() => setTripType('multi-city')}
            >
              {t('homeTripMulti')}
            </button>
          </div>

          <div className="search-grid">
            <label>
              {t('homeFrom')}
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} list="home-origin-list" />
            </label>
            <label>
              {t('homeTo')}
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                list="home-destination-list"
              />
            </label>
            <label>
              {t('homeDeparture')}
              <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
            </label>
            <label>
              {t('homeReturn')}
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                disabled={tripType === 'one-way'}
              />
            </label>
            <button className="search-btn" onClick={runSearch} disabled={loading}>
              {loading ? '...' : '⌕'}
            </button>
          </div>
          <datalist id="home-origin-list">
            {originSuggestions.map((airport) => (
              <option key={`home-origin-${airport.code}`} value={airportLabel(airport)} />
            ))}
          </datalist>
          <datalist id="home-destination-list">
            {destinationSuggestions.map((airport) => (
              <option key={`home-destination-${airport.code}`} value={airportLabel(airport)} />
            ))}
          </datalist>
          {error && <p className="error">{error}</p>}
        </div>
      </section>

      {results.length > 0 && (
        <section className="section-block">
          <h2>{t('homeFlightResults')}</h2>
          <div className="result-row">
            {results.slice(0, 4).map((item) => (
              <article className="small-card" key={item.id}>
                <p className="small-card-title">{item.airline}</p>
                <p>
                  {item.from} → {item.to}
                </p>
                <p>
                  {item.price} {item.currency}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="section-block">
        <h2>{t('homeTopDealsTitle')}</h2>
        <p>{t('homeTopDealsDesc')}</p>
        <div className="deals-grid">
          <article className="deal-lg">
            <img
              src="https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=900&q=80"
              alt="Luxury cabin"
            />
            <div>
              <span>DTOUR2023</span>
              <h3>LUXURY TRAVEL AND AIRLINES</h3>
              <p>Luxury travel and airlines offer opulence, comfort and exclusivity.</p>
              <button className="pill">Learn More</button>
            </div>
          </article>
          <article className="deal-sm">
            <img
              src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=80"
              alt="Hotel booking"
            />
            <strong>HOTEL BOOKINGS</strong>
          </article>
          <article className="deal-sm">
            <img
              src="https://images.unsplash.com/photo-1576675784201-0e142b423952?auto=format&fit=crop&w=900&q=80"
              alt="Domestic booking"
            />
            <strong>BOOK DOMESTIC</strong>
          </article>
        </div>
      </section>

      <section className="section-block" id="trains">
        <h2>{t('homePopularAirlines')}</h2>
        <p>{t('homePopularAirlinesDesc')}</p>
        <div className="airline-row">
          <article className="airline-card">
            <img
              src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80"
              alt="Turkish Airlines"
            />
            <strong>TURKISH AIRLINES</strong>
          </article>
          <article className="airline-card">
            <img
              src="https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=900&q=80"
              alt="Emirates"
            />
            <strong>EMIRATES</strong>
          </article>
          <article className="airline-card">
            <img
              src="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=900&q=80"
              alt="Qatar Airways"
            />
            <strong>QATAR AIRWAYS</strong>
          </article>
        </div>
      </section>

      <section className="section-block" id="hotels">
        <h2>{t('homeBookHotel')}</h2>
        <p>{t('homeBookHotelDesc')}</p>
        <div className="hotel-row">
          <article className="hotel-card">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80"
              alt="Moxy NYC"
            />
            <strong>MOXY NYC DOWNTOWN</strong>
          </article>
          <article className="hotel-card featured">
            <img
              src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=80"
              alt="Hotel Tropical Daisy"
            />
            <strong>HOTEL TROPICAL DAISY</strong>
            <div className="hotel-meta">
              <span>122 km from city center</span>
              <button>Book Now</button>
            </div>
          </article>
          <article className="hotel-card" id="buses">
            <img
              src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=900&q=80"
              alt="Ocean villa"
            />
            <strong>HOTEL TROPICAL DAISY</strong>
          </article>
        </div>
      </section>

      <section className="section-block" id="cabs">
        <h2>{t('homePlanTrip')}</h2>
        <p>{t('homePlanTripDesc')}</p>
        <div className="hero-actions">
          <Link className="cta-link" to="/flights">
            {t('homeViewFlights')}
          </Link>
          <Link className="cta-link alt" to="/hotels">
            {t('homeViewHotels')}
          </Link>
          <Link className="cta-link alt" to="/cart">
            {t('homeOpenCart')}
          </Link>
        </div>
      </section>
    </main>
  );
};
