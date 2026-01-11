# CarpoolNetwork Flow Map (v1 - derived from code)

Sources of truth: `src/App.tsx`, `src/contexts/*.tsx`, `src/pages/*`, `src/services/*`, `docs/qa-context.md`, `supabase/migrations/*`.

## Global Contexts and Guards
- App providers: `LoadingProvider` -> `AuthProvider` -> `PremiumProvider` -> `RealtimeProvider` (`src/App.tsx`).
- Router: BrowserRouter on web, HashRouter on Capacitor (`src/App.tsx`).
- Guard: `ProtectedRoute` (requires authenticated user + email verified), redirects to `/signin` or `/verify-email` (`src/App.tsx`).
- Guard: `RequireProfileComplete` (requires auth + email verified + profile complete), redirects to `/onboarding/profile` (`src/App.tsx`).
- Guard: `PublicRoute` (redirects authenticated users to `/`) (`src/App.tsx`).
- Service gating modal: `useServiceGating()` used in `/post-ride` and `/request-ride` to block actions when profile incomplete (`src/hooks/useServiceGating.tsx`, `src/pages/PostRide.tsx`, `src/pages/RequestRide.tsx`).

## Route Inventory (by guard)

### Public (guest or authenticated)
- `/terms` -> Terms of Service (`src/pages/TermsOfService.tsx`).
- `/privacy` -> Privacy Policy (`src/pages/PrivacyPolicy.tsx`).
- `/verify-email` -> Verification screen (no guard) (`src/pages/auth/VerifyEmail.tsx`).
- `/reset-password` -> Reset password (no guard) (`src/pages/auth/ResetPassword.tsx`).

### PublicRoute (redirect to `/` if authenticated)
- `/signin` -> Sign-in (password + OTP + OAuth) (`src/pages/auth/SignIn.tsx`).
- `/signup` -> Sign-up (password + OAuth) (`src/pages/auth/SignUp.tsx`).
- `/verify-otp` -> OTP verification, requires `location.state` else redirects to `/signin` (`src/pages/auth/VerifyOtp.tsx`).
- `/forgot-password` -> password reset request (`src/pages/auth/ForgotPassword.tsx`).

### ProtectedRoute (auth + email verified)
- `/` -> Home dashboard (`src/pages/Home.tsx`).
- `/find-rides` -> Ride search (`src/pages/FindRides.tsx`).
- `/my-rides` -> Driver + rider ride management (`src/pages/MyRides.tsx`).
- `/messages` -> Messaging system (`src/pages/Messages.tsx`).
- `/community` -> Community feed (`src/pages/Community.tsx`).
- `/community/:postId` -> Community post detail (`src/pages/CommunityPost.tsx`).
- `/profile` -> Profile management (`src/pages/Profile.tsx`).
- `/user/:userId` -> Public profile view (`src/pages/PublicProfile.tsx`).
- `/security` -> Security settings (`src/pages/SecuritySettings.tsx`).
- `/settings` -> Settings hub (`src/pages/Settings.tsx`).
- `/preferences` -> Preferences (`src/pages/Preferences.tsx`).
- `/analytics` -> User analytics (`src/pages/Analytics.tsx`).
- `/leaderboards` -> Leaderboards (`src/pages/Leaderboards.tsx`).
- `/challenges` -> Challenges (`src/pages/Challenges.tsx`).
- `/rides/:rideId` -> Ride details (`src/pages/RideDetails.tsx`).
- `/bookings/:bookingId` -> Booking details (`src/pages/BookingDetails.tsx`).
- `/friends` -> Friends manager (`src/pages/Friends.tsx`).
- `/social/groups/:groupId` -> Social group detail (`src/pages/GroupDetail.tsx`).
- `/notifications` -> Notifications (`src/pages/Notifications.tsx`).
- `/safety` -> Safety center (`src/pages/SafetyCenter.tsx`).
- `/favorites` -> Saved routes and favorites (`src/pages/Favorites.tsx`).
- `/pools` -> Carpool pools (`src/pages/Pools.tsx`).
- `/help` -> Help hub (`src/pages/HelpHub.tsx`).

