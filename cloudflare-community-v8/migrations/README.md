# Production upgrade and rollback

`production-v8-additive.sql` was derived from the production schema read on 28 September 2026. It adds 44 objects and the community lounge. It has been exercised twice against an in-memory copy of that schema with synthetic legacy accounts, posts and a pending booking. It preserves the existing 29 tables and records. **It has not been applied to production.**

Before applying it:

1. Export a fresh protected production backup. Record the current Worker version, bindings, cron, routing and secret names. Keep the existing production integrity-signing key pair; never substitute preview or development keys.
2. Pause new writes for the rollout window. Verify foreign keys and check for duplicate `(rider_id, ride_offer_post_id)` pairs whose status is pending, accepted or completed. The new unique index requires those conflicts to be resolved explicitly; the migration does not delete or rewrite bookings.
3. Compare the current schema with the inspected baseline. Rehearse the migration on a protected copy of the current database, including representative existing-account, booking and rating flows.
4. Apply the additive migration, configure the real email binding and deploy the candidate against production bindings. Confirm the owner can sign in, unlock administration and see support/reporting. Remove the preview banner and noindex headers only for the actual production release.
5. Run the two-member smoke journey before reopening writes and issuing invitations.

Rollback must preserve records created after rollout. Revert the Worker/routing to the recorded previous version, and remove only the new behavioral triggers if required using `rollback-v8-triggers.sql`. New tables remain intact for investigation or forward recovery. Do not restore an old database export over newly created bookings or messages as a routine rollback. Rehearse the rollback with the selected previous Worker before the production window.

The preview has separate D1, Durable Objects, signing keys and deployment versions. A preview rollback does not modify the existing public site.
