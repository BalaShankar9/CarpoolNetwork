# Automated Error Monitoring Pipeline + Admin Dashboard Redesign

**Date:** 2026-03-08
**Status:** Approved

---

## Summary

Two interconnected systems:

1. **Automated Error Monitoring Pipeline** — Captures client errors, deduplicates into incidents, auto-fixes known patterns via GitHub PRs, batches by severity, notifies affected users after deploy.
2. **Admin Dashboard Redesign** — Dark mode control room theme, top-level tab navigation with sidebar sub-nav, new Platform Health Score, Incident Queue, and Status Page Manager.

## Decisions

| Decision | Choice |
|----------|--------|
| Fix approach | Hybrid — auto-fix known patterns (confidence > 85%), escalate complex |
| Deploy model | Severity-gated — critical = immediate PR, low/medium = weekly batch |
| User communication | In-app notification for affected users + public status page |
| Admin navigation | Top tabs (6 categories) + sidebar sub-nav per tab |
| Admin theme | Dark mode — slate-900/800 base, red-to-orange brand gradient accents |
| Analytics focus | Composite Health Score (0-100) with operational + user impact drill-down |
| Architecture | Edge Function Pipeline — Supabase Edge Functions + DB triggers |

---

## 1. Error Monitoring Pipeline

### Data Flow

```
User Browser
  window.onerror / unhandledrejection / React ErrorBoundary
    → errorTracking.ts (buffered, flushes every 10s)
      → log_error RPC → error_logs table
        → DB trigger (AFTER INSERT)
          → Edge Function: auto-triage
            → Deduplicate (fingerprint)
            → Classify severity
            → Match known patterns
            → Score confidence
            → If auto-fixable (confidence > 85%): queue fix
            → If not: escalate to incident_queue for review
```

### Error Fingerprinting

```
fingerprint = hash(
  error_code            // "PGRST200", "42501", "TypeError"
  + message_template    // parameterized (strip table/column names)
  + route_pattern       // "/messages", "/admin/*", "/rides/:id"
)
```

- Same fingerprint within 24h → same incident (count incremented)
- Same fingerprint after 24h silence → new incident (regression)

### Known Auto-Fix Patterns

| Pattern | Detection | Auto-Fix |
|---------|-----------|----------|
| PGRST200 — missing relationship | Error code + message regex | Add FK hint to query or create migration |
| PGRST204 — missing column | Error code + column name | Rename/add column migration |
| RLS policy denial (42501) | Error code + table name | Generate permissive RLS policy migration |
| Missing RPC (404 on /rpc/) | 404 status + RPC name | Check if function exists, regenerate from migrations |
| PostgREST schema cache stale | PGRST errors after migration | NOTIFY pgrst, 'reload schema' |
| Uncaught TypeError: null access | Stack trace pattern | Add null guard at crash site |

### Database Schema

```sql
-- Deduplicated error groups
incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','triaging','fixing','pr_created','needs_review','deployed','dismissed')),
  error_code text,
  error_message text,
  route_pattern text,
  service text, -- 'messaging', 'rides', 'auth', 'community', 'notifications'
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  occurrence_count int DEFAULT 1,
  affected_user_count int DEFAULT 1,
  auto_fixable boolean DEFAULT false,
  confidence_score int DEFAULT 0,
  suggested_fix jsonb DEFAULT '{}',
  fix_pr_url text,
  fix_branch text,
  resolved_at timestamptz,
  deployed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Links raw errors to incidents
incident_errors (
  incident_id uuid REFERENCES incidents(id),
  error_log_id uuid,
  PRIMARY KEY (incident_id, error_log_id)
);

-- Tracks which users were affected
incident_affected_users (
  incident_id uuid REFERENCES incidents(id),
  user_id uuid REFERENCES auth.users(id),
  first_seen timestamptz DEFAULT now(),
  notified boolean DEFAULT false,
  PRIMARY KEY (incident_id, user_id)
);

-- Public status page entries
status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id),
  title text NOT NULL,
  description text,
  severity text NOT NULL,
  service text NOT NULL,
  status text NOT NULL DEFAULT 'investigating'
    CHECK (status IN ('investigating','identified','monitoring','resolved')),
  is_public boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Cached health score (refreshed every 5 min)
platform_health_cache (
  id int PRIMARY KEY DEFAULT 1,
  score int NOT NULL,
  uptime_pct numeric,
  error_rate numeric,
  fix_rate_pct numeric,
  mttr_minutes numeric,
  trend_delta int,
  breakdown jsonb,
  computed_at timestamptz DEFAULT now()
);
```

