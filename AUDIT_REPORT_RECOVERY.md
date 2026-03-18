# AUDIT REPORT — RECOVERY PLAN

**Date:** 2026-03-09
**Auditor:** Principal Product Engineer / Recovery Lead
**Domain:** carpoolnetwork.co.uk
**Stack:** React 18 + TypeScript + Vite 7 + Supabase + Netlify + Capacitor

---

## Executive Summary

CarpoolNetwork is a **real, actively-developed application** — not a throwaway prototype. The core infrastructure (auth, deployment, database, ride lifecycle) is genuinely production-grade. However, the project has suffered from **severe scope creep, documentation sprawl, and feature-factory engineering** that has buried the MVP under layers of aspirational functionality.

**The honest diagnosis:**
- The app has ~230 React components across 34 directories — roughly 2.5× what an MVP needs.
- There are 82 markdown documents, most of which are stale phase reports and one-time fix instructions.
- The root directory has 38 `.md` files, 5 screenshot PNGs, and feels like a project dump, not a product.
- Features like gamification, leaderboards, carbon rewards, social story carousels, AI chatbot, premium subscriptions, and referral programs exist in code — none of these are needed for launch.
- 3 entire service files (~1,400 lines) are completely dead code — never imported anywhere.
- The payment system references Stripe but has a hardcoded "demo_secret" and no confirmed payment flow.
- The landing page displays fabricated statistics ("1,200+ Active Members") and fake testimonials.

**What's actually good:**
- Auth system is excellent: 6 auth methods, 4-tier RBAC, 52 granular permissions, beta gating
- Ride lifecycle state machine is clean and well-modeled
- Database schema is rich (112 migrations, proper RLS, PostGIS)
- Deployment config is production-grade (Netlify + CSP + HSTS + CI/CD)
- Core ride flows (post, find, book, request) appear functional
- Messaging system has real resilience engineering
- Capacitor config exists for native mobile shells

**Recovery verdict:** This project does NOT need a rebuild. It needs **aggressive pruning, focus, and a launch-track sprint.** The core 40% of this codebase is launchable. The other 60% needs to be feature-flagged, hidden, or deferred.

---

## Current State Diagnosis

### What Actually Exists

| Layer | Status | Evidence |
|-------|--------|----------|
| **Frontend app** | ✅ Real | React 18 + Vite 7 + TypeScript SPA, 89 page files, 230 components |
| **Auth system** | ✅ Production-grade | Email/password, Google/GitHub OAuth, OTP (email + phone), password reset, email verification, RBAC |
| **Database** | ✅ Real | Supabase + PostGIS, 112 SQL migrations (Oct 2025 → Mar 2026), RLS policies |
| **Ride system** | ✅ Core functional | Post, find, search, request, book, ride details, ride lifecycle FSM |
| **Messaging** | ✅ Real | Resilient RPC wrapper, realtime subscriptions, conversation system |
| **Admin panel** | ✅ Over-built | 37 admin pages covering users, rides, bookings, messages, community, analytics, incidents, safety |
| **Maps/location** | ✅ Partial | Google Maps integration for directions/geocoding; weather/air-quality features aspirational |
| **Payments** | ⚠️ Facade | Stripe references exist (12 Netlify functions), webhook handler is real, but client-side has hardcoded demo secrets |
| **Mobile** | ⚠️ Shell only | Capacitor config for iOS/Android, no native features confirmed |
| **Community/Social** | ⚠️ Over-built | 1,413-line monolith community page + 22-component social hub + orphaned services |
| **Gamification** | 🔴 Not needed | Achievements, challenges, leaderboards, carbon rewards — no user demand |
| **Premium/Subscriptions** | 🔴 Not needed | Membership tiers, premium gates — no payment backend confirmed |
| **AI features** | 🔴 Not needed | Chatbot (Gemini/OpenAI), smart recommendations, AI bug triage |
| **Tests** | ⚠️ Partial | 14 unit tests, 30+ e2e test files (Playwright), but e2e not in CI |

### Feature Surface vs. MVP Need

