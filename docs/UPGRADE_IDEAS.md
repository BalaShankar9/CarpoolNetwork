# Upgrade Ideas

This list captures the current upgrade / transformation ideas to revisit later.

## Access and Auth
- Configure OAuth origins and redirect URIs for production, staging, and local dev.
- Add post-login routing to return users to the intended page.
- Add session-expired messaging and re-auth prompts.
- Add auth rate limiting and lockout messaging.
- Gate critical actions behind profile completion with clear fix CTAs.

## Rides and Booking
- Real-time seat availability with optimistic UI and rollback on failure.
- Clear booking lifecycle UI with timestamps and notifications.
- Waitlist promotion visibility and a fallback action when full.
- Show pricing breakdown and cancellation policy before confirming.
- Improve booking failure messages with retry CTAs.

## Messaging and Community
- Show first-message success and jump into the new conversation.
- Message delivery states (sending, sent, failed) with retry.
- Community moderation tools (report, lock, pin, rate-limit posts).
- Better community filters (top/new/active) and pinned highlights.
- Admin announcement system for community-wide updates.

## Trust and Safety
- Show verification badges in ride cards and profiles.
- Block or report flows that also mute chat and hide content.
- Safety prompt when sharing contact info.
- Reliability score explanation and impact on booking eligibility.
- Escalation flow for urgent safety incidents.

## Maps and Location
- Address validation and formatting via Address Validation API.
- Route alternatives with ETA, tolls, and best-route badge.
- Distance-based pricing estimate using Distance Matrix.
- Geocoding fallback if Places autocomplete fails.
- Time zone normalization for cross-region rides.

## Performance and Reliability
- Skeleton loaders for community, messaging, and ride cards.
- Cache common data with stale-while-revalidate.
- Offline and degraded-network UX with queued actions and retry status.
- Global error toast and bug-report CTA.
- Image optimization and lazy loading for avatars and maps.

## Insights and Ops
- Booking funnel analytics and message initiation analytics.
- Admin alerting for error spikes and failed bookings.
- Audit logs for moderation actions and admin changes.
- Feature flags for risky rollouts.

## Testing and Release Readiness
- E2E flows for cancellation, seat contention, DM creation, and admin ops.
- Smoke tests for sign-in, post ride, find rides, and messaging.
- Migration checks and seed data scripts for QA environments.
