# Analytics Release Checklist

This checklist ensures analytics changes are properly tested and deployed safely.

## Pre-Deployment Checklist

### 1. Code Quality

- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] All analytics imports use the central `@/lib/analytics` entry point
- [ ] No PII (email, phone, full name, exact location) in event properties
- [ ] Event names follow snake_case convention
- [ ] All events include required base properties

### 2. Event Schema Validation

- [ ] New events are documented in [ANALYTICS_README.md](./ANALYTICS_README.md)
- [ ] Event types are defined in `types.ts`
- [ ] Bucket values are used for numeric data (distance, time, percentage)
- [ ] Page paths are sanitized (UUIDs replaced with `:id`)

### 3. Debug Testing (Local)

1. Enable debug mode:
   ```bash
   VITE_ANALYTICS_DEBUG=true npm run dev
   ```

2. Verify in browser console:
   - [ ] `[Analytics] Initialized` message appears
   - [ ] Page view events fire on navigation
   - [ ] Custom events log with correct properties

3. Test using browser console:
   ```javascript
   // Check current state
   analytics.getDebugState()
   
   // Verify dataLayer
   window.dataLayer
   ```

### 4. Staging Verification

1. Deploy to staging environment
2. Verify in GA4 DebugView:
   - [ ] Events appear in DebugView within 60 seconds
   - [ ] Event parameters are correct
   - [ ] User properties are set correctly

3. Test key flows:
   - [ ] Sign up flow (sign_up_complete event)
   - [ ] Ride creation (ride_created event)
   - [ ] Search (ride_search_performed event)
   - [ ] Booking request (ride_requested event)
   - [ ] Message send (message_sent event)

### 5. Performance Validation

- [ ] No significant increase in bundle size (< 5KB for analytics)
- [ ] No blocking scripts in critical path
- [ ] Web Vitals metrics remain within acceptable thresholds
- [ ] No console errors related to analytics

---

## Environment Configuration

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GA4_MEASUREMENT_ID` | Yes (prod) | GA4 Measurement ID (G-XXXXXXXXXX) |
| `VITE_GTM_CONTAINER_ID` | No | GTM Container ID (GTM-XXXXXXX) |
| `VITE_ANALYTICS_ENV` | No | Override environment detection |
| `VITE_ANALYTICS_DEBUG` | No | Enable debug logging |
| `VITE_ANALYTICS_DISABLED` | No | Disable all tracking |

### Netlify Environment Setup

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add the following:

**Production:**
```
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ANALYTICS_ENV=production
```

**Staging (Preview):**
```
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ANALYTICS_ENV=staging
VITE_ANALYTICS_DEBUG=true
```

---

## Rollback Procedure

If analytics issues are detected in production:

### Quick Disable

1. Set environment variable:
   ```
   VITE_ANALYTICS_DISABLED=true
   ```

2. Redeploy

### Code Rollback

1. Identify the problematic commit
2. Revert the changes:
   ```bash
   git revert <commit-hash>
   git push
   ```

3. Verify in production

---

## Monitoring

### GA4 Real-Time Reports

1. Open GA4 → Reports → Real-time
2. Verify:
   - Active users count
   - Events per minute
   - Top events by count

### Error Monitoring

Check Sentry for analytics-related errors:
- `analytics` in error source
- `dataLayer` or `gtag` errors
- Script loading failures

### Performance Monitoring

Check Web Vitals in GA4:
- Navigate to Engagement → Events
- Filter by `web_vitals` event
- Verify LCP, CLS, INP metrics

---

## Weekly QA Tasks

- [ ] Review error_state_shown events for recurring issues
- [ ] Check funnel drop-off rates for unexpected changes
- [ ] Verify Core Web Vitals are within thresholds
- [ ] Review new event additions for schema compliance

---

## Contacts

- **Analytics Issues:** Check #engineering Slack channel
- **GA4 Access:** Contact project lead
- **Emergency:** Follow incident response procedure
