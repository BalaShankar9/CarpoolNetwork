# Production Load Audit Report

**Date:** 2026-01-14  
**Auditor:** Principal Engineer / QA  
**Application:** CarpoolNetwork  
**Deployment:** Netlify  
**Stack:** React + Vite + TypeScript + Supabase  

---

## 🎉 FIXES IMPLEMENTED — 2026-01-14

The issues identified in this audit have been **resolved**. See the "Implementation Summary" section at the end of this document.

| Issue | Status | Fix |
|-------|--------|-----|
| Supabase throws on missing env vars | ✅ FIXED | Graceful validation with GlobalErrorBoundary |
| Service worker race condition | ✅ FIXED | SW registration disabled in pwaService.ts |
| Missing SPA redirects | ✅ OK | Already configured in netlify.toml |
| Admin route protection | ✅ OK | AdminRoute guard verified |
| Cache headers for sw.js/index.html | ✅ ADDED | No-cache headers in netlify.toml |

---

## 1. Executive Summary

### Severity: 🔴 HIGH → 🟢 RESOLVED

The website intermittently fails to load (blank screen / error on refresh). Based on code analysis, the **most likely root causes** are:

1. **P0 - CRITICAL: Supabase client throws on missing env vars** — If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing at runtime, the app crashes immediately before any error boundary can catch it.

2. **P1 - HIGH: Service Worker / PWA Conflict** — A service worker (`sw.js`) is registered by `pwaService.ts`, but `index.html` also contains code to unregister all service workers. This race condition can cause stale chunk caching, leading to `ChunkLoadError` on deploys.

3. **P2 - MEDIUM: Lazy loading without retry/fallback** — All 60+ routes use `lazy()` imports without chunk load error recovery, meaning a failed chunk fetch shows a blank screen with no recovery path.

---

## 2. Most Likely Root Causes (Ranked)

