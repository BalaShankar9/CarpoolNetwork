-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 011: Notifications, Error Logging, Analytics, and System Monitoring
-- ============================================================================
-- Notifications, notification queue/preferences/templates/logs, push tokens,
-- error logs, error patterns, performance metrics, system health/events/jobs,
-- activity logs, critical alerts, invariant violations, caching, and
-- analytics views/functions.
--
-- Depends on:
--   001_extensions_and_utils.sql  (notification_priority, notification_delivery_status
--                                  ENUMs, update_updated_at_column(), is_admin())
--   002_core_profiles_and_auth.sql (profiles table)
--   004_rides_bookings_requests.sql (rides, ride_bookings tables)
-- ============================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. notifications
-- --------------------------------------------------------------------------
CREATE TABLE notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category        text NOT NULL DEFAULT 'system',
    title           text,
    message         text,
    data            jsonb,
    is_read         boolean DEFAULT false,
    priority        text DEFAULT 'normal',
    action_url      text,
    action_label    text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1b. notification_queue
-- --------------------------------------------------------------------------
CREATE TABLE notification_queue (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type   text,
    title               text,
    message             text,
    data                jsonb,
    priority            notification_priority DEFAULT 'normal',
    status              notification_delivery_status DEFAULT 'pending',
    scheduled_for       timestamptz,
    sent_at             timestamptz,
    failed_reason       text,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1c. notification_preferences
-- --------------------------------------------------------------------------
CREATE TABLE notification_preferences (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    ride_notifications          boolean DEFAULT true,
    message_notifications       boolean DEFAULT true,
    system_notifications        boolean DEFAULT true,
    social_notifications        boolean DEFAULT true,
    challenge_notifications     boolean DEFAULT true,
    dnd_enabled                 boolean DEFAULT false,
    dnd_start_time              time,
    dnd_end_time                time,
    push_enabled                boolean DEFAULT true,
    email_enabled               boolean DEFAULT true,
    sms_enabled                 boolean DEFAULT false,
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1d. notification_preferences_override
-- --------------------------------------------------------------------------
CREATE TABLE notification_preferences_override (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category        text NOT NULL,
    channel         text NOT NULL,
    enabled         boolean NOT NULL
);

-- --------------------------------------------------------------------------
-- 1e. notification_templates
-- --------------------------------------------------------------------------
CREATE TABLE notification_templates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL UNIQUE,
    subject         text,
    body            text NOT NULL,
    category        text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1f. notification_logs
-- --------------------------------------------------------------------------
CREATE TABLE notification_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid,
    channel         text,
    status          text,
    sent_at         timestamptz,
    error           text
);

-- --------------------------------------------------------------------------
-- 1g. push_notification_tokens
-- --------------------------------------------------------------------------
CREATE TABLE push_notification_tokens (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token           text NOT NULL,
    platform        text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1h. error_logs
-- --------------------------------------------------------------------------
CREATE TABLE error_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type      text,
    message         text,
    stack_trace     text,
    user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
    metadata        jsonb,
    severity        text DEFAULT 'error',
    url             text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1i. error_patterns
-- --------------------------------------------------------------------------
CREATE TABLE error_patterns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern         text NOT NULL,
    count           integer DEFAULT 0,
    first_seen      timestamptz,
    last_seen       timestamptz,
    status          text
);

-- --------------------------------------------------------------------------
-- 1j. performance_metrics
-- --------------------------------------------------------------------------
CREATE TABLE performance_metrics (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name     text NOT NULL,
    value           numeric NOT NULL,
    tags            jsonb,
    recorded_at     timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1k. system_health
-- --------------------------------------------------------------------------
CREATE TABLE system_health (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service         text NOT NULL,
    status          text NOT NULL,
    last_check      timestamptz DEFAULT now(),
    details         jsonb
);

-- --------------------------------------------------------------------------
-- 1l. system_events
-- --------------------------------------------------------------------------
CREATE TABLE system_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      text NOT NULL,
    description     text,
    severity        text,
    metadata        jsonb,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1m. system_job_log
-- --------------------------------------------------------------------------
CREATE TABLE system_job_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name        text NOT NULL,
    status          text NOT NULL,
    started_at      timestamptz,
    completed_at    timestamptz,
    error           text,
    metadata        jsonb
);

-- --------------------------------------------------------------------------
-- 1n. system_messages
-- --------------------------------------------------------------------------
CREATE TABLE system_messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    content         text NOT NULL,
    target_audience text,
    is_active       boolean DEFAULT true,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1o. activity_logs
-- --------------------------------------------------------------------------
CREATE TABLE activity_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type   text NOT NULL,
    severity        text DEFAULT 'info',
    actor_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name      text,
    actor_email     text,
    target_type     text,
    target_id       uuid,
    action          text,
    description     text,
    metadata        jsonb,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1p. critical_alerts
-- --------------------------------------------------------------------------
CREATE TABLE critical_alerts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type      text NOT NULL,
    title           text NOT NULL,
    description     text,
    severity        text NOT NULL,
    status          text DEFAULT 'active',
    acknowledged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    acknowledged_at timestamptz,
    resolved_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at     timestamptz,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1q. invariant_violations
-- --------------------------------------------------------------------------
CREATE TABLE invariant_violations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_type  text NOT NULL,
    description     text,
    metadata        jsonb,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1r. cache_entries
-- --------------------------------------------------------------------------
CREATE TABLE cache_entries (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key       text NOT NULL UNIQUE,
    cache_value     jsonb,
    expires_at      timestamptz,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1s. cache_stats
-- --------------------------------------------------------------------------
CREATE TABLE cache_stats (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key       text NOT NULL,
    hit_count       integer DEFAULT 0,
    miss_count      integer DEFAULT 0,
    updated_at      timestamptz DEFAULT now()
);

-- ==========================================================================
-- 2. INDEXES
-- ==========================================================================

-- notifications
CREATE INDEX idx_notifications_user           ON notifications (user_id);
CREATE INDEX idx_notifications_category       ON notifications (category);
CREATE INDEX idx_notifications_is_read        ON notifications (is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at     ON notifications (created_at DESC);
CREATE INDEX idx_notifications_user_unread    ON notifications (user_id, created_at DESC) WHERE is_read = false;

-- notification_queue
CREATE INDEX idx_notification_queue_user      ON notification_queue (user_id);
CREATE INDEX idx_notification_queue_status    ON notification_queue (status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue (scheduled_for) WHERE status = 'pending';

-- notification_preferences
CREATE INDEX idx_notification_preferences_user ON notification_preferences (user_id);

-- notification_preferences_override
CREATE INDEX idx_notification_pref_override_user ON notification_preferences_override (user_id);

-- notification_logs
CREATE INDEX idx_notification_logs_notification ON notification_logs (notification_id);
CREATE INDEX idx_notification_logs_status       ON notification_logs (status);

-- push_notification_tokens
CREATE INDEX idx_push_tokens_user             ON push_notification_tokens (user_id);

-- error_logs
CREATE INDEX idx_error_logs_type              ON error_logs (error_type);
CREATE INDEX idx_error_logs_severity          ON error_logs (severity);
CREATE INDEX idx_error_logs_user              ON error_logs (user_id);
CREATE INDEX idx_error_logs_created_at        ON error_logs (created_at DESC);

-- error_patterns
CREATE INDEX idx_error_patterns_status        ON error_patterns (status);
CREATE INDEX idx_error_patterns_last_seen     ON error_patterns (last_seen DESC);

-- performance_metrics
CREATE INDEX idx_performance_metrics_name     ON performance_metrics (metric_name);
CREATE INDEX idx_performance_metrics_recorded ON performance_metrics (recorded_at DESC);

-- system_health
CREATE INDEX idx_system_health_service        ON system_health (service);
CREATE INDEX idx_system_health_status         ON system_health (status);

-- system_events
CREATE INDEX idx_system_events_type           ON system_events (event_type);
CREATE INDEX idx_system_events_severity       ON system_events (severity);
CREATE INDEX idx_system_events_created        ON system_events (created_at DESC);

-- system_job_log
CREATE INDEX idx_system_job_log_name          ON system_job_log (job_name);
CREATE INDEX idx_system_job_log_status        ON system_job_log (status);

-- activity_logs
CREATE INDEX idx_activity_logs_type           ON activity_logs (activity_type);
CREATE INDEX idx_activity_logs_actor          ON activity_logs (actor_id);
CREATE INDEX idx_activity_logs_target         ON activity_logs (target_type, target_id);
CREATE INDEX idx_activity_logs_created        ON activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_severity       ON activity_logs (severity);

-- critical_alerts
CREATE INDEX idx_critical_alerts_status       ON critical_alerts (status);
CREATE INDEX idx_critical_alerts_severity     ON critical_alerts (severity);
CREATE INDEX idx_critical_alerts_created      ON critical_alerts (created_at DESC);

-- invariant_violations
CREATE INDEX idx_invariant_violations_type    ON invariant_violations (violation_type);
CREATE INDEX idx_invariant_violations_created ON invariant_violations (created_at DESC);

-- cache_entries
CREATE INDEX idx_cache_entries_key            ON cache_entries (cache_key);
CREATE INDEX idx_cache_entries_expires        ON cache_entries (expires_at);

-- cache_stats
CREATE INDEX idx_cache_stats_key             ON cache_stats (cache_key);

-- ==========================================================================
-- 3. TRIGGERS
-- ==========================================================================

CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- 4. VIEWS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- daily_metrics — daily aggregated ride/booking stats
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW daily_metrics AS
SELECT
    date_trunc('day', r.created_at)::date  AS metric_date,
    COUNT(DISTINCT r.id)                    AS rides_created,
    COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) AS rides_completed,
    COUNT(DISTINCT CASE WHEN r.status = 'cancelled' THEN r.id END) AS rides_cancelled,
    COUNT(DISTINCT rb.id)                   AS bookings_created,
    COUNT(DISTINCT CASE WHEN rb.status = 'confirmed' THEN rb.id END) AS bookings_confirmed,
    COUNT(DISTINCT r.driver_id)             AS active_drivers,
    COUNT(DISTINCT rb.passenger_id)         AS active_passengers
FROM rides r
LEFT JOIN ride_bookings rb ON rb.ride_id = r.id
GROUP BY date_trunc('day', r.created_at)::date
ORDER BY metric_date DESC;

-- --------------------------------------------------------------------------
-- ride_completion_stats
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW ride_completion_stats AS
SELECT
    COUNT(*) AS total_rides,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
    COUNT(CASE WHEN status = 'active' THEN 1 END)    AS active,
    CASE
        WHEN COUNT(*) > 0
        THEN ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*) * 100, 2)
        ELSE 0
    END AS completion_rate
FROM rides;

-- --------------------------------------------------------------------------
-- booking_success_metrics
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW booking_success_metrics AS
SELECT
    COUNT(*) AS total_bookings,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmed,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
    CASE
        WHEN COUNT(*) > 0
        THEN ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*) * 100, 2)
        ELSE 0
    END AS success_rate
