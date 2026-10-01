# Live availability checks

This workflow checks the active Cloudflare site, independently of the legacy application at the repository root. It performs anonymous GET requests only: both domains, HTTPS redirects, database health, daily-maintenance freshness, public help pages, sitemap, robots, private-route indexing, anonymous admin denial and real 404 responses. A failed check is retried once and then fails the workflow. It neither signs in nor submits accounts, messages, bookings or reports.

Run locally with Node 24 or later:

```
node scripts/operations/check-public.mjs
```

The schedule requests checks every 15 minutes. GitHub can delay scheduled runs; this is an initial availability monitor, not a guaranteed real-time paging service or uptime SLA. Receipts remain as workflow artifacts for 30 days. GitHub Actions notification delivery depends on each operator's notification settings; verify those settings and review the Actions dashboard daily. No new email recipient or third-party alerting service is configured by this workflow.

If a check fails, inspect the receipt, reproduce with the stated URL, then inspect the Cloudflare Worker deployment and logs. Use the site's private Feedback & bug reports inbox for application failures. Maintenance should run daily at 03:17 UTC; the health endpoint flags a failed run or a heartbeat older than 40 hours. A newly installed heartbeat has a 40-hour initial grace period.

Do not run synthetic account or booking tests against production. Deployments remain an explicit separate operation. Database restoration is destructive and is not an automatic response to an alert.
