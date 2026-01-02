# Testing Guide

## Environment
- Ensure `.env` contains valid Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and test users match `e2e/fixtures.ts`. Current staging test accounts:
  - Passenger/Driver/Admin: `e2epassenger123@mailnesia.com` / `TestPassenger123!` (reused for all roles in staging)
- Use non-production/staging credentials only; never set production keys locally.
- Set `E2E_USE_PREVIEW=true` to run Playwright against the production build (`npm run preview`) for stability on Windows.

## Commands
- Run all Playwright tests: `npm run test:e2e`
- Open Playwright UI: `npm run test:e2e:ui`
- Show last report: `npm run test:e2e:report`

## Regression coverage
- `e2e/auth-redirect.spec.ts`: verifies unauthenticated `/profile` redirects to `/signin`.
- `e2e/notifications-regression.spec.ts`: seeds notifications via Supabase (using anon key + user session), checks unread badge, single mark-as-read, and mark-all-read.

## Notes
- Tests assume Supabase policies allow authenticated users to insert/update notifications (present in schema).
- If login UI is flaky, use the `AuthHelper` fixture (used in tests) for stable sign-in flows.
- Clear cached sessions between runs if redirects behave unexpectedly.