```
IMPLEMENTED (230+ components)    │    NEEDED FOR MVP (~100 components)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Auth (14 components)             │    Auth (14) ✅
Rides (17 components)            │    Rides (17) ✅
Messaging (11 components)        │    Messaging (11) ✅
Community (2 components)         │    Community (2) ✅
Dashboard (2 components)         │    Dashboard (2) ✅
Onboarding (6 components)        │    Onboarding (6) ✅
Landing (3 components)           │    Landing (3) ✅
Notifications (2 components)     │    Notifications (2) ✅
Profile (11 components)          │    Profile (6) ⚠️ trim
Settings (9 components)          │    Settings (5) ⚠️ trim
Shared/UI (27 components)        │    Shared/UI (15) ⚠️ trim
Reviews (1 component)            │    Reviews (1) ✅
Admin (36+ components)           │    Admin (10) ⚠️ trim heavily
Pools (7 components)             │    ❌ defer
Safety (10 components)           │    Safety (3) ⚠️ trim
Payments (4 components)          │    ❌ defer (free beta)
Social Hub (22 components)       │    ❌ defer
Gamification (7 components)      │    ❌ defer
Leaderboards (5 components)      │    ❌ defer
Challenges (3 components)        │    ❌ defer
Membership (3 components)        │    ❌ defer
Premium (1 component)            │    ❌ defer
Rewards (3 components)           │    ❌ defer
Referral (3 components)          │    ❌ defer
Eco (1 component)                │    ❌ defer
Developer (2 components)         │    ❌ remove
Favorites (4 components)         │    ❌ defer
Preferences (7 components)       │    ❌ defer (basic only)
Disputes (2 components)          │    ❌ defer
I18n (2 components)              │    ❌ defer
PWA (4 components)               │    PWA (2) ⚠️ trim
```

---

## Architecture Summary

### Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18.3, TypeScript 5.5, Vite 7.3 | Solid choices |
| Styling | Tailwind CSS 3.4 | Standard |
| Routing | react-router-dom 6.30 | Stable |
| Animation | framer-motion 12.25 | Heavy for MVP |
| Icons | lucide-react | Good |
| State | React Context (Auth, Realtime, Social, Premium) | No Redux/Zustand — fine for now |
| Backend | Supabase (Auth + DB + Realtime + Storage) | Good serverless choice |
| Functions | Netlify Functions (12 functions) | Stripe, AI, config |
| Maps | @googlemaps/js-api-loader | Real integration |
| Payments | @stripe/stripe-js + react-stripe-js | Referenced, not confirmed working |
| Monitoring | @sentry/react + vite-plugin | Production monitoring |
| Charts | recharts 3.6 | For analytics pages |
| Mobile | Capacitor 8 (iOS + Android shells) | Config exists, no native features |
| CI/CD | GitHub Actions (build + test + audit) | E2E tests not in CI |
| Hosting | Netlify (with proper CSP, HSTS, caching) | Production-ready config |

### Data Model (Core Tables)

| Table | Purpose | Quality |
|-------|---------|---------|
| `profiles` | User profiles (50+ columns) | ✅ Rich, possibly too rich |
| `rides` | Ride offers | ✅ Solid (origin/dest, polyline, recurring, status FSM) |
| `bookings` | Seat reservations | ✅ With atomic RPC |
| `ride_requests` | Passenger requests | ✅ Matching system |
| `conversations` + `messages` | Messaging | ✅ Real, with resilience layer |
| `vehicles` | Driver vehicles | ✅ Clean |
| `community_posts` + `comments` | Forum | ✅ Working |
| `beta_allowlist` | Beta access control | ✅ Useful |
| `admin_roles` | RBAC permissions | ✅ Well-modeled |
| `achievements` | Gamification | 🔴 Not needed for MVP |
| `subscriptions` | Premium tiers | 🔴 Not needed for MVP |
| `emergency_contacts` | Safety | 🟡 Nice-to-have |
| `safety_reports` | Incident reporting | 🟡 Phase 2 |

---

## Reusable Assets (What to Preserve)

These are genuinely well-built and should be kept:

