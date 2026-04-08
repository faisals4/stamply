# Stamply

Multi-tenant loyalty cards SaaS — a OneCup Cards competitor.

**Tagline:** Build beautiful digital loyalty cards in Apple Wallet & Google Wallet in minutes.

## Stack

- **Backend:** Laravel 11 (PHP 8.3) + Postgres (Neon) + Redis
- **Frontend:** React 19 + Vite + TypeScript + Tailwind + shadcn/ui
- **Wallet:** Apple PassKit + Google Wallet API (open-source PHP libraries)
- **Queues:** Laravel Horizon
- **Hosting:** Laravel Cloud (API) + Vercel (Web) + Neon (DB)

## Repository Structure

```
Stamply/
├── api/            # Laravel 11 backend (starts Phase 0 after Herd is installed)
├── web/            # React SPA — merchant admin + customer PWA
└── docs/           # Architecture, API reference, wallet setup, deployment
```

## Project Status

**Phase:** 0 — Foundation
**Progress:** Repo scaffold + React SPA starting. Laravel API blocked on Herd install.

See [docs/roadmap.md](docs/roadmap.md) for the 24-week phased roadmap.

## Local Development

### Frontend (web/)

```bash
cd web
pnpm install
pnpm dev
# opens at http://localhost:5173
```

### Backend (api/) — coming soon

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

## Prerequisites

- Node.js 20+ and pnpm 10+
- PHP 8.3+ and Composer 2+ (via [Laravel Herd](https://herd.laravel.com))
- Postgres 16 (or a Neon cloud DB URL)
- Redis (optional for local; required for queues in production)
