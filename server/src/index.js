import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { User } from './models/User.js';
import { Purchase } from './models/Purchase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI;
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  ...(process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()) : []),
].filter(Boolean);

const amadeusClientId = process.env.AMADEUS_CLIENT_ID || process.env.VITE_AMADEUS_CLIENT_ID;
const amadeusClientSecret = process.env.AMADEUS_CLIENT_SECRET || process.env.VITE_AMADEUS_CLIENT_SECRET;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

let amadeusTokenCache = null;

if (!mongoUri) {
  throw new Error('MONGODB_URI est requis dans server/.env');
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origine non autorisée par CORS'));
    },
  })
);
app.use(express.json());

const requireAmadeusCredentials = () => {
  if (!amadeusClientId || !amadeusClientSecret) {
    throw new Error('Clés Amadeus manquantes. Ajoutez AMADEUS_CLIENT_ID/SECRET côté serveur.');
  }
  return { clientId: amadeusClientId, clientSecret: amadeusClientSecret };
};

const zeroDecimalCurrencies = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

const toStripeAmount = (amount, currency) => {
  const normalizedCurrency = String(currency ?? 'EUR').trim().toLowerCase();
  const normalizedAmount = Number(amount ?? 0);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return null;
  }

  if (zeroDecimalCurrencies.has(normalizedCurrency)) {
    return {
      amount: Math.round(normalizedAmount),
      currency: normalizedCurrency,
    };
  }

  return {
    amount: Math.round(normalizedAmount * 100),
    currency: normalizedCurrency,
  };
};

const getAmadeusToken = async () => {
  const now = Date.now();
  if (amadeusTokenCache && amadeusTokenCache.expiresAt > now + 30_000) {
    return amadeusTokenCache.token;
  }

  const { clientId, clientSecret } = requireAmadeusCredentials();
  const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.error_description || payload?.errors?.[0]?.detail;
    throw new Error(detail ? `Token Amadeus refusé: ${detail}` : 'Impossible de récupérer un token Amadeus.');
  }

  const data = await response.json();
  amadeusTokenCache = {
    token: data.access_token,
    expiresAt: now + Number(data.expires_in ?? 1800) * 1000,
  };

  return amadeusTokenCache.token;
};

const toQuery = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  return query.toString();
};

const mapFlightOffer = (raw) => {
  const itinerary = raw.itineraries?.[0];
  const firstSegment = itinerary?.segments?.[0];
  const lastSegment = itinerary?.segments?.[itinerary.segments.length - 1];
  const segments = (itinerary?.segments ?? []).map((segment) => ({
    carrierCode: segment?.carrierCode ?? 'N/A',
    flightNumber: segment?.number ?? 'N/A',
    from: segment?.departure?.iataCode ?? 'N/A',
    to: segment?.arrival?.iataCode ?? 'N/A',
    departureAt: segment?.departure?.at ?? '',
    arrivalAt: segment?.arrival?.at ?? '',
  }));

  return {
    id: String(raw.id),
    airline: firstSegment?.carrierCode ?? 'N/A',
    from: firstSegment?.departure?.iataCode ?? 'N/A',
    to: lastSegment?.arrival?.iataCode ?? 'N/A',
    departureAt: firstSegment?.departure?.at ?? '',
    arrivalAt: lastSegment?.arrival?.at ?? '',
    price: Number(raw.price?.total ?? 0),
    currency: raw.price?.currency ?? 'EUR',
    direct: itinerary?.segments?.length === 1,
    segments,
  };
};

const fallbackMostBooked = [
  { destination: 'LON', rank: 1, travelersScore: 100 },
  { destination: 'MAD', rank: 2, travelersScore: 92 },
  { destination: 'LIS', rank: 3, travelersScore: 86 },
  { destination: 'BCN', rank: 4, travelersScore: 83 },
  { destination: 'ROM', rank: 5, travelersScore: 79 },
];

