# Error Monitoring Pipeline + Admin Dashboard Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an automated error monitoring pipeline that captures, deduplicates, and auto-fixes known error patterns via GitHub PRs, with a redesigned dark-mode admin dashboard featuring top-tab navigation, a Platform Health Score, and a public status page.

**Architecture:** Errors flow from the browser → `errorTracking.ts` → `error_logs` table → DB trigger → `auto-triage` Edge Function → `incidents` table → `fix-deployer` Edge Function → GitHub PR. Deploys trigger `deploy-webhook` → user notifications + status page updates. Admin dashboard uses a new `AdminShell` with 6 top-level tabs, dark slate theme, and red-to-orange brand gradient accents.

**Tech Stack:** React 18 + TypeScript, Supabase (Postgres, Edge Functions, Realtime), Tailwind CSS, GitHub API (via fetch), Netlify (deploy webhooks).

**Design Doc:** `docs/plans/2026-03-08-error-monitoring-admin-redesign-design.md`

---

## Phase 1: Foundation — Database + Dark Admin Shell

### Task 1: Create Incident Tables Migration

**Files:**
- Create: `supabase/migrations/20260308000001_create_incident_tables.sql`

**Step 1: Write the migration**

```sql
-- Deduplicated error groups (fingerprinted)
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','triaging','fixing','pr_created','needs_review','deployed','dismissed')),
  error_code text,
  error_message text,
  route_pattern text,
  service text CHECK (service IN ('messaging','rides','auth','community','notifications','admin','other')),
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  occurrence_count int DEFAULT 1,
  affected_user_count int DEFAULT 1,
  auto_fixable boolean DEFAULT false,
  confidence_score int DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  suggested_fix jsonb DEFAULT '{}',
  fix_pr_url text,
  fix_branch text,
  resolved_at timestamptz,
  deployed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_incidents_fingerprint_active
  ON public.incidents (fingerprint)
  WHERE status NOT IN ('deployed', 'dismissed');

CREATE INDEX idx_incidents_status ON public.incidents (status);
CREATE INDEX idx_incidents_severity ON public.incidents (severity);

-- Links raw errors to incidents
CREATE TABLE IF NOT EXISTS public.incident_errors (
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  error_log_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (incident_id, error_log_id)
);

-- Tracks which users were affected
CREATE TABLE IF NOT EXISTS public.incident_affected_users (
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  first_seen timestamptz DEFAULT now(),
  notified boolean DEFAULT false,
  PRIMARY KEY (incident_id, user_id)
);

CREATE INDEX idx_incident_affected_users_user ON public.incident_affected_users (user_id);

-- Public status page entries
CREATE TABLE IF NOT EXISTS public.status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  service text NOT NULL,
  status text NOT NULL DEFAULT 'investigating'
    CHECK (status IN ('investigating','identified','monitoring','resolved')),
  is_public boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_status_events_public ON public.status_events (is_public, started_at DESC);

-- Cached health score (refreshed every 5 min by edge function)
CREATE TABLE IF NOT EXISTS public.platform_health_cache (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  score int NOT NULL DEFAULT 100,
  uptime_pct numeric DEFAULT 100,
  error_rate numeric DEFAULT 0,
  fix_rate_pct numeric DEFAULT 100,
  mttr_minutes numeric DEFAULT 0,
  trend_delta int DEFAULT 0,
  breakdown jsonb DEFAULT '{}',
  computed_at timestamptz DEFAULT now()
);

-- Seed the singleton row
INSERT INTO public.platform_health_cache (id, score) VALUES (1, 100)
ON CONFLICT (id) DO NOTHING;

-- RLS policies
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_affected_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_health_cache ENABLE ROW LEVEL SECURITY;

-- Admin read/write on incidents
CREATE POLICY "Admins can manage incidents"
  ON public.incidents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Service role (edge functions) can manage incidents
CREATE POLICY "Service role manages incidents"
  ON public.incidents FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages incident_errors"
  ON public.incident_errors FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages incident_affected_users"
  ON public.incident_affected_users FOR ALL
  USING (auth.role() = 'service_role');

-- Users can see their own affected incidents
CREATE POLICY "Users see own affected incidents"
  ON public.incident_affected_users FOR SELECT
  USING (user_id = auth.uid());

-- Public can read public status events
CREATE POLICY "Public reads status events"
  ON public.status_events FOR SELECT
  USING (is_public = true);

-- Admins can manage status events
CREATE POLICY "Admins manage status events"
  ON public.status_events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Service role manages status events"
  ON public.status_events FOR ALL
  USING (auth.role() = 'service_role');

-- Everyone reads health cache
CREATE POLICY "Admins read health cache"
  ON public.platform_health_cache FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Service role manages health cache"
  ON public.platform_health_cache FOR ALL
  USING (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
```

**Step 2: Apply migration via Supabase MCP tool**

Run: `mcp__plugin_supabase_supabase__apply_migration` with name `create_incident_tables`

