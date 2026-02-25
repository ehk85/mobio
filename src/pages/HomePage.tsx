import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMostBookedDestinations, searchFlights } from '../services/amadeus';
import { useI18n } from '../context/I18nContext';
import { airportLabel, extractIataCode, filterAirportSuggestions } from '../data/searchSuggestions';

type TopDestinationDeal = {
  destination: string;
  rank: number;
  travelersScore: number;
  cheapestPrice: number | null;
  currency: string;
  airline: string;
  image: string;
  label: string;
};

const DESTINATION_META: Record<string, { label: string; image: string }> = {
  LIS: {
    label: 'Lisbon, Portugal',
    image: 'https://images.unsplash.com/photo-1471623817296-aa07ae5c9f47?auto=format&fit=crop&w=900&q=80',
  },
  BCN: {
    label: 'Barcelona, Spain',
    image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=80',
  },
  ROM: {
    label: 'Rome, Italy',
    image: 'https://images.unsplash.com/photo-1526481280695-3c4691f75e82?auto=format&fit=crop&w=900&q=80',
  },
  MAD: {
    label: 'Madrid, Spain',
    image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=900&q=80',
  },
  LON: {
    label: 'London, United Kingdom',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80',
  },
};

export const HomePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<'one-way' | 'round-trip' | 'multi-city'>('one-way');
  const [origin, setOrigin] = useState('Tokyo, Japan');
  const [destination, setDestination] = useState('Berlin, Germany');
  const [departureDate, setDepartureDate] = useState('2026-10-11');
  const [returnDate, setReturnDate] = useState('2026-12-15');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topDeals, setTopDeals] = useState<TopDestinationDeal[]>([]);
  const [topDealsLoading, setTopDealsLoading] = useState(true);
  const [topDealsError, setTopDealsError] = useState<string | null>(null);

  const originSuggestions = filterAirportSuggestions(origin);
  const destinationSuggestions = filterAirportSuggestions(destination);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      origin: extractIataCode(origin, 'CDG'),
      destination: extractIataCode(destination, 'LIS'),
      departureDate,
      travelers: '1',
      travelClass: 'ECONOMY',
    });
    navigate(`/flights?${params.toString()}`);
  };

  useEffect(() => {
    let cancelled = false;

    const loadTopDeals = async () => {
      setTopDealsLoading(true);
      setTopDealsError(null);

      try {
        const period = new Date().toISOString().slice(0, 7);
        const popular = await fetchMostBookedDestinations('PAR', period, 3);

        const departureSeed = new Date();
        departureSeed.setDate(departureSeed.getDate() + 28);
        const departureDate = departureSeed.toISOString().split('T')[0];

        const resolved = await Promise.all(
          popular.map(async (destination) => {
            let cheapestPrice: number | null = null;
            let currency = 'EUR';
            let airline = '-';

            try {
              const offers = await searchFlights(
                {
                  origin: 'CDG',
                  destination: destination.destination,
                  departureDate,
                  travelers: 1,
                },
                { directOnly: false }
              );

              if (offers.length > 0) {
                const cheapest = offers.reduce((best, current) => (current.price < best.price ? current : best), offers[0]);
                cheapestPrice = cheapest.price;
                currency = cheapest.currency;
                airline = cheapest.airline;
              }
            } catch {
            }

            const meta = DESTINATION_META[destination.destination] ?? {
              label: destination.destination,
              image:
                'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80',
            };

            return {
              destination: destination.destination,
              rank: destination.rank,
              travelersScore: destination.travelersScore,
              cheapestPrice,
              currency,
              airline,
              image: meta.image,
              label: meta.label,
            } satisfies TopDestinationDeal;
          })
        );

        if (cancelled) return;

        setTopDeals(resolved);

        if (resolved.length === 0) {
          setTopDealsError(t('flightsError'));
        }
      } catch {
        if (cancelled) return;
        setTopDeals([]);
        setTopDealsError(t('flightsError'));
      } finally {
        if (!cancelled) {
          setTopDealsLoading(false);
        }
      }
    };

    void loadTopDeals();
    return () => {
      cancelled = true;
    };
  }, [t]);

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
              {loading ? t('commonLoading') : t('commonSearch')}
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

      <section className="section-block">
        <h2>{t('homeTopDealsTitle')}</h2>
        <p>{t('homeTopDealsDesc')}</p>
        {topDealsLoading && <p>{t('commonLoading')}</p>}
        {topDealsError && !topDealsLoading && <p className="error">{topDealsError}</p>}
        {!topDealsLoading && !topDealsError && (
          <div className="top-destination-row">
            {topDeals.map((deal) => (
              <article key={`${deal.destination}-${deal.rank}`} className="card top-destination-card">
                <img src={deal.image} alt={deal.label} />
                <div>
                  <strong>{deal.label}</strong>
                  <p>#{deal.rank}</p>
                  <p>{t('homePopularityScore', { score: deal.travelersScore })}</p>
                  <p>{deal.cheapestPrice === null ? t('homePricePending') : `${deal.cheapestPrice} ${deal.currency}`}</p>
                  <small>{deal.airline}</small>
                </div>
              </article>
            ))}
          </div>
        )}
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
          <article className="hotel-card">
            <img
              src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=80"
              alt="Hotel Tropical Daisy"
            />
            <strong>HOTEL TROPICAL DAISY</strong>
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
