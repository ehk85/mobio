import { env } from '../config/env';
import type { FlightOffer, FlightSearchParams, SearchFilters } from '../types';

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
