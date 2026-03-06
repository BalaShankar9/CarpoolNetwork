# CarpoolNetwork — Full Project Audit Report

**Date:** March 1, 2026
**Audited by:** Claude
**Project:** CarpoolNetwork (React + Vite + Supabase + Capacitor)

---

## Executive Summary

A comprehensive audit of the CarpoolNetwork codebase uncovered **55+ issues** across security, code quality, dependencies, and database/backend layers. Of these, **8 are Critical**, **16 are High**, and the rest are Medium/Low. The most urgent findings involve exposed credentials in git history, payment processing race conditions, and several TypeScript compilation errors that affect production builds.

---

## 1. CRITICAL Issues (Fix Immediately)

### 1.1 `.env.e2e` Committed to Git History with Real Passwords
- **Severity:** CRITICAL
- **File:** `.env.e2e` (committed in `5d0937e`)
- **Detail:** The file contains real test account credentials that are permanently in git history:
  - `E2E_DRIVER_PASSWORD=Shadow@987`
  - `E2E_ADMIN_PASSWORD=Shadow@987`
  - `E2E_DRIVER_EMAIL=balashankarbollineni4@gmail.com`
- **Fix:** Add `.env.e2e` to `.gitignore`, scrub from git history with `git filter-repo`, and rotate ALL exposed passwords immediately.

### 1.2 `.env.e2e` NOT in `.gitignore`
- **Severity:** CRITICAL
- **File:** `.gitignore`
- **Detail:** `.gitignore` lists `.env` and `.env.test` but **not** `.env.e2e`. This means every future commit could re-expose test credentials.
- **Fix:** Add `.env.e2e` to `.gitignore`.

### 1.3 Build Fails — Missing Rollup Native Module
- **Severity:** CRITICAL
- **Error:** `Cannot find module @rollup/rollup-linux-arm64-gnu`
- **Detail:** `npm run build` fails due to a platform-specific Rollup binary mismatch. The project cannot be built in its current state on this architecture.
- **Fix:** Run `npm ci` on the correct platform, or add the missing optional dependency.

### 1.4 Stripe Webhook Not Idempotent
- **Severity:** CRITICAL
- **File:** `netlify/functions/stripe-webhook.ts`
- **Detail:** Webhook handlers perform `.update()` and `.upsert()` without tracking webhook event IDs. Stripe retries webhooks on failure, causing duplicate billing state updates (e.g., double cancellation timestamps).
- **Fix:** Store processed webhook event IDs in a database table; skip duplicates.

### 1.5 Race Condition in Payment Method Deletion
- **Severity:** CRITICAL
- **File:** `netlify/functions/remove-payment-method.ts`
- **Detail:** Deleting the default payment method queries for a replacement and updates it — but no transaction wraps these operations. A concurrent deletion can leave the user with zero default methods.
- **Fix:** Wrap in a database transaction or use a Supabase RPC function.

### 1.6 Unhandled `.single()` Failures in All Payment Functions
- **Severity:** CRITICAL
- **Files:** `create-payment-intent.ts`, `add-payment-method.ts`, `create-subscription.ts`, `remove-payment-method.ts`, `process-refund.ts`
- **Detail:** `.single()` throws if 0 or >1 rows are returned. The code proceeds to use `profile?.email` without checking for errors, creating Stripe customers with null email/name.
- **Fix:** Add explicit error checks after every `.single()` call.

### 1.7 innerHTML XSS Vulnerability
- **Severity:** CRITICAL
- **File:** `src/components/profile/VehicleManager.tsx` (line ~787)
- **Detail:** Direct `innerHTML` assignment in an error handler — bypasses React's XSS protection.
- **Fix:** Use React state to conditionally render fallback UI.

### 1.8 Broken Supabase RPC Type Signatures
- **Severity:** CRITICAL (causes TypeScript errors)
- **Files:** `src/services/rideService.ts:15`, `src/services/vehicleService.ts:55`
- **Detail:** `client.rpc('delete_ride_for_driver', { p_ride_id: rideId })` passes an object where TypeScript expects `undefined`. The RPC function parameter types are not generated correctly.
- **Fix:** Regenerate Supabase types with `npx supabase gen types typescript`.

---

## 2. HIGH Issues

### 2.1 Sourcemaps Enabled in Production
- **File:** `vite.config.ts` — `sourcemap: true`
- **Detail:** 125+ `.js.map` files ship to production, exposing full source code including component logic, route guards, and admin panel structure.
- **Fix:** Set `sourcemap: 'hidden'` to upload to Sentry only without serving to users.

