export type SearchType = 'flight' | 'hotel';

export interface SearchFilters {
  maxPrice?: number;
  directOnly?: boolean;
  stars?: number;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  travelers: number;
  travelClass?: 'ECONOMY' | 'BUSINESS' | 'FIRST';
}

export interface HotelSearchParams {
  city: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
}

export interface FlightOffer {
  id: string;
  airline: string;
  from: string;
  to: string;
  departureAt: string;
  arrivalAt: string;
  price: number;
  currency: string;
  direct: boolean;
  segments: FlightSegment[];
}

export interface FlightSegment {
  carrierCode: string;
  flightNumber: string;
  from: string;
  to: string;
  departureAt: string;
  arrivalAt: string;
}

export interface FlightTrackingPoint {
  iataCode: string | null;
  departure: string | null;
  arrival: string | null;
  terminal: string | null;
  gate: string | null;
  status: string | null;
}

export interface FlightTrackingResult {
  type: string | null;
  scheduledDepartureDate: string;
  carrierCode: string;
  flightNumber: string;
  aircraftCode: string | null;
  segments: FlightTrackingPoint[];
}

export interface MostBookedDestination {
  destination: string;
  rank: number;
  travelersScore: number;
}

export interface FlightPriceMarker {
  date: string;
  amount: number;
  level: 'low' | 'medium' | 'high';
}

export interface HotelOffer {
  id: string;
  name: string;
  city: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  nights: number;
  currency: string;
  rating: number;
}

export interface HotelSuggestion {
  id: string;
  type: 'hotel' | 'city';
  label: string;
  city: string;
  cityCode: string;
  hotelId: string | null;
}

export type SearchResult = FlightOffer | HotelOffer;

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
}
