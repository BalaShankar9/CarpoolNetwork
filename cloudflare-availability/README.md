# Carpool availability monitor

Separate Worker, separate KV namespace, no binding or credential access to the member database, photos or sign-in system. It makes anonymous, read-only requests to a fixed list of public URLs on both production domains every 15 minutes.

The public page reports the last check and whether it is overdue (40 minutes). It checks the homepage and HTTPS header, health/database/maintenance status, help, anonymous admin denial, 404 and HTTP redirect. Failed HTTPS checks retry once. It records only route, status, duration and a limited health flag. Every receipt expires after seven days; the latest failure expires after 30 days. The latest result remains so a stalled monitor can be shown as overdue. There is no public endpoint that can trigger checks or modify stored state.

Run `node --test worker.test.js` for deterministic failure, retry, retention and stale-status checks. Deploy from the application toolchain with `npx wrangler deploy --config ../cloudflare-availability/wrangler.jsonc`.

The initial receipt can be produced with `runChecks()` through an operator's local tooling, then stored through the authenticated KV API. Scheduled invocations subsequently replace it. Verify a newer scheduled timestamp before claiming the cron itself has been observed.

This shares Cloudflare infrastructure with the application and does not provide independent detection of a Cloudflare-wide outage. It does not send email or pager alerts. The separate GitHub workflow adds an external vantage point and certificate-expiry checks once Actions are available. Inspect existing notification preferences before relying on delivery.
