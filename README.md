# CarpoolNetwork

## Supabase OTP prerequisites
- To allow OTP signups: turn OFF "Disable signups" in Supabase Auth settings and enable Phone provider + SMS provider (and Email provider for email OTP).
- To disable signups (private beta): keep signups disabled and set `VITE_AUTH_ALLOW_OTP_SIGNUPS=false`. OTP will work only for existing users created/admin-invited.

## Admin: create OTP users (private beta)
Server-side only (never in the browser). Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

```bash
node scripts/create-user.mjs --email user@example.com --password TempPass123!
node scripts/create-user.mjs --phone +447700900000
```

## Messaging RPC notes
- If you see `PGRST202` for `get_conversations_overview`, apply the latest Supabase migrations and refresh the API schema cache in the Supabase dashboard.