**Step 3: Commit**

```bash
git add supabase/migrations/20260308000001_create_incident_tables.sql
git commit -m "feat: create incident tracking tables for error monitoring pipeline"
```

---

### Task 2: Create Health Score Calculation Function

**Files:**
- Create: `supabase/migrations/20260308000002_create_health_score_function.sql`

**Step 1: Write the migration**

```sql
CREATE OR REPLACE FUNCTION public.calculate_platform_health_score(period_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uptime_pct numeric;
  v_error_rate numeric;
  v_fix_rate_pct numeric;
  v_mttr_minutes numeric;
  v_score int;
  v_prev_score int;
  v_total_incidents int;
  v_resolved_incidents int;
  v_critical_downtime_hours numeric;
  v_total_hours numeric;
BEGIN
  v_total_hours := period_days * 24.0;

  -- Uptime: hours without critical incidents / total hours
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (COALESCE(resolved_at, now()) - first_seen)) / 3600.0
  ), 0)
  INTO v_critical_downtime_hours
  FROM public.incidents
  WHERE severity = 'critical'
    AND first_seen >= now() - (period_days || ' days')::interval;

  v_uptime_pct := GREATEST(0, LEAST(100,
    ((v_total_hours - v_critical_downtime_hours) / v_total_hours) * 100
  ));

  -- Error rate: incidents per day (lower is better, normalized to 0-100)
  SELECT COUNT(*)
  INTO v_total_incidents
  FROM public.incidents
  WHERE first_seen >= now() - (period_days || ' days')::interval;

  v_error_rate := CASE
    WHEN period_days > 0 THEN v_total_incidents::numeric / period_days
    ELSE 0
  END;

  -- Fix rate: % of incidents resolved
  SELECT COUNT(*)
  INTO v_resolved_incidents
  FROM public.incidents
  WHERE first_seen >= now() - (period_days || ' days')::interval
    AND status IN ('deployed', 'dismissed');

  v_fix_rate_pct := CASE
    WHEN v_total_incidents > 0 THEN (v_resolved_incidents::numeric / v_total_incidents) * 100
    ELSE 100
  END;

  -- MTTR: average minutes to resolve
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (resolved_at - first_seen)) / 60.0
  ), 0)
  INTO v_mttr_minutes
  FROM public.incidents
  WHERE resolved_at IS NOT NULL
    AND first_seen >= now() - (period_days || ' days')::interval;

  -- Composite score (0-100)
  -- Uptime 40%, Error rate 25%, Fix rate 20%, MTTR 15%
  v_score := LEAST(100, GREATEST(0, (
    (v_uptime_pct * 0.40) +
    (GREATEST(0, 100 - (v_error_rate * 10)) * 0.25) +  -- 10 errors/day = 0 score
    (v_fix_rate_pct * 0.20) +
    (GREATEST(0, 100 - (v_mttr_minutes / 10)) * 0.15)  -- 1000 min = 0 score
  )::int));

  -- Previous score for trend
  SELECT COALESCE(score, 100) INTO v_prev_score FROM public.platform_health_cache WHERE id = 1;

  -- Update cache
  INSERT INTO public.platform_health_cache (id, score, uptime_pct, error_rate, fix_rate_pct, mttr_minutes, trend_delta, breakdown, computed_at)
  VALUES (1, v_score, v_uptime_pct, v_error_rate, v_fix_rate_pct, v_mttr_minutes, v_score - v_prev_score,
    jsonb_build_object(
      'total_incidents', v_total_incidents,
      'resolved_incidents', v_resolved_incidents,
      'critical_downtime_hours', round(v_critical_downtime_hours, 2),
      'period_days', period_days
    ),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    score = EXCLUDED.score,
    uptime_pct = EXCLUDED.uptime_pct,
    error_rate = EXCLUDED.error_rate,
    fix_rate_pct = EXCLUDED.fix_rate_pct,
    mttr_minutes = EXCLUDED.mttr_minutes,
    trend_delta = EXCLUDED.trend_delta,
    breakdown = EXCLUDED.breakdown,
    computed_at = EXCLUDED.computed_at;

  RETURN jsonb_build_object(
    'score', v_score,
    'uptime_pct', round(v_uptime_pct, 2),
    'error_rate', round(v_error_rate, 2),
    'fix_rate_pct', round(v_fix_rate_pct, 2),
    'mttr_minutes', round(v_mttr_minutes, 1),
    'trend_delta', v_score - v_prev_score,
    'total_incidents', v_total_incidents,
    'resolved_incidents', v_resolved_incidents
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_platform_health_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_platform_health_score TO service_role;
```

**Step 2: Apply migration**

**Step 3: Commit**

```bash
git add supabase/migrations/20260308000002_create_health_score_function.sql
git commit -m "feat: add health score calculation function"
```

---

### Task 3: Build DarkThemeProvider

**Files:**
- Create: `src/components/admin/DarkThemeProvider.tsx`

**Step 1: Write the component**