1. **Auth system** — 6 auth methods, RBAC, beta gating. Keep all of it.
2. **Ride lifecycle FSM** (`src/lib/rideLifecycle.ts`) — Clean state machine with grace periods.
3. **Schema health check** (`src/lib/schemaHealthCheck.ts`) — Runtime DB verification. Excellent.
4. **Messaging resilience** (`src/services/messagingUtils.ts`) — Error classification, retry logic.
5. **Service gating hook** (`src/hooks/useServiceGating.tsx`) — Blocks actions for incomplete profiles.
6. **Route registry** (`src/lib/routeRegistry.ts`) — Centralized route catalog with SEO metadata.
7. **Deployment config** — Netlify + CI/CD + CSP headers. Production-ready.
8. **Core Supabase migrations** — The schema is rich and real (though needs consolidation).
9. **Vehicle service** (`src/services/vehicleService.ts`) — Small, clean, tested.
10. **Ride search/post pages** — Large but functional with Google Maps integration.

---

## Clutter / Mess / Entropy Sources

### 1. Documentation Sprawl (82 markdown files)

| Category | Count | Examples |
|----------|-------|---------|
| Phase completion reports | 13 | PHASE_1_STATUS, PHASE_2_COMPLETION_REPORT, PHASE_7_8_COMPLETION_REPORT... |
| Fix/patch notes | 8 | EMAIL_BOUNCE_FIX, IMAGE_DISPLAY_FIX, MESSAGING_FIX_SUMMARY... |
| Deployment/ops guides | 6 | DEPLOY_NOW, DEPLOYMENT_GUIDE, QUICK_FIX_GUIDE... |
| Audit reports | 5 | FULL_AUDIT_REPORT, FLOW_AUDIT_REPORT, CODE_CHECK_REPORT... |
| Feature specs | 4 | FACE_VERIFICATION, GOOGLE_MAPS_INTEGRATION, SMART_INTELLIGENCE... |
| Architecture docs | 3 | flow-map (×2), invariants (×2), state-model (×2) — duplicated root+docs |
| Setup guides | 3 | EMAIL_VERIFICATION_SETUP (×2), SUPABASE_EMAIL_VERIFICATION_SETUP... |

**Root cause:** Every coding session appears to produce a new markdown file instead of updating a single living document. This creates the illusion of progress while making it impossible to know the current state.

### 2. Dead Code (~2,500 lines)

| File | Lines | Problem |
|------|-------|---------|
| `groupsService.ts` | 435 | Never imported by any component |
| `socialFeedService.ts` | 704 | Never imported by any component |
| `reviewService.ts` | 258 | Never imported by any component |
| Various gamification services | ~1,000+ | Imported but non-functional (client-side only, no DB backing) |

### 3. Feature-Factory Bloat

The project has 34 component directories. A focused MVP should have 12–15. The following directories represent features that no early user has asked for:

- `gamification/` (7 components)
- `leaderboards/` (5 components)
- `challenges/` (3 components)
- `rewards/` (3 components)
- `membership/` (3 components)
- `premium/` (1 component)
- `referral/` (3 components)
- `eco/` (1 component)
- `developer/` (2 components)

### 4. Root Directory Pollution

38 markdown files + 5 PNGs in root. A professional project root should have: README, LICENSE, CONTRIBUTING, CHANGELOG — that's it for docs.

### 5. Migration Churn

112 SQL migrations in 5 months. Many are "fix" migrations that patch earlier ones (e.g., `fix_rls_performance`, `fix_booking_status`, `fix_vehicle_delete_cascade`). This suggests insufficient testing of migrations before committing.

### 6. Duplicated Architecture Docs

`flow-map.md`, `invariants.md`, and `state-model.md` each exist in BOTH the root directory AND `docs/`. This guarantees they'll drift out of sync.

---

## Likely Blockers to Launch

1. **No confirmed working payment flow** — Stripe is referenced but has demo secrets. Decision needed: launch free or fix payments.
2. **Fabricated landing page data** — "1,200+ Active Members" is a lie. Must replace with honest messaging before launch.
3. **database.types.ts drift** — Hand-maintained types likely don't match the DB after 112 migrations. Will cause runtime errors.
4. **No community onboarding flow** — The product is supposed to serve existing WhatsApp groups, but there's no "create a community" or "invite your group" flow visible.
5. **E2E tests not in CI** — 30+ Playwright tests exist but aren't run on deploy. Regressions go undetected.
6. **Admin panel over-built** — 37 admin pages for a platform with zero users. Founder will waste time in admin instead of talking to users.
7. **No WhatsApp integration** — The product thesis is "upgrade from WhatsApp" but there's no WhatsApp share, deep link, or bridge feature.