---

## 2. Edge Functions

### auto-triage (DB trigger on error_logs INSERT)

1. Generate fingerprint from error
2. Upsert incident (create or increment)
3. Pattern-match against known fix rules
4. Score confidence
5. If critical + auto-fixable: invoke fix-deployer immediately
6. For unmatched patterns: call Claude API for classification

### fix-deployer (cron every 15 min + direct invocation)

1. Query incidents with status = 'fixing' or queued
2. Generate fix based on pattern type (SQL migration or code patch)
3. GitHub API: create branch, commit, open PR
4. Update incident status → pr_created
5. Batch logic: critical = 1 PR each, low/medium = weekly batch PR

### deploy-webhook (Netlify deploy notification)

1. Receive Netlify deploy success payload
2. Match merged PRs to incidents via fix_branch
3. Update incident status → deployed
4. Create public status_event if severity >= high
5. Insert user_notifications for affected users
6. Refresh platform_health_cache

### Configuration

```
Edge Function env vars:
  GITHUB_TOKEN              — repo-scoped PAT
  GITHUB_REPO               — "owner/CarpoolNetwork"
  CLAUDE_API_KEY             — for smart triage
  NETLIFY_WEBHOOK_SECRET     — verify deploy webhooks

DB settings:
  app.settings.auto_fix_enabled        — global kill switch
  app.settings.confidence_threshold    — min score for auto-fix (default: 85)
```

---

## 3. User Communication

### In-App Fix Notification

When incident status → deployed, a DB trigger inserts into user_notifications for each user in incident_affected_users.

On next app visit, user sees a dismissible toast:
"An issue you experienced with {service} has been fixed."

- Passive (shown on next visit, not push/email)
- Links to status page entry
- Auto-dismissed after 7 days if unread

### Public Status Page (/status)

No-auth-required page showing:
- Overall status indicator (Operational / Degraded / Outage)
- Per-service uptime bars (Messaging, Rides, Auth, Community, Notifications)
- Recent incidents list (public ones only, controlled by is_public flag)
- 30-day uptime percentage

---

## 4. Admin Dashboard Redesign

### Navigation: Top Tabs + Sidebar Sub-Nav

6 top-level categories:

| Tab | Sidebar Pages |
|-----|--------------|
| **Overview** | Dashboard, Platform Health Score, Incident Queue, Status Page Manager |
| **Users & Safety** | Users, User Detail, Verification Queue, Safety Reports, Safety Detail, Safety Dashboard, Muted Users |
| **Content** | Community, Post Detail, Content Warnings, Messages, Conversation Detail, Notifications, Announcements, Templates |
| **Operations** | Rides, Ride Detail, Bookings, Booking Detail, Bulk Operations |
| **Analytics** | Summary, User Analytics, Ride Analytics, Geo Analytics, Ops Health, Live Activity, Performance |
| **System** | Platform Settings, System Health, Admin Management, Audit Log, Diagnostics, Bug Reports, Feedback, Beta |

### Dark Mode Theme

```
Backgrounds:     slate-900 (#0f172a), slate-800 (#1e293b), slate-700 (#334155)
Text:            slate-50 (#f8fafc), slate-400 (#94a3b8), slate-500 (#64748b)
Brand gradient:  red-500 (#ef4444) → orange-500 (#f97316)
Borders:         slate-700 (#334155)
Status colors:   green-500, amber-500, red-500, blue-500
Active states:   Brand gradient left border or underline + slate-700 bg
```

### Top Bar

