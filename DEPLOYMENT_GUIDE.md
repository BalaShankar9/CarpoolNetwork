# Carpool Network - Deployment Guide

## Overview

This guide covers deploying the Carpool Network application to production with zero-regression guarantees.

## ⚠️ CRITICAL: Pre-Deployment Checklist

Before ANY deployment, complete these steps IN ORDER:

1. ✅ Verify Netlify env vars match your Supabase project
2. ✅ Run schema contract verification
3. ✅ Apply missing migrations
4. ✅ Reload PostgREST schema cache
5. ✅ Re-verify schema contract (all ✅)
6. ✅ Build and deploy

---

## Phase 0: Database ↔ App Contract Sync

### Step 1: Verify Environment Variable Match

**This is the #1 cause of "works locally, breaks in prod" issues.**

```bash
# Get your Netlify env vars
netlify env:list
```

Compare `VITE_SUPABASE_URL` with your Supabase project URL:
- Supabase Dashboard → Project → Settings → API → Project URL

**If they don't match**: You've been deploying against the wrong database!
```bash
netlify env:set VITE_SUPABASE_URL "https://YOUR_CORRECT_PROJECT.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your_correct_anon_key"
```

### Step 2: Run Schema Contract Verification

Open Supabase SQL Editor for your **production** project:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
```

Copy and run the contents of `scripts/verify_schema_contract.sql`

Expected output: All items show ✅

If any show ❌, proceed to Step 3.

### Step 3: Apply Missing Migrations (IN ORDER)

The verification script tells you exactly which migrations to apply. Common ones:

| Missing Object | Migration File |
|---------------|----------------|
| `conversations`, `chat_messages` | `20260105120000_upgrade_messaging_system.sql` |
| `get_conversations_overview()` | `20260106120000_fix_messaging_overview_rpc.sql` |
| `profile_public_v` | `20260108100000_fix_profile_public_view.sql` |
| `recurring_ride_patterns` | `20260109120000_phase2_rbac_achievements_subscriptions.sql` |
| `user_can_view_ride()` | `20260116100000_fix_rides_rls_visibility.sql` |

**Apply each migration in Supabase SQL Editor, one at a time, in timestamp order.**

### Step 4: Reload PostgREST Schema Cache

After applying migrations, run `scripts/reload_postgrest_schema_cache.sql`:

```sql
SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';
```

Wait 10 seconds.

### Step 5: Re-verify Schema Contract

Run `scripts/verify_schema_contract.sql` again.

**EXIT CRITERIA**: All items show ✅

If any items still show ❌, repeat steps 3-5.

---

## Prerequisites

- Node.js 18+ and npm
- Supabase account with project set up
- Environment variables configured
- Domain name (optional but recommended)

## Environment Variables

Create a `.env.production` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Build Process

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Type Check

```bash
npm run typecheck
```

### 3. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### 4. Test Production Build Locally

```bash
npm run preview
```

## Deployment Options

### Option 1: Netlify (Recommended)

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Initialize Site:**
   ```bash
   netlify init
   ```

4. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

5. **Configure Redirects:**
   Netlify automatically reads `public/_redirects` for SPA routing.

6. **Set Environment Variables:**
   ```bash
   netlify env:set VITE_SUPABASE_URL "your_url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your_key"
   ```

### Option 2: Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Environment Variables:**
   Add in Vercel dashboard under Settings → Environment Variables

### Option 3: Self-Hosted (Docker)

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Build and Run:**
   ```bash
   docker build -t carpool-network .
   docker run -p 80:80 carpool-network
   ```

## Database Migration

### ⚠️ CRITICAL: Verify Environment Variables Match Production

Before applying any migrations, **confirm your Netlify environment variables point to the correct Supabase project**:

1. **Get your Netlify env vars:**
   ```bash
   netlify env:list
   ```
   Or check: Netlify Dashboard → Site → Site configuration → Environment variables

2. **Compare with your Supabase project:**
   - The `VITE_SUPABASE_URL` should match your Supabase project URL
   - Go to: https://supabase.com/dashboard → Your Project → Settings → API

3. **⚠️ If they don't match, you've been deploying to a different database!**
   Update Netlify env vars to point to the correct project.

### Step-by-Step Migration Process

**Step 1: Run Schema Verification**

Open the Supabase SQL Editor for your production project:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
```

Copy and run `scripts/verify_prod_schema.sql` to see what's missing.

**Step 2: Apply Missing Migrations**

For messaging to work, these migrations must be applied IN ORDER:

1. **Messaging Tables & Functions** (if conversations table missing):
   ```
   supabase/migrations/20260105120000_upgrade_messaging_system.sql
   ```

2. **Profile Public View** (if profile_public_v missing):
   ```
   supabase/migrations/20260108100000_fix_profile_public_view.sql
   ```

