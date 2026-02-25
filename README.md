# Mobio - Flight & Hotel Booking

Application de réservation voyages avec:
- Frontend React + TypeScript + Vite
- Backend Node.js + Express
- MongoDB (auth + achats)
- Paiements Stripe (backend)

## Architecture

### Frontend
- React + Vite
- React Router (SPA)
- API client pour vols/hôtels/auth/paiement

### Backend
- Express
- MongoDB + Mongoose
- Stripe (Payment Intents)

## Installation locale

### 1) Frontend

```bash
npm install
```

### 2) Backend

```bash
npm install --prefix server
```

## Variables d'environnement

### Frontend (`.env`)

Copier `.env.example` vers `.env`.

Variables principales:
- `VITE_API_MODE=mock|live`
- `VITE_API_SERVER_URL=http://localhost:4000/api`
- `VITE_AUTH_SERVER_URL=http://localhost:4000/api/auth`
- `VITE_PAYMENT_SERVER_URL=http://localhost:4000/api/payments`
- `VITE_AMADEUS_CLIENT_ID`
- `VITE_AMADEUS_CLIENT_SECRET`
- `VITE_HOTELS_API_KEY`
- `VITE_STRIPE_PUBLIC_KEY`

### Backend (`server/.env`)

Copier `server/.env.example` vers `server/.env`.

Variables:
- `PORT=4000`
- `MONGODB_URI`
- `CLIENT_ORIGIN=http://localhost:5173`
- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`
- `HOTELS_API_KEY`
- `HOTELS_API_BASE_URL`
- `STRIPE_SECRET_KEY`

## Lancement local

Terminal 1 (API):

```bash
npm run dev:server
```

Terminal 2 (frontend):

```bash
npm run dev
```

## Déploiement recommandé

Ce repo est prêt pour:
- Frontend: **Vercel** (fichier `vercel.json`)
- Backend: **Render** (fichier `render.yaml`)

### 1) Déployer le backend (Render)

1. Créer un nouveau Web Service sur Render depuis ce repo.
2. Render détecte `render.yaml` automatiquement.
3. Renseigner les valeurs des variables d'environnement demandées.
4. Récupérer l'URL backend, ex: `https://mobio-api.onrender.com`.

### 2) Déployer le frontend (Vercel)

1. Importer le repo dans Vercel.
2. Framework: `Vite`.
3. Build command: `npm run build`.
4. Output dir: `dist`.
5. Variables frontend à définir dans Vercel:
	- `VITE_API_MODE=live`
	- `VITE_API_SERVER_URL=https://<backend>/api`
	- `VITE_AUTH_SERVER_URL=https://<backend>/api/auth`
	- `VITE_PAYMENT_SERVER_URL=https://<backend>/api/payments`
	- `VITE_AMADEUS_CLIENT_ID`, `VITE_AMADEUS_CLIENT_SECRET`
	- `VITE_HOTELS_API_KEY`
	- `VITE_STRIPE_PUBLIC_KEY`

### 3) CORS backend

Dans Render, définir `CLIENT_ORIGIN` avec l'URL Vercel finale, par exemple:

```bash
CLIENT_ORIGIN=https://mobio.vercel.app
```

## Vérification post-déploiement

- `GET /health` sur le backend
- Signup / Signin
- Recherche vols / hôtels
- Ajout panier et checkout
- Paiement Stripe

## Sécurité

- Ne jamais commiter de secrets dans `.env`
- Régénérer immédiatement toute clé exposée publiquement
- Utiliser des clés Stripe de production uniquement en environnement production