This is a wrapper that applies dark mode classes scoped to the admin section. It adds the `dark` class to the wrapper div and provides CSS custom properties for the dark admin theme. All admin components use these via Tailwind's `dark:` prefix.

```tsx
import { ReactNode, useEffect } from 'react';

interface DarkThemeProviderProps {
  children: ReactNode;
}

export default function DarkThemeProvider({ children }: DarkThemeProviderProps) {
  useEffect(() => {
    // Add dark class to html element when admin is mounted
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {children}
    </div>
  );
}
```

**Step 2: Update `tailwind.config.js`** — Add `darkMode: 'class'` to the config.

In `tailwind.config.js`, add at the top level of the config object:
```js
darkMode: 'class',
```

**Step 3: Commit**

```bash
git add src/components/admin/DarkThemeProvider.tsx tailwind.config.js
git commit -m "feat: add dark theme provider scoped to admin dashboard"
```

---

### Task 4: Build AdminTopBar

**Files:**
- Create: `src/components/admin/AdminTopBar.tsx`

**Step 1: Write the component**

The top bar has the logo, 6 category tabs with brand gradient active indicator, notification bell, and user dropdown.

```tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, FileText, Truck, BarChart3, Settings,
  Bell, ChevronDown, ArrowLeft, LogOut
} from 'lucide-react';

export type AdminTab = 'overview' | 'users-safety' | 'content' | 'operations' | 'analytics' | 'system';

interface AdminTopBarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  incidentCount?: number;
}

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'users-safety', label: 'Users & Safety', icon: <Users className="w-4 h-4" /> },
  { id: 'content', label: 'Content', icon: <FileText className="w-4 h-4" /> },
  { id: 'operations', label: 'Operations', icon: <Truck className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Settings className="w-4 h-4" /> },
];

export default function AdminTopBar({ activeTab, onTabChange, incidentCount = 0 }: AdminTopBarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700">
      {/* Top row: logo + actions */}
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-50 font-semibold text-sm">CarpoolNetwork Admin</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Incident bell */}
          <button
            onClick={() => { onTabChange('overview'); navigate('/admin/incidents'); }}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {incidentCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                {incidentCount > 99 ? '99+' : incidentCount}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <span className="text-sm hidden sm:block">{profile?.full_name || 'Admin'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1">
                  <button
                    onClick={() => { navigate('/'); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to App
                  </button>
                  <button
                    onClick={() => { signOut(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab row */}
      <div className="flex px-4 gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative ${
              activeTab === tab.id
                ? 'text-slate-50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-orange-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    </header>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin/AdminTopBar.tsx
git commit -m "feat: add admin top bar with dark theme and tab navigation"
```

---

### Task 5: Build AdminSideNav

**Files:**
- Create: `src/components/admin/AdminSideNav.tsx`

**Step 1: Write the component**

The sidebar renders different nav items based on the active top-level tab. It checks permissions using the existing `useAuth` hook.

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { AdminTab } from './AdminTopBar';
import type { Permission, AdminRole } from '../../types/admin';
import {
  LayoutDashboard, HeartPulse, AlertTriangle, Globe, Users, UserCheck,
  Shield, ShieldAlert, Heart, UserX, FileText, MessageSquare, MessagesSquare,
  Bell, Megaphone, FileCode, Car, Calendar, Zap, BarChart3, TrendingUp,
  Map, Activity, Monitor, Settings, UserCog, ClipboardList, Database,
  Bug, MessageCircle, Beaker, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  permission?: Permission;
  minRole?: AdminRole;
  badge?: number;
}