const buildFallbackPriceAnalysis = (startDate, days) => {
  const levels = ['low', 'medium', 'high', 'medium'];
  const base = 170;
  const start = new Date(`${startDate}T00:00:00Z`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const level = levels[index % levels.length];
    const amount =
      level === 'low' ? base + index * 2 : level === 'high' ? base + 85 + index * 2 : base + 40 + index * 2;

    return {
      date: date.toISOString().split('T')[0],
      amount,
      level,
    };
  });
};

const getStayNights = (checkInDate, checkOutDate) => {
  const start = new Date(`${checkInDate}T00:00:00Z`).getTime();
  const end = new Date(`${checkOutDate}T00:00:00Z`).getTime();
  const diffDays = Math.round((end - start) / 86_400_000);
  return Number.isFinite(diffDays) && diffDays > 0 ? diffDays : 1;
};

const toPriceNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapAmadeusHotelOffer = (raw, nights, fallbackCity) => {
  const hotel = raw.hotel ?? {};
  const offer = raw.offers?.[0] ?? {};
  const totalPrice = toPriceNumber(offer.price?.total ?? offer.price?.base ?? 0);
  const pricePerNight = Number((totalPrice / Math.max(1, nights)).toFixed(2));
  const ratingValue = Number(hotel.rating ?? 0);

  return {
    id: String(offer.id ?? hotel.hotelId ?? raw.type ?? crypto.randomUUID()),
    name: hotel.name ?? 'Hotel',
    city: hotel.address?.cityName ?? hotel.cityCode ?? fallbackCity,
    stars: Number.isFinite(ratingValue) && ratingValue > 0 ? Math.round(ratingValue) : 3,
    pricePerNight,
    totalPrice,
    nights,
    currency: offer.price?.currency ?? 'EUR',
    rating: Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue : 0,
  };
};

const mockFlights = (params) => {
  const templates = [
    { airline: 'AF', departureHour: 8, durationMinutes: 155, price: 235, direct: true },
    { airline: 'LH', departureHour: 10, durationMinutes: 190, price: 198, direct: false },
    { airline: 'TP', departureHour: 12, durationMinutes: 170, price: 256, direct: true },
    { airline: 'IB', departureHour: 14, durationMinutes: 210, price: 182, direct: false },
    { airline: 'BA', departureHour: 16, durationMinutes: 165, price: 244, direct: true },
    { airline: 'KL', departureHour: 18, durationMinutes: 200, price: 208, direct: false },
    { airline: 'EK', departureHour: 20, durationMinutes: 175, price: 268, direct: true },
    { airline: 'QR', departureHour: 22, durationMinutes: 230, price: 216, direct: false },
  ];

  return templates.map((template, index) => {
    const departure = new Date(`${params.departureDate}T00:00:00`);
    departure.setHours(template.departureHour, index % 2 === 0 ? 20 : 45, 0, 0);
    const arrival = new Date(departure.getTime() + template.durationMinutes * 60_000);

    return {
      id: `mock-flight-${params.origin}-${params.destination}-${index + 1}`,
      airline: template.airline,
      from: String(params.origin).toUpperCase(),
      to: String(params.destination).toUpperCase(),
      departureAt: departure.toISOString(),
      arrivalAt: arrival.toISOString(),
      price: template.price,
      currency: 'EUR',
      direct: template.direct,
    };
  });
};

const mockHotels = (params) => {
  const nights = getStayNights(params.checkInDate, params.checkOutDate);
  const templates = [
    { name: 'City Central Hotel', stars: 4, pricePerNight: 120, rating: 8.4 },
    { name: 'Skyline Suites', stars: 5, pricePerNight: 220, rating: 9.1 },
    { name: 'Grand Horizon', stars: 4, pricePerNight: 168, rating: 8.7 },
    { name: 'Harbor View Inn', stars: 3, pricePerNight: 110, rating: 8.1 },
    { name: 'Royal Garden Hotel', stars: 5, pricePerNight: 289, rating: 9.3 },
    { name: 'Urban Loft Stay', stars: 4, pricePerNight: 146, rating: 8.5 },
    { name: 'Sunrise Boutique', stars: 4, pricePerNight: 132, rating: 8.6 },
    { name: 'Classic Business Hotel', stars: 3, pricePerNight: 98, rating: 7.9 },
  ];

  return templates.map((template, index) => ({
    id: `mock-hotel-${String(params.city).toLowerCase()}-${index + 1}`,
    name: template.name,
    city: params.city,
    stars: template.stars,
    pricePerNight: template.pricePerNight,
    totalPrice: Number((template.pricePerNight * nights).toFixed(2)),
    nights,
    currency: 'EUR',
    rating: template.rating,
  }));
};

