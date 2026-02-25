# Mobio - Flight & Hotel Booking (Web + Mobile)

Interface reproduite selon votre maquette (style landing travel premium), avec:
- page d'accueil design (hero, moteur de recherche, sections deals/airlines/hôtels)
- pages compte et paiement
- responsive desktop/mobile
- gestion utilisateurs via **MongoDB**

## Architecture

### Frontend
- React + TypeScript + Vite
- React Router
- Services API: Amadeus (vols), Hotels API (hôtels)

### Backend Auth
- Node.js + Express
- MongoDB + Mongoose
- bcrypt pour hash des mots de passe

## Dossier serveur MongoDB

Le backend est dans `server/`.

Endpoints:
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /health`

## Installation

### 1) Frontend

```bash
npm install
```

### 2) Backend

```bash
npm install --prefix server
```

## Configuration

### Frontend (`.env`)

Copier `.env.example` vers `.env`.

Variables principales:
- `VITE_API_MODE=mock|live`
- `VITE_API_SERVER_URL=/api`
- `VITE_AMADEUS_CLIENT_ID`
- `VITE_AMADEUS_CLIENT_SECRET`
- `VITE_HOTELS_API_KEY`
- `VITE_AUTH_SERVER_URL=/api/auth`
- `VITE_PAYMENT_SERVER_URL=/api/payments`

### Backend (`server/.env`)

Copier `server/.env.example` vers `server/.env`.

Variables:
- `PORT=4000`
- `HOST=0.0.0.0`
- `MONGODB_URI`
- `CLIENT_ORIGIN=https://votre-front.example.com` (ou `*`)

## Lancement en local

Terminal 1 (API MongoDB):

```bash
npm run dev:server
```

Terminal 2 (frontend):

```bash
npm run dev
```

## Pages

- `/` : design principal type travel agency + recherche vols
- `/account` : inscription/connexion liée à MongoDB
- `/checkout` : paiement (simulé ou via backend paiement)

## Déploiement GitHub

1. Push du repo:

```bash
git add .
git commit -m "UI design + auth MongoDB"
git push origin main
```

2. Frontend: GitHub Pages / Vercel / Netlify
3. Backend MongoDB: Render / Railway / Fly.io / VPS

## Déploiement recommandé: Vercel + Render

### 1) Déployer l’API sur Render

- Créer un nouveau service Web Render à partir du repo (ou utiliser `render.yaml`).
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`

Variables Render à définir:
- `NODE_ENV=production`
- `PORT=4000`
- `HOST=0.0.0.0`
- `MONGODB_URI=...`
- `CLIENT_ORIGIN=https://votre-app.vercel.app`
- `AMADEUS_CLIENT_ID=...`
- `AMADEUS_CLIENT_SECRET=...`
- `HOTELS_API_KEY=...`
- `HOTELS_API_BASE_URL=https://api.hotels-api.com/v1/hotels/search`
- `STRIPE_SECRET_KEY=...`

Quand Render est prêt, noter l’URL publique, ex: `https://mobio-api.onrender.com`.

### 2) Déployer le frontend sur Vercel

- Importer le même repo sur Vercel.
- Framework détecté: Vite.
- Build command: `npm run build`
- Output directory: `dist`

Variables Vercel à définir:
- `VITE_API_MODE=live`
- `VITE_API_SERVER_URL=https://mobio-api.onrender.com/api`
- `VITE_AUTH_SERVER_URL=https://mobio-api.onrender.com/api/auth`
- `VITE_PAYMENT_SERVER_URL=https://mobio-api.onrender.com/api/payments`
- `VITE_AMADEUS_CLIENT_ID=...`
- `VITE_AMADEUS_CLIENT_SECRET=...`
- `VITE_HOTELS_API_KEY=...`
- `VITE_STRIPE_PUBLIC_KEY=...`

### 3) Finaliser CORS

- Revenir sur Render et mettre `CLIENT_ORIGIN` à l’URL finale Vercel.
- Redéployer Render si nécessaire.

### 4) Vérification rapide

- `GET https://...onrender.com/health` doit répondre `ok: true`.
- Sur Vercel: inscription/connexion + recherche vols/hôtels + paiement test Stripe.

### Configuration recommandée en production

- Frontend et backend derrière le même domaine (reverse proxy):
	- Front: `/`
	- API: `/api`
- Garder les URLs frontend en relatif (`/api`, `/api/auth`, `/api/payments`) pour éviter toute dépendance machine locale.
- Définir `CLIENT_ORIGIN` avec le domaine réel frontend (ou `*` si vous assumez cette ouverture CORS).

## Notes

- En mode `live`, renseigner vos clés Amadeus et Hotels API.
- L'auth n'utilise plus de compte mock: elle dépend de l'API MongoDB.