FROM ride_bookings;

-- --------------------------------------------------------------------------
-- popular_routes
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW popular_routes AS
SELECT
    origin,
    destination,
    COUNT(*)                    AS ride_count,
    AVG(price_per_seat)         AS avg_price,
    AVG(estimated_duration)     AS avg_duration_min
FROM rides
WHERE status IN ('active', 'completed')
GROUP BY origin, destination
ORDER BY ride_count DESC
LIMIT 50;

-- ==========================================================================
-- 5. FUNCTIONS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- get_user_growth — user registration growth over a period
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_growth(p_period_days integer DEFAULT 30)
RETURNS TABLE (
    period_date     date,
    new_users       bigint,
    cumulative      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH daily AS (
        SELECT
            date_trunc('day', created_at)::date AS d,
            COUNT(*) AS cnt
        FROM profiles
        WHERE created_at >= now() - (p_period_days || ' days')::interval
        GROUP BY d
    )
    SELECT
        daily.d AS period_date,
        daily.cnt AS new_users,
        SUM(daily.cnt) OVER (ORDER BY daily.d) AS cumulative
    FROM daily
    ORDER BY daily.d;
END;
$$;

-- --------------------------------------------------------------------------
-- get_live_metrics — current platform stats
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_live_metrics()
RETURNS TABLE (
    total_users         bigint,
    active_rides        bigint,
    pending_bookings    bigint,
    active_conversations bigint,
    unresolved_reports  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM profiles)                                         AS total_users,
        (SELECT COUNT(*) FROM rides WHERE status = 'active')                    AS active_rides,
        (SELECT COUNT(*) FROM ride_bookings WHERE status = 'pending')           AS pending_bookings,
        (SELECT COUNT(*) FROM conversations WHERE updated_at > now() - INTERVAL '24 hours') AS active_conversations,
        (SELECT COUNT(*) FROM safety_reports WHERE status = 'pending')          AS unresolved_reports;
END;
$$;

-- --------------------------------------------------------------------------
-- get_activity_feed — recent activity log entries
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_activity_feed(p_limit integer DEFAULT 50)
RETURNS TABLE (
    id              uuid,
    activity_type   text,
    severity        text,
    actor_name      text,
    action          text,
    description     text,
    target_type     text,
    target_id       uuid,
    metadata        jsonb,
    created_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can view the activity feed';
    END IF;

    RETURN QUERY
    SELECT
        al.id,
        al.activity_type,
        al.severity,
        al.actor_name,
        al.action,
        al.description,
        al.target_type,
        al.target_id,
        al.metadata,
        al.created_at
    FROM activity_logs al
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;

-- --------------------------------------------------------------------------
-- get_activity_stats — activity counts by type over a period
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_activity_stats(p_period text DEFAULT '7d')
RETURNS TABLE (
    activity_type   text,
    count           bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_interval interval;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can view activity stats';
    END IF;

    -- Parse period string
    v_interval := CASE
        WHEN p_period = '24h' THEN INTERVAL '24 hours'
        WHEN p_period = '7d'  THEN INTERVAL '7 days'
        WHEN p_period = '30d' THEN INTERVAL '30 days'
        WHEN p_period = '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '7 days'
    END;

    RETURN QUERY
    SELECT
        al.activity_type,
        COUNT(*) AS count
    FROM activity_logs al
    WHERE al.created_at >= now() - v_interval
    GROUP BY al.activity_type
    ORDER BY count DESC;
END;
$$;

-- --------------------------------------------------------------------------
-- log_activity — insert an activity log entry
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_activity(
    p_activity_type text,
    p_action text,
    p_description text DEFAULT NULL,
    p_target_type text DEFAULT NULL,
    p_target_id uuid DEFAULT NULL,
    p_metadata jsonb DEFAULT NULL,
    p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id uuid;
    v_actor_name text;
    v_actor_email text;
    v_log_id uuid;
BEGIN
    v_actor_id := (SELECT auth.uid());

    IF v_actor_id IS NOT NULL THEN
        SELECT full_name, email
        INTO v_actor_name, v_actor_email
        FROM profiles
        WHERE id = v_actor_id;
    END IF;

    INSERT INTO activity_logs (
        activity_type, severity, actor_id, actor_name, actor_email,
        target_type, target_id, action, description, metadata
    )
    VALUES (
        p_activity_type, p_severity, v_actor_id, v_actor_name, v_actor_email,
        p_target_type, p_target_id, p_action, p_description, p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- --------------------------------------------------------------------------
-- acknowledge_alert — mark a critical alert as acknowledged
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION acknowledge_alert(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can acknowledge alerts';
    END IF;

    UPDATE critical_alerts
    SET status = 'acknowledged',
        acknowledged_by = (SELECT auth.uid()),
        acknowledged_at = now()
    WHERE id = p_alert_id
      AND status = 'active';
END;
$$;

-- --------------------------------------------------------------------------
-- resolve_alert — mark a critical alert as resolved
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_alert(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can resolve alerts';
    END IF;

    UPDATE critical_alerts
    SET status = 'resolved',
        resolved_by = (SELECT auth.uid()),
        resolved_at = now()
    WHERE id = p_alert_id
      AND status IN ('active', 'acknowledged');
END;
$$;

-- ==========================================================================
-- 6. TRIGGERS (activity logging)
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Log ride creation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_ride_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO activity_logs (
        activity_type, severity, actor_id, action, description,
        target_type, target_id, metadata
    )
    VALUES (
        'ride', 'info', NEW.driver_id, 'created',
        'New ride from ' || NEW.origin || ' to ' || NEW.destination,
        'ride', NEW.id,
        jsonb_build_object(
            'origin', NEW.origin,
            'destination', NEW.destination,
            'departure_time', NEW.departure_time,
            'available_seats', NEW.available_seats
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ride_creation ON rides;
CREATE TRIGGER trg_log_ride_creation
    AFTER INSERT ON rides
    FOR EACH ROW EXECUTE FUNCTION log_ride_creation();

-- --------------------------------------------------------------------------
-- Log booking changes
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_logs (
            activity_type, severity, actor_id, action, description,
            target_type, target_id, metadata
        )
        VALUES (
            'booking', 'info', NEW.passenger_id, 'created',
            'New booking created',
            'booking', NEW.id,
            jsonb_build_object('ride_id', NEW.ride_id, 'status', NEW.status)
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO activity_logs (
            activity_type, severity, actor_id, action, description,
            target_type, target_id, metadata
        )
        VALUES (
            'booking',
            CASE WHEN NEW.status = 'cancelled' THEN 'warning' ELSE 'info' END,
            NEW.passenger_id,
            'status_changed',
            'Booking status changed from ' || OLD.status || ' to ' || NEW.status,
            'booking', NEW.id,
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'ride_id', NEW.ride_id)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_booking_changes ON ride_bookings;
CREATE TRIGGER trg_log_booking_changes
    AFTER INSERT OR UPDATE ON ride_bookings
    FOR EACH ROW EXECUTE FUNCTION log_booking_changes();

-- ==========================================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE notifications                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_job_log                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_alerts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE invariant_violations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_entries                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_stats                     ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 8. RLS POLICIES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- notifications — own only
-- --------------------------------------------------------------------------
CREATE POLICY notifications_select_own
    ON notifications FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_insert_service
    ON notifications FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY notifications_update_own
    ON notifications FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_delete_own
    ON notifications FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_admin
    ON notifications FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- notification_queue — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY notification_queue_admin
    ON notification_queue FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY notification_queue_service_role
    ON notification_queue FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- notification_preferences — own only
-- --------------------------------------------------------------------------
CREATE POLICY notification_preferences_select_own
    ON notification_preferences FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY notification_preferences_insert_own
    ON notification_preferences FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notification_preferences_update_own
    ON notification_preferences FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- notification_preferences_override — own only
-- --------------------------------------------------------------------------
CREATE POLICY notification_pref_override_select_own
    ON notification_preferences_override FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY notification_pref_override_insert_own
    ON notification_preferences_override FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notification_pref_override_update_own
    ON notification_preferences_override FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY notification_pref_override_delete_own
    ON notification_preferences_override FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- notification_templates — admin only
-- --------------------------------------------------------------------------
CREATE POLICY notification_templates_admin
    ON notification_templates FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- notification_logs — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY notification_logs_admin
    ON notification_logs FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY notification_logs_service_role
    ON notification_logs FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- push_notification_tokens — own only
-- --------------------------------------------------------------------------
CREATE POLICY push_tokens_select_own
    ON push_notification_tokens FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY push_tokens_insert_own
    ON push_notification_tokens FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY push_tokens_delete_own
    ON push_notification_tokens FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- error_logs — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY error_logs_admin
    ON error_logs FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY error_logs_service_role
    ON error_logs FOR ALL TO service_role
    USING (true);

CREATE POLICY error_logs_insert_authenticated
    ON error_logs FOR INSERT TO authenticated
    WITH CHECK (true);

-- --------------------------------------------------------------------------
-- error_patterns — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY error_patterns_admin
    ON error_patterns FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY error_patterns_service_role
    ON error_patterns FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- performance_metrics — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY performance_metrics_admin
    ON performance_metrics FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY performance_metrics_service_role
    ON performance_metrics FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- system_health — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY system_health_admin
    ON system_health FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY system_health_service_role
    ON system_health FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- system_events — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY system_events_admin
    ON system_events FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY system_events_service_role
    ON system_events FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- system_job_log — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY system_job_log_admin
    ON system_job_log FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY system_job_log_service_role
    ON system_job_log FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- system_messages — public read for active, admin full
-- --------------------------------------------------------------------------
CREATE POLICY system_messages_select_active
    ON system_messages FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY system_messages_admin
    ON system_messages FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- activity_logs — admin only
-- --------------------------------------------------------------------------
CREATE POLICY activity_logs_admin
    ON activity_logs FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY activity_logs_service_role
    ON activity_logs FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- critical_alerts — admin only
-- --------------------------------------------------------------------------
CREATE POLICY critical_alerts_admin
    ON critical_alerts FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY critical_alerts_service_role
    ON critical_alerts FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- invariant_violations — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY invariant_violations_admin
    ON invariant_violations FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY invariant_violations_service_role
    ON invariant_violations FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- cache_entries / cache_stats — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY cache_entries_admin
    ON cache_entries FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY cache_entries_service_role
    ON cache_entries FOR ALL TO service_role
    USING (true);

CREATE POLICY cache_stats_admin
    ON cache_stats FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY cache_stats_service_role
    ON cache_stats FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- End of 011_notifications_and_analytics.sql
-- --------------------------------------------------------------------------