const applyFlightFilters = (offers, filters) =>
  offers.filter((item) => {
    if (filters?.maxPrice && item.price > Number(filters.maxPrice)) return false;
    if (filters?.directOnly && !item.direct) return false;
    return true;
  });

const applyHotelFilters = (offers, filters) =>
  offers.filter((item) => {
    if (filters?.maxPrice && item.pricePerNight > Number(filters.maxPrice)) return false;
    if (filters?.stars && item.stars < Number(filters.stars)) return false;
    return true;
  });

const normalizeTravelClass = (value) => {
  if (!value) return undefined;

  const raw = String(value).trim();
  const upper = raw.toUpperCase();

  if (upper === 'FIRST' || upper === 'PREMIÈRE' || upper === 'PREMIERE') return 'FIRST';
  if (upper === 'BUSINESS' || upper === 'AFFAIRES') return 'BUSINESS';
  if (upper === 'ECONOMY' || upper === 'ECONOMIC' || upper === 'ÉCONOMIE' || upper === 'ECONOMIE') {
    return 'ECONOMY';
  }

  return undefined;
};

const resolveAmadeusCityCode = async (city) => {
  const normalized = String(city ?? '').trim();
  if (/^[A-Za-z]{3}$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  const token = await getAmadeusToken();
  const query = toQuery({ keyword: normalized, max: 1 });
  const response = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/cities?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  const cityCode = payload?.data?.[0]?.iataCode ?? payload?.data?.[0]?.address?.cityCode ?? null;
  return cityCode ? String(cityCode).toUpperCase() : null;
};

const getAmadeusHotelIdsByCity = async (token, cityCode, maxHotels = 20) => {
  const query = toQuery({ cityCode, radius: 25, radiusUnit: 'KM', hotelSource: 'ALL' });
  const response = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json().catch(() => null);
  const hotels = payload?.data ?? [];

  return hotels
    .map((item) => item?.hotelId)
    .filter(Boolean)
    .slice(0, maxHotels)
    .map((id) => String(id));
};

const getHotelSuggestionsByKeyword = async (keyword) => {
  const normalized = String(keyword ?? '').trim();
  if (normalized.length < 2) {
    return [];
  }

  const token = await getAmadeusToken();
  const cityQuery = toQuery({ keyword: normalized, max: 5 });
  const cityResponse = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/cities?${cityQuery}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!cityResponse.ok) {
    return [];
  }

  const cityPayload = await cityResponse.json().catch(() => null);
  const cities = (cityPayload?.data ?? [])
    .map((item) => ({
      cityCode: String(item?.iataCode ?? item?.address?.cityCode ?? '').toUpperCase(),
      cityName: String(item?.name ?? '').trim(),
      countryCode: String(item?.address?.countryCode ?? '').toUpperCase(),
    }))
    .filter((item) => item.cityCode.length === 3 && item.cityName);

  const citySuggestions = cities.map((city) => ({
    id: `city-${city.cityCode}`,
    type: 'city',
    label: `${city.cityName}${city.countryCode ? ` (${city.countryCode})` : ''}`,
    city: city.cityName,
    cityCode: city.cityCode,
    hotelId: null,
  }));

  const hotelCollections = await Promise.all(
    cities.slice(0, 3).map(async (city) => {
      const hotelsQuery = toQuery({ cityCode: city.cityCode, radius: 15, radiusUnit: 'KM', hotelSource: 'ALL' });
      const hotelsResponse = await fetch(
        `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?${hotelsQuery}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!hotelsResponse.ok) {
        return [];
      }

      const hotelsPayload = await hotelsResponse.json().catch(() => null);
      return (hotelsPayload?.data ?? []).slice(0, 5).map((hotel) => ({
        id: `hotel-${String(hotel?.hotelId ?? hotel?.name ?? crypto.randomUUID())}`,
        type: 'hotel',
        label: String(hotel?.name ?? '').trim(),
        city: city.cityName,
        cityCode: city.cityCode,
        hotelId: String(hotel?.hotelId ?? '').trim() || null,
      }));
    })
  );

  const hotels = hotelCollections.flat().filter((item) => item.label);
  const merged = [...hotels, ...citySuggestions];
  const unique = [];
  const seen = new Set();

  for (const item of merged) {
    const key = `${item.type}-${item.label.toLowerCase()}-${item.cityCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 12) break;
  }

  return unique;
};

const toPurchaseResponse = (purchase) => ({
  id: purchase._id.toString(),
  userId: purchase.userId.toString(),
  orderNumber: purchase.orderNumber,
  status: purchase.status,
  amount: purchase.amount,
  currency: purchase.currency,
  paymentMode: purchase.paymentMode,
  paymentReference: purchase.paymentReference,
  customer: purchase.customer,
  items: purchase.items,
  createdAt: purchase.createdAt,
  updatedAt: purchase.updatedAt,
});

app.post('/api/payments/checkout', async (req, res) => {
  try {
    const { amount, currency, reservationType, reservationId, paymentMode } = req.body ?? {};

    if (!amount || !currency || !reservationType || !reservationId) {
      return res.status(400).json({
        status: 'failed',
        message: 'Données de paiement invalides.',
      });
    }

    const stripePayload = toStripeAmount(amount, currency);
    if (!stripePayload) {
      return res.status(400).json({
        status: 'failed',
        message: 'Montant de paiement invalide.',
      });
    }

    if (!stripe) {
      return res.status(503).json({
        status: 'failed',
        message: 'Stripe non configuré côté serveur.',
      });
    }

    const intent = await stripe.paymentIntents.create({
      amount: stripePayload.amount,
      currency: stripePayload.currency,
      confirm: true,
      payment_method: 'pm_card_visa',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `Reservation ${String(reservationType)} ${String(reservationId)}`,
      metadata: {
        reservationType: String(reservationType),
        reservationId: String(reservationId),
        selectedPaymentMode: String(paymentMode ?? 'card'),
      },
    });

    if (intent.status === 'succeeded') {
      return res.json({
        status: 'success',
        message: 'Paiement Stripe confirmé.',
        reference: intent.id,
      });
    }

    return res.status(402).json({
      status: 'failed',
      message: `Paiement non confirmé (status: ${intent.status}).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Stripe inconnue.';
    return res.status(500).json({
      status: 'failed',
      message: `Paiement Stripe échoué: ${message}`,
    });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { userId, amount, currency, paymentMode, paymentReference, items, customer } = req.body ?? {};

    if (!userId || !amount || !currency || !paymentMode || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Données achat invalides.' });
    }

    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(400).json({ message: 'Utilisateur invalide.' });
    }

    const user = await User.findById(userId).select('_id');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const normalizedItems = items
      .map((item) => ({
        cartItemId: String(item.cartItemId ?? '').trim(),
        type: item.type === 'hotel' ? 'hotel' : 'flight',
        title: String(item.title ?? '').trim(),
        subtitle: String(item.subtitle ?? '').trim(),
        amount: Number(item.amount ?? 0),
        currency: String(item.currency ?? currency).trim().toUpperCase(),
      }))
      .filter((item) => item.cartItemId && item.title && item.amount >= 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: 'Aucun article valide à enregistrer.' });
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
    const purchase = await Purchase.create({
      userId: user._id,
      orderNumber,
      status: paymentMode === 'hotel' ? 'in-progress' : 'delivered',
      amount: Number(amount),
      currency: String(currency).toUpperCase(),
      paymentMode: paymentMode === 'hotel' ? 'hotel' : 'online',
      paymentReference: String(paymentReference ?? '').trim(),
      items: normalizedItems,
      customer: {
        firstName: String(customer?.firstName ?? '').trim(),
        lastName: String(customer?.lastName ?? '').trim(),
        email: String(customer?.email ?? '').trim().toLowerCase(),
        country: String(customer?.country ?? '').trim(),
        zipCode: String(customer?.zipCode ?? '').trim(),
        notes: String(customer?.notes ?? '').trim(),
      },
    });

    return res.status(201).json(toPurchaseResponse(purchase));
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur lors de l’enregistrement de l’achat.' });
  }
});

app.get('/api/purchases/user/:userId', async (req, res) => {
  try {
    const userId = String(req.params.userId ?? '');

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Utilisateur invalide.' });
    }

    const purchases = await Purchase.find({ userId }).sort({ createdAt: -1 }).limit(100);
    return res.json({ results: purchases.map(toPurchaseResponse) });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur lors du chargement de l’historique.' });
  }
});

app.post('/api/search/flights', async (req, res) => {
  const { params, filters } = req.body ?? {};
  try {
    if (!params?.origin || !params?.destination || !params?.departureDate || !params?.travelers) {
      return res.status(400).json({ message: 'Paramètres de recherche vols invalides.' });
    }

    const token = await getAmadeusToken();
    const travelClass = normalizeTravelClass(params.travelClass);
    const query = toQuery({
      originLocationCode: String(params.origin).toUpperCase(),
      destinationLocationCode: String(params.destination).toUpperCase(),
      departureDate: params.departureDate,
      adults: Number(params.travelers),
      travelClass,
      max: 50,
    });

    const response = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return res.status(502).json({ message: payload?.errors?.[0]?.detail ?? 'API vols indisponible.' });
    }

    const data = await response.json();
    const mapped = (data.data ?? []).map(mapFlightOffer);
    return res.json({ results: applyFlightFilters(mapped, filters) });
  } catch (error) {
    const fallback = params ? applyFlightFilters(mockFlights(params), filters) : [];
    return res.json({
      results: fallback,
      fallback: true,
      message: error.message ?? 'Amadeus indisponible, résultats de secours affichés.',
    });
  }
});

app.get('/api/search/flights/tracking', async (req, res) => {
  const carrierCode = String(req.query.carrierCode ?? '').trim().toUpperCase();
  const flightNumber = String(req.query.flightNumber ?? '').trim();
  const date = String(req.query.date ?? '').trim();

  try {
    if (!carrierCode || !flightNumber || !date) {
      return res.status(400).json({ message: 'Paramètres tracking invalides.' });
    }

    const token = await getAmadeusToken();
    const scheduledDepartureDate = date.split('T')[0];
    const query = toQuery({ carrierCode, flightNumber, scheduledDepartureDate });
    const response = await fetch(`https://test.api.amadeus.com/v2/schedule/flights?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const detail = payload?.errors?.[0]?.detail ?? 'Tracking indisponible.';
      return res.status(502).json({ message: detail });
    }

    const payload = await response.json();
    const flights = payload?.data ?? [];
    const normalized = flights.map((item) => ({
      type: item?.type ?? null,
      scheduledDepartureDate: item?.scheduledDepartureDate ?? scheduledDepartureDate,
      carrierCode: item?.flightDesignator?.carrierCode ?? carrierCode,
      flightNumber: String(item?.flightDesignator?.flightNumber ?? flightNumber),
      aircraftCode: item?.aircraftEquipment?.aircraftType ?? null,
      segments: (item?.flightPoints ?? []).map((point) => ({
        iataCode: point?.iataCode ?? null,
        departure: point?.departure?.timings?.at ?? null,
        arrival: point?.arrival?.timings?.at ?? null,
        terminal: point?.departure?.terminal?.code ?? point?.arrival?.terminal?.code ?? null,
        gate: point?.departure?.gate ?? point?.arrival?.gate ?? null,
        status: point?.departure?.timings?.status ?? point?.arrival?.timings?.status ?? null,
      })),
    }));

    return res.json({ results: normalized });
  } catch (error) {
    return res.status(502).json({ message: error.message ?? 'Tracking indisponible.' });
  }
});

app.get('/api/flights/most-booked', async (req, res) => {
  const originCityCode = String(req.query.originCityCode ?? 'PAR').trim().toUpperCase();
  const period = String(req.query.period ?? new Date().toISOString().slice(0, 7)).trim();
  const max = Math.min(Math.max(Number(req.query.max ?? 5), 1), 10);

  try {
    const token = await getAmadeusToken();
    const query = toQuery({ originCityCode, period });
    const response = await fetch(`https://test.api.amadeus.com/v1/travel/analytics/air-traffic/booked?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const detail = payload?.errors?.[0]?.detail ?? 'Destinations populaires indisponibles.';
      throw new Error(detail);
    }

    const payload = await response.json();
    const results = (payload?.data ?? [])
      .slice(0, max)
      .map((item, index) => ({
        destination: String(item?.destination ?? '').toUpperCase(),
        rank: index + 1,
        travelersScore: Number(item?.analytics?.travelers?.score ?? 0),
      }))
      .filter((item) => item.destination.length === 3);

    if (results.length === 0) {
      return res.json({
        originCityCode,
        period,
        fallback: true,
        results: fallbackMostBooked.slice(0, max),
        message: 'Aucune destination retournée par Amadeus, données de secours affichées.',
      });
    }

    return res.json({
      originCityCode,
      period,
      results,
    });
  } catch (error) {
    return res.json({
      originCityCode,
      period,
      fallback: true,
      results: fallbackMostBooked.slice(0, max),
      message: error.message ?? 'Destinations populaires indisponibles, données de secours affichées.',
    });
  }
});

app.get('/api/flights/price-analysis', async (req, res) => {
  const origin = String(req.query.origin ?? '').trim().toUpperCase();
  const destination = String(req.query.destination ?? '').trim().toUpperCase();
  const startDate = String(req.query.startDate ?? new Date().toISOString().split('T')[0]).trim();
  const days = Math.min(Math.max(Number(req.query.days ?? 14), 5), 21);

  try {
    if (!origin || !destination || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ message: 'Paramètres analyse prix invalides.' });
    }

    const token = await getAmadeusToken();
    const start = new Date(`${startDate}T00:00:00Z`);
    const dateList = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return date.toISOString().split('T')[0];
    });

    const metrics = await Promise.all(
      dateList.map(async (departureDate) => {
        const query = toQuery({
          originIataCode: origin,
          destinationIataCode: destination,
          departureDate,
        });

        const response = await fetch(`https://test.api.amadeus.com/v1/analytics/itinerary-price-metrics?${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return { date: departureDate, amount: null };
        }

        const payload = await response.json().catch(() => null);
        const values = (payload?.data?.[0]?.priceMetrics ?? [])
          .map((metric) => Number(metric?.amount ?? metric?.price ?? metric?.value ?? 0))
          .filter((value) => Number.isFinite(value) && value > 0);

        if (values.length === 0) {
          return { date: departureDate, amount: null };
        }

        const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
        return { date: departureDate, amount: Number(avg.toFixed(2)) };
      })
    );

    const valid = metrics.filter((item) => typeof item.amount === 'number');

    if (valid.length === 0) {
      return res.json({
        origin,
        destination,
        fallback: true,
        results: buildFallbackPriceAnalysis(startDate, days),
      });
    }

    const amounts = valid.map((item) => Number(item.amount));
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const span = Math.max(1, max - min);
    const lowThreshold = min + span / 3;
    const highThreshold = min + (2 * span) / 3;

    const results = valid.map((item) => {
      const amount = Number(item.amount);
      const level = amount <= lowThreshold ? 'low' : amount >= highThreshold ? 'high' : 'medium';
      return {
        date: item.date,
        amount,
        level,
      };
    });

    return res.json({
      origin,
      destination,
      results,
    });
  } catch (error) {
    return res.json({
      origin,
      destination,
      fallback: true,
      results: buildFallbackPriceAnalysis(startDate, days),
      message: error.message ?? 'Analyse prix indisponible, estimation affichée.',
    });
  }
});

app.post('/api/search/hotels', async (req, res) => {
  const { params, filters } = req.body ?? {};
  try {
    if (!params?.city || !params?.checkInDate || !params?.checkOutDate || !params?.guests) {
      return res.status(400).json({ message: 'Paramètres de recherche hôtels invalides.' });
    }

    const token = await getAmadeusToken();
    const cityCode = await resolveAmadeusCityCode(params.city);

    if (!cityCode) {
      throw new Error('Ville introuvable pour la recherche hôtels Amadeus.');
    }

    const nights = getStayNights(params.checkInDate, params.checkOutDate);
    const hotelIds = await getAmadeusHotelIdsByCity(token, cityCode, 20);

    if (hotelIds.length === 0) {
      throw new Error('Aucun hôtel trouvé pour cette ville dans Amadeus.');
    }

    const query = toQuery({
      hotelIds: hotelIds.join(','),
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      adults: Number(params.guests),
      roomQuantity: 1,
      bestRateOnly: true,
      includeClosed: false,
      view: 'LIGHT',
    });

    const hotelsResponse = await fetch(`https://test.api.amadeus.com/v3/shopping/hotel-offers?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!hotelsResponse.ok) {
      const payload = await hotelsResponse.json().catch(() => null);
      const detail = payload?.message || payload?.error || payload?.errors?.[0]?.detail;
      throw new Error(detail ?? 'hotels-api indisponible.');
    }

    const payload = await hotelsResponse.json();
    const source = payload.data ?? [];
    const mapped = source
      .map((item) => mapAmadeusHotelOffer(item, nights, params.city))
      .filter((item) => item.pricePerNight > 0)
      .slice(0, 50);
    return res.json({ results: applyHotelFilters(mapped, filters) });
  } catch (error) {
    const fallback = params ? applyHotelFilters(mockHotels(params), filters) : [];
    return res.json({
      results: fallback,
      fallback: true,
      message: error.message ?? 'API hôtels indisponible, résultats de secours affichés.',
    });
  }
});

app.get('/api/search/hotels/suggestions', async (req, res) => {
  const keyword = String(req.query.keyword ?? '').trim();

  try {
    const results = await getHotelSuggestionsByKeyword(keyword);
    return res.json({ results });
  } catch (error) {
    return res.json({
      results: [],
      fallback: true,
      message: error.message ?? 'Suggestions hôtels indisponibles.',
    });
  }
});

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'mobio-auth-api' });
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body ?? {};

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'Champs obligatoires manquants.' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Cet email existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      email: String(email).toLowerCase().trim(),
      displayName: String(displayName).trim(),
      passwordHash,
    });

    return res.status(201).json({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    return res.json({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

const start = async () => {
  await mongoose.connect(mongoUri);
  const server = app.listen(port, () => {
    console.log(`Mobio API running on http://localhost:${port}`);
  });

  server.on('error', async (error) => {
    if (error?.code === 'EADDRINUSE') {
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        const payload = await response.json().catch(() => null);
        if (response.ok && payload?.service === 'mobio-auth-api') {
          console.log(`Mobio API already running on http://localhost:${port}`);
          process.exit(0);
          return;
        }
      } catch {
      }

      console.error(`Port ${port} déjà utilisé par un autre processus.`);
      process.exit(1);
      return;
    }

    console.error('Erreur serveur:', error);
    process.exit(1);
  });
};

start().catch((error) => {
  console.error('Impossible de démarrer le serveur:', error);
  process.exit(1);
});