- Dark (slate-900), logo + "CarpoolNetwork Admin"
- Tab row with brand gradient underline on active
- Notification bell with incident count badge
- User avatar dropdown with role badge

### Sidebar (per-tab)

- 240px width, collapsible to 60px icons-only
- slate-800 background
- Active item: 3px brand gradient left border + slate-700 bg
- Badge pills for counts (red-500)

### Platform Health Score Widget

Circular gauge with brand gradient arc, showing 0-100 score.

Score formula:
- Uptime % (weight: 40%)
- 1 - Error rate (weight: 25%)
- Fix rate % (weight: 20%)
- MTTR score (weight: 15%)

Thresholds: 90-100 Excellent, 70-89 Good, 50-69 Fair, <50 Critical

Drill-downs: Operational (errors by severity/service) and User Impact (affected users, most impacted features, error-to-churn).

### Incident Queue Page

Grouped by status:
- CRITICAL — auto-fixing with PR links
- NEEDS REVIEW — manual review with Apply Fix / Dismiss actions
- RECENTLY FIXED — deployed fixes with timestamps

---

## 5. New Files

### Create

```
supabase/migrations/XXX_create_incidents_tables.sql
supabase/migrations/XXX_create_health_score_function.sql
supabase/migrations/XXX_create_status_events_table.sql
supabase/migrations/XXX_create_incident_triggers.sql
supabase/functions/auto-triage/index.ts
supabase/functions/fix-deployer/index.ts
supabase/functions/deploy-webhook/index.ts
src/components/admin/AdminShell.tsx
src/components/admin/AdminTopBar.tsx
src/components/admin/AdminSideNav.tsx
src/components/admin/DarkThemeProvider.tsx
src/pages/admin/IncidentQueue.tsx
src/pages/admin/PlatformHealthScore.tsx
src/pages/admin/IncidentAnalytics.tsx
src/pages/admin/StatusPageManager.tsx
src/pages/Status.tsx
src/services/incidentService.ts
src/services/statusPageService.ts
src/components/shared/HealthScoreGauge.tsx
src/components/shared/FixNotificationBanner.tsx
```

### Modify

```
src/components/admin/AdminLayout.tsx      — replace with AdminShell
src/App.tsx                               — add new routes
src/services/errorTracking.ts             — add fingerprinting, user_id tracking
src/services/adminAnalyticsService.ts     — add getHealthScore()
src/components/shared/ToastContainer.tsx   — handle fix-notification type
```

### Unchanged

All 35 existing admin pages keep their current logic. They render inside AdminShell instead of AdminLayout — wrapper swap only.

---

## 6. Rollout Phases

### Phase 1: Foundation
- Create incident tables + triggers
- Build AdminShell (top tabs + sidebar)
- Apply dark theme
- Wire all 35 existing pages into new shell

### Phase 2: Error Pipeline
- Deploy auto-triage edge function
- Deploy fix-deployer edge function
- Build Incident Queue page
- Enhance errorTracking.ts with fingerprinting

### Phase 3: Health Score + Analytics
- Create health score calculation function
- Build Platform Health Score page
- Build Incident Analytics page

### Phase 4: User Communication
- Deploy deploy-webhook edge function
- Configure Netlify webhook
- Build public Status page
- Build Status Page Manager (admin)
- Build FixNotificationBanner component

### Phase 5: Polish + Hardening
- Kill switch testing
- Duplicate PR prevention
- Rate limiting on edge functions
- Load test with synthetic errors

---

## 7. Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Auto-fix creates bad PR | 85% confidence threshold. PRs require manual merge. Netlify preview deploys. |
| Duplicate incidents | Fingerprint dedup with 24h window. Idempotent operations. |
| GitHub API rate limits | 15-min cron max. Batch mode. Exponential backoff on 429s. |
| Health score too expensive | Cached, refreshed every 5 min. Dashboard reads from cache only. |
| Auto-fix breaks something | All fixes via PRs (never direct to main). Preview URLs. Global kill switch. |
| Edge function down | Errors still captured in error_logs. Triage on next invocation. No data loss. |
