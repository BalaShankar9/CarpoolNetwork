# CarpoolNetwork

> **Community-first ride sharing for the UK**

CarpoolNetwork is a full-stack ride coordination platform built for communities who already trust each other. It replaces chaotic WhatsApp ride-sharing threads with a structured ride board where members can post rides, search routes, book seats, and coordinate pickups in real time.

---

## Screenshots

| Ride Board | Messaging | Admin Dashboard |
|:---:|:---:|:---:|
| Search & book rides | Real-time chat with riders | Platform health & monitoring |

---

## Features

### Core
- **Ride Posting & Search** — Post rides with route, stops, time, and available seats. Passengers search by origin/destination with smart matching.
- **Seat Booking** — Atomic booking with real-time seat availability updates.
- **Real-time Messaging** — Direct messages, ride conversations, and community chat with WhatsApp integration.
- **Google Maps Integration** — Route visualization, distance calculation, and location autocomplete.

### Community & Social
- **Community Groups** — Create and join communities with forums, chat, and shared ride boards.
- **Friends System** — Add friends, favourite drivers, and build trusted networks.
- **Social Hub** — Activity feed, ride stories, user presence, and social waves.
- **Preference Matching** — Smart ride recommendations based on commute patterns and user preferences.

### Safety & Trust
- **Driver Verification** — License verification, photo verification, and document checks.
- **Trust Scoring** — Dynamic trust and reliability scores based on ride history and behaviour.
- **Emergency Alerts** — SOS system with emergency contacts integration.
- **Two-Factor Authentication** — TOTP-based 2FA with recovery codes.
- **Row-Level Security** — Every database table protected with Supabase RLS policies.

### Admin Panel
- **User Management** — View, flag, suspend, and manage user accounts.
- **Incident Monitoring** — Error tracking pipeline with fingerprint-based deduplication.
- **Platform Health** — Composite health score (uptime, error rate, MTTR, fix rate).
- **Community Moderation** — Content moderation, banned words, and audit logging.
- **Analytics Dashboard** — Ride metrics, user growth, booking success rates, and engagement stats.

### Platform
- **Notifications** — Push notifications, in-app alerts, and email notifications with templates.
- **Subscription System** — Tiered subscription plans with Stripe integration.
- **Payment Processing** — Stripe-powered payments with split payment support.
- **Gamification** — Achievements, challenges, and leaderboards.
- **Offline Support** — Offline queue for actions taken without connectivity.
- **Mobile Ready** — Capacitor-powered iOS and Android shells.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 · TypeScript · Vite 7 · Tailwind CSS · Framer Motion |
| **Backend** | Supabase (Auth · PostgreSQL · Realtime · Storage · Edge Functions) |
| **Serverless** | Netlify Functions |
| **Maps** | Google Maps Platform |
| **Payments** | Stripe |
| **Monitoring** | Sentry |
| **Mobile** | Capacitor (iOS / Android) |
| **Hosting** | Netlify |
| **AI** | Google Gemini (AI bug triage, smart assistant) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                    │
│  Pages · Components · Contexts · Hooks · Services       │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌───────────┐ ┌────────────┐
   │  Supabase  │ │  Netlify  │ │  External  │
   │  Platform  │ │ Functions │ │   APIs     │
   ├────────────┤ ├───────────┤ ├────────────┤
   │ Auth       │ │ Stripe    │ │ Google Maps│
   │ PostgreSQL │ │ AI Triage │ │ Sentry     │
   │ Realtime   │ │ Webhooks  │ │ Gemini AI  │
   │ Storage    │ │ Config    │ │            │
   │ Edge Funcs │ │           │ │            │
   └────────────┘ └───────────┘ └────────────┘
```

### Database

- **162 tables** across 15+ domains (rides, messaging, safety, analytics, admin, social, payments, etc.)
- **129 migrations** with full RLS coverage
- **6 Edge Functions** (metrics aggregation, email validation, vehicle lookup, 2FA, AI proxy, auto-expiry)
- **PostGIS** enabled for geospatial queries
- **Realtime** subscriptions on critical tables

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Supabase project (URL + anon key)
- Google Maps API key

### Setup

```bash
# Clone
git clone https://github.com/BalaShankar9/CarpoolNetwork.git
cd CarpoolNetwork

# Install
npm ci

# Configure environment
cp .env.example .env
# Fill in your Supabase, Google Maps, Stripe, and Sentry credentials

# Run migrations (via Supabase CLI or dashboard)
# supabase db push

# Start dev server
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run test:unit` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run cap:sync` | Build + sync to mobile |

---

## Project Structure

```
src/
├── pages/              # Route-level page components
│   ├── auth/           # Sign in, sign up, verification
│   ├── admin/          # Admin panel (users, incidents, analytics)
│   └── public/         # Public marketing pages
├── components/         # UI components
│   ├── rides/          # Ride cards, search, maps
│   ├── messaging/      # Chat system
│   ├── community/      # Community features
│   ├── admin/          # Admin dashboard components
│   ├── social/         # Social hub, activity feed
│   ├── layout/         # App shell, navigation
│   └── shared/         # Common UI components
├── services/           # API & business logic (50+ services)
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── lib/                # Core utilities (Supabase client, analytics)
├── types/              # TypeScript type definitions
└── utils/              # Helper functions

supabase/
├── migrations/         # 129 SQL migration files
└── functions/          # 6 Supabase Edge Functions

netlify/
└── functions/          # Serverless functions (Stripe, AI, config)
```

---

## Environment Variables

```env
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anon/public key
VITE_GOOGLE_MAPS_API_KEY=    # Google Maps API key
VITE_SENTRY_DSN=             # Sentry error tracking DSN
VITE_APP_ENV=                # development | staging | production
VITE_STRIPE_PUBLISHABLE_KEY= # Stripe publishable key
STRIPE_SECRET_KEY=           # Stripe secret key (server-side)
```

See `.env.example` for the full list.

---

## Deployment

Deploys to **Netlify** on push to `main`.

- **Domain:** carpoolnetwork.co.uk
- **Build:** `npm ci && npm run build`
- **Output:** `dist/`
- **Config:** `netlify.toml`

---

## Documentation

| Document | Description |
|---|---|
| [PRODUCT_SCOPE_V1.md](PRODUCT_SCOPE_V1.md) | V1 product definition |
| [ROADMAP.md](ROADMAP.md) | Development roadmap |
| [STATUS.md](STATUS.md) | Current project status |
| [docs/SYSTEM_DESIGN_NARRATIVE.md](docs/SYSTEM_DESIGN_NARRATIVE.md) | System architecture |
| [docs/SECURITY_AUDIT_REPORT.md](docs/SECURITY_AUDIT_REPORT.md) | Security audit |
| [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) | Launch readiness |
| [docs/DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md) | Deployment guide |

---

## Contributing

This is currently a private project. If you're interested in contributing, please open an issue to discuss.

---

## License

All rights reserved.
