# CarpoolNetwork State Model (v1 - derived from code)

Sources of truth: `src/contexts/AuthContext.tsx`, `src/App.tsx`, `src/pages/*`, `src/services/*`, `supabase/migrations/*`, `docs/qa-context.md`.

## 1) Auth / Session States

State machine (auth session):
- `unknown` -> `signed_out` or `signed_in_*` after `supabase.auth.getSession`.
- `signed_out` -> `signed_in_unverified` on successful sign-in when `email_confirmed_at` is null.
- `signed_out` -> `signed_in_verified` on successful sign-in with `email_confirmed_at`.
- `signed_in_unverified` -> `signed_in_verified` after email verification + refresh.
- `signed_in_*` -> `signed_out` on `signOut`.

Guards:
- `ProtectedRoute` requires `user != null` and `isEmailVerified`.
- `PublicRoute` requires `user == null`.

Relevant code:
- `src/contexts/AuthContext.tsx` (session loading, email verification flag).
- `src/App.tsx` (route guards).

## 2) Profile Completeness States

Profile record states:
- `missing`: no `profiles` row found -> UI inserts fallback profile.
- `incomplete`: profile exists, missing required fields.
- `complete`: profile meets required fields.

Required fields (UI):
- `full_name`, `avatar_url` or `profile_photo_url`, `phone_e164`, `phone_verified`, `country`.

Required fields (DB RLS via `is_profile_complete`):
- `full_name`, `avatar_url` or `profile_photo_url`, `phone_e164`, `phone_verified`, `country` OR `country_of_residence`.

Transitions:
- `missing` -> `incomplete` when auto-created profile inserted.
- `incomplete` -> `complete` when required fields set.
- `complete` -> `incomplete` if required fields removed.

Relevant code:
- `src/utils/profileCompleteness.ts`.
- `supabase/migrations/20260107120000_enforce_profile_completion.sql`.

## 3) Ride Lifecycle States

Canonical ride status values (DB types):
- `active` -> `in-progress` -> `completed` or `cancelled`.

Derived/implicit states:
- `expired` (computed by time: `departure_time` or `available_until` < now).

Transitions:
- Create ride -> `active`.
- Driver updates ride -> `in-progress` or `completed`.
- Cancel ride -> `cancelled`.
- Expiry sync -> booking/passenger state transition (see rideService RPC).

Relevant code:
- `src/components/rides/RideStatusTracker.tsx`.
- `src/pages/MyRides.tsx`.
- `src/services/rideService.ts`.
- `supabase/migrations/20260115_fix_vehicle_delete_cascade.sql` (seat recalculation).

## 4) Booking Lifecycle States

DB constraint values (ride_bookings):
- `pending`, `confirmed`, `completed`, `cancelled`, `rejected`.

Observed UI variants (non-canonical):
- `declined`, `active`, `paid` (used in various code paths).

Transitions:
- Request booking -> `pending`.
- Driver accept -> `confirmed`.
- Driver decline -> `rejected` (DB) or `declined` (UI). 
- Passenger cancel -> `cancelled`.
- Completion -> `completed`.

Data constraints:
- Unique index for active bookings per passenger/ride (pending, confirmed, completed).

Relevant code:
- `supabase/migrations/20251214200429_fix_booking_status_and_unique_constraint.sql`.
- `supabase/migrations/20251214200908_add_atomic_booking_operations.sql`.
- `src/pages/MyRides.tsx`, `src/pages/RideDetails.tsx`.

## 5) Notification States

Canonical notification state:
- `unread` when `read_at` is null.
- `read` when `read_at` is non-null.

Legacy fields:
- `is_read` used by some admin UI and types.

Transitions:
- New notification -> `unread`.
- Mark read -> set `read_at` timestamp.
- Mark all read -> set `read_at` for all unread.

Relevant code:
- `supabase/migrations/20251231140000_update_notifications_schema.sql`.
- `src/services/notificationsService.ts`.
- `src/pages/admin/NotificationsManagement.tsx`.

## 6) Admin vs User States

Role states:
- `user` (default): `is_admin` false and `admin_role` null.
- `admin` (role-based): `admin_role` in {super_admin, admin, moderator, analyst}.

Permissions:
- `PermissionGuard` checks `permission` and `minRole` using `admin_permissions` or defaults.

Transitions:
- Role assignment (DB) -> admin access.
- Role removed -> user access only.

Relevant code:
- `src/contexts/AuthContext.tsx`.
- `src/components/admin/PermissionGuard.tsx`.
- `src/types/admin.ts`.

## Known Ambiguities (flag as defects)
- Booking status strings are inconsistent across UI, RPC, and DB.
- Ride status uses both `in-progress` and `in_progress` in UI filters.
- Notifications schema mismatch in admin views (`is_read` vs `read_at`).
- Profile completeness criteria differ between UI and DB.