| Rank | Issue | Severity | File(s) | Impact |
|------|-------|----------|---------|--------|
| 1 | Supabase init throws on missing env vars | 🔴 CRITICAL | [src/lib/supabase.ts](src/lib/supabase.ts#L6-L8) | App crash before render |
| 2 | Service worker race condition | 🟠 HIGH | [public/sw.js](public/sw.js), [index.html](index.html#L55-L64) | Stale chunks, blank screen |
| 3 | No chunk load error recovery | 🟡 MEDIUM | [src/App.tsx](src/App.tsx#L17-L98) | Unrecoverable lazy load fail |
| 4 | PWA service still registers SW | 🟡 MEDIUM | [src/services/pwaService.ts](src/services/pwaService.ts#L49) | Re-registers SW after unregister |
| 5 | ErrorBoundary inside Router | 🟢 LOW | [src/App.tsx](src/App.tsx#L619-L635) | Router errors bypass boundary |

---

## 3. Detailed Findings & Evidence

### 3.1 CRITICAL: Supabase Client Throws on Missing Environment Variables

**Location:** [src/lib/supabase.ts](src/lib/supabase.ts#L3-L8)

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
```

**Problem:** This code runs at **module load time** (before React renders). If either env var is missing or blank:
- The error throws synchronously
- ErrorBoundary never mounts (App hasn't rendered)
- User sees blank white screen with no feedback

**Why this happens in production:**
- Netlify env var misconfiguration
- Build-time env var not injected
- Cached deployment with old build

**Verification:** Check browser console for: `Uncaught Error: Missing Supabase environment variables`

---

### 3.2 HIGH: Service Worker Race Condition

**Locations:** 
- [public/sw.js](public/sw.js) — Full service worker implementation
- [index.html](index.html#L55-L64) — Unregisters service workers
- [src/services/pwaService.ts](src/services/pwaService.ts#L49) — Registers service worker

**Conflict Analysis:**

1. **index.html** (lines 55-64) runs inline script to unregister all SWs:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
    if (window.caches) {
      caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
    }
  }
</script>
```

2. **pwaService.ts** (line 49) re-registers the SW on load:
```typescript
this.registration = await navigator.serviceWorker.register('/sw.js');
```

**Race Condition:**
- Inline script runs first → unregisters SW
- React mounts → `pwaService` constructor runs → re-registers SW
- On next navigation/refresh → Old cached chunks may be served

**Impact:** After a new deployment:
- Service worker caches old chunk hashes
- Browser requests `/assets/Home-abc123.js`
- SW serves cached `/assets/Home-xyz789.js` (404 or wrong content)
- Result: Blank screen, `ChunkLoadError`, or runtime errors

---

### 3.3 MEDIUM: No Chunk Load Error Recovery

**Location:** [src/App.tsx](src/App.tsx#L17-L98)

All 60+ pages use `lazy()` without error handling:
```typescript
const Home = lazy(() => import('./pages/Home'));
const FindRides = lazy(() => import('./pages/FindRides'));
// ... 60+ more lazy imports
```

**Problem:** If chunk fetch fails (network error, CDN issue, cache mismatch):
- `Suspense` fallback shows loading spinner forever
- Or React throws `ChunkLoadError` caught by ErrorBoundary
- **No automatic retry** mechanism
- User must manually refresh

**Recommended Pattern:**
```typescript
const Home = lazy(() => 
  import('./pages/Home').catch(() => {
    window.location.reload(); // Force reload on chunk fail
    return { default: () => null }; // Prevent crash
  })
);
```

---

### 3.4 SPA Fallback Configuration ✅ CORRECT

**Location:** [netlify.toml](netlify.toml#L32-L35)

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Also:** [public/_redirects](public/_redirects)
```
/*    /index.html   200
```

**Status:** ✅ SPA fallback is correctly configured. Refresh on any route returns `index.html`.

---

### 3.5 Vite Base Path ✅ CORRECT

**Location:** [vite.config.ts](vite.config.ts)

No explicit `base` configuration = defaults to `/` which is correct for Netlify root deployment.

**Status:** ✅ No issues with asset paths.

---

### 3.6 Admin Routes ✅ PROTECTED

**Location:** [src/App.tsx](src/App.tsx#L127-L157)

```typescript
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading, isEmailVerified, isAdmin, adminRole } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // CRITICAL: Wait for profile to load before checking admin status
  if (!profile) {
    return <LoadingScreen />;
  }

  const hasAdminAccess = profile.is_admin === true || adminRole !== null;
  
  if (!hasAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

**Status:** ✅ Admin routes are properly protected at router level with profile-load guard.

---

### 3.7 Environment Variables Usage

**Required at runtime (CRITICAL):**
| Variable | Used In | Graceful Fallback? |
|----------|---------|-------------------|
| `VITE_SUPABASE_URL` | [src/lib/supabase.ts](src/lib/supabase.ts#L3) | ❌ NO - throws |
| `VITE_SUPABASE_ANON_KEY` | [src/lib/supabase.ts](src/lib/supabase.ts#L4) | ❌ NO - throws |

**Optional (have fallbacks):**
| Variable | Used In | Fallback |
|----------|---------|----------|
| `VITE_GOOGLE_MAPS_API_KEY` | [src/lib/runtimeConfig.ts](src/lib/runtimeConfig.ts#L13) | ✅ `''` |
| `VITE_SENTRY_DSN` | [src/lib/sentry.ts](src/lib/sentry.ts#L1) | ✅ No-op if missing |
| `VITE_GA4_MEASUREMENT_ID` | [src/lib/analytics/config.ts](src/lib/analytics/config.ts#L80) | ✅ `''` |
| `VITE_VAPID_PUBLIC_KEY` | [src/services/pwaService.ts](src/services/pwaService.ts#L148) | ✅ Push disabled |

---

### 3.8 Error Boundary Coverage

**Structure:**
```
main.tsx
└── ErrorBoundary (catches top-level crashes)
    └── App.tsx
        └── AuthProvider
            └── Router
                └── AppErrorBoundary (ProductionErrorBoundary)
                    └── AppContent (Routes)
```

**Issue:** If error occurs **before** `ErrorBoundary` renders (e.g., module load error in `supabase.ts`), user sees blank screen.

**Evidence:** ErrorBoundary is in [src/main.tsx](src/main.tsx#L23-L27):
```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

But `App` imports `AuthProvider` which imports `supabase`, which throws before ErrorBoundary mounts.

---

## 4. Reproduction Steps

### 4.1 Blank Screen on Refresh

**Steps:**
1. Deploy new version to Netlify
2. User has old service worker cached
3. User navigates to `/find-rides`
4. Press F5 or browser refresh
5. **Expected:** Page loads
6. **Actual:** Blank screen or infinite spinner

**Root Cause:** Stale SW serves old chunks that don't match new deployment.

### 4.2 Blank Screen on First Load

**Steps:**
1. Misconfigure or remove `VITE_SUPABASE_URL` in Netlify env vars
2. Trigger redeploy
3. Visit site
4. **Expected:** Error message
5. **Actual:** Blank white screen

**Root Cause:** `supabase.ts` throws before React renders.

### 4.3 Routes That May Fail

| Route | Dependency | Failure Mode |
|-------|------------|--------------|
| `/` | Supabase auth check | Crash if Supabase missing |
| `/messages` | `get_total_unread_messages` RPC | Partial failure, UI handles |
| `/admin/*` | Profile load + admin check | Stuck loading if profile fails |
| `/signup` (beta mode) | `check_beta_allowlist` RPC | Error shown in UI |

---

## 5. Fix Checklist

### P0 - CRITICAL (Fix Immediately)

- [ ] **5.1** Make Supabase init graceful with boot error UI
  - **File:** [src/lib/supabase.ts](src/lib/supabase.ts)
  - **Change:** Instead of throwing, export a `supabaseError` flag and render a diagnostic page if true
  - **Impact:** Users see helpful error instead of blank screen

- [ ] **5.2** Remove service worker completely OR fix the race condition
  - **Option A:** Remove `sw.js`, unregister code in `index.html`, and `pwaService.ts` registration
  - **Option B:** Keep SW but add versioned cache busting on every deploy
  - **Impact:** Eliminates stale chunk issues

### P1 - HIGH (Fix This Week)

- [ ] **5.3** Add chunk load error recovery to lazy imports
  - **File:** [src/App.tsx](src/App.tsx)
  - **Pattern:** Wrap `import()` with `.catch()` that reloads page
  - **Impact:** Self-healing on chunk load failures

- [ ] **5.4** Add boot diagnostics banner for missing env vars
  - **File:** [src/main.tsx](src/main.tsx)
  - **Change:** Check critical env vars before render, show diagnostic UI if missing
  - **Impact:** Clear error message for operators

### P2 - MEDIUM (Fix This Sprint)

- [ ] **5.5** Move ErrorBoundary higher in the component tree
  - **File:** [src/main.tsx](src/main.tsx)
  - **Change:** Wrap entire React tree in try-catch with fallback HTML
  - **Impact:** Catch module-level errors

- [ ] **5.6** Add global unhandledrejection handler with UI
  - **File:** [src/main.tsx](src/main.tsx) or new file
  - **Change:** Listen for unhandled promise rejections, show toast/banner
  - **Impact:** Better visibility into async failures

---

## 6. How to Verify Fixes

### 6.1 Manual Verification

1. **Supabase graceful init:**
   - Temporarily remove `VITE_SUPABASE_URL` from Netlify
   - Deploy and visit site
   - ✅ Should see diagnostic error page, not blank screen

2. **Service worker fix:**
   - Deploy new version
   - In old browser session, navigate to `/find-rides`
   - Refresh page
   - ✅ Should load new version, not show ChunkLoadError

3. **Chunk recovery:**
   - Open DevTools → Network → Offline
   - Navigate to new route
   - Go back online
   - ✅ Should auto-recover or prompt reload

### 6.2 Automated Verification

Add these E2E tests:

```typescript
// e2e/boot-reliability.spec.ts
test('app shows error UI if Supabase unavailable', async ({ page }) => {
  await page.route('**/supabase.co/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('text=connection error')).toBeVisible();
});

test('app recovers from chunk load error', async ({ page }) => {
  await page.goto('/');
  // Simulate chunk 404
  await page.route('**/assets/FindRides*.js', route => route.abort());
  await page.click('text=Find Rides');
  await expect(page.locator('text=Loading')).toBeVisible();
  // Reconnect
  await page.unroute('**/assets/FindRides*.js');
  await page.reload();
  await expect(page.locator('h1:text("Find a Ride")')).toBeVisible();
});
```

---

## 7. Rollback Strategy

### Quick Rollback (< 5 minutes)

1. Go to Netlify Dashboard → Deploys
2. Find last known working deploy (check timestamp)
3. Click "Publish deploy"
4. ✅ Site reverts instantly (Netlify keeps all deploy artifacts)

### Cache Bust for Users

If users have stale service worker:

1. Deploy the SW unregister fix (already in `index.html`)
2. Add cache-busting header to `sw.js`:
   ```toml
   # netlify.toml
   [[headers]]
     for = "/sw.js"
     [headers.values]
       Cache-Control = "no-cache, no-store, must-revalidate"
   ```
3. Users' next visit will unregister old SW

---

## 8. Required Configuration Changes

### 8.1 Netlify Environment Variables

Verify these are set in Netlify Dashboard → Site settings → Environment variables:

| Variable | Required | Status |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | ✅ CRITICAL | Verify not empty |
| `VITE_SUPABASE_ANON_KEY` | ✅ CRITICAL | Verify not empty |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | - |
| `VITE_SENTRY_DSN` | Optional | - |

### 8.2 Netlify.toml Additions

Add to [netlify.toml](netlify.toml):

```toml
# Prevent SW caching issues
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

# Prevent index.html caching
[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
```

---

## 9. Summary

| Finding | Severity | Status | Action Required |
|---------|----------|--------|-----------------|
| Supabase throws on missing env | 🔴 CRITICAL | ✅ FIXED | None |
| SW race condition | 🟠 HIGH | ✅ FIXED | None |
| No chunk retry | 🟡 MEDIUM | Partial | Add retry logic (future) |
| SPA fallback | ✅ OK | ✅ OK | None |
| Vite base path | ✅ OK | ✅ OK | None |
| Admin route guard | ✅ OK | ✅ OK | None |
| ErrorBoundary coverage | 🟢 LOW | ✅ FIXED | None |

---

## 10. Implementation Summary (2026-01-14)

### Changes Made

#### 1. Environment Variable Validation & Graceful Error Handling

**File:** [src/lib/supabase.ts](src/lib/supabase.ts)

- Added `validateEnvVars()` function that returns a result object instead of throwing
- Created `supabaseInitError` export to track initialization failures
- Created `isSupabaseInitialized()` helper for runtime checks
- Mock Supabase client proxy for graceful degradation when env vars are missing

#### 2. Global Error Boundary

**File:** [src/components/shared/GlobalErrorBoundary.tsx](src/components/shared/GlobalErrorBoundary.tsx)

- New top-level ErrorBoundary with minimal dependencies (no external icons/services)
- User-friendly error UI with:
  - Clear error message
  - "Retry" and "Clear Cache & Retry" buttons
  - Special messaging for environment variable issues
  - Technical details in expandable section
  - Support contact information

**File:** [src/main.tsx](src/main.tsx)

- Wrapped app with GlobalErrorBoundary
- Added AppWithInitCheck component that throws supabaseInitError if present
- Added boot-time logging for initialization issues

#### 3. Service Worker Race Condition Fix

**File:** [src/services/pwaService.ts](src/services/pwaService.ts)

- Added `SW_ENABLED = false` flag to disable SW registration
- Added detailed comments explaining the issue and how to re-enable
- PWA install prompts still work (beforeinstallprompt listener)

**File:** [netlify.toml](netlify.toml)

- Added no-cache headers for `/index.html` to prevent stale app shell
- Added no-cache headers for `/sw.js` to prevent stale service worker

#### 4. Tests Added

**File:** [tests/envValidation.spec.ts](tests/envValidation.spec.ts)

- Unit tests for environment variable validation logic
- Tests for error message formatting

**File:** [e2e/spa-refresh.spec.ts](e2e/spa-refresh.spec.ts)

- E2E tests for SPA refresh on various routes
- Tests for protected route redirects
- Tests for admin route protection
- Console error monitoring tests

### Verification Steps

1. **Build and deploy:**
   ```bash
   npm run build
   netlify deploy --prod
   ```

2. **Test missing env vars locally:**
   - Temporarily remove VITE_SUPABASE_URL from .env
   - Run `npm run dev`
   - Verify GlobalErrorBoundary shows friendly error

3. **Test SPA refresh:**
   - Navigate to /messages, /profile, /find-rides
   - Press F5 to refresh
   - Verify page loads without 404 or blank screen

4. **Run tests:**
   ```bash
   npm run test            # Unit tests
   npm run test:e2e        # E2E tests
   ```

### Files Modified

| File | Change |
|------|--------|
| src/lib/supabase.ts | Graceful env validation |
| src/main.tsx | GlobalErrorBoundary integration |
| src/components/shared/GlobalErrorBoundary.tsx | NEW - Boot error UI |
| src/services/pwaService.ts | Disabled SW registration |
| netlify.toml | Added cache headers |
| tests/envValidation.spec.ts | NEW - Unit tests |
| e2e/spa-refresh.spec.ts | NEW - E2E tests |
| PROD_LOAD_AUDIT_REPORT.md | Updated with fixes |

---

## 11. Future Improvements

1. **Chunk Load Error Recovery:** Add `.catch()` handlers to lazy imports that trigger page reload
2. **Re-enable Service Worker:** Implement proper cache versioning and re-enable PWA offline support
3. **Enhanced Monitoring:** Add Sentry integration for boot errors
4. **Automated Health Checks:** Add synthetic monitoring for production load reliability

---

*Report updated after fix implementation. All critical issues resolved.*
