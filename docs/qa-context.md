# QA Context Bundle

## Tech stack
- React 18 + TypeScript + Vite; React Router DOM 6.30 (BrowserRouter on web, HashRouter for Capacitor/native shells).
- State via React contexts (AuthContext for Supabase auth/profile, RealtimeContext for notifications/bookings/messages, LoadingProvider); no Redux.
- UI: TailwindCSS + lucide-react icons; Google Maps via @googlemaps/js-api-loader; Capacitor tooling present for mobile builds.
- Backend/data: Supabase (auth, Postgres, storage, edge functions) via supabase-js v2 client (`src/lib/supabase.ts`); Playwright already configured for e2e (`playwright.config.ts`).

## Auth
- Supabase email/password signup with optional beta allowlist (env `VITE_BETA_MODE`); profile auto-created if missing.
- OAuth: Google and Facebook; OTP login via email or phone (`signInWithOtp`/`verifyOtp`); password reset email to `/reset-password`.
- Email verification gate (`isEmailVerified`) blocks posting rides, booking, and messaging; service-gating hook also requires a profile photo before booking/posting/messaging.

## Routes
- Public/guest: `/signin`, `/signup`, `/verify-otp`, `/verify-email`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy`.
- Protected (auth required): `/` (Home), `/find-rides`, `/post-ride`, `/request-ride`, `/my-rides`, `/messages`, `/community`, `/community/:postId`, `/profile`, `/user/:userId`, `/security`, `/settings`, `/preferences`, `/analytics`, `/leaderboards`, `/challenges`, `/rides/:rideId`, `/bookings/:bookingId`.
- Admin (auth + in-page isAdmin check): `/admin`, `/admin/beta`, `/admin/feedback`, `/admin/diagnostics`, `/admin/users`, `/admin/bugs`, `/admin/verifications`, `/admin/safety`, `/admin/safety/report/:reportId`, `/admin/safety/dashboard`, `/admin/analytics`, `/admin/activity`, `/admin/bulk-operations`, `/admin/performance`.

## Roles & permissions
- Guest: only auth/static pages.
- Authenticated user: can act as rider or driver; key actions require email verification and a profile photo (useServiceGating). Profile flag `is_admin` controls admin UIs (pages redirect home if false).
- Supabase RLS highlights: profiles updateable only by owner; vehicles restricted to `user_id`; rides restricted to `driver_id`; ride_bookings selectable/updateable by passenger or ride driver; ride_requests tied to requester/rider; notifications and bug_reports restricted to `user_id`; storage policies restrict uploads to own folders.

## Supabase schema (core tables)
- `profiles`: id (auth user FK), email, full_name, avatar_url, phone/phone_number, bio, city/country, DOB, gender enum, verification flags (email_verified, phone_verified, photo_verified, id_verified, is_verified), badge, trust/reliability scores, ride counts, profile_photo_path/thumb/url, profile_verified, onboarding_completed, preferred_contact_method, whatsapp_number, is_admin, timestamps.
- `vehicles`: id, user_id, make/model/year/color, license_plate, capacity, is_active, fuel_type/type, registration_year, engine_capacity, image_url/vehicle_photo_url, vehicle_front_photo_path/thumb, vehicle_verified, plate_ocr_text, plate_verified/plate_verified_at, mot_status/expiry, tax_status/due_date, extracted_plate_text, timestamps.
- `rides`: id, driver_id, vehicle_id, origin/destination + lat/lng, departure_time, available_seats/total_seats, status (active/in-progress/completed/cancelled), is_recurring + recurrence_pattern, notes, route_polyline, estimated_duration/distance, timestamps.
- `ride_bookings`: id, ride_id, passenger_id, pickup/dropoff + lat/lng, seats_requested, status (pending/confirmed/completed/cancelled), pickup_order, created_at/updated_at, unique ride_id + passenger_id; policies allow passenger or ride driver access.
- `ride_requests`: two flavors in schema: (a) rider need post: requester_id, from/to locations + lat/lng, departure_time, seats_needed, status pending/matched/cancelled/expired; (b) ride-specific request: ride_id, rider_id, seats_requested, status (PENDING_DRIVER/DECLINED/ACCEPTED/CONFIRMED/CANCELLED/EXPIRED), expires_at, unique ride_id + rider_id; matches tracked in `ride_requests_matches`.
- `messages`: legacy direct messages table (id, sender_id, recipient_id, ride_id, content, is_read, created_at); new chat system uses `conversations`, `conversation_members`, `chat_messages` (body, sender_id, conversation_id), and `message_reads` for unread tracking.
- `notifications`: id, user_id, type (NEW_MESSAGE, FRIEND_REQUEST, RIDE_MATCH, BOOKING_* etc), `data` jsonb, `read_at` timestamptz, created_at; title/message columns removed; RLS scoped to user_id.
- `bug_reports`: id, user_id, text, page, created_at; RLS limits to reporter.

## Storage buckets & access
- `user-media` (used by profile/vehicle uploads): authenticated uploads to `users/{userId}/...`; public read policy exists; update/delete limited to owner paths.
- `vehicle-images`: authenticated uploads allowed, public read; earlier bucket-specific path checks removed in latest policies.
- Older buckets `profile-photos` and `vehicle-photos` exist with per-user/per-vehicle path checks; main UI code currently uses `user-media`.

## Key user flows
- Auth: Sign up via PasswordSignupForm; optional Google/Facebook; OTP login for email/phone; password reset email routes to `/reset-password`; redirects to home on success.
- Onboarding/profile: `/profile` lets users add/edit profile fields, upload face-validated profile photo (`uploadProfilePhoto` -> `user-media`), manage emergency contacts, documents (driver license), privacy controls, ride stats, and ride preferences (auto_accept, instant booking, smoking/pets, music, conversation). Service-gating modal blocks core actions until a photo exists.
- Driver: Add vehicle in Profile/VehicleManager (DVLA lookup via Supabase edge `vehicle-lookup`, optional photo upload/replace/remove to `user-media`), then `/post-ride` (requires verified email + vehicle + profile photo) inserts rides; `/my-rides` driver view shows posted rides, matches, and bookings with RPC `driver_decide_booking` for accept/decline/cancel and ride cancellation/rescheduling.
- Rider: Discover via `/find-rides` (filters, reliability scores), view `/rides/:rideId` for driver details; request seats via RPC `request_booking`, cancel via `cancel_booking`, and track in `/bookings/:bookingId` (contact driver via call/WhatsApp/chat, SOS). `/request-ride` posts open ride requests for drivers to offer.
- Chat & notifications: Chat entry from ride/booking/profile goes to `/messages` with `NewChatSystem` (conversation + chat_messages + message_reads, unread badges, email verification required to send). Realtime subscriptions for notifications/bookings/messages via Supabase channels; notifications panel uses `notifications` table.

## Known current bugs
- Notifications schema mismatch: RealtimeContext/NotificationCenter and generated types still expect `is_read`/`title`/`message`, but migration `20251231140000_update_notifications_schema.sql` replaced these with `read_at` + `data` jsonb. Mark-as-read updates and unread counts fail against the current table shape.
- Profile auth redirect uses `/sign-in` (hyphen) when user is unauthenticated, but the defined route is `/signin`, causing a broken redirect from `/profile`.
- No TODO/FIXME tags found in the codebase.
