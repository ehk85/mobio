import { useMemo, useState } from 'react';
import { searchFlights } from '../services/amadeus';
import { searchHotels } from '../services/hotelsApi';
import type { FlightOffer, FlightSearchParams, HotelOffer, HotelSearchParams, SearchType } from '../types';

type ResultItem =
  | { kind: 'flight'; value: FlightOffer }
  | { kind: 'hotel'; value: HotelOffer };

export const SearchPanel = () => {
  const [searchType, setSearchType] = useState<SearchType>('flight');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);

  const [flightForm, setFlightForm] = useState<FlightSearchParams>({
    origin: 'CDG',
    destination: 'LIS',
    departureDate: new Date().toISOString().split('T')[0],
    travelers: 1,
  });

  const [hotelForm, setHotelForm] = useState<HotelSearchParams>({
    city: 'Lisbon',
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86_400_000).toISOString().split('T')[0],
    guests: 2,
  });

  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [directOnly, setDirectOnly] = useState(false);
  const [stars, setStars] = useState<number | undefined>();

  const filters = useMemo(
    () => ({
      maxPrice,
      directOnly,
      stars,
    }),
    [maxPrice, directOnly, stars]
  );

  const runSearch = async () => {
    setError(null);
    setLoading(true);
    try {
      if (searchType === 'flight') {
        const data = await searchFlights(flightForm, filters);
        setResults(data.map((value) => ({ kind: 'flight', value })));
      } else {
        const data = await searchHotels(hotelForm, filters);
        setResults(data.map((value) => ({ kind: 'hotel', value })));
      }
    } catch (e) {
      setError((e as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="switch-row">
        <button
          className={searchType === 'flight' ? 'active' : ''}
          onClick={() => setSearchType('flight')}
        >
          Vols
        </button>
        <button
          className={searchType === 'hotel' ? 'active' : ''}
          onClick={() => setSearchType('hotel')}
        >
          Hôtels
        </button>
      </div>

      {searchType === 'flight' ? (
        <div className="grid">
          <label>
            Origine (IATA)
            <input
              value={flightForm.origin}
              onChange={(e) => setFlightForm({ ...flightForm, origin: e.target.value.toUpperCase() })}
            />
          </label>
          <label>
            Destination (IATA)
            <input
              value={flightForm.destination}
              onChange={(e) =>
                setFlightForm({ ...flightForm, destination: e.target.value.toUpperCase() })
              }
            />
          </label>
          <label>
            Date de départ
            <input
              type="date"
              value={flightForm.departureDate}
              onChange={(e) => setFlightForm({ ...flightForm, departureDate: e.target.value })}
            />
          </label>
          <label>
            Voyageurs
            <input
              type="number"
              min={1}
              value={flightForm.travelers}
              onChange={(e) => setFlightForm({ ...flightForm, travelers: Number(e.target.value) })}
            />
          </label>
        </div>
      ) : (
        <div className="grid">
          <label>
            Ville
            <input
              value={hotelForm.city}
              onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}
            />
          </label>
          <label>
            Check-in
            <input
              type="date"
              value={hotelForm.checkInDate}
              onChange={(e) => setHotelForm({ ...hotelForm, checkInDate: e.target.value })}
            />
          </label>
          <label>
            Check-out
            <input
              type="date"
              value={hotelForm.checkOutDate}
              onChange={(e) => setHotelForm({ ...hotelForm, checkOutDate: e.target.value })}
            />
          </label>
          <label>
            Voyageurs
            <input
              type="number"
              min={1}
              value={hotelForm.guests}
              onChange={(e) => setHotelForm({ ...hotelForm, guests: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      <div className="grid">
        <label>
          Prix max
          <input
            type="number"
            min={0}
            value={maxPrice ?? ''}
            onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
          />
        </label>
        {searchType === 'flight' ? (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(e) => setDirectOnly(e.target.checked)}
            />
            Direct uniquement
          </label>
        ) : (
          <label>
            Étoiles min
            <input
              type="number"
              min={1}
              max={5}
              value={stars ?? ''}
              onChange={(e) => setStars(e.target.value ? Number(e.target.value) : undefined)}
            />
          </label>
        )}
      </div>

      <button className="primary" onClick={runSearch} disabled={loading}>
        {loading ? 'Recherche...' : 'Rechercher'}
      </button>

      {error && <p className="error">{error}</p>}

      <ul className="results">
        {results.map((item) =>
          item.kind === 'flight' ? (
            <li key={item.value.id}>
              <strong>{item.value.airline}</strong> {item.value.from} → {item.value.to} •{' '}
              {item.value.price} {item.value.currency} • {item.value.direct ? 'Direct' : 'Avec escale'}
            </li>
          ) : (
            <li key={item.value.id}>
              <strong>{item.value.name}</strong> ({item.value.stars}★) • {item.value.city} •{' '}
              {item.value.pricePerNight} {item.value.currency}/nuit • Note {item.value.rating}
            </li>
          )
        )}
      </ul>
    </section>
  );
};