---

## Top 10 Technical Risks

| # | Risk | Severity | Impact |
|---|------|----------|--------|
| 1 | **database.types.ts is hand-maintained** — 112 migrations and no auto-generation means type/schema mismatch is guaranteed | 🔴 Critical | Runtime crashes from wrong column names/types |
| 2 | **Stripe demo_secret hardcoded in paymentService** | 🔴 Critical | If payments are enabled, this is a security breach |
| 3 | **Safety-critical logic runs client-side** — Emergency SOS, route deviation, content moderation scoring | 🔴 Critical | Easily bypassed, unreliable for actual safety |
| 4 | **No error boundary around Supabase calls in pages** — Inline queries in 839-line FindRides, 591-line Home | 🟡 High | Unhandled promise rejections crash the app |
| 5 | **E2E tests exist but aren't in CI** | 🟡 High | Deploys without regression protection |
| 6 | **112 migration files with "fix" churn** | 🟡 High | New deployments may fail if migrations conflict |
| 7 | **1,413-line Community.tsx monolith** | 🟡 Medium | Unmaintainable, likely has hidden bugs |
| 8 | **Google Maps API key exposed via Netlify function** (by design, but no referrer restriction confirmed) | 🟡 Medium | Cost exposure if key is stolen |
| 9 | **Hardcoded profanity list in source code** | 🟡 Medium | Offensive content in repo; should be external config |
| 10 | **No rate limiting on client-side auth** (relies on Supabase server-side limits) | 🟡 Medium | Brute force risk if Supabase limits are misconfigured |

---

## Top 10 Product Risks

| # | Risk | Severity | Impact |
|---|------|----------|--------|
| 1 | **No community creation/invitation flow** — The core thesis is communities, but there's no "bring your WhatsApp group here" feature | 🔴 Critical | Can't onboard the target users |
| 2 | **Fabricated social proof on landing page** — Fake stats, fake testimonials | 🔴 Critical | Destroys trust if discovered; potential ASA violation in UK |
| 3 | **Feature bloat confuses the value prop** — Gamification, leaderboards, challenges, carbon tracking distract from core ride coordination | 🟡 High | Users arrive expecting a simple tool and find a complex platform |
| 4 | **No WhatsApp bridge** — Product positioned as "WhatsApp upgrade" but zero WhatsApp integration | 🟡 High | Can't capture users where they already are |
| 5 | **Admin panel optimised for scale, not for zero-to-one** — 37 admin pages when founder needs 3: users, rides, feedback | 🟡 High | Wasted dev time; founder overwhelmed by admin UI |
| 6 | **No recurring ride coordination UX** — Pools exist in code but are secondary/deferred. Recurring commutes are the core use case. | 🟡 High | Misses the main reason people form WhatsApp groups |
| 7 | **No language/cultural community filter** — Target is language-based communities but no language-based ride filtering | 🟡 High | Misses the community-trust angle |
| 8 | **Payment model undefined** — Is it free? Fuel contribution? Subscription? Contradictory signals in code. | 🟡 High | Confuses users and blocks monetization |
| 9 | **Mobile experience unclear** — Capacitor shells exist but no evidence of native testing | 🟡 Medium | If mobile UX is broken, loses the WhatsApp-user audience |
| 10 | **No feedback loop from beta users** — Bug report system exists but no NPS, satisfaction survey, or usage tracking confirmed | 🟡 Medium | Can't iterate without user signal |

---

## Conclusion

This is a **recoverable project with a real core** buried under engineering excess. The founder built genuine infrastructure — auth, database, rides, messaging, deployment — but then kept building features (social, gamification, premium, AI) instead of shipping the MVP.

**The path forward is not more building. It is aggressive subtraction.**

Strip the product to its core: sign up → join a community → post/find rides → coordinate → ride. Feature-flag everything else. Ship to one WhatsApp group. Iterate from there.
