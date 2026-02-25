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
- `VITE_AMADEUS_CLIENT_ID`
- `VITE_AMADEUS_CLIENT_SECRET`
- `VITE_HOTELS_API_KEY`
- `VITE_AUTH_SERVER_URL=http://localhost:4000/api/auth`
- `VITE_PAYMENT_SERVER_URL`

### Backend (`server/.env`)

Copier `server/.env.example` vers `server/.env`.

Variables:
- `PORT=4000`
- `MONGODB_URI=mongodb://127.0.0.1:27017/mobio`
- `CLIENT_ORIGIN=http://localhost:5173`

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

## Notes

- En mode `live`, renseigner vos clés Amadeus et Hotels API.
- L'auth n'utilise plus de compte mock: elle dépend de l'API MongoDB.
