# CarpoolNetwork

> **Trusted community ride-sharing for the UK**
> Your community already shares rides. Now do it properly.

[![CI](https://github.com/carpoolnetwork/carpoolnetwork/actions/workflows/ci.yml/badge.svg)](https://github.com/carpoolnetwork/carpoolnetwork/actions)
[![Netlify Status](https://api.netlify.com/api/v1/badges/placeholder/deploy-status)](https://carpoolnetwork.co.uk)

---

## What is CarpoolNetwork?

CarpoolNetwork is a ride coordination platform for communities who already trust each other. It replaces chaotic WhatsApp ride-sharing threads with a structured ride board — post rides, find rides, book seats, coordinate pickup.

**Who it's for:**
- Existing WhatsApp ride-sharing groups
- Language-based communities (Telugu, Punjabi, Polish, etc.)
- Location-based communities (neighbourhood, workplace, school)
- Recurring commuters sharing routes

**What it's not:**
- Not a ride-hailing app (no Uber-style dispatch)
- Not a stranger-matching marketplace (community-first)
- Not a social network (no feeds, leaderboards, stories)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vite 7 · Tailwind CSS |
| Backend | Supabase (Auth + PostgreSQL + Realtime + Storage) |
| Functions | Netlify Functions (serverless) |
| Maps | Google Maps Platform |
| Monitoring | Sentry |
| Mobile | Capacitor (iOS/Android shells) |
| Hosting | Netlify · carpoolnetwork.co.uk |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Supabase project (with URL and anon key)
- Google Maps API key

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd CarpoolNetwork

# Install dependencies
npm ci

# Set up environment
cp .env.example .env
# Edit .env with your Supabase and Google Maps credentials

# Run database migrations
# (via Supabase CLI or dashboard)

# Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run test:unit` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Project Structure

```
src/
├── pages/           # Route-level page components
│   ├── auth/        # Sign in, sign up, verification
│   ├── admin/       # Admin panel pages
│   └── public/      # Public marketing pages
├── components/      # Reusable UI components
│   ├── rides/       # Ride cards, search, maps
│   ├── messaging/   # Chat system
│   ├── community/   # Community features
│   ├── layout/      # App shell, navigation
│   ├── shared/      # Common UI components
│   └── ...
├── services/        # API/business logic layer
├── contexts/        # React context providers
├── hooks/           # Custom React hooks
├── lib/             # Core utilities (Supabase, analytics, lifecycle)
├── types/           # TypeScript type definitions
└── utils/           # Helper functions

supabase/
├── migrations/      # SQL migrations (112 files)
└── functions/       # Supabase Edge Functions

netlify/
└── functions/       # Netlify serverless functions
```

## Documentation

| Document | Description |
|----------|-------------|
| [STATUS.md](STATUS.md) | Current project status |
| [ROADMAP.md](ROADMAP.md) | Development roadmap |
| [PRODUCT_SCOPE_V1.md](PRODUCT_SCOPE_V1.md) | V1 product definition |
| [ENGINEERING_PRIORITIES.md](ENGINEERING_PRIORITIES.md) | Prioritised task list |
| [GAP_ANALYSIS_PRIVATE_BETA.md](GAP_ANALYSIS_PRIVATE_BETA.md) | Beta readiness gaps |

### Ops & Setup

See `docs/ops/` for deployment runbooks, environment setup, and operational guides.

### Architecture

See `docs/engineering/` for system design, data flow, and invariants.

## Environment Variables

Copy `.env.example` and fill in your values:

```
VITE_SUPABASE_URL=         # Supabase project URL
VITE_SUPABASE_ANON_KEY=    # Supabase anon/public key
VITE_GOOGLE_MAPS_API_KEY=  # Google Maps API key
VITE_SENTRY_DSN=           # Sentry error tracking DSN
VITE_APP_ENV=              # development | staging | production
```

## Deployment

The app deploys to Netlify on push to main. Configuration is in `netlify.toml`.

- **Domain:** carpoolnetwork.co.uk
- **Build:** `npm ci && npm run build`
- **Output:** `dist/`

## License

Private. All rights reserved.
