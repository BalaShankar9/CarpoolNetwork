# CarpoolNetwork Spec Audit Report (Derived + Validation)

Sources of truth: code, migrations, `docs/qa-context.md`. No authoritative spec files exist.

## A) Generated flow-map.md (v1 - derived)
- File: `flow-map.md`

## B) Generated state-model.md (v1 - derived)
- File: `state-model.md`

## C) Generated invariants.md (v1 - derived)
- File: `invariants.md`

## D) Spec vs Code Mismatch Report

### Routing and Guard Mismatches
- Admin nav dead links:
  - `/admin/verification` (nav) vs `/admin/verifications` (route) (`src/components/admin/AdminLayout.tsx`, `src/App.tsx`).
  - `/admin/safety-dashboard` (nav) vs `/admin/safety/dashboard` (route) (`src/components/admin/AdminLayout.tsx`, `src/App.tsx`).
  - `/admin/bulk` (nav) vs `/admin/bulk-operations` (route) (`src/components/admin/AdminLayout.tsx`, `src/App.tsx`).
- Missing router-level admin guard: admin routes use `ProtectedRoute` only; access is enforced per page and inconsistent (`src/App.tsx`, `src/pages/admin/*`).
- No 404 route for unknown paths (dead-end UX). 
- Onboarding modal exists but is unused (`src/components/shared/OnboardingModal.tsx`).

### Schema Drift and Data Mismatches
- Notifications schema drift:
  - DB uses `read_at` and removed `is_read/title/message` (`supabase/migrations/20251231140000_update_notifications_schema.sql`).
  - Admin UI still queries `is_read` (`src/pages/admin/NotificationsManagement.tsx`, `src/components/admin/NotificationCard.tsx`).
- `bookings` table references in services, but DB uses `ride_bookings` (no evidence of `bookings` table in core schema):
  - `src/services/offlineSupport.ts`, `src/services/emergencyService.ts`, `src/services/achievementService.ts`.
- Ride status mismatch: admin filters use `in_progress` but DB uses `in-progress` (`src/components/admin/RideFilters.tsx`, `src/lib/database.types.ts`).
- Booking status mismatch: DB constraint uses `rejected`, UI uses `declined`, logic uses `active/paid` (`supabase/migrations/20251214200429_fix_booking_status_and_unique_constraint.sql`, `src/pages/MyRides.tsx`).
- Profile completeness mismatch: UI requires `country` but DB accepts `country_of_residence` (`src/utils/profileCompleteness.ts`, `supabase/migrations/20260107120000_enforce_profile_completion.sql`).

### State and UX Mismatches
- Service gating modal message claims only photo is needed, but `isProfileComplete` requires name, phone, phone_verified, country (`src/hooks/useServiceGating.tsx`, `src/utils/profileCompleteness.ts`).
- `ProfileOnboarding` sets state during render (`setCurrentStep`), risking render loops (`src/pages/ProfileOnboarding.tsx`).
- Accessibility and i18n contexts are not mounted at app root; settings likely do nothing (`src/contexts/AccessibilityContext.tsx`, `src/contexts/I18nContext.tsx`, `src/main.tsx`).

### Test Mismatches
- E2E signup helper uses `input#phone` which does not exist in UI (`src/components/auth/PasswordSignupForm.tsx`, `e2e/fixtures.ts`).
- Test results exist only as media; no summary JSON found (`test-results/`, `playwright-report/`).

### Security Mismatches
- Hard-coded external API keys in edge function (`supabase/functions/vehicle-lookup/index.ts`).
- Admin access enforced only at UI level; no router-level guard.

## E) Corrected Flow Map (v2 - proposed)

### Guard Architecture (single source of truth)
- Introduce `GuardedRoute` that accepts requirements: `{ auth, emailVerified, profileComplete, adminRole, permission }`.
- Use `GuardedRoute` for all routes instead of mixed `ProtectedRoute/RequireProfileComplete`.

### Corrected Route Map (key groups)

Public:
- `/signin`, `/signup`, `/verify-otp`, `/forgot-password`, `/reset-password`, `/verify-email`, `/terms`, `/privacy`.

Onboarding:
- `/onboarding/profile` (requires auth + email verified; optional `from` path).

Core (auth + email verified):
- `/`, `/find-rides`, `/rides/:rideId`, `/bookings/:bookingId`, `/messages`, `/community`, `/community/:postId`, `/profile`, `/user/:userId`, `/settings`, `/preferences`, `/analytics`, `/leaderboards`, `/challenges`, `/friends`, `/notifications`, `/safety`, `/favorites`, `/pools`, `/help`, `/security`.

Driver actions (auth + email verified + profile complete):
- `/post-ride`, `/request-ride`.

Admin (auth + email verified + admin role):
- `/admin`, `/admin/*` (all admin routes), plus PermissionGuard per page.

