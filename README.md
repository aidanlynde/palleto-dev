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

## RevenueCat

The mobile app uses RevenueCat for the paid Palleto Pro unlock.

Installed packages:

```bash
cd mobile
npm install --save react-native-purchases react-native-purchases-ui
```

Code entry points:

- `mobile/src/services/revenueCat.ts` configures the SDK with the public API key, tracks `CustomerInfo`, checks the `Palleto Pro` entitlement, presents the RevenueCat paywall, restores purchases, and opens Customer Center.
- `mobile/App.tsx` initializes RevenueCat once, identifies Firebase users with `Purchases.logIn(firebaseUser.uid)`, listens for `CustomerInfo` updates, and gates Share/Save/Refine through the paywall.
- `mobile/src/screens/ProfileScreen.tsx` exposes restore purchases and Customer Center.

RevenueCat dashboard setup required:

1. Create or open the Palleto RevenueCat project.
2. Add the app/store connection you are testing with. For early testing, RevenueCat Test Store can work; for TestFlight/App Store, connect the Apple app.
3. Create an entitlement with identifier exactly `Palleto Pro`.
4. Create a lifetime product with identifier exactly `lifetime_founding_sub`.
5. Attach `lifetime_founding_sub` to the `Palleto Pro` entitlement.
6. Create an Offering and add the lifetime package/product to it.
7. Create and attach a RevenueCat Paywall to that Offering.
8. Configure Customer Center in RevenueCat if the account plan supports it.

Native build notes:

- RevenueCat native modules do not work in Expo Go for real purchases. Use an EAS development or production build.
- iOS TestFlight/App Store purchase testing requires the In-App Purchase capability and an App Store Connect in-app purchase matching the RevenueCat product.
- Android purchase testing requires a Google Play product matching the RevenueCat product.

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
