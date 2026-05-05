# Fleet Management System

Full-stack fleet management platform integrating with Saudi Arabia's **Tamm** (ELM vehicle/traffic platform) and **Naql** (transport permits platform).

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 10 + TypeScript + Prisma (PostgreSQL) |
| Web | Next.js 14 App Router + Tailwind CSS |
| Mobile | React Native 0.74 CLI (Android/iOS) |
| Real-time | Socket.io (`/fleet` namespace) |
| Auth | JWT (RS256-compatible, argon2 passwords) |
| Infra | Docker Compose (PostgreSQL 16, Redis 7) |

## Quick Start

### 1. Prerequisites
- Node.js 20+, pnpm (`npm i -g pnpm`), Docker Desktop

### 2. Install dependencies
```bash
pnpm install
```

### 3. Start infrastructure (PostgreSQL + Redis)
```bash
docker compose up postgres redis -d
```

### 4. Configure environment
```bash
copy packages\backend\.env.example packages\backend\.env
# Edit packages\backend\.env — set JWT_SECRET to a strong random string
```

### 5. Run DB migrations + seed demo data
```bash
cd packages\backend
pnpm db:migrate        # applies Prisma migrations
pnpm db:seed           # creates demo company, vehicles, drivers
```

### 6. Start backend
```bash
cd packages\backend
pnpm dev
# API: http://localhost:3001/api/v1
# Swagger: http://localhost:3001/api/docs
```

### 7. Start web dashboard (new terminal)
```bash
cd packages\web
pnpm dev
# Web: http://localhost:3000
```

### Demo login
- Email: `admin@alrashed.sa`
- Password: `Admin@1234`

---

## Mobile (React Native)

```bash
cd packages\mobile
npm install          # or yarn install (RN doesn't use pnpm)

# Android (emulator must be running)
npx react-native run-android

# iOS (macOS only)
cd ios && pod install && cd ..
npx react-native run-ios
```

> The mobile app hits `http://10.0.2.2:3001` (Android emulator host alias for localhost). Change `packages/mobile/src/lib/api.ts` for a real device.

---

## Docker (all services)

```bash
docker compose up --build
```

Services:
- `postgres` → port 5432
- `redis` → port 6379
- `backend` → port 3001
- `web` → port 3000

---

## Tamm & Naql Integration

Both integrations run in **mock mode** by default (`TAMM_MOCK=true`, `NAQL_MOCK=true` in `.env`). To enable real API calls:

1. Obtain credentials from [tamm.sa](https://tamm.sa) (ELM B2B subscription) or [naql.com.sa](https://naql.com.sa)
2. Set `TAMM_MOCK=false` and fill `TAMM_MOI_NUMBER`, `TAMM_CLIENT_ID`, `TAMM_CLIENT_SECRET`, and `TAMM_BASE_URL` in `.env`
3. Set `NAQL_MOCK=false` and fill `NAQL_API_KEY`, `NAQL_COMPANY_CODE`, `NAQL_BASE_URL`

---

## Project Structure

```
fleet-management/
├── packages/
│   ├── shared/          # Shared TypeScript types & interfaces
│   ├── backend/         # NestJS API server
│   │   ├── prisma/      # Schema, migrations, seed
│   │   └── src/
│   │       ├── auth/
│   │       ├── vehicles/
│   │       ├── drivers/
│   │       ├── trips/
│   │       ├── maintenance/
│   │       ├── fuel/
│   │       ├── documents/
│   │       ├── gateway/     # Socket.io real-time GPS
│   │       ├── dashboard/
│   │       ├── notifications/
│   │       └── integrations/
│   │           ├── tamm/
│   │           └── naql/
│   ├── web/             # Next.js 14 dashboard
│   └── mobile/          # React Native driver app
├── docker-compose.yml
└── pnpm-workspace.yaml
```
