# CarpoolNetwork System Invariants (v1 - derived from code)

Sources of truth: `src/App.tsx`, `src/contexts/*`, `src/services/*`, `supabase/migrations/*`, `docs/qa-context.md`.

## 1) Security Invariants
1. Authenticated access only for protected routes.
   - Enforced by `ProtectedRoute` in `src/App.tsx`.
2. Email verification is required for protected routes.
   - Enforced by `ProtectedRoute` using `isEmailVerified`.
3. Only admins can access admin pages and perform admin actions.
   - Enforced in-page via `isAdmin` and `PermissionGuard` checks.
4. Users can only read/write their own profile data.
   - Enforced by RLS on `profiles` and `AuthContext.updateProfile` uses `auth.uid()`.
5. Drivers can only manage their own rides; passengers can only manage their own bookings.
   - Enforced by RLS on `rides` and `ride_bookings`.
6. Messaging is only allowed between conversation members.
   - Enforced by RLS policies and RPCs (`get_or_create_*` functions).

## 2) Data Integrity Invariants
1. Vehicle ownership is immutable by non-owners.
   - `vehicles.user_id` must match `auth.uid()` for create/update/delete.
2. Ride must reference a vehicle owned by the driver.
   - `rides.vehicle_id` should belong to `rides.driver_id`.
3. Active bookings are unique per passenger per ride.
   - Unique partial index on `ride_bookings(ride_id, passenger_id)` with active statuses.
4. Seat availability cannot be negative and must match active bookings.
   - Enforced by `recalculate_ride_seats` RPC.
5. Deleting a ride or vehicle must not orphan dependent records.
   - Enforced by FK constraints and delete/cancel RPCs.
6. Notifications must have a consistent read state (`read_at`).
   - Enforced by `notifications` schema and service logic.

## 3) UX Invariants
1. No dead-end screens (every page has a recovery path or navigation).
2. Errors are visible; no silent failures.
   - Use toasts or inline alerts.
3. Long operations show loading indicators.
   - `LoadingProvider` + per-page spinners.
4. Blocking gates provide a clear CTA (e.g., profile completion, email verification).
5. Mobile-first layouts and accessible controls (focus, labels, tap targets).

## 4) Permission Boundary Invariants
1. Admin actions require admin role and, where applicable, permissions.
2. Users cannot view other users' private phone numbers without `can_view_phone` permission.
3. Storage access is scoped to user-owned paths or public buckets.

## 5) Failure Handling Invariants
1. Network/API errors must result in a user-visible error and retry path.
2. Offline actions are queued and retried when online.
3. RPC failures do not corrupt client state (rollback or refresh after error).
4. Rate limiting prevents abuse of messaging/conversation creation.

## Known At-Risk Invariants (flag as defects)
- Admin routes are protected only in-page, not at router level.
- Notification read state uses `read_at` in DB but `is_read` in admin UI.
- Booking status strings diverge between UI and DB constraints.
- Profile completeness checks differ between UI and DB enforcement.
- Offline queue writes to `offline_queue` without confirming table existence.
