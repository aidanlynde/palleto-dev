# Palleto

Mobile app MVP for creatives to capture real-world inspiration and turn it into structured inspiration cards.

## Monorepo Structure

```text
/mobile   Expo + React Native + TypeScript app
/backend  FastAPI service
/docs     Product and design documentation
```

The current implementation covers the first incremental slices: project scaffolding, a bootable mobile shell, Firebase social auth wiring, minimal backend user sync, and a backend health endpoint.

## Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+
- PostgreSQL for local user sync
- Firebase project with Google and Apple sign-in providers enabled

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

Health check:

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{ "status": "ok" }
```

Authenticated user sync:

```bash
curl http://localhost:8000/api/v1/me \
  -H "Authorization: Bearer <firebase_id_token>"
```

## Mobile

```bash
cd mobile
npm install
cp .env.example .env
npm run start
```

Use Expo Go or a simulator from the Expo developer tools.

For a native development build:

```bash
cd mobile
npx eas login
npx eas build:configure
npx eas build --profile development --platform ios
npm run start:dev-client
```

The development build uses `mobile/eas.json` and the Firebase native config files in `mobile/`.

## Environment

Root `.env.example` contains shared development defaults. Each app also has a local example file:

- `backend/.env.example`
- `mobile/.env.example`

Do not commit real Firebase, RevenueCat, database, or provider credentials.

For Phase 2, configure:

- backend Firebase Admin credentials in `backend/.env`
- `DATABASE_URL` in `backend/.env`
- Expo public Firebase web app values in `mobile/.env`
- Google OAuth client IDs in `mobile/.env`
- `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env`

## Current Scope

Implemented:

- monorepo scaffolding
- Expo TypeScript app shell
- simple stack-based mobile navigation
- Firebase Google and Apple auth screen
- authenticated mobile API client
- FastAPI app shell
- `/api/v1/health`
- `/api/v1/me`
- minimal backend settings
- minimal `users` table for Firebase user sync

Not implemented yet:

- image analysis
- card business logic
- subscriptions
- analytics

## Railway Backend Deployment

Create a Railway project with:

- one backend service using the `backend` directory as the root
- one PostgreSQL database service

Backend service variables:

```env
APP_ENV=production
APP_NAME=Palleto API
API_V1_PREFIX=/api/v1
BACKEND_CORS_ORIGINS=
DATABASE_URL=${{ Postgres.DATABASE_URL }}
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_CREDENTIALS_PATH=
```

Use the Firebase service account JSON for the three Firebase values. Keep `FIREBASE_CREDENTIALS_PATH` empty on Railway.

After Railway generates the backend domain, set this in `mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend.up.railway.app
```