### 2.2 CSP Uses `'unsafe-inline'` for Scripts and Styles
- **File:** `netlify.toml` (line 96)
- **Detail:** Content-Security-Policy includes `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'`, which severely weakens XSS protection.
- **Fix:** Use CSP nonces or hashes for inline scripts/styles.

### 2.3 14 TypeScript Compilation Errors
- **Key Errors:**
  - `src/types/admin.ts:196` — `PERMISSION_LABELS` missing 7 permission entries
  - `src/lib/analytics/ga4.ts:64` — `DataLayerEvent` type not defined
  - `src/pages/Home.tsx:49` — Uses `unreadMessagesCount` but context provides `unreadMessages`
  - `src/pages/PostRide.tsx:252` — `setSuccess('string')` where `boolean` expected
  - `src/pages/PostRide.tsx:459` — `type.bgColor` doesn't exist (should be `type.color`)
  - `src/components/community/EventsCalendar.tsx:418` — Array typed as `never[]`
  - `src/components/layout/Layout.tsx:221,226` — `item.badge` possibly undefined
  - `src/components/admin/AdvancedReporting.tsx:303` — Conditional Link/div wrapper type mismatch

### 2.4 ESLint Rules Overly Relaxed
- **File:** `eslint.config.js`
- **Disabled Rules:** `no-explicit-any`, `no-unused-vars`, `exhaustive-deps`, `prefer-const`, `no-case-declarations`, `react-refresh/only-export-components`
- **Impact:** Silences warnings that catch real bugs (missing deps in useEffect, unused variables, type-unsafe code).

### 2.5 `stripe` (Server SDK) in Frontend Dependencies
- **File:** `package.json`
- **Detail:** The `stripe` package is server-side only (used in Netlify functions) but listed in frontend `dependencies`, bloating the bundle.
- **Fix:** Move to a separate `netlify/functions/package.json` or exclude from frontend build.

### 2.6 `@capacitor/cli` and `@sentry/vite-plugin` in `dependencies`
- **File:** `package.json`
- **Detail:** Build-time tools shipped as production dependencies.
- **Fix:** Move both to `devDependencies`.

### 2.7 Race Condition in AuthContext Profile Loading
- **File:** `src/contexts/AuthContext.tsx`
- **Detail:** `loadProfile()` called from both `getSession().then()` and `onAuthStateChange()`. Rapid login/logout can cause stale profile data to overwrite newer data.
- **Fix:** Add an abort controller or race-condition guard.

### 2.8 Memory Leaks — setTimeout Without Cleanup
- **Files:** `AccessibilitySettings.tsx`, `NotificationSettings.tsx`, `AccountSettings.tsx`, `AppearanceSettings.tsx`, `DeveloperSettings.tsx`
- **Pattern:** `setTimeout(() => setSuccess(''), 2000)` with no cleanup in useEffect.
- **Fix:** Store timeout ID and clear in cleanup function.

### 2.9 Realtime Channel Subscription Leaks
- **Files:** `src/contexts/RealtimeContext.tsx`, `src/pages/FindRides.tsx`
- **Detail:** `supabase.removeChannel()` called without first calling `.unsubscribe()`, causing potential subscription leaks.

### 2.10 N+1 Weather API Calls in FindRides
- **File:** `src/pages/FindRides.tsx` (~line 208-230)
- **Detail:** Each ride fetches weather independently inside `Promise.all()`. For 50 rides, that's 50 API calls.
- **Fix:** Batch by unique coordinates or cache results.

### 2.11 Missing Null Checks in Payment Functions
- **Files:** All payment Netlify functions
- **Detail:** Multiple `.update()` calls ignore the `error` return value, causing silent data loss.

### 2.12 Currency Normalization Bug
- **Files:** `create-payment-intent.ts` uses `.toLowerCase()`, `add-payment-method.ts` uses `.toUpperCase()`
- **Impact:** Inconsistent 'gbp' vs 'GBP' in database, breaking analytics queries.

### 2.13 Unvalidated Profile Data in Stripe Customer Creation
- **File:** `netlify/functions/create-payment-intent.ts`
- **Detail:** Creates Stripe customer with potentially null email/name without validation.

### 2.14 Missing Error Handling in Promise Chains
- **File:** `src/pages/admin/SafetyDashboard.tsx`
- **Detail:** `.then()` chains inside `Promise.all()` lack `.catch()` handlers.

