import { env } from '../config/env';
import type {
  FlightPriceMarker,
  FlightOffer,
  FlightSearchParams,
  FlightTrackingResult,
  MostBookedDestination,
  SearchFilters,
} from '../types';

const mockFlights = (params: FlightSearchParams): FlightOffer[] => [
  {
    id: 'mock-flight-1',
    airline: 'AF',
    from: params.origin,
    to: params.destination,
    departureAt: `${params.departureDate}T08:20:00`,
    arrivalAt: `${params.departureDate}T10:50:00`,
    price: 235,
    currency: 'EUR',
    direct: true,
    segments: [
      {
        carrierCode: 'AF',
        flightNumber: '1234',
        from: params.origin,
        to: params.destination,
        departureAt: `${params.departureDate}T08:20:00`,
        arrivalAt: `${params.departureDate}T10:50:00`,
      },
    ],
  },
  {
    id: 'mock-flight-2',
    airline: 'LH',
    from: params.origin,
    to: params.destination,
    departureAt: `${params.departureDate}T12:40:00`,
    arrivalAt: `${params.departureDate}T16:10:00`,
    price: 190,
    currency: 'EUR',
    direct: false,
    segments: [
      {
        carrierCode: 'LH',
        flightNumber: '987',
        from: params.origin,
        to: 'FRA',
        departureAt: `${params.departureDate}T12:40:00`,
        arrivalAt: `${params.departureDate}T14:30:00`,
      },
      {
        carrierCode: 'LH',
        flightNumber: '654',
        from: 'FRA',
        to: params.destination,
        departureAt: `${params.departureDate}T15:10:00`,
        arrivalAt: `${params.departureDate}T16:10:00`,
      },
    ],
  },
];

export const searchFlights = async (
  params: FlightSearchParams,
  filters: SearchFilters
): Promise<FlightOffer[]> => {
  const useMock = env.apiMode === 'mock';

  if (useMock) {
    return mockFlights(params).filter((item) => {
      if (filters.maxPrice && item.price > filters.maxPrice) return false;
      if (filters.directOnly && !item.direct) return false;
      return true;
    });
  }

  const response = await fetch(`${env.apiServerUrl}/search/flights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params, filters }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Erreur pendant la recherche de vols.');
  }

  const data = (await response.json()) as { results?: FlightOffer[] };
  return data.results ?? [];
};

export const fetchFlightTracking = async (
  carrierCode: string,
  flightNumber: string,
  date: string
): Promise<FlightTrackingResult[]> => {
  if (env.apiMode === 'mock') {
    return [];
  }

  const query = new URLSearchParams({ carrierCode, flightNumber, date });
  const response = await fetch(`${env.apiServerUrl}/search/flights/tracking?${query.toString()}`);

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Tracking indisponible pour ce vol.');
  }

  const data = (await response.json()) as { results?: FlightTrackingResult[] };
  return data.results ?? [];
};

export const fetchMostBookedDestinations = async (
  originCityCode: string,
  period: string,
  max = 5
): Promise<MostBookedDestination[]> => {
  if (env.apiMode === 'mock') {
    return [
      { destination: 'LON', rank: 1, travelersScore: 100 },
      { destination: 'MAD', rank: 2, travelersScore: 92 },
      { destination: 'LIS', rank: 3, travelersScore: 86 },
    ];
  }

  const query = new URLSearchParams({ originCityCode, period, max: String(max) });
  const response = await fetch(`${env.apiServerUrl}/flights/most-booked?${query.toString()}`);

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Destinations populaires indisponibles.');
  }

  const data = (await response.json()) as { results?: MostBookedDestination[] };
  return data.results ?? [];
};

export const fetchFlightPriceAnalysis = async (
  origin: string,
  destination: string,
  startDate: string,
  days = 14
): Promise<FlightPriceMarker[]> => {
  if (env.apiMode === 'mock') {
    const levels: FlightPriceMarker['level'][] = ['low', 'medium', 'high', 'medium'];
    const start = new Date(`${startDate}T00:00:00Z`);

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const level = levels[index % levels.length];
      const amount = level === 'low' ? 180 + index : level === 'high' ? 285 + index : 230 + index;
      return {
        date: date.toISOString().split('T')[0],
        amount,
        level,
      };
    });
  }

  const query = new URLSearchParams({ origin, destination, startDate, days: String(days) });
  const response = await fetch(`${env.apiServerUrl}/flights/price-analysis?${query.toString()}`);

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { results?: FlightPriceMarker[] };
  return data.results ?? [];
};
