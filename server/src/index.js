import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
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
  };
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
    const query = toQuery({
      originLocationCode: String(params.origin).toUpperCase(),
      destinationLocationCode: String(params.destination).toUpperCase(),
      departureDate: params.departureDate,
      adults: Number(params.travelers),
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
  app.listen(port, () => {
    console.log(`Mobio API running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error('Impossible de démarrer le serveur:', error);
  process.exit(1);
});