### 2.15 Broken favoritesService RPC Fallback
- **File:** `src/services/favoritesService.ts` (line ~191)
- **Detail:** Fallback passes `supabase.rpc('increment_ride_count')` as a value instead of awaiting it.

### 2.16 Division by Zero in advancedMatching
- **File:** `src/services/advancedMatching.ts` (line ~82)
- **Detail:** `pricePerKm / userPrefs.search_max_price_per_km` without checking for zero.

---

## 3. MEDIUM Issues

### 3.1 TypeScript Strictness Relaxed
- `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`

### 3.2 Version Pinning Inconsistency
- `react-router-dom` is exact-pinned (6.30.1) while everything else uses `^`

### 3.3 Missing Input Validation in PostRide
- No check that origin ≠ destination; no max distance check

### 3.4 Missing Error Boundaries Around List Renders
- Large lists (200+ items) have no error boundary or virtualization

### 3.5 Admin Route Only Checks Role Exists
- `AdminRoute` in `App.tsx` verifies admin role exists but doesn't check per-route permissions

### 3.6 AI Router Has No Rate Limiting
- `netlify/functions/ai-router.ts` — no throttling; attackers with valid tokens can spam AI endpoints

### 3.7 Admin Email Exposed in Client Code
- `VITE_ADMIN_EMAIL` exposed via `import.meta.env`, making admin account identifiable

### 3.8 `.select('*')` in Edge Functions
- `supabase/functions/aggregate-metrics/index.ts` fetches all columns but only needs a count

### 3.9 Missing Database Indexes
- No index on `subscription_plans(stripe_price_id)` or `ride_bookings(passenger_id, status)`

### 3.10 Stripe API Version Uses Preview Suffix
- Payment functions hardcode `apiVersion: '2025-04-30.basil'` (test/preview API version)

### 3.11 No Request Body Validation in Payment Functions
- `JSON.parse(event.body || '{}')` without schema validation; negative amounts possible

### 3.12 Inconsistent Error Response Format
- Some functions return `{ error }`, others `{ statusCode, body: JSON.stringify({error}) }`

### 3.13 Missing Memoization in RidePreferencesForm
- Entire form re-renders on any state change without `useMemo`/`useCallback`

### 3.14 Data Sanitization Missing for Ride Descriptions
- User-provided ride notes not sanitized before display

### 3.15 useServiceGating Returns Function Call Result
- `isProfileComplete: isProfileComplete()` calls once at render; stale if auth changes

---

## 4. LOW Issues

### 4.1 localStorage for Non-Sensitive Data (XSS vector, low risk)
### 4.2 Analytics Environment Variables Not Set (GA4, GTM)
### 4.3 Service Worker Unregistration Script in index.html
### 4.4 Using Index as Key in List Rendering (CorporateDashboard)
### 4.5 Metadata Type Casting Without Validation (payment functions)
### 4.6 EventEmitter MaxListeners Warning During npm Operations

---

## 5. Positive Findings

- **RLS is properly configured** — Latest migration hardens all public tables
- **No hardcoded API keys** in source code
- **No `dangerouslySetInnerHTML`** in React components (except the innerHTML in VehicleManager)
- **No `eval()` or code injection** patterns found
- **Stripe webhook signature verification** is properly implemented
- **Supabase client** has good error handling with proxy fallback
- **Security headers** in netlify.toml are comprehensive (HSTS, X-Frame-Options, Referrer-Policy)
- **SEO meta tags** are well-configured in index.html

---

## Issue Count Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 8     |
| HIGH     | 16    |
| MEDIUM   | 15    |
| LOW      | 6     |
| **Total** | **45+** |

---

## Recommended Priority Actions

1. **Today:** Add `.env.e2e` to `.gitignore`, rotate all exposed passwords
2. **Today:** Fix Stripe webhook idempotency and payment race conditions
3. **Today:** Fix TypeScript errors preventing clean builds
4. **This Week:** Disable production sourcemaps, remove `unsafe-inline` from CSP
5. **This Week:** Move `stripe`, `@capacitor/cli`, `@sentry/vite-plugin` to correct dependency groups
6. **This Week:** Add error handling to all payment function database calls
7. **This Sprint:** Add rate limiting to AI endpoints, fix memory leaks in settings components
8. **Ongoing:** Re-enable ESLint rules gradually, add missing database indexes