### RequireProfileComplete (auth + email verified + profile complete)
- `/post-ride` -> Post a ride (vehicle required; service gating modal) (`src/pages/PostRide.tsx`).
- `/request-ride` -> Post a ride request (service gating modal) (`src/pages/RequestRide.tsx`).

### ProtectedRoute (Admin pages; in-page `isAdmin` checks)
- `/admin` -> Admin dashboard (`src/pages/admin/AdminDashboard.tsx`).
- `/admin/beta` -> Beta management (`src/pages/admin/BetaManagement.tsx`).
- `/admin/feedback` -> Feedback management (`src/pages/admin/FeedbackManagement.tsx`).
- `/admin/diagnostics` -> Diagnostics (`src/pages/admin/Diagnostics.tsx`).
- `/admin/users` -> User management (`src/pages/admin/UserManagement.tsx`).
- `/admin/users/:userId` -> User detail (`src/pages/admin/UserDetailAdmin.tsx`).
- `/admin/bugs` -> Bug reports (`src/pages/admin/BugReports.tsx`).
- `/admin/verifications` -> Verification queue (`src/pages/admin/VerificationQueue.tsx`).
- `/admin/safety` -> Safety reports (`src/pages/admin/SafetyReports.tsx`).
- `/admin/safety/report/:reportId` -> Safety report detail (`src/pages/admin/SafetyReportDetail.tsx`).
- `/admin/safety/dashboard` -> Safety dashboard (`src/pages/admin/SafetyDashboard.tsx`).
- `/admin/analytics` -> Advanced analytics (`src/pages/admin/AdvancedAnalytics.tsx`).
- `/admin/activity` -> Live activity monitor (`src/pages/admin/LiveActivityMonitor.tsx`).
- `/admin/bulk-operations` -> Bulk operations (`src/pages/admin/BulkOperations.tsx`).
- `/admin/performance` -> Performance monitor (`src/pages/admin/PerformanceMonitor.tsx`).
- `/admin/settings` -> Platform settings (`src/pages/admin/PlatformSettings.tsx`).
- `/admin/health` -> System health (`src/pages/admin/SystemHealth.tsx`).
- `/admin/admins` -> Admin management (`src/pages/admin/AdminManagement.tsx`).
- `/admin/audit` -> Audit log (`src/pages/admin/AuditLog.tsx`).
- `/admin/rides` -> Rides management (`src/pages/admin/RidesManagement.tsx`).
- `/admin/rides/:rideId` -> Ride detail (`src/pages/admin/RideDetailAdmin.tsx`).
- `/admin/bookings` -> Bookings management (`src/pages/admin/BookingsManagement.tsx`).
- `/admin/bookings/:bookingId` -> Booking detail (`src/pages/admin/BookingDetailAdmin.tsx`).
- `/admin/messages` -> Messages management (`src/pages/admin/MessagesManagement.tsx`).
- `/admin/messages/muted` -> Muted users (`src/pages/admin/MutedUsersManagement.tsx`).
- `/admin/messages/:id` -> Conversation detail (`src/pages/admin/ConversationDetailAdmin.tsx`).
- `/admin/community` -> Community management (`src/pages/admin/CommunityManagement.tsx`).
- `/admin/community/warnings` -> Content warnings (`src/pages/admin/ContentWarnings.tsx`).
- `/admin/community/:postId` -> Post detail admin (`src/pages/admin/PostDetailAdmin.tsx`).
- `/admin/notifications` -> Notifications management (`src/pages/admin/NotificationsManagement.tsx`).
- `/admin/notifications/announcements` -> Announcements (`src/pages/admin/AnnouncementsManagement.tsx`).
- `/admin/notifications/templates` -> Notification templates (`src/pages/admin/NotificationTemplates.tsx`).

