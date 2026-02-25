import { env } from '../config/env';
import type { HotelOffer, HotelSearchParams, SearchFilters } from '../types';

const getNights = (checkInDate: string, checkOutDate: string) => {
  const start = new Date(`${checkInDate}T00:00:00Z`).getTime();
  const end = new Date(`${checkOutDate}T00:00:00Z`).getTime();
  const diffDays = Math.round((end - start) / 86_400_000);
  return Number.isFinite(diffDays) && diffDays > 0 ? diffDays : 1;
};

const mockHotels = (params: HotelSearchParams): HotelOffer[] => {
  const nights = getNights(params.checkInDate, params.checkOutDate);
  return [
    {
      id: 'mock-hotel-1',
      name: 'City Central Hotel',
      city: params.city,
      stars: 4,
      pricePerNight: 120,
      totalPrice: 120 * nights,
      nights,
      currency: 'EUR',
      rating: 8.4,
    },
    {
      id: 'mock-hotel-2',
      name: 'Skyline Suites',
      city: params.city,
      stars: 5,
      pricePerNight: 220,
      totalPrice: 220 * nights,
      nights,
      currency: 'EUR',
      rating: 9.1,
    },
  ];
};

export const searchHotels = async (
  params: HotelSearchParams,
  filters: SearchFilters
): Promise<HotelOffer[]> => {
  if (env.apiMode === 'mock') {
    return mockHotels(params).filter((item) => {
      if (filters.maxPrice && item.pricePerNight > filters.maxPrice) return false;
      if (filters.stars && item.stars < filters.stars) return false;
      return true;
    });
  }

  const response = await fetch(`${env.apiServerUrl}/search/hotels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params, filters }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? 'Erreur pendant la recherche d\'hôtels.');
  }

  const data = (await response.json()) as { results?: HotelOffer[] };
  return data.results ?? [];
};
