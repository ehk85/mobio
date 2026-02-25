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

export type SearchResult = FlightOffer | HotelOffer;

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
}
