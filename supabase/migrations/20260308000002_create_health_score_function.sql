-- ============================================================================
-- Create Platform Health Score Calculation Function
-- ============================================================================
-- Computes a composite platform health score (0-100) from incidents data
-- and caches it in the platform_health_cache singleton row.
--
-- Components:
--   Uptime %    (40%) — hours without critical incidents / total hours
--   Error rate  (25%) — incidents per day, normalized 0-10 => 100-0
--   Fix rate    (20%) — % of resolved incidents
--   MTTR        (15%) — mean time to resolve, normalized 0-1000 min => 100-0
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_platform_health_score(
  period_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start   TIMESTAMPTZ;
  v_total_hours    NUMERIC;
  v_total_incidents INT;
  v_resolved_incidents INT;
  v_critical_hours NUMERIC;
  v_uptime_pct     NUMERIC;
  v_error_rate     NUMERIC;
  v_fix_rate_pct   NUMERIC;
  v_mttr_minutes   NUMERIC;
  v_uptime_score   NUMERIC;
  v_error_score    NUMERIC;
  v_fix_score      NUMERIC;
  v_mttr_score     NUMERIC;
  v_composite      NUMERIC;
  v_prev_score     NUMERIC;
  v_trend_delta    NUMERIC;
  v_result         JSONB;
BEGIN
  -- -----------------------------------------------------------------------
  -- 1. Setup period boundaries
  -- -----------------------------------------------------------------------
  v_period_start := NOW() - (period_days || ' days')::INTERVAL;
  v_total_hours  := period_days * 24.0;

  -- -----------------------------------------------------------------------
  -- 2. Count incidents in period
  -- -----------------------------------------------------------------------
  SELECT COUNT(*)
    INTO v_total_incidents
    FROM public.incidents
   WHERE first_seen_at >= v_period_start;

  SELECT COUNT(*)
    INTO v_resolved_incidents
    FROM public.incidents
   WHERE first_seen_at >= v_period_start
     AND status IN ('deployed', 'dismissed');

  -- -----------------------------------------------------------------------
  -- 3. Uptime % (weight 40%)
  --    Sum the duration (in hours) of each critical incident within the
  --    period window.  An incident's downtime runs from first_seen_at
  --    (clamped to period_start) to COALESCE(updated_at, NOW()) clamped
  --    to NOW().  Only resolved incidents use updated_at; active ones
  --    count as still down.
  -- -----------------------------------------------------------------------
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (
      LEAST(
        CASE WHEN status IN ('deployed', 'dismissed') THEN updated_at ELSE NOW() END,
        NOW()
      )
      -
      GREATEST(first_seen_at, v_period_start)
    )) / 3600.0
  ), 0)
    INTO v_critical_hours
    FROM public.incidents
   WHERE severity = 'critical'
     AND first_seen_at < NOW()                -- sanity
     AND (
       -- Incident overlaps the period
       CASE WHEN status IN ('deployed', 'dismissed') THEN updated_at ELSE NOW() END
     ) >= v_period_start
     AND first_seen_at <= NOW();

  -- Clamp to total_hours
  v_critical_hours := LEAST(v_critical_hours, v_total_hours);
  v_uptime_pct     := CASE WHEN v_total_hours > 0
                            THEN ((v_total_hours - v_critical_hours) / v_total_hours) * 100.0
                            ELSE 100.0
                       END;
  v_uptime_score   := v_uptime_pct;  -- already 0-100

  -- -----------------------------------------------------------------------
  -- 4. Error rate (weight 25%)
  --    Normalize: 0 errors/day = 100, >= 10 errors/day = 0
  -- -----------------------------------------------------------------------
  v_error_rate := CASE WHEN period_days > 0
                       THEN v_total_incidents::NUMERIC / period_days
                       ELSE 0
                  END;
  v_error_score := GREATEST(0, 100.0 - (v_error_rate / 10.0) * 100.0);

  -- -----------------------------------------------------------------------
  -- 5. Fix rate % (weight 20%)
  --    100% if no incidents at all
  -- -----------------------------------------------------------------------
  v_fix_rate_pct := CASE WHEN v_total_incidents > 0
                         THEN (v_resolved_incidents::NUMERIC / v_total_incidents) * 100.0
                         ELSE 100.0
                    END;
  v_fix_score    := v_fix_rate_pct;  -- already 0-100

  -- -----------------------------------------------------------------------
  -- 6. MTTR in minutes (weight 15%)
  --    Average (updated_at - first_seen_at) for resolved incidents.
  --    Normalize: 0 min = 100, >= 1000 min = 0.
  --    If no resolved incidents, score = 100 (nothing to penalize).
  -- -----------------------------------------------------------------------
  SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (updated_at - first_seen_at)) / 60.0),
    0
  )
    INTO v_mttr_minutes
    FROM public.incidents
   WHERE first_seen_at >= v_period_start
     AND status IN ('deployed', 'dismissed');

  IF v_resolved_incidents = 0 THEN
    v_mttr_score := 100.0;
  ELSE
    v_mttr_score := GREATEST(0, 100.0 - (v_mttr_minutes / 1000.0) * 100.0);
  END IF;

  -- -----------------------------------------------------------------------
  -- 7. Composite score — weighted sum, clamped 0-100
  -- -----------------------------------------------------------------------
  v_composite := (v_uptime_score * 0.40)
               + (v_error_score  * 0.25)
               + (v_fix_score    * 0.20)
               + (v_mttr_score   * 0.15);
  v_composite := GREATEST(0, LEAST(100, v_composite));

  -- -----------------------------------------------------------------------
  -- 8. Trend delta — compare against previous cached score
  -- -----------------------------------------------------------------------
  SELECT score INTO v_prev_score
    FROM public.platform_health_cache
   WHERE id = 1;

  v_trend_delta := COALESCE(v_composite - COALESCE(v_prev_score, 100), 0);

  -- -----------------------------------------------------------------------
  -- 9. Update platform_health_cache singleton row
  -- -----------------------------------------------------------------------
  UPDATE public.platform_health_cache
     SET score            = ROUND(v_composite, 2),
         active_incidents = (
           SELECT COUNT(*) FROM public.incidents
            WHERE first_seen_at >= v_period_start
              AND status NOT IN ('deployed', 'dismissed')
         ),
         critical_count   = (
           SELECT COUNT(*) FROM public.incidents
            WHERE first_seen_at >= v_period_start
              AND severity = 'critical'
              AND status NOT IN ('deployed', 'dismissed')
         ),
         high_count       = (
           SELECT COUNT(*) FROM public.incidents
            WHERE first_seen_at >= v_period_start
              AND severity = 'high'
              AND status NOT IN ('deployed', 'dismissed')
         ),
         medium_count     = (
           SELECT COUNT(*) FROM public.incidents
            WHERE first_seen_at >= v_period_start
              AND severity = 'medium'
              AND status NOT IN ('deployed', 'dismissed')
         ),
         low_count        = (
           SELECT COUNT(*) FROM public.incidents
            WHERE first_seen_at >= v_period_start
              AND severity = 'low'
              AND status NOT IN ('deployed', 'dismissed')
         ),
         last_incident_at = (
           SELECT MAX(first_seen_at) FROM public.incidents
            WHERE first_seen_at >= v_period_start
         ),
         computed_at      = NOW(),
         metadata         = jsonb_build_object(
           'period_days',        period_days,
           'uptime_pct',         ROUND(v_uptime_pct, 2),
           'error_rate',         ROUND(v_error_rate, 4),
           'fix_rate_pct',       ROUND(v_fix_rate_pct, 2),
           'mttr_minutes',       ROUND(v_mttr_minutes, 2),
           'trend_delta',        ROUND(v_trend_delta, 2),
           'total_incidents',    v_total_incidents,
           'resolved_incidents', v_resolved_incidents
         )
   WHERE id = 1;

  -- If no singleton row exists yet, insert it
  IF NOT FOUND THEN
    INSERT INTO public.platform_health_cache (
      id, score, active_incidents, computed_at, metadata
    ) VALUES (
      1, ROUND(v_composite, 2), 0, NOW(),
      jsonb_build_object(
        'period_days',        period_days,
        'uptime_pct',         ROUND(v_uptime_pct, 2),
        'error_rate',         ROUND(v_error_rate, 4),
        'fix_rate_pct',       ROUND(v_fix_rate_pct, 2),
        'mttr_minutes',       ROUND(v_mttr_minutes, 2),
        'trend_delta',        ROUND(v_trend_delta, 2),
        'total_incidents',    v_total_incidents,
        'resolved_incidents', v_resolved_incidents
      )
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- 10. Build and return result
  -- -----------------------------------------------------------------------
  v_result := jsonb_build_object(
    'score',              ROUND(v_composite, 2),
    'uptime_pct',         ROUND(v_uptime_pct, 2),
    'error_rate',         ROUND(v_error_rate, 4),
    'fix_rate_pct',       ROUND(v_fix_rate_pct, 2),
    'mttr_minutes',       ROUND(v_mttr_minutes, 2),
    'trend_delta',        ROUND(v_trend_delta, 2),
    'total_incidents',    v_total_incidents,
    'resolved_incidents', v_resolved_incidents
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- Permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.calculate_platform_health_score(INT)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.calculate_platform_health_score(INT)
  IS 'Computes a composite platform health score (0-100) from incidents data and caches it in platform_health_cache';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
