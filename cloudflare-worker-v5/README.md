# Carpool Network — Premium v5

A Cloudflare-first community + protected carpool booking system.

## Live upgrade from v4

This package is designed for the existing live Worker and D1 database:

- Worker: `carpool-network`
- D1: `carpool-network-db`
- Existing members, posts, bookings and ratings are preserved.

Run:

```bash
chmod +x UPDATE_EXISTING.command
./UPDATE_EXISTING.command
```

The upgrade applies only `migration-v5.sql`, validates the Worker bundle, then deploys.

## What v5 adds

### Premium responsive experience
- Desktop sidebar and full-width workspace.
- Phone-first bottom navigation and compact ride search.
- High-resolution responsive cards and layouts.
- Dedicated Find a Ride experience.
- Community feed remains available for jobs, marketplace, services, accommodation and general posts.

### Safer ride booking
- Search once and compare ranked drivers.
- Rider can request a seat directly from a search result.
- Up to three nearby-time pending driver requests.
- First accepted request wins.
- Conflicting pending requests are cancelled automatically.
- Database guards prevent rider overlap, driver overlap and seat overbooking.
- Confirmed cancellations reopen availability when safe.
- Driver cancelling a ride reopens affected riders' ride requests and sends notifications.
- WhatsApp remains communication; it does not reserve a seat.

### Reputation
- Ratings are tied to completed confirmed journeys.
- Driver/member average and rating count appear in search and posts.

### Device/account recovery
- New members receive a private recovery code.
- Existing members can generate a recovery code under My Network → Account.
- Recovery uses the WhatsApp number + recovery code and rotates the device token.

### Notifications
- In-app notifications.
- Per-user Durable Object live updates.
- Standards-based Web Push where the browser supports it.

## Files

- `src/index.js` — Worker API, Durable Object and scheduled cleanup.
- `public/` — installable PWA.
- `schema.sql` — fresh-install schema through v5.
- `migration-v5.sql` — v4 → v5 migration only.
- `wrangler.jsonc` — existing D1 + Worker bindings.

## Important

Do not run `FIRST_DEPLOY.command` on the existing live installation. Use `UPDATE_EXISTING.command`.