const TAB_NAV_ITEMS: Record<AdminTab, NavItem[]> = {
  overview: [
    { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/admin/health-score', label: 'Health Score', icon: <HeartPulse className="w-5 h-5" /> },
    { path: '/admin/incidents', label: 'Incident Queue', icon: <AlertTriangle className="w-5 h-5" /> },
    { path: '/admin/status-manager', label: 'Status Page', icon: <Globe className="w-5 h-5" /> },
  ],
  'users-safety': [
    { path: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" />, permission: 'users.view' },
    { path: '/admin/verifications', label: 'Verification Queue', icon: <UserCheck className="w-5 h-5" />, permission: 'verification.view' },
    { path: '/admin/safety', label: 'Safety Reports', icon: <Shield className="w-5 h-5" />, permission: 'safety.view' },
    { path: '/admin/safety/dashboard', label: 'Safety Dashboard', icon: <Heart className="w-5 h-5" />, permission: 'safety.view' },
    { path: '/admin/messages/muted', label: 'Muted Users', icon: <UserX className="w-5 h-5" />, permission: 'messages.moderate' },
  ],
  content: [
    { path: '/admin/community', label: 'Community', icon: <MessagesSquare className="w-5 h-5" />, permission: 'community.view' },
    { path: '/admin/community/warnings', label: 'Content Warnings', icon: <ShieldAlert className="w-5 h-5" />, permission: 'community.warnings' },
    { path: '/admin/messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5" />, permission: 'messages.view' },
    { path: '/admin/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" />, permission: 'notifications.view' },
    { path: '/admin/notifications/announcements', label: 'Announcements', icon: <Megaphone className="w-5 h-5" />, permission: 'notifications.send' },
    { path: '/admin/notifications/templates', label: 'Templates', icon: <FileCode className="w-5 h-5" />, permission: 'notifications.templates' },
  ],
  operations: [
    { path: '/admin/rides', label: 'Rides', icon: <Car className="w-5 h-5" />, permission: 'rides.view' },
    { path: '/admin/bookings', label: 'Bookings', icon: <Calendar className="w-5 h-5" />, permission: 'bookings.view' },
    { path: '/admin/bulk-operations', label: 'Bulk Operations', icon: <Zap className="w-5 h-5" />, permission: 'system.bulk_operations' },
  ],
  analytics: [
    { path: '/admin/analytics', label: 'Overview', icon: <BarChart3 className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/summary', label: 'Summary', icon: <TrendingUp className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/users', label: 'User Analytics', icon: <Users className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/rides', label: 'Ride Analytics', icon: <Car className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/geo', label: 'Geo Analytics', icon: <Map className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/analytics/ops', label: 'Ops Health', icon: <Activity className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/activity', label: 'Live Activity', icon: <Activity className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/performance', label: 'Performance', icon: <Monitor className="w-5 h-5" />, permission: 'analytics.view' },
    { path: '/admin/incident-analytics', label: 'Incidents', icon: <AlertTriangle className="w-5 h-5" />, permission: 'analytics.view' },
  ],
  system: [
    { path: '/admin/settings', label: 'Platform Settings', icon: <Settings className="w-5 h-5" />, minRole: 'super_admin' },
    { path: '/admin/health', label: 'System Health', icon: <HeartPulse className="w-5 h-5" />, minRole: 'super_admin' },
    { path: '/admin/admins', label: 'Admin Management', icon: <UserCog className="w-5 h-5" />, minRole: 'super_admin' },
    { path: '/admin/audit', label: 'Audit Log', icon: <ClipboardList className="w-5 h-5" />, minRole: 'super_admin' },
    { path: '/admin/diagnostics', label: 'Diagnostics', icon: <Database className="w-5 h-5" />, permission: 'system.diagnostics' },
    { path: '/admin/bugs', label: 'Bug Reports', icon: <Bug className="w-5 h-5" />, minRole: 'moderator' },
    { path: '/admin/feedback', label: 'Feedback', icon: <MessageCircle className="w-5 h-5" />, minRole: 'moderator' },
    { path: '/admin/beta', label: 'Beta Management', icon: <Beaker className="w-5 h-5" />, minRole: 'admin' },
  ],
};

interface AdminSideNavProps {
  activeTab: AdminTab;
}

export default function AdminSideNav({ activeTab }: AdminSideNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const items = TAB_NAV_ITEMS[activeTab].filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.minRole && !hasRole(item.minRole)) return false;
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} shrink-0 bg-slate-800 border-r border-slate-700 transition-all duration-200 flex flex-col`}>
      <div className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive(item.path)
                ? 'bg-slate-700/80 text-slate-50 border-l-[3px] border-transparent bg-gradient-to-r from-slate-700 to-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            style={isActive(item.path) ? {
              borderImage: 'linear-gradient(to bottom, #ef4444, #f97316) 1',
            } : undefined}
          >
            <span className={isActive(item.path) ? 'text-orange-400' : ''}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.badge && item.badge > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-bold text-white bg-red-500 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 border-t border-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
      </button>
    </aside>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin/AdminSideNav.tsx
git commit -m "feat: add admin sidebar with per-tab navigation"
```

---

### Task 6: Build AdminShell — Replace AdminLayout

**Files:**
- Create: `src/components/admin/AdminShell.tsx`
- Modify: `src/components/admin/AdminLayout.tsx` (re-export AdminShell for backwards compat)

**Step 1: Write AdminShell**

This is the new top-level admin layout that combines DarkThemeProvider + AdminTopBar + AdminSideNav + content area. It detects the active tab from the current route.

```tsx
import { ReactNode, useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DarkThemeProvider from './DarkThemeProvider';
import AdminTopBar, { type AdminTab } from './AdminTopBar';
import AdminSideNav from './AdminSideNav';
import { supabase } from '../../lib/supabase';

interface AdminShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

// Map route prefixes to tabs
const ROUTE_TO_TAB: { prefix: string; tab: AdminTab }[] = [
  { prefix: '/admin/users', tab: 'users-safety' },
  { prefix: '/admin/verifications', tab: 'users-safety' },
  { prefix: '/admin/safety', tab: 'users-safety' },
  { prefix: '/admin/community', tab: 'content' },
  { prefix: '/admin/messages', tab: 'content' },
  { prefix: '/admin/notifications', tab: 'content' },
  { prefix: '/admin/rides', tab: 'operations' },
  { prefix: '/admin/bookings', tab: 'operations' },
  { prefix: '/admin/bulk-operations', tab: 'operations' },
  { prefix: '/admin/analytics', tab: 'analytics' },
  { prefix: '/admin/activity', tab: 'analytics' },
  { prefix: '/admin/performance', tab: 'analytics' },
  { prefix: '/admin/incident-analytics', tab: 'analytics' },
  { prefix: '/admin/settings', tab: 'system' },
  { prefix: '/admin/health', tab: 'system' },
  { prefix: '/admin/admins', tab: 'system' },
  { prefix: '/admin/audit', tab: 'system' },
  { prefix: '/admin/diagnostics', tab: 'system' },
  { prefix: '/admin/bugs', tab: 'system' },
  { prefix: '/admin/feedback', tab: 'system' },
  { prefix: '/admin/beta', tab: 'system' },
  // Overview catches everything else under /admin
];

function detectTab(pathname: string): AdminTab {
  for (const { prefix, tab } of ROUTE_TO_TAB) {
    if (pathname.startsWith(prefix)) return tab;
  }
  return 'overview';
}

export default function AdminShell({ children, title, subtitle, actions }: AdminShellProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => detectTab(location.pathname));
  const [incidentCount, setIncidentCount] = useState(0);

  // Sync tab with route on navigation
  useEffect(() => {
    setActiveTab(detectTab(location.pathname));
  }, [location.pathname]);

  // Fetch open incident count
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'triaging', 'needs_review']);
      setIncidentCount(count || 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <DarkThemeProvider>
      <div className="flex flex-col h-screen">
        <AdminTopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          incidentCount={incidentCount}
        />

        <div className="flex flex-1 overflow-hidden">
          <AdminSideNav activeTab={activeTab} />

          <main className="flex-1 overflow-y-auto">
            {(title || actions) && (
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    {title && <h1 className="text-xl font-semibold text-slate-50">{title}</h1>}
                    {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
                  </div>
                  {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
              </div>
            )}
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DarkThemeProvider>
  );
}

// Re-export helper components from the old AdminLayout for backwards compat
export { AdminStatCard, AdminSection, AdminEmptyState } from './AdminLayout';
```

**Step 2: Modify AdminLayout.tsx**

Keep the existing `AdminStatCard`, `AdminSection`, `AdminEmptyState` exports but replace the default export to use AdminShell:

At the end of `AdminLayout.tsx`, change the default export:
```tsx
// Old AdminLayout is replaced by AdminShell
// Keep helper component exports for backwards compatibility
export { default } from './AdminShell';
```

**Step 3: Test** — Run `npm run dev` and navigate to `/admin`. Verify the dark shell renders with top tabs and sidebar.

**Step 4: Commit**

```bash
git add src/components/admin/AdminShell.tsx src/components/admin/AdminLayout.tsx
git commit -m "feat: replace admin layout with dark mode shell (top tabs + sidebar)"
```

---

### Task 7: Add New Admin Routes to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add lazy imports for new pages**

Add alongside existing admin page imports:
```tsx
const IncidentQueue = lazy(() => import('./pages/admin/IncidentQueue'));
const PlatformHealthScore = lazy(() => import('./pages/admin/PlatformHealthScore'));
const IncidentAnalytics = lazy(() => import('./pages/admin/IncidentAnalytics'));
const StatusPageManager = lazy(() => import('./pages/admin/StatusPageManager'));
const StatusPage = lazy(() => import('./pages/Status'));
```

**Step 2: Add admin routes** inside the admin routes block:

```tsx
<Route path="/admin/incidents" element={<AdminRoute><IncidentQueue /></AdminRoute>} />
<Route path="/admin/health-score" element={<AdminRoute><PlatformHealthScore /></AdminRoute>} />
<Route path="/admin/incident-analytics" element={<AdminRoute><IncidentAnalytics /></AdminRoute>} />
<Route path="/admin/status-manager" element={<AdminRoute><StatusPageManager /></AdminRoute>} />
```

**Step 3: Add public status route** outside admin routes (no auth required):

```tsx
<Route path="/status" element={<StatusPage />} />
```

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add routes for incident queue, health score, analytics, and status page"
```

---

### Task 8: Create Placeholder Pages (Overview Tab)

**Files:**
- Create: `src/pages/admin/IncidentQueue.tsx`
- Create: `src/pages/admin/PlatformHealthScore.tsx`
- Create: `src/pages/admin/IncidentAnalytics.tsx`
- Create: `src/pages/admin/StatusPageManager.tsx`
- Create: `src/pages/Status.tsx`

**Step 1:** Create each page as a minimal placeholder that uses AdminShell (for admin pages) or standalone (for public status page). Each renders a title and "Coming soon" content inside the correct layout. These will be filled in during Phases 2-4.

Example pattern for each admin page:
```tsx
import AdminLayout from '../../components/admin/AdminLayout';

export default function IncidentQueue() {
  return (
    <AdminLayout title="Incident Queue" subtitle="Auto-triaged errors and fix queue">
      <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
        <p className="text-slate-400">Incident queue will be built in Phase 2.</p>
      </div>
    </AdminLayout>
  );
}
```

Pattern for public Status page:
```tsx
export default function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-slate-900">Carpool Network — System Status</h1>
        <p className="text-slate-500 mt-2">Status page will be built in Phase 4.</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/admin/IncidentQueue.tsx src/pages/admin/PlatformHealthScore.tsx \
  src/pages/admin/IncidentAnalytics.tsx src/pages/admin/StatusPageManager.tsx \
  src/pages/Status.tsx
git commit -m "feat: add placeholder pages for incident queue, health score, analytics, status"
```

---

### Task 9: Update All 35 Existing Admin Pages for Dark Theme

**Files:**
- Modify: All files in `src/pages/admin/*.tsx` and `src/components/admin/*.tsx`

**Step 1:** The existing pages use white backgrounds (`bg-white`), dark text (`text-gray-900`), and light borders (`border-gray-200`). Since they're now wrapped in `DarkThemeProvider` which adds the `dark` class, we need to add `dark:` variants to the shared utility components (`AdminStatCard`, `AdminSection`, `AdminEmptyState`) and to key color classes.

**Strategy — minimal changes:**
Rather than touching all 35 pages, update the 3 helper components in `AdminLayout.tsx` that most pages use:

- `AdminStatCard`: Add `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50`
- `AdminSection`: Add `dark:bg-slate-800 dark:border-slate-700`
- `AdminEmptyState`: Add `dark:text-slate-400`

Then add a global CSS override in `src/index.css`:
```css
/* Admin dark mode overrides */
.dark .bg-white { background-color: #1e293b; }
.dark .text-gray-900 { color: #f8fafc; }
.dark .text-gray-700 { color: #cbd5e1; }
.dark .text-gray-500 { color: #94a3b8; }
.dark .text-gray-400 { color: #64748b; }
.dark .border-gray-200 { border-color: #334155; }
.dark .border-gray-100 { border-color: #334155; }
.dark .bg-gray-50 { background-color: #0f172a; }
.dark .bg-gray-100 { background-color: #1e293b; }
.dark .divide-gray-200 > * + * { border-color: #334155; }
.dark .hover\:bg-gray-50:hover { background-color: #334155; }
.dark .ring-gray-200 { --tw-ring-color: #334155; }
```

This approach converts all 35 pages to dark mode without touching any individual page files. The CSS overrides map light theme classes to dark equivalents only when the `dark` class is present (which is only in the admin section).

**Step 2: Commit**

```bash
git add src/index.css src/components/admin/AdminLayout.tsx
git commit -m "feat: apply dark theme to all existing admin pages via CSS overrides"
```

---

## Phase 2: Error Pipeline — Edge Functions + Incident Queue

### Task 10: Enhance errorTracking.ts with Fingerprinting

**Files:**
- Modify: `src/services/errorTracking.ts`

**Step 1:** Add a fingerprint generation function and include `user_id` in every error log entry. Add these to the existing file:

```typescript
// Add at top of file
function generateFingerprint(errorType: string, errorMessage: string, route: string): string {
  // Parameterize message: strip UUIDs, numbers, table/column names
  const template = errorMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}')
    .replace(/\b\d+\b/g, '{n}')
    .replace(/'[^']+'/g, "'{param}'");

  // Simple hash
  const str = `${errorType}::${template}::${route}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}
```

**Step 2:** Update the `enqueue` function to include `fingerprint` and `user_id` in metadata:

```typescript
// In the enqueue function, add to metadata:
metadata: {
  ...entry.metadata,
  fingerprint: generateFingerprint(
    entry.errorType,
    entry.errorMessage,
    entry.endpoint || ''
  ),
  user_id: currentUserId(), // helper that reads from auth context
}
```

**Step 3: Commit**

```bash
git add src/services/errorTracking.ts
git commit -m "feat: add error fingerprinting and user tracking to error service"
```

---

### Task 11: Create auto-triage Edge Function

**Files:**
- Create: `supabase/functions/auto-triage/index.ts`

**Step 1:** Write the edge function. This is invoked by a Supabase database webhook on `error_logs` INSERT.

The function:
1. Extracts error details from the webhook payload
2. Generates a fingerprint
3. Upserts into `incidents` table (create or increment)
4. Pattern-matches against known fix rules
5. Updates confidence score
6. For critical auto-fixable incidents, invokes fix-deployer

Reference existing edge functions in `supabase/functions/` for the Deno/Supabase pattern (imports from `https://esm.sh/@supabase/supabase-js`).

**Step 2: Deploy**

```bash
supabase functions deploy auto-triage --project-ref uqofmsreosfjflmgurzb
```

**Step 3:** Create the database webhook via Supabase dashboard or migration:

```sql
-- Create webhook trigger (applied via migration)
CREATE OR REPLACE FUNCTION public.trigger_auto_triage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-triage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_error_log_insert
  AFTER INSERT ON public.error_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_triage();
```

**Step 4: Commit**

```bash
git add supabase/functions/auto-triage/index.ts
git commit -m "feat: add auto-triage edge function for error classification"
```

---

### Task 12: Create fix-deployer Edge Function

**Files:**
- Create: `supabase/functions/fix-deployer/index.ts`

**Step 1:** Write the edge function. Runs on cron (every 15 min) and on direct invocation for critical incidents.

The function:
1. Queries `incidents` with status = 'fixing'
2. For each, generates the fix (SQL migration or code patch)
3. Uses GitHub API (fetch, not octokit — no external deps needed) to:
   - Create branch
   - Commit fix file(s)
   - Open PR
4. Updates incident status → `pr_created`
5. Handles batch logic: critical = immediate, low/medium = weekly

**Step 2:** Set up cron via `supabase/functions/fix-deployer/config.toml` or scheduled invocation.

**Step 3: Commit**

```bash
git add supabase/functions/fix-deployer/index.ts
git commit -m "feat: add fix-deployer edge function for auto-PR creation"
```

---

### Task 13: Build Incident Queue Page (Full Implementation)

**Files:**
- Modify: `src/pages/admin/IncidentQueue.tsx` (replace placeholder)
- Create: `src/services/incidentService.ts`

**Step 1:** Build `incidentService.ts` with functions:
- `getIncidents(filters)` — query incidents table with status/severity filters
- `getIncidentDetail(id)` — single incident with affected users
- `updateIncidentStatus(id, status)` — admin actions
- `dismissIncident(id)` — mark as dismissed
- `applyFix(id)` — trigger fix-deployer for a specific incident
- `getHealthScore()` — read from `platform_health_cache`

**Step 2:** Build IncidentQueue page with three sections:
- Critical (auto-fixing) — red left border, PR links
- Needs Review — amber left border, Apply Fix / Dismiss buttons
- Recently Fixed — green left border, deployed timestamps

Uses dark theme classes throughout (bg-slate-800, text-slate-50, etc).

**Step 3: Commit**

```bash
git add src/services/incidentService.ts src/pages/admin/IncidentQueue.tsx
git commit -m "feat: build incident queue page with triage actions"
```

---

## Phase 3: Health Score + Analytics

### Task 14: Build Platform Health Score Page

**Files:**
- Modify: `src/pages/admin/PlatformHealthScore.tsx` (replace placeholder)
- Create: `src/components/shared/HealthScoreGauge.tsx`

**Step 1:** Build `HealthScoreGauge.tsx` — SVG circular gauge with brand gradient arc. Props: `score: number`, `size?: number`. Renders 0-100 with color thresholds (green/amber/red).

**Step 2:** Build full PlatformHealthScore page with:
- Health score gauge (top center)
- 4 KPI cards (Uptime, Error Rate, Fix Rate, MTTR) with trend arrows
- Operational drill-down: errors by severity, errors by service (bar charts)
- User impact drill-down: affected users, most impacted features
- Auto-fix stats: total/auto-fixed/manual/dismissed

**Step 3: Commit**

```bash
git add src/components/shared/HealthScoreGauge.tsx src/pages/admin/PlatformHealthScore.tsx
git commit -m "feat: build platform health score page with gauge and drill-downs"
```

---

### Task 15: Build Incident Analytics Page

**Files:**
- Modify: `src/pages/admin/IncidentAnalytics.tsx` (replace placeholder)

**Step 1:** Build the page with:
- Resolution timeline area chart (opened vs fixed vs open over time)
- Top auto-fix patterns table (pattern, count, success %, avg time)
- MTTR breakdown (detection → triage → fix → deploy)
- Date range filter (7d, 30d, 90d)

**Step 2: Commit**

```bash
git add src/pages/admin/IncidentAnalytics.tsx
git commit -m "feat: build incident analytics page with resolution trends"
```

---

## Phase 4: User Communication

### Task 16: Create deploy-webhook Edge Function

**Files:**
- Create: `supabase/functions/deploy-webhook/index.ts`

**Step 1:** Write the edge function. Called by Netlify deploy notification.

The function:
1. Verifies webhook secret
2. Extracts commit SHA from payload
3. Matches merged PRs to incidents via `fix_branch`
4. Updates incident status → `deployed`
5. Creates `status_events` entries (public if severity >= high)
6. Inserts `user_notifications` for affected users
7. Refreshes health score cache

**Step 2:** Configure Netlify webhook: Deploy notifications → outgoing webhook to Edge Function URL.

**Step 3: Commit**

```bash
git add supabase/functions/deploy-webhook/index.ts
git commit -m "feat: add deploy-webhook for post-deploy incident resolution"
```

---

### Task 17: Build Public Status Page

**Files:**
- Modify: `src/pages/Status.tsx` (replace placeholder)
- Create: `src/services/statusPageService.ts`

**Step 1:** Build `statusPageService.ts`:
- `getServiceStatus()` — returns per-service uptime from status_events
- `getRecentIncidents()` — public status events, last 30 days
- `getOverallUptime()` — 30-day composite uptime

**Step 2:** Build Status page (no auth, light theme, minimal):
- Overall status indicator
- Per-service uptime bars (Messaging, Rides, Auth, Community, Notifications)
- Recent incidents list
- 30-day uptime %
- "Powered by CarpoolNetwork" footer

**Step 3: Commit**

```bash
git add src/services/statusPageService.ts src/pages/Status.tsx
git commit -m "feat: build public status page with service uptime and incidents"
```

---

### Task 18: Build Status Page Manager (Admin)

**Files:**
- Modify: `src/pages/admin/StatusPageManager.tsx` (replace placeholder)

**Step 1:** Build admin page for managing status events:
- List of all status events (public and private)
- Toggle `is_public` visibility
- Edit status event descriptions
- Manually create status events (for planned maintenance, etc.)
- Preview of how the public page looks

**Step 2: Commit**

```bash
git add src/pages/admin/StatusPageManager.tsx
git commit -m "feat: build status page manager for admin"
```

---

### Task 19: Build Fix Notification Banner

**Files:**
- Create: `src/components/shared/FixNotificationBanner.tsx`
- Modify: `src/components/shared/ToastContainer.tsx`

**Step 1:** Build `FixNotificationBanner.tsx` — a subtle top-of-page banner that shows when the user has unread fix notifications. Queries `incident_affected_users` for the current user where `notified = false`.

```
┌─────────────────────────────────────────────┐
│ ✓ An issue you experienced has been fixed.  │
│   Messaging is now working properly.        │
│                              [Dismiss]      │
└─────────────────────────────────────────────┘
```

**Step 2:** Add the banner to the main app layout (not admin). It checks on mount and shows if there are unread fix notifications.

**Step 3: Commit**

```bash
git add src/components/shared/FixNotificationBanner.tsx src/components/shared/ToastContainer.tsx
git commit -m "feat: add fix notification banner for affected users"
```

---

## Phase 5: Polish + Hardening

### Task 20: Add Global Kill Switch

**Files:**
- Modify: `supabase/functions/auto-triage/index.ts`
- Modify: `supabase/functions/fix-deployer/index.ts`

**Step 1:** At the start of each edge function, check `app.settings.auto_fix_enabled`. If false, log and exit early. Add a toggle in PlatformSettings admin page.

**Step 2: Commit**

```bash
git add supabase/functions/auto-triage/index.ts supabase/functions/fix-deployer/index.ts
git commit -m "feat: add global kill switch for auto-fix pipeline"
```

---

### Task 21: Duplicate PR Prevention

**Files:**
- Modify: `supabase/functions/fix-deployer/index.ts`

**Step 1:** Before creating a PR, check if a branch `fix/incident-{id}-*` already exists via GitHub API. If so, skip. Also check if the incident already has `fix_pr_url` set.

**Step 2: Commit**

```bash
git add supabase/functions/fix-deployer/index.ts
git commit -m "fix: prevent duplicate PRs for same incident"
```

---

### Task 22: Rate Limiting + Error Handling for Edge Functions

**Files:**
- Modify: All 3 edge functions

**Step 1:** Add:
- Exponential backoff on GitHub API 429 responses
- Max 10 PRs per hour guard
- Proper error logging (insert into `error_logs` for meta-errors)
- Timeout handling (30s max per operation)

**Step 2: Commit**

```bash
git add supabase/functions/
git commit -m "fix: add rate limiting and error handling to edge functions"
```

---

### Task 23: End-to-End Verification

**Step 1:** Manually trigger a test error in the browser console:
```js
throw new Error('TEST_INCIDENT: Simulated PGRST200 error');
```

**Step 2:** Verify the pipeline:
1. Error appears in `error_logs` table
2. `auto-triage` creates/updates an incident
3. Incident visible in Incident Queue page
4. Health Score updates

**Step 3:** Verify the admin dashboard:
1. Top tabs navigate correctly
2. Sidebar changes per tab
3. Dark theme renders across all 35+ pages
4. Health score gauge renders

**Step 4:** Final commit and tag:

```bash
git tag v2.0.0-error-monitoring
```

---

## Summary

| Phase | Tasks | Key Deliverable |
|-------|-------|----------------|
| **Phase 1** | Tasks 1-9 | Dark admin shell + incident tables |
| **Phase 2** | Tasks 10-13 | Auto-triage + fix-deployer + incident queue |
| **Phase 3** | Tasks 14-15 | Health score + incident analytics |
| **Phase 4** | Tasks 16-19 | Deploy webhook + status page + user notifications |
| **Phase 5** | Tasks 20-23 | Kill switch, dedup, rate limits, e2e test |

**Total: 23 tasks across 5 phases.**
