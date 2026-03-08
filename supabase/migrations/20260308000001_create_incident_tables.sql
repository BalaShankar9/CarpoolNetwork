-- ============================================================================
-- Create Incident Tables for Error Monitoring Pipeline
-- ============================================================================
-- Creates the core tables for the automated error monitoring system:
--   incidents          – Deduplicated error groups
--   incident_errors    – Links raw error_log entries to incidents
--   incident_affected_users – Tracks affected users per incident
--   status_events      – Public status page entries
--   platform_health_cache  – Singleton row with computed health score
-- ============================================================================

-- 1. incidents — Deduplicated error groups
CREATE TABLE IF NOT EXISTS public.incidents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint   TEXT NOT NULL,
  title         TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (severity IN ('critical','high','medium','low')),
  status        TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','triaging','fixing','pr_created','needs_review','deployed','dismissed')),
  confidence_score NUMERIC(5,2) DEFAULT 0.0
                  CHECK (confidence_score >= 0 AND confidence_score <= 100),
  fix_pr_url    TEXT,
  summary       TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_count   INTEGER NOT NULL DEFAULT 1,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.incidents IS 'Deduplicated error groups with fingerprint-based deduplication';
COMMENT ON COLUMN public.incidents.fingerprint IS 'Hash-based fingerprint for deduplicating similar errors';
COMMENT ON COLUMN public.incidents.confidence_score IS 'AI confidence score (0-100) for the incident classification';
COMMENT ON COLUMN public.incidents.fix_pr_url IS 'URL to the pull request that fixes this incident';

-- Unique partial index: only one active incident per fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_active_fingerprint
  ON public.incidents (fingerprint)
  WHERE status NOT IN ('deployed', 'dismissed');

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_last_seen ON public.incidents (last_seen_at DESC);


-- 2. incident_errors — Links raw error_log entries to incidents
CREATE TABLE IF NOT EXISTS public.incident_errors (
  incident_id   UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  error_log_id  UUID NOT NULL REFERENCES public.error_logs(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (incident_id, error_log_id)
);

COMMENT ON TABLE public.incident_errors IS 'Junction table linking raw error_log entries to deduplicated incidents';

CREATE INDEX IF NOT EXISTS idx_incident_errors_error_log
  ON public.incident_errors (error_log_id);


-- 3. incident_affected_users — Tracks which users were affected
CREATE TABLE IF NOT EXISTS public.incident_affected_users (
  incident_id   UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_count   INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (incident_id, user_id)
);

COMMENT ON TABLE public.incident_affected_users IS 'Tracks which users were affected by each incident';

CREATE INDEX IF NOT EXISTS idx_incident_affected_users_user
  ON public.incident_affected_users (user_id);


-- 4. status_events — Public status page entries tied to incidents
CREATE TABLE IF NOT EXISTS public.status_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'investigating'
                  CHECK (status IN ('investigating','identified','monitoring','resolved')),
  is_public     BOOLEAN NOT NULL DEFAULT false,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.status_events IS 'Public status page entries tied to incidents';

CREATE INDEX IF NOT EXISTS idx_status_events_public_started
  ON public.status_events (is_public, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_events_incident
  ON public.status_events (incident_id);


-- 5. platform_health_cache — Singleton row caching the computed health score
CREATE TABLE IF NOT EXISTS public.platform_health_cache (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  score           NUMERIC(5,2) NOT NULL DEFAULT 100.0
                    CHECK (score >= 0 AND score <= 100),
  active_incidents INTEGER NOT NULL DEFAULT 0,
  critical_count  INTEGER NOT NULL DEFAULT 0,
  high_count      INTEGER NOT NULL DEFAULT 0,
  medium_count    INTEGER NOT NULL DEFAULT 0,
  low_count       INTEGER NOT NULL DEFAULT 0,
  last_incident_at TIMESTAMPTZ,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.platform_health_cache IS 'Singleton row caching the computed platform health score';

-- Seed the singleton row
INSERT INTO public.platform_health_cache (id, score)
VALUES (1, 100.0)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- Updated-at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_status_events_updated_at
  BEFORE UPDATE ON public.status_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_affected_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_health_cache ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- incidents policies
-- ---------------------------------------------------------------------------

-- Admins: full CRUD
CREATE POLICY incidents_admin_all ON public.incidents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- service_role: full access (bypasses RLS by default, but explicit for clarity)
CREATE POLICY incidents_service_role ON public.incidents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- incident_errors policies
-- ---------------------------------------------------------------------------

CREATE POLICY incident_errors_admin_all ON public.incident_errors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY incident_errors_service_role ON public.incident_errors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- incident_affected_users policies
-- ---------------------------------------------------------------------------

-- Admins: full CRUD
CREATE POLICY incident_affected_users_admin_all ON public.incident_affected_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Users: can see their own affected incidents
CREATE POLICY incident_affected_users_own_select ON public.incident_affected_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- service_role: full access
CREATE POLICY incident_affected_users_service_role ON public.incident_affected_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- status_events policies
-- ---------------------------------------------------------------------------

-- Admins: full CRUD
CREATE POLICY status_events_admin_all ON public.status_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Public: can read public status events (anon + authenticated)
CREATE POLICY status_events_public_read ON public.status_events
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- service_role: full access
CREATE POLICY status_events_service_role ON public.status_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- platform_health_cache policies
-- ---------------------------------------------------------------------------

-- Admins: read the health cache
CREATE POLICY health_cache_admin_select ON public.platform_health_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- service_role: full access (for edge functions to update)
CREATE POLICY health_cache_service_role ON public.platform_health_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- Notify PostgREST to reload schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
