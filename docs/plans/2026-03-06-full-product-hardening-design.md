# CarpoolNetwork — Full Product Hardening Design

**Date:** 2026-03-06
**Status:** Approved
**Approach:** Hybrid (Phase 0 security sprint, then flow-by-flow fixes + tests + polish)

## Context

CarpoolNetwork is a community carpooling platform (React + TypeScript + Vite + Supabase + Netlify). Audit identified 60 issues across security, payments, broken flows, and code quality. This plan takes the app from MVP to production-grade, publicly releasable product.

**Key constraint:** No user-to-user payments. This is a cost-sharing community platform, not a taxi service. Stripe exists only for future platform memberships (hidden at launch).

## Phase Map

| Phase | Focus | Tasks |
|-------|-------|-------|
| 0 | Security & Financial Emergency Sprint | 17 |
| 1 | Auth, Onboarding & Profile Flow | 37 |
| 2 | Ride Creation, Search & Discovery Flow | 43 |
| 3 | Booking & Legal Compliance | 37 |
| 4 | Messaging, Notifications & Real-time Flow | 41 |
| 5 | Community, Social, Gamification & Admin Flow | 55 |
| 6 | Infrastructure Hardening & Performance | 55 |
| 7 | Testing Suite & Release Certification | 48 |
| **Total** | | **333** |

## Phase 0: Security & Financial Emergency Sprint

### 0.1 Payment Security
- Add Stripe idempotency keys to all payment/refund functions
- Fix currency case inconsistency (lowercase vs uppercase)
- Add .single() error handling to all payment functions
- Make Stripe webhook idempotent (track event IDs)

### 0.2 Auth & Authorization Security
- Remove auto-verification on photo upload (profile_verified: true)
- Fix admin privilege escalation (no role hierarchy check)
- Gate VITE_SKIP_EMAIL_VERIFICATION behind import.meta.env.DEV
- Standardize is_admin vs admin_role checks

### 0.3 Secrets & Exposure
- Remove .env.e2e from git history, rotate credentials
- Add .env.e2e to .gitignore
- Change sourcemaps to 'hidden' (Sentry only)
- Remove demo_secret hardcode from paymentService

### 0.4 XSS & CSP
- Fix innerHTML XSS in VehicleManager
- Remove unsafe-inline from CSP
- Update Stripe API version from test to stable

### 0.5 Core Feature Blockers
- Fix search (add actual location filtering)
- Fix PostRide hardcoded (0,0) coordinates

## Phase 1: Auth, Onboarding & Profile

- Fix AuthContext race condition on profile loading
- Audit all OAuth/OTP/password flows end-to-end
- Fix onboarding wizard step progression
- Add phone E.164 validation, license plate format validation
- Fix account deletion to handle dependents (GDPR)
- Fix localStorage.clear() on logout (preserve preferences)
- Fix setTimeout memory leaks in all settings pages
- 8 E2E tests covering all auth paths

## Phase 2: Ride Creation, Search & Discovery

- Fix coordinate validation (reject 0,0)
- Fix LocationAutocomplete free text bypass
- Add past-time validation for today's rides
- Implement actual geo-distance search (PostGIS or Haversine)
- Fix date timezone bug in search
- Fix N+1 weather API calls
- Fix ride lifecycle state transitions
- Fix matching algorithm division by zero
- 10 E2E tests covering ride CRUD and search

## Phase 3: Booking & Legal Compliance

- Remove ALL user-to-user payment code and UI
- Fix booking eligibility consistency across pages
- Add optimistic locking for seat availability
- Fix booking status transitions and cancellation flow
- Add legal disclaimers (ride creation, details, search, terms, privacy)
- Hide membership infrastructure behind feature flag
- Fix Stripe webhook bugs for future membership use
- 7 E2E tests covering booking and legal compliance

## Phase 4: Messaging, Notifications & Real-time

- Fix message deduplication race condition
- Fix block query logic error
- Fix unread count hardcoded to 1
- Enforce message edit window server-side
- Fix notification type mapping and click navigation
- Fix realtime channel cleanup (unsubscribe + removeChannel)
- Fix reconnection handling with user-visible status
- 9 E2E tests covering messaging and notifications

## Phase 5: Community, Social, Gamification & Admin

- Fix community post CRUD and comments
- Fix friend request/removal flow
- Fix carpool pool creation and management
- Fix achievement unlock logic and leaderboards
- Fix all admin panel pages (14 admin fixes)
- Fix admin RBAC and PermissionGuard
- Fix SOS button, trip sharing, safety reports
- 12 E2E tests covering community, admin, safety

## Phase 6: Infrastructure Hardening & Performance

- Add rate limiting to all Netlify functions
- Add input sanitization library
- Add server-side validation (rides, profiles, bookings)
- Fix all error boundaries
- Lazy-load all page components
- Fix bundle size (move server deps to devDependencies)
- Fix all TypeScript errors (14+)
- Tighten ESLint rules
- SEO meta tags, structured data, accessibility audit
- Fix CI pipeline quality gates
- Add staging environment
- 6 tests covering infrastructure

## Phase 7: Testing Suite & Release Certification

- Set up test infrastructure (multi-browser, seed scripts, factories)
- 12 critical path E2E tests (full user journeys)
- 10 edge case & negative tests
- 6 cross-browser & responsive tests
- 5 performance & load tests
- 6 security verification tests
- 4 accessibility verification tests
- 20-checkpoint release certification checklist
- Launch readiness (monitoring, alerts, incident playbook)

## Exit Criteria for Public Launch

All 20 release certification checkpoints green:
1. All critical security issues resolved
2. TypeScript clean, ESLint clean
3. All unit + E2E tests pass
4. Lighthouse scores >90 across the board
5. No npm audit high/critical vulnerabilities
6. No user-to-user payment UI visible
7. Legal disclaimers present
8. GDPR-compliant cookie consent
9. Accurate terms and privacy policy
10. Sourcemaps not served to users
11. CSP headers hardened
12. Sentry capturing errors
13. Staging tested, production deployed
14. Monitoring and alerting active
15. Incident playbook documented