3. **Messaging RPC Fix** (if get_conversations_overview missing):
   ```
   supabase/migrations/20260106120000_fix_messaging_overview_rpc.sql
   ```

4. **RLS Visibility Fix** (if user_can_view_ride missing):
   ```
   supabase/migrations/20260116100000_fix_rides_rls_visibility.sql
   ```

**Step 3: Reload PostgREST Schema Cache**

After applying migrations, run in Supabase SQL Editor:
```sql
NOTIFY pgrst, 'reload schema';
```
Or use `scripts/reload_postgrest_schema_cache.sql`

**Step 4: Verify Again**

Re-run `scripts/verify_prod_schema.sql` - all items should show ✅

### Apply All Migrations (Supabase CLI)

If you have Supabase CLI linked to your project:
```bash
# Link to your production project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
npx supabase db push
```

### Verify Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

### Troubleshooting PGRST202 Errors

If you see `PGRST202` errors after migrations:

1. **Check function exists:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' AND routine_name = 'get_conversations_overview';
   ```

2. **Reload schema cache:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

3. **Check function permissions:**
   ```sql
   GRANT EXECUTE ON FUNCTION get_conversations_overview TO authenticated;
   ```

4. **Wait 30 seconds** and test again - PostgREST may need time to refresh

## Edge Functions Deployment

All edge functions are deployed automatically via the Supabase management API:

```bash
# Functions are deployed when you use the deploy_edge_function tool
# No manual deployment needed
```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication flow (sign up, sign in, password reset)
- [ ] Test core features (post ride, find rides, booking)
- [ ] Verify real-time features (messages, notifications)
- [ ] Test on multiple devices/browsers
- [ ] Check performance metrics
- [ ] Verify SSL certificate is active
- [ ] Set up monitoring and error tracking
- [ ] Configure custom domain (if applicable)
- [ ] Enable CDN caching
- [ ] Set up automated backups

## Mobile App Deployment

### Android

1. **Build Release APK:**
   ```bash
   npm run cap:sync
   cd android
   ./gradlew assembleRelease
   ```

2. **Sign APK:**
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
     -keystore my-release-key.keystore app-release-unsigned.apk alias_name
   ```

3. **Align APK:**
   ```bash
   zipalign -v 4 app-release-unsigned.apk carpool-network.apk
   ```

4. **Upload to Google Play Console**

### iOS

1. **Open in Xcode:**
   ```bash
   npm run cap:sync
   npx cap open ios
   ```

2. **Configure Signing & Capabilities**

3. **Archive and Upload:**
   - Product → Archive
   - Distribute App → App Store Connect

## Monitoring

### Performance Monitoring

Monitor key metrics in the admin dashboard:
- Average response times
- Error rates
- Active users
- Cache hit rates

### Error Tracking

Check error logs:
```sql
SELECT * FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### System Health

```sql
SELECT * FROM get_system_health();
```

## Rollback Procedure

If deployment issues occur:

1. **Revert to Previous Deployment:**
   ```bash
   netlify rollback
   ```

2. **Restore Database (if needed):**
   ```bash
   supabase db reset
   ```

3. **Notify Users:**
   Use admin panel to send system notification

## Security Considerations

- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use HTTPS everywhere
- [ ] Implement CSP headers
- [ ] Enable Supabase RLS on all tables
- [ ] Rotate API keys regularly
- [ ] Monitor for suspicious activity
- [ ] Set up automated security scans

## Scaling

### Database

- Enable connection pooling in Supabase
- Add read replicas for high traffic
- Optimize slow queries identified in performance metrics

### Application

- Enable CDN caching
- Use image optimization
- Implement lazy loading
- Consider edge functions for compute-heavy operations

## Maintenance

### Regular Tasks

- **Weekly:** Review error logs and fix critical issues
- **Monthly:** Update dependencies and security patches
- **Quarterly:** Performance audit and optimization
- **Yearly:** Major version updates and feature review

### Backup Strategy

- Database: Automated daily backups via Supabase
- Code: Git repository with tags for releases
- Media: Regular backups of uploaded files

## Support

For deployment issues:
1. Check logs in the deployment platform
2. Review Supabase logs
3. Check browser console for errors
4. Verify environment variables are correct

## Useful Commands

```bash
# Build production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck

# Run tests
npm run test:e2e

# Sync Capacitor
npm run cap:sync

# Open Android Studio
npm run android

# Open Xcode
npm run ios
```

## Success Criteria

Deployment is successful when:
- ✅ Application loads without errors
- ✅ Authentication works correctly
- ✅ Core features are functional
- ✅ Real-time features work
- ✅ Performance metrics are within acceptable range
- ✅ No critical errors in error logs
- ✅ Mobile apps submitted to stores
