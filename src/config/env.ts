const required = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`La variable d'environnement ${key} est manquante.`);
  }
  return value;
};

export const env = {
  apiMode: import.meta.env.VITE_API_MODE ?? 'mock',
  apiServerUrl: import.meta.env.VITE_API_SERVER_URL ?? 'http://localhost:4000/api',
  authServerUrl: import.meta.env.VITE_AUTH_SERVER_URL ?? 'http://localhost:4000/api/auth',
  paymentServerUrl: import.meta.env.VITE_PAYMENT_SERVER_URL,
  amadeusClientId: import.meta.env.VITE_AMADEUS_CLIENT_ID,
  amadeusClientSecret: import.meta.env.VITE_AMADEUS_CLIENT_SECRET,
  hotelsApiKey: import.meta.env.VITE_HOTELS_API_KEY,
};

export const requireAmadeusCredentials = () => ({
  clientId: required(env.amadeusClientId, 'VITE_AMADEUS_CLIENT_ID'),
  clientSecret: required(env.amadeusClientSecret, 'VITE_AMADEUS_CLIENT_SECRET'),
});

export const requireHotelsApiKey = () => required(env.hotelsApiKey, 'VITE_HOTELS_API_KEY');
