import { useMemo, useState } from 'react';
import { searchFlights } from '../services/amadeus';
import { useCart } from '../context/CartContext';
import type { FlightOffer } from '../types';
import { useI18n } from '../context/I18nContext';
import { airportLabel, extractIataCode, filterAirportSuggestions } from '../data/searchSuggestions';

type QuickFilter = 'best-price' | 'fastest' | 'morning' | 'evening' | null;

export const FlightsPage = () => {
  const { t, locale } = useI18n();
  const { addFlight } = useCart();
  const [origin, setOrigin] = useState('CDG');
  const [destination, setDestination] = useState('LIS');
  const [travelers, setTravelers] = useState(1);
  const [cabin, setCabin] = useState('Business');
  const [maxPrice, setMaxPrice] = useState(1600);
  const [directOnly, setDirectOnly] = useState(false);
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const getFlightDurationMinutes = (flight: FlightOffer) => {
    const departureMs = new Date(flight.departureAt).getTime();
    const arrivalMs = new Date(flight.arrivalAt).getTime();
    return Math.max(0, Math.round((arrivalMs - departureMs) / 60_000));
  };

  const isMorningFlight = (flight: FlightOffer) => {
    const hour = new Date(flight.departureAt).getHours();
    return hour >= 5 && hour < 12;
  };

  const isEveningFlight = (flight: FlightOffer) => {
    const hour = new Date(flight.departureAt).getHours();
    return hour >= 18;
  };

  const displayedResults = useMemo(() => {
    const items = [...results];

    if (quickFilter === 'morning') {
      return items.filter(isMorningFlight);
    }

    if (quickFilter === 'evening') {
      return items.filter(isEveningFlight);
    }

    if (quickFilter === 'best-price') {
      return items.sort((a, b) => a.price - b.price);
    }

    if (quickFilter === 'fastest') {
      return items.sort((a, b) => getFlightDurationMinutes(a) - getFlightDurationMinutes(b));
    }

    return items;
  }, [results, quickFilter]);

  const originSuggestions = filterAirportSuggestions(origin);
  const destinationSuggestions = filterAirportSuggestions(destination);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchFlights(
        {
          origin: extractIataCode(origin, 'CDG'),
          destination: extractIataCode(destination, 'LIS'),
          departureDate,
          travelers,
        },
        {
          maxPrice,
          directOnly,
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
    <main className="layout section-page-layout flights-layout">
      <section className="section-page-header">
        <p className="hero-kicker">FLIGHTS</p>
        <h1>{t('flightsTitle')}</h1>
        <p>{t('flightsSubtitle')}</p>
      </section>

      <section className="card flight-search-shell">
        <div className="trip-tabs">
          <button className="active">{t('flightsOneWay')}</button>
          <button>{t('flightsRound')}</button>
        </div>

        <div className="flight-search-grid">
          <label>
            {t('flightsFrom')}
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} list="flights-origin-list" />
          </label>
          <label>
            {t('flightsTo')}
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              list="flights-destination-list"
            />
          </label>
          <label>
            {t('flightsDate')}
            <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
          </label>
          <label>
            {t('flightsPassengers')}
            <select value={travelers} onChange={(e) => setTravelers(Number(e.target.value))}>
              <option value={1}>1 adult</option>
              <option value={2}>2 adults</option>
              <option value={3}>3 adults</option>
              <option value={4}>4 adults</option>
            </select>
          </label>
          <label>
            {t('flightsClass')}
            <select value={cabin} onChange={(e) => setCabin(e.target.value)}>
              <option>{t('flightsClassEconomy')}</option>
              <option>{t('flightsClassBusiness')}</option>
              <option>{t('flightsClassFirst')}</option>
            </select>
          </label>
          <button className="primary" onClick={runSearch} disabled={loading}>
            {loading ? t('commonLoading') : t('commonSearch')}
          </button>
        </div>
        <datalist id="flights-origin-list">
          {originSuggestions.map((airport) => (
            <option key={`origin-${airport.code}`} value={airportLabel(airport)} />
          ))}
        </datalist>
        <datalist id="flights-destination-list">
          {destinationSuggestions.map((airport) => (
            <option key={`destination-${airport.code}`} value={airportLabel(airport)} />
          ))}
        </datalist>
        <div className="flight-tag-row">
          <button
            type="button"
            className={`flight-tag-btn ${quickFilter === 'best-price' ? 'active' : ''}`}
            onClick={() => setQuickFilter((value) => (value === 'best-price' ? null : 'best-price'))}
          >
            {t('flightsBestPrice')}
          </button>
          <button
            type="button"
            className={`flight-tag-btn ${quickFilter === 'fastest' ? 'active' : ''}`}
            onClick={() => setQuickFilter((value) => (value === 'fastest' ? null : 'fastest'))}
          >
            {t('flightsFastest')}
          </button>
          <button
            type="button"
            className={`flight-tag-btn ${quickFilter === 'morning' ? 'active' : ''}`}
            onClick={() => setQuickFilter((value) => (value === 'morning' ? null : 'morning'))}
          >
            {t('flightsEarly')}
          </button>
          <button
            type="button"
            className={`flight-tag-btn ${quickFilter === 'evening' ? 'active' : ''}`}
            onClick={() => setQuickFilter((value) => (value === 'evening' ? null : 'evening'))}
          >
            {t('flightsLate')}
          </button>
        </div>
      </section>

      <section className="flight-results-layout">
        <aside className="card flights-filter-panel">
          <h3>{t('flightsFilters')}</h3>
          <label>
            {t('flightsMaxPrice')} ({maxPrice} EUR)
            <input
              type="range"
              min={100}
              max={3000}
              step={50}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(e) => setDirectOnly(e.target.checked)}
            />
            {t('flightsDirectOnly')}
          </label>
          <button onClick={runSearch} disabled={loading}>
            {t('commonApply')}
          </button>
          {error && <p className="error">{error}</p>}
        </aside>

        <div className="flight-ticket-list">
          {displayedResults.map((flight) => (
            <article key={flight.id} className="card flight-ticket">
              <div className="flight-ticket-main">
                <div className="flight-ticket-top">
                  <span>{flight.airline}</span>
                  <span>{flight.direct ? t('flightsDirect') : t('flightsStopover')}</span>
                </div>
                <h3>
                  {formatTime(flight.departureAt)} → {formatTime(flight.arrivalAt)}
                </h3>
                <p>
                  {flight.from} → {flight.to}
                </p>
                <small>
                  {t('flightsCabin')}: {cabin}
                </small>
              </div>
              <div className="flight-ticket-side">
                <strong>
                  {flight.price} {flight.currency}
                </strong>
                <button className="primary" onClick={() => addFlight(flight)}>
                  {t('flightsSelect')}
                </button>
              </div>
            </article>
          ))}
          {!loading && displayedResults.length === 0 && !error && (
            <article className="card empty-card">
              <p>{t('flightsEmpty')}</p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
};
