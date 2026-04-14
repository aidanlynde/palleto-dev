# Palleto

Mobile app MVP for creatives to capture real-world inspiration and turn it into structured inspiration cards.

## Monorepo Structure

```text
/mobile   Expo + React Native + TypeScript app
/backend  FastAPI service
/docs     Product and design documentation
```

The current implementation covers Phase 1 only: project scaffolding, a bootable mobile shell, and a minimal backend health endpoint.

## Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+

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

## Mobile

```bash
cd mobile
npm install
cp .env.example .env
npm run start
```

Use Expo Go or a simulator from the Expo developer tools.

## Environment

Root `.env.example` contains shared development defaults. Each app also has a local example file:

- `backend/.env.example`
- `mobile/.env.example`

Do not commit real Firebase, RevenueCat, database, or provider credentials.

## Current Scope

Implemented:

- monorepo scaffolding
- Expo TypeScript app shell
- simple stack-based mobile navigation
- FastAPI app shell
- `/api/v1/health`
- minimal backend settings

Not implemented yet:

- auth
- database models
- image analysis
- card business logic
- subscriptions
- analytics
