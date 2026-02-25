export const airportSuggestions = [
  { code: 'CDG', city: 'Paris', country: 'France' },
  { code: 'ORY', city: 'Paris', country: 'France' },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal' },
  { code: 'MAD', city: 'Madrid', country: 'Spain' },
  { code: 'BCN', city: 'Barcelona', country: 'Spain' },
  { code: 'LHR', city: 'London', country: 'United Kingdom' },
  { code: 'JFK', city: 'New York', country: 'United States' },
  { code: 'SFO', city: 'San Francisco', country: 'United States' },
  { code: 'NRT', city: 'Tokyo', country: 'Japan' },
  { code: 'PEK', city: 'Beijing', country: 'China' },
  { code: 'PVG', city: 'Shanghai', country: 'China' },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany' },
  { code: 'MUC', city: 'Munich', country: 'Germany' },
  { code: 'MEX', city: 'Mexico City', country: 'Mexico' },
  { code: 'DXB', city: 'Dubai', country: 'UAE' },
] as const;

export const citySuggestions = [
  'Paris',
  'Lisbon',
  'Madrid',
  'Barcelona',
  'London',
  'Berlin',
  'Munich',
  'Rome',
  'New York',
  'Tokyo',
  'Beijing',
  'Shanghai',
  'Dubai',
  'Mexico City',
  'Istanbul',
] as const;

export const airportLabel = (airport: { code: string; city: string; country: string }) =>
  `${airport.city} (${airport.code}) - ${airport.country}`;

export const filterAirportSuggestions = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return airportSuggestions.slice(0, 8);

  return airportSuggestions
    .filter(
      (airport) =>
        airport.code.toLowerCase().includes(normalized) ||
        airport.city.toLowerCase().includes(normalized) ||
        airport.country.toLowerCase().includes(normalized)
    )
    .slice(0, 8);
};

export const filterCitySuggestions = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return citySuggestions.slice(0, 8);
  return citySuggestions.filter((city) => city.toLowerCase().includes(normalized)).slice(0, 8);
};

export const extractIataCode = (value: string, fallback: string) => {
  const match = value.toUpperCase().match(/\b([A-Z]{3})\b/);
  if (match?.[1]) return match[1];
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return fallback;
};
