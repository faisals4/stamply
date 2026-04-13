# Stamply

Multi-tenant loyalty cards SaaS — a OneCup Cards competitor.

**Tagline:** Build beautiful digital loyalty cards in Apple Wallet & Google Wallet in minutes.

## Repository Structure

```
Stamply/
├── mobile/         # React Native (Expo 54) customer + merchant app
├── web/            # React SPA — merchant admin dashboard (Vite + shadcn/ui)
├── api/            # Laravel 11 backend — REST API, wallet passes, queues
└── docs/           # Architecture, API reference, wallet setup, deployment
```

### mobile/

Customer-facing app with loyalty cards, store browsing, ordering, and checkout. Also includes merchant screens (dashboard, scanner, card editor). Built with Expo Router, NativeWind (Tailwind), React Query, and i18next for Arabic/English RTL support.

### web/

Merchant admin dashboard for managing stores, cards, analytics, and settings. Built with React 19, Vite, TypeScript, Tailwind, and shadcn/ui.

### api/

Laravel 11 backend powering both mobile and web clients. Handles authentication, merchant management, wallet pass generation (Apple PassKit + Google Wallet API), and order processing. Uses PostgreSQL (Neon) and Redis for queues (Laravel Horizon).

## Tech Stack

| Layer       | Tech                                                        |
|-------------|-------------------------------------------------------------|
| Mobile      | Expo 54, React Native 0.81, NativeWind 4, Expo Router 6    |
| Web         | React 19, Vite, TypeScript, Tailwind, shadcn/ui             |
| Backend     | Laravel 11, PHP 8.3, PostgreSQL (Neon), Redis               |
| Wallet      | Apple PassKit + Google Wallet API (open-source PHP libs)     |
| Queues      | Laravel Horizon                                              |
| Hosting     | Laravel Cloud (API) + Vercel (Web) + Neon (DB)              |

## Prerequisites

- Node.js 20+ and npm / pnpm 10+
- PHP 8.3+ and Composer 2+ (via [Laravel Herd](https://herd.laravel.com))
- PostgreSQL 16 (or a Neon cloud DB URL)
- Redis (optional locally; required for queues in production)

## Getting Started

### Mobile App

```bash
cd mobile
npm install
npx expo start
# Press i for iOS simulator, a for Android emulator, w for web
```

### Web Dashboard

```bash
cd web
pnpm install
pnpm dev
# Opens at http://localhost:5173
```

### Backend API

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
# Opens at http://localhost:8000
```

## Project Status

**Phase:** 0 — Foundation
**Progress:** Mobile app UI complete (demo data). Web dashboard in progress. API scaffolded.

See [docs/roadmap.md](docs/roadmap.md) for the 24-week phased roadmap.