Global recovery:
- Add `/404` and catch-all `*` route.

### Failure and Recovery Rules (normalized)
- Any guard failure -> explicit screen with CTA (sign-in, verify-email, complete-profile).
- Network/API failures -> inline error + retry button.
- Offline actions -> queued banner + sync status.

## F) Corrected State Model (v2 - proposed)

### Auth
- States: `loading` -> `signed_out` -> `signed_in_unverified` -> `signed_in_verified`.
- Guards use explicit state machine; avoid using `user` alone for routing.

### Profile Completeness
- Single definition: use DB helper `is_profile_complete` or align UI to its fields.
- Required fields: `full_name`, `avatar_url or profile_photo_url`, `phone_e164`, `phone_verified`, `country OR country_of_residence`.

### Ride Lifecycle (normalized)
- Canonical values: `active`, `in-progress`, `completed`, `cancelled`.
- Derived: `expired` if `available_until` or `departure_time` < now.
- On expiry: booking statuses -> `completed` or `cancelled`, passengers archived.

### Booking Lifecycle (normalized)
- Canonical values: `pending`, `confirmed`, `completed`, `cancelled`, `rejected`.
- Map legacy values:
  - `declined` -> `rejected`.
  - `active` -> `confirmed` (or remove).
  - `paid` -> `confirmed` or `completed` (define explicitly).

### Notification States
- Canonical: `read_at` null -> unread; `read_at` set -> read.

### Admin vs User States
- Roles: `none`, `analyst`, `moderator`, `admin`, `super_admin`.
- Permissions enforced by `PermissionGuard` and route guard.

## G) Prioritized Action List

Critical
- Add router-level admin guard and fix admin nav route paths.
- Align notifications schema in admin UI and regenerate `database.types`.
- Remove hard-coded API keys in `vehicle-lookup` edge function.
- Replace `bookings` usage with `ride_bookings` or add a DB view.

High
- Normalize ride and booking status enums across UI/RPC/DB.
- Align profile completeness checks (UI vs DB).
- Add 404 route and guard-failure recovery screen.

Medium
- Wire AccessibilityProvider and I18nProvider or remove unused settings UI.
- Fix `ProfileOnboarding` state update in render.
- Update E2E signup selectors to match UI.

Low
- Remove or integrate unused `OnboardingModal`.
- Consolidate storage bucket usage for profile/vehicle uploads.

## H) Test Gap Matrix

| Flow/State | Unit | E2E | Gaps |
|---|---|---|---|
| Auth (password/OTP/OAuth) | Partial | Yes | OAuth cancel/failed flows not covered |
| Email verification gate | No | No | Missing blocked route + recovery tests |
| Profile completeness/RLS | No | No | Missing gating + RLS denial tests |
| Ride lifecycle | Partial | Yes | Status normalization not tested |
| Booking lifecycle | Partial | Yes | `rejected/declined/paid` drift not tested |
| Notifications schema | No | Yes | Admin read/unread not validated |
| Admin permissions | No | Partial | Missing negative tests |
| Offline queue | No | Partial | Missing queue/sync tests |

Recommended tests:
- `e2e/admin-guard.spec.ts`: non-admin cannot access admin routes; shows access denied CTA.
- `e2e/profile-completeness-rls.spec.ts`: incomplete profile blocked with actionable copy.
- `e2e/notifications-read-at.spec.ts`: read/unread behavior uses `read_at`.
- `e2e/booking-status-enum.spec.ts`: decline/reject mapping consistent across UI/RPC.
- `e2e/offline-queue-booking.spec.ts`: offline booking queues and syncs.
- `e2e/oauth-cancelled.spec.ts`: OAuth cancellation returns to `/signin` with clear messaging.

## I) Safe Refactor Plan (Incremental)

1) Guard unification
- Add `GuardedRoute` and apply to all routes; add admin guard.
- Verify: `e2e/auth-redirect.spec.ts`, `e2e/admin-ops.spec.ts`.
- Rollback: revert `src/App.tsx`.

2) Schema alignment
- Update notifications UI to `read_at`, regenerate types, fix admin UI.
- Verify: `e2e/notifications.spec.ts`.
- Rollback: revert UI changes + types.

3) Status normalization
- Centralize status constants + mapping in a shared module.
- Update UI filters and RPC calls; adjust DB constraints if needed.
- Verify: `e2e/rides.spec.ts`, `e2e/booking.spec.ts`.
- Rollback: revert mapping module and usage sites.

4) Data table consistency
- Replace `bookings` with `ride_bookings` or add DB view.
- Verify: `e2e/network-resilience.spec.ts` + manual booking.
- Rollback: revert service changes or drop view.

5) UX hardening
- Add 404 route, guard failure pages, clear recovery CTA.
- Verify: manual navigation and `e2e/ui-audit.spec.ts`.
- Rollback: revert route + components.
