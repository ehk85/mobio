import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchFlightPriceAnalysis, fetchFlightTracking, searchFlights } from '../services/amadeus';
import { useCart } from '../context/CartContext';
import type { FlightOffer, FlightPriceMarker, FlightTrackingResult } from '../types';
import { useI18n } from '../context/I18nContext';
import { airportLabel, airportSuggestions, extractIataCode, filterAirportSuggestions } from '../data/searchSuggestions';

type QuickFilter = 'best-price' | 'fastest' | 'morning' | 'evening' | null;
type CabinClass = 'ECONOMY' | 'BUSINESS' | 'FIRST';

export const FlightsPage = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addFlight } = useCart();
  const [origin, setOrigin] = useState('CDG');
  const [destination, setDestination] = useState('LIS');
  const [travelers, setTravelers] = useState(1);
  const [cabin, setCabin] = useState<CabinClass>('BUSINESS');
  const [maxPrice, setMaxPrice] = useState(1600);
  const [directOnly, setDirectOnly] = useState(false);
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedTrackingId, setExpandedTrackingId] = useState<string | null>(null);
  const [trackingLoadingId, setTrackingLoadingId] = useState<string | null>(null);
  const [trackingByFlightId, setTrackingByFlightId] = useState<Record<string, FlightTrackingResult[]>>({});
  const [trackingErrorByFlightId, setTrackingErrorByFlightId] = useState<Record<string, string>>({});
  const [priceMarkers, setPriceMarkers] = useState<FlightPriceMarker[]>([]);
  const [priceMarkersLoading, setPriceMarkersLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const [hotelPromptFlight, setHotelPromptFlight] = useState<FlightOffer | null>(null);
  const [sadPromptFlight, setSadPromptFlight] = useState<FlightOffer | null>(null);
  const [popupSoundEnabled, setPopupSoundEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('mobio_popup_sound');
    return stored === null ? true : stored === '1';
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const parseIsoDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const toIsoDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const cabinLabel =
    cabin === 'ECONOMY'
      ? t('flightsClassEconomy')
      : cabin === 'FIRST'
        ? t('flightsClassFirst')
        : t('flightsClassBusiness');

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
  const markerByDate = useMemo(() => {
    const map = new Map<string, FlightPriceMarker>();
    for (const marker of priceMarkers) {
      map.set(marker.date, marker);
    }
    return map;
  }, [priceMarkers]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const iso = toIsoDate(date);
      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === visibleMonth.getMonth(),
        marker: markerByDate.get(iso),
      };
    });
  }, [visibleMonth, markerByDate]);

  useEffect(() => {
    const queryOrigin = searchParams.get('origin');
    const queryDestination = searchParams.get('destination');
    const queryDate = searchParams.get('departureDate');
    const queryTravelers = Number(searchParams.get('travelers') ?? '1');
    const queryClass = String(searchParams.get('travelClass') ?? '').toUpperCase() as CabinClass;

    if (!queryOrigin || !queryDestination || !queryDate) {
      return;
    }

    const initialClass: CabinClass =
      queryClass === 'FIRST' || queryClass === 'BUSINESS' || queryClass === 'ECONOMY' ? queryClass : 'ECONOMY';

    setOrigin(queryOrigin);
    setDestination(queryDestination);
    setDepartureDate(queryDate);
    setTravelers(Number.isFinite(queryTravelers) && queryTravelers > 0 ? queryTravelers : 1);
    setCabin(initialClass);

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchFlights(
          {
            origin: queryOrigin,
            destination: queryDestination,
            departureDate: queryDate,
            travelers: Number.isFinite(queryTravelers) && queryTravelers > 0 ? queryTravelers : 1,
            travelClass: initialClass,
          },
          {
            maxPrice,
            directOnly,
          }
        );
        setResults(data);
        setHasSearched(true);
      } catch {
        setError(t('flightsError'));
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

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
          travelClass: cabin,
        },
        {
          maxPrice,
          directOnly,
        }
      );
      setResults(data);
      setHasSearched(true);
    } catch {
      setError(t('flightsError'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSearched) return;
    void runSearch();
  }, [cabin, travelers, departureDate]);

  useEffect(() => {
    const queryOrigin = extractIataCode(origin, 'CDG');
    const queryDestination = extractIataCode(destination, 'LIS');
    if (!queryOrigin || !queryDestination || !departureDate) {
      setPriceMarkers([]);
      return;
    }

    void (async () => {
      setPriceMarkersLoading(true);
      try {
        const markers = await fetchFlightPriceAnalysis(queryOrigin, queryDestination, departureDate, 14);
        setPriceMarkers(markers);
      } finally {
        setPriceMarkersLoading(false);
      }
    })();
  }, [origin, destination, departureDate]);

  useEffect(() => {
    const selected = parseIsoDate(departureDate);
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [departureDate]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!datePickerRef.current) return;
      if (!datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const toggleTracking = async (flight: FlightOffer) => {
    if (expandedTrackingId === flight.id) {
      setExpandedTrackingId(null);
      return;
    }

    setExpandedTrackingId(flight.id);

    if (trackingByFlightId[flight.id] || trackingLoadingId === flight.id) {
      return;
    }

    const firstSegment = flight.segments[0];
    if (!firstSegment) {
      setTrackingErrorByFlightId((current) => ({
        ...current,
        [flight.id]: t('flightsTrackingUnavailable'),
      }));
      return;
    }

    setTrackingLoadingId(flight.id);
    setTrackingErrorByFlightId((current) => {
      const next = { ...current };
      delete next[flight.id];
      return next;
    });

    try {
      const tracking = await fetchFlightTracking(
        firstSegment.carrierCode,
        firstSegment.flightNumber,
        firstSegment.departureAt
      );
      setTrackingByFlightId((current) => ({
        ...current,
        [flight.id]: tracking,
      }));
    } catch {
      setTrackingErrorByFlightId((current) => ({
        ...current,
        [flight.id]: t('flightsTrackingUnavailable'),
      }));
    } finally {
      setTrackingLoadingId(null);
    }
  };

  const getTrackingStatus = (flightId: string) => {
    const status = trackingByFlightId[flightId]
      ?.flatMap((entry) => entry.segments ?? [])
      .find((segment) => segment.status)?.status;

    if (!status) return 'UNKNOWN';
    return String(status).toUpperCase();
  };

  const getTrackingStatusClass = (status: string) => {
    if (status.includes('ON_TIME') || status.includes('ONTIME') || status.includes('SCHEDULED')) {
      return 'ok';
    }
    if (status.includes('DELAY') || status.includes('LATE')) {
      return 'warn';
    }
    if (status.includes('CANCEL')) {
      return 'bad';
    }
    return 'neutral';
  };

  const getCityByIata = (iataCode: string) =>
    airportSuggestions.find((airport) => airport.code === iataCode)?.city ?? iataCode;

  const playPopupTone = (tone: 'open' | 'accept' | 'reject') => {
    if (!popupSoundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const context = audioContextRef.current;
      if (context.state === 'suspended') {
        void context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);

      const now = context.currentTime;
      const base = tone === 'accept' ? 540 : tone === 'reject' ? 210 : 420;
      const end = now + (tone === 'open' ? 0.13 : 0.16);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(base, now);
      oscillator.frequency.exponentialRampToValueAtTime(base * 1.16, now + 0.05);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.start(now);
      oscillator.stop(end);
    } catch {
    }
  };

  useEffect(() => {
    localStorage.setItem('mobio_popup_sound', popupSoundEnabled ? '1' : '0');
  }, [popupSoundEnabled]);

  useEffect(() => {
    if (hotelPromptFlight || sadPromptFlight) {
      playPopupTone('open');
    }
  }, [hotelPromptFlight, sadPromptFlight]);

  const redirectToHotels = (flight: FlightOffer) => {
    const city = getCityByIata(flight.to);
    const checkInDate = departureDate;
    const checkOutSeed = new Date(`${departureDate}T00:00:00`);
    checkOutSeed.setDate(checkOutSeed.getDate() + 2);
    const checkOutDate = checkOutSeed.toISOString().split('T')[0];

    const params = new URLSearchParams({
      city,
      guests: String(travelers),
      checkInDate,
      checkOutDate,
      fromFlight: '1',
    });

    navigate(`/hotels?${params.toString()}`);
  };

  const handleSelectFlight = (flight: FlightOffer) => {
    addFlight(flight);
    setHotelPromptFlight(flight);
    setSadPromptFlight(null);
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
            <div className="flight-date-field" ref={datePickerRef}>
              <button
                type="button"
                className="flight-date-trigger"
                onClick={() => setIsDatePickerOpen((value) => !value)}
              >
                {parseIsoDate(departureDate).toLocaleDateString(locale, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </button>
              {isDatePickerOpen && (
                <div className="flight-date-popover">
                  <div className="flight-date-head">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleMonth(
                          (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                        )
                      }
                    >
                      ‹
                    </button>
                    <strong>
                      {visibleMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleMonth(
                          (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                        )
                      }
                    >
                      ›
                    </button>
                  </div>
                  <div className="flight-date-grid">
                    {calendarDays.map((day) => (
                      <button
                        key={day.iso}
                        type="button"
                        className={`flight-date-cell ${day.inMonth ? '' : 'outside'} ${departureDate === day.iso ? 'selected' : ''} ${day.marker?.level ?? ''}`}
                        onClick={() => {
                          setDepartureDate(day.iso);
                          setIsDatePickerOpen(false);
                        }}
                        title={day.marker ? `${day.iso} • ${Math.round(day.marker.amount)}€` : day.iso}
                      >
                        <span>{day.day}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
            <select value={cabin} onChange={(e) => setCabin(e.target.value as CabinClass)}>
              <option value="ECONOMY">{t('flightsClassEconomy')}</option>
              <option value="BUSINESS">{t('flightsClassBusiness')}</option>
              <option value="FIRST">{t('flightsClassFirst')}</option>
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
        {priceMarkersLoading && <p className="flight-date-loading">{t('commonLoading')}</p>}
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
                  {t('flightsCabin')}: {cabinLabel}
                </small>
              </div>
              <div className="flight-ticket-side">
                <strong>
                  {flight.price} {flight.currency}
                </strong>
                <button className="primary" onClick={() => handleSelectFlight(flight)}>
                  {t('flightsSelect')}
                </button>
                <button className="flight-track-btn" onClick={() => void toggleTracking(flight)}>
                  {expandedTrackingId === flight.id ? t('flightsHideTracking') : t('flightsTrackItinerary')}
                </button>
              </div>
              {expandedTrackingId === flight.id && (
                <div className="flight-tracking-panel">
                  <p className="flight-tracking-title">{t('flightsItineraryTitle')}</p>
                  <ul className="flight-segment-list">
                    {flight.segments.map((segment, index) => (
                      <li key={`${flight.id}-${segment.flightNumber}-${index}`}>
                        <strong>
                          {segment.from} → {segment.to}
                        </strong>{' '}
                        · {segment.carrierCode} {segment.flightNumber} · {formatTime(segment.departureAt)} -{' '}
                        {formatTime(segment.arrivalAt)}
                      </li>
                    ))}
                  </ul>
                  {trackingLoadingId === flight.id && <p>{t('flightsTrackingLoading')}</p>}
                  {trackingErrorByFlightId[flight.id] && <p className="error">{trackingErrorByFlightId[flight.id]}</p>}
                  {trackingByFlightId[flight.id]?.[0] && (
                    <div className="flight-tracking-status">
                      <span className={`flight-status-pill ${getTrackingStatusClass(getTrackingStatus(flight.id))}`}>
                        {getTrackingStatus(flight.id)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
          {!loading && displayedResults.length === 0 && !error && (
            <article className="card empty-card">
              <p>{t('flightsEmpty')}</p>
            </article>
          )}
        </div>
      </section>

      {hotelPromptFlight && (
        <div className="flight-popup-overlay" role="dialog" aria-modal="true">
          <article className="flight-popup-card">
            <button
              type="button"
              className="flight-popup-sound-btn"
              onClick={() => setPopupSoundEnabled((value) => !value)}
              title={popupSoundEnabled ? 'Désactiver le son' : 'Activer le son'}
            >
              {popupSoundEnabled ? '🔊' : '🔇'}
            </button>
            <div className="flight-popup-orb" />
            <p className="flight-popup-emoji" aria-hidden="true">
              ✈️
            </p>
            <h3>Super choix !</h3>
            <p>
              Tu as sélectionné un vol vers <strong>{getCityByIata(hotelPromptFlight.to)}</strong>.
              <br />
              Tu veux réserver un hôtel maintenant ?
            </p>
            <div className="flight-popup-actions">
              <button
                className="primary"
                onClick={() => {
                  playPopupTone('accept');
                  redirectToHotels(hotelPromptFlight);
                }}
              >
                Oui, je réserve mon hôtel
              </button>
              <button
                className="flight-popup-ghost"
                onClick={() => {
                  playPopupTone('reject');
                  setHotelPromptFlight(null);
                  setSadPromptFlight(hotelPromptFlight);
                }}
              >
                Non merci
              </button>
            </div>
          </article>
        </div>
      )}

      {sadPromptFlight && (
        <div className="flight-popup-overlay" role="dialog" aria-modal="true">
          <article className="flight-popup-card sad">
            <button
              type="button"
              className="flight-popup-sound-btn"
              onClick={() => setPopupSoundEnabled((value) => !value)}
              title={popupSoundEnabled ? 'Désactiver le son' : 'Activer le son'}
            >
              {popupSoundEnabled ? '🔊' : '🔇'}
            </button>
            <p className="flight-popup-emoji" aria-hidden="true">
              😢
            </p>
            <h3>Donc tu vas dormir dehors ?!!!</h3>
            <p>On peut quand même te trouver un hôtel en 2 clics.</p>
            <div className="flight-popup-actions">
              <button
                className="primary"
                onClick={() => {
                  playPopupTone('accept');
                  redirectToHotels(sadPromptFlight);
                }}
              >
                Oui, je veux un hôtel
              </button>
              <button
                className="flight-popup-ghost"
                onClick={() => setSadPromptFlight(null)}
              >
                Non
              </button>
            </div>
          </article>
        </div>
      )}
    </main>
  );
};