## Primary User Flows (entry -> exit, failure, recovery)

### Auth: Email/password sign-in
- Entry: `/signin`.
- Preconditions: none.
- Actions: submit credentials -> `signInWithPassword`.
- Success: navigate to `/`.
- Failure: inline error; retry or go to `/forgot-password`.

### Auth: OTP login
- Entry: `/signin` -> OTP mode.
- Preconditions: valid email/phone.
- Actions: request OTP -> `/verify-otp` with `location.state`.
- Success: `verifyOtp` -> `/`.
- Failure: stay on `/verify-otp`, error + resend.
- Recovery: back to `/signin` or `/signup`.

### Auth: OAuth (Google/GitHub/Facebook)
- Entry: `/signin` or `/signup`.
- Preconditions: provider configured.
- Actions: OAuth redirect -> Supabase session.
- Success: `/`.
- Failure: error message; retry sign-in.

### Email verification
- Entry: any protected route while unverified -> `/verify-email`.
- Actions: resend verification email; refresh page.
- Success: after verification, refresh -> access protected route.
- Failure: error message; sign out.

### Onboarding / Profile completion
- Entry: `/onboarding/profile` or redirect from `RequireProfileComplete`.
- Preconditions: authenticated and email verified.
- Actions: multi-step profile edit and upload.
- Success: navigate to `from` path or `/`.
- Failure: error toast; retry step.

### Post Ride (driver)
- Entry: `/post-ride`.
- Preconditions: auth, email verified, profile complete, vehicle exists.
- Actions: select vehicle -> enter route -> submit -> insert ride.
- Success: navigate to `/my-rides` or `/rides/:rideId`.
- Failure: error panel/toast; retry; CTA to `/profile?section=vehicles` if no vehicles.

### Request Ride (rider)
- Entry: `/request-ride`.
- Preconditions: auth, email verified, profile complete.
- Actions: enter route/time -> submit -> create request.
- Success: confirmation view and listing.
- Failure: error toast; retry.

### Find Ride and Book
- Entry: `/find-rides`.
- Preconditions: auth + email verified.
- Actions: search -> view ride -> `/rides/:rideId` -> request booking.
- Success: booking created -> `/bookings/:bookingId`.
- Failure: error toast or eligibility message; retry search.

### Manage Rides (driver)
- Entry: `/my-rides`.
- Actions: cancel ride, delete ride (blocked if active passengers), accept/decline bookings.
- Success: list updates.
- Failure: error toast; retry.

### Messaging
- Entry: `/messages` or via deep link `?c=conversationId`.
- Preconditions: auth + email verified to send.
- Actions: create conversation via RPC or open existing; send messages.
- Failure: init error shows retry CTA; send errors show inline status.
- Recovery: retry, navigate back to ride/user.

### Notifications
- Entry: `/notifications` or bell icon in layout.
- Actions: mark read, mark all read.
- Failure: error toast; reload.

### Admin
- Entry: any `/admin/*`.
- Preconditions: authenticated and admin role (checked per page, not at router).
- Success: admin views and actions.
- Failure: non-admin is redirected to `/` or sees null content.
- Recovery: sign out or request access.

## Failure and Recovery Patterns
- Network/API failures typically surface as toasts or inline alerts; retry via button or refresh.
- Loading states: per-page spinners and global `LoadingProvider` indicator.
- Offline: `offlineSupport` queues actions and syncs on reconnect; no guaranteed UI confirmation.
- Messaging: queued/failed statuses with retry logic in `NewChatSystem`.

## Known Ambiguities (flag as defects)
- Admin nav links do not match actual admin routes (dead links).
- Booking status strings differ between UI, DB, and RPCs (declined vs rejected, active vs confirmed).
- Notifications schema mismatch between admin UI and DB (`is_read` vs `read_at`).
- Onboarding modal component exists but is not used by any route.
