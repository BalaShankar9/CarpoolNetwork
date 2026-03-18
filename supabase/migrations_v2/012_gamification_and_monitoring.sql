-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 012: Gamification, Reviews, Reliability, and Error Monitoring
-- ============================================================================
-- Challenges, achievements, leaderboards, detailed ride reviews, reliability
-- scoring, cancellation history, booking restrictions, favorite/preferred
-- drivers, ride modifications, passenger search filters, and the error
-- monitoring incident pipeline (incidents, status events, platform health).
--
-- Depends on:
--   001_extensions_and_utils.sql  (incident_severity, incident_status ENUMs,
--                                  update_updated_at_column(), is_admin())
--   002_core_profiles_and_auth.sql (profiles table)
--   004_rides_bookings_requests.sql (rides, ride_bookings tables)
--   011_notifications_and_analytics.sql (error_logs table)
-- ============================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. challenges
-- --------------------------------------------------------------------------
CREATE TABLE challenges (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    description     text,
    challenge_type  text,
    target_value    numeric,
    reward_type     text,
    reward_value    text,
    badge_icon      text,
    start_date      timestamptz,
    end_date        timestamptz,
    is_active       boolean DEFAULT true,
    is_seasonal     boolean DEFAULT false,
    season_theme    text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1b. user_challenges
-- --------------------------------------------------------------------------
CREATE TABLE user_challenges (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id    uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    progress        numeric DEFAULT 0,
    completed       boolean DEFAULT false,
    completed_at    timestamptz,
    reward_claimed  boolean DEFAULT false,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE (user_id, challenge_id)
);

-- --------------------------------------------------------------------------
-- 1c. user_achievements
-- --------------------------------------------------------------------------
CREATE TABLE user_achievements (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_type    text NOT NULL,
    achievement_name    text NOT NULL,
    description         text,
    unlocked_at         timestamptz DEFAULT now(),
    metadata            jsonb,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1d. leaderboard_cache
-- --------------------------------------------------------------------------
CREATE TABLE leaderboard_cache (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category        text NOT NULL,
    region          text NOT NULL,
    rank            integer,
    score           numeric,
    period          text NOT NULL,
    updated_at      timestamptz DEFAULT now(),
    created_at      timestamptz DEFAULT now(),
    UNIQUE (user_id, category, region, period)
);

-- --------------------------------------------------------------------------
-- 1e. ride_reviews_detailed
-- --------------------------------------------------------------------------
CREATE TABLE ride_reviews_detailed (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              uuid UNIQUE,  -- FK to ride_bookings (created in 004)
    ride_id                 uuid NOT NULL, -- FK to rides (created in 004)
    reviewer_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewee_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    review_type             text NOT NULL CHECK (review_type IN ('driver', 'passenger')),
    overall_rating          integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    driving_rating          integer CHECK (driving_rating >= 1 AND driving_rating <= 5),
    punctuality_rating      integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    communication_rating    integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
    cleanliness_rating      integer CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    comfort_rating          integer CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
    comment                 text,
    would_ride_again        boolean,
    is_anonymous            boolean DEFAULT false,
    helpful_count           integer DEFAULT 0,
    created_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1f. reliability_scores
-- --------------------------------------------------------------------------
CREATE TABLE reliability_scores (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    reliability_score           integer DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    total_rides                 integer DEFAULT 0,
    completed_rides             integer DEFAULT 0,
    cancelled_rides             integer DEFAULT 0,
    completion_ratio            numeric,
    cancellation_ratio          numeric,
    last_minute_cancellations   integer DEFAULT 0,
    warnings_count              integer DEFAULT 0,
    last_warning_at             timestamptz,
    is_in_grace_period          boolean DEFAULT true,
    grace_rides_remaining       integer DEFAULT 5,
    last_updated                timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1g. reliability_score_cache
-- --------------------------------------------------------------------------
CREATE TABLE reliability_score_cache (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score_type      text NOT NULL,
    score           numeric,
    calculated_at   timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1h. reliability_events
-- --------------------------------------------------------------------------
CREATE TABLE reliability_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type      text NOT NULL,
    impact          integer,
    metadata        jsonb,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1i. cancellation_history
-- --------------------------------------------------------------------------
CREATE TABLE cancellation_history (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ride_id                 uuid,  -- FK to rides (created in 004)
    booking_id              uuid,  -- FK to ride_bookings (created in 004)
    cancellation_type       text,
    user_role               text,
    hours_before_departure  numeric,
    cancellation_reason     text,
    reliability_impact      integer,
    is_exempt               boolean DEFAULT false,
    exemption_reason        text,
    created_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1j. booking_restrictions
-- --------------------------------------------------------------------------
CREATE TABLE booking_restrictions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    restriction_type    text NOT NULL,
    reason              text,
    starts_at           timestamptz DEFAULT now(),
    ends_at             timestamptz,
    is_active           boolean DEFAULT true,
    appeal_status       text DEFAULT 'none',
    appeal_reason       text,
    reviewed_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1k. favorite_drivers
-- --------------------------------------------------------------------------
CREATE TABLE favorite_drivers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    auto_accept     boolean DEFAULT false,
    rides_together  integer DEFAULT 0,
    created_at      timestamptz DEFAULT now(),
    UNIQUE (user_id, driver_id)
);

-- --------------------------------------------------------------------------
-- 1l. preferred_drivers
-- --------------------------------------------------------------------------
CREATE TABLE preferred_drivers (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    priority                integer DEFAULT 0,
    notify_on_new_ride      boolean DEFAULT true,
    created_at              timestamptz DEFAULT now(),
    UNIQUE (user_id, driver_id)
);

-- --------------------------------------------------------------------------
-- 1m. ride_modifications
-- --------------------------------------------------------------------------
CREATE TABLE ride_modifications (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id             uuid NOT NULL,  -- FK to rides (created in 004)
    booking_id          uuid,           -- FK to ride_bookings (created in 004)
    modified_by         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    modification_type   text NOT NULL,
    old_value           jsonb,
    new_value           jsonb,
    reason              text,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1n. ride_preference_overrides
-- --------------------------------------------------------------------------
CREATE TABLE ride_preference_overrides (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id         uuid NOT NULL,  -- FK to rides (created in 004)
    driver_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    preferences     jsonb,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1o. passenger_search_filters
-- --------------------------------------------------------------------------
CREATE TABLE passenger_search_filters (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    filter_name     text NOT NULL,
    filters         jsonb,
    is_default      boolean DEFAULT false,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- Error Monitoring Tables
-- --------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- 1p. incidents
-- --------------------------------------------------------------------------
CREATE TABLE incidents (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint         text NOT NULL,
    title               text NOT NULL,
    severity            incident_severity NOT NULL DEFAULT 'medium',
    status              incident_status NOT NULL DEFAULT 'new',
    confidence_score    numeric(5,2),
    fix_pr_url          text,
    summary             text,
    first_seen_at       timestamptz DEFAULT now(),
    last_seen_at        timestamptz DEFAULT now(),
    error_count         integer DEFAULT 1,
    metadata            jsonb,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Unique partial index: only one active incident per fingerprint
CREATE UNIQUE INDEX idx_incidents_fingerprint_active
    ON incidents (fingerprint)
    WHERE status NOT IN ('deployed', 'dismissed');

-- --------------------------------------------------------------------------
-- 1q. incident_errors (junction: incident <-> error_log)
-- --------------------------------------------------------------------------
CREATE TABLE incident_errors (
    incident_id     uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    error_log_id    uuid NOT NULL REFERENCES error_logs(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now(),
    PRIMARY KEY (incident_id, error_log_id)
);

-- --------------------------------------------------------------------------
-- 1r. incident_affected_users
-- --------------------------------------------------------------------------
CREATE TABLE incident_affected_users (
    incident_id     uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    first_seen_at   timestamptz DEFAULT now(),
    error_count     integer DEFAULT 1,
    created_at      timestamptz DEFAULT now(),
    PRIMARY KEY (incident_id, user_id)
);

-- --------------------------------------------------------------------------
-- 1s. status_events (public status page events)
-- --------------------------------------------------------------------------
CREATE TABLE status_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    title           text NOT NULL,
    description     text,
    status          text NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    is_public       boolean DEFAULT false,
    started_at      timestamptz DEFAULT now(),
    resolved_at     timestamptz,
    created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1t. platform_health_cache (singleton)
-- --------------------------------------------------------------------------
CREATE TABLE platform_health_cache (
    id                  integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    score               numeric(5,2) DEFAULT 100,
    active_incidents    integer DEFAULT 0,
    critical_count      integer DEFAULT 0,
    high_count          integer DEFAULT 0,
    medium_count        integer DEFAULT 0,
    low_count           integer DEFAULT 0,
    last_incident_at    timestamptz,
    computed_at         timestamptz DEFAULT now(),
    metadata            jsonb
);

-- Seed the singleton row
INSERT INTO platform_health_cache (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- 2. INDEXES
-- ==========================================================================

-- challenges
CREATE INDEX idx_challenges_active            ON challenges (is_active) WHERE is_active = true;
CREATE INDEX idx_challenges_dates             ON challenges (start_date, end_date);
CREATE INDEX idx_challenges_seasonal          ON challenges (is_seasonal) WHERE is_seasonal = true;

-- user_challenges
CREATE INDEX idx_user_challenges_user         ON user_challenges (user_id);
CREATE INDEX idx_user_challenges_challenge    ON user_challenges (challenge_id);
CREATE INDEX idx_user_challenges_completed    ON user_challenges (completed) WHERE completed = true;

-- user_achievements
CREATE INDEX idx_user_achievements_user       ON user_achievements (user_id);
CREATE INDEX idx_user_achievements_type       ON user_achievements (achievement_type);
CREATE INDEX idx_user_achievements_unlocked   ON user_achievements (unlocked_at DESC);

-- leaderboard_cache
CREATE INDEX idx_leaderboard_cache_user       ON leaderboard_cache (user_id);
CREATE INDEX idx_leaderboard_cache_category   ON leaderboard_cache (category, region, period);
CREATE INDEX idx_leaderboard_cache_rank       ON leaderboard_cache (rank);
CREATE INDEX idx_leaderboard_cache_score      ON leaderboard_cache (score DESC);

-- ride_reviews_detailed
CREATE INDEX idx_ride_reviews_detailed_ride       ON ride_reviews_detailed (ride_id);
CREATE INDEX idx_ride_reviews_detailed_reviewer   ON ride_reviews_detailed (reviewer_id);
CREATE INDEX idx_ride_reviews_detailed_reviewee   ON ride_reviews_detailed (reviewee_id);
CREATE INDEX idx_ride_reviews_detailed_type       ON ride_reviews_detailed (review_type);
CREATE INDEX idx_ride_reviews_detailed_rating     ON ride_reviews_detailed (overall_rating);
CREATE INDEX idx_ride_reviews_detailed_created    ON ride_reviews_detailed (created_at DESC);

-- reliability_scores
CREATE INDEX idx_reliability_scores_user          ON reliability_scores (user_id);
CREATE INDEX idx_reliability_scores_score         ON reliability_scores (reliability_score);

-- reliability_score_cache
CREATE INDEX idx_reliability_score_cache_user     ON reliability_score_cache (user_id);

-- reliability_events
CREATE INDEX idx_reliability_events_user          ON reliability_events (user_id);
CREATE INDEX idx_reliability_events_type          ON reliability_events (event_type);
CREATE INDEX idx_reliability_events_created       ON reliability_events (created_at DESC);

-- cancellation_history
CREATE INDEX idx_cancellation_history_user        ON cancellation_history (user_id);
CREATE INDEX idx_cancellation_history_ride        ON cancellation_history (ride_id);
CREATE INDEX idx_cancellation_history_created     ON cancellation_history (created_at DESC);

-- booking_restrictions
CREATE INDEX idx_booking_restrictions_user        ON booking_restrictions (user_id);
CREATE INDEX idx_booking_restrictions_active      ON booking_restrictions (is_active) WHERE is_active = true;

-- favorite_drivers
CREATE INDEX idx_favorite_drivers_user            ON favorite_drivers (user_id);
CREATE INDEX idx_favorite_drivers_driver          ON favorite_drivers (driver_id);

-- preferred_drivers
CREATE INDEX idx_preferred_drivers_user           ON preferred_drivers (user_id);
CREATE INDEX idx_preferred_drivers_driver         ON preferred_drivers (driver_id);

-- ride_modifications
CREATE INDEX idx_ride_modifications_ride          ON ride_modifications (ride_id);
CREATE INDEX idx_ride_modifications_booking       ON ride_modifications (booking_id);
CREATE INDEX idx_ride_modifications_modified_by   ON ride_modifications (modified_by);
CREATE INDEX idx_ride_modifications_created       ON ride_modifications (created_at DESC);

-- ride_preference_overrides
CREATE INDEX idx_ride_preference_overrides_ride   ON ride_preference_overrides (ride_id);
CREATE INDEX idx_ride_preference_overrides_driver ON ride_preference_overrides (driver_id);

-- passenger_search_filters
CREATE INDEX idx_passenger_search_filters_user    ON passenger_search_filters (user_id);

-- incidents
CREATE INDEX idx_incidents_severity               ON incidents (severity);
CREATE INDEX idx_incidents_status                 ON incidents (status);
CREATE INDEX idx_incidents_first_seen             ON incidents (first_seen_at DESC);
CREATE INDEX idx_incidents_last_seen              ON incidents (last_seen_at DESC);
CREATE INDEX idx_incidents_error_count            ON incidents (error_count DESC);

-- incident_errors
CREATE INDEX idx_incident_errors_incident         ON incident_errors (incident_id);
CREATE INDEX idx_incident_errors_error_log        ON incident_errors (error_log_id);

-- incident_affected_users
CREATE INDEX idx_incident_affected_users_incident ON incident_affected_users (incident_id);
CREATE INDEX idx_incident_affected_users_user     ON incident_affected_users (user_id);

-- status_events
CREATE INDEX idx_status_events_incident           ON status_events (incident_id);
CREATE INDEX idx_status_events_status             ON status_events (status);
CREATE INDEX idx_status_events_public             ON status_events (is_public) WHERE is_public = true;
CREATE INDEX idx_status_events_created            ON status_events (created_at DESC);

-- ==========================================================================
-- 3. TRIGGERS
-- ==========================================================================

CREATE TRIGGER trg_user_challenges_updated_at
    BEFORE UPDATE ON user_challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_status_events_updated_at
    BEFORE UPDATE ON status_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize reliability score when a new profile is created
-- (The trigger function initialize_reliability_score is defined in 002,
--  but we create the reliability_scores row here.)
CREATE OR REPLACE FUNCTION initialize_reliability_score_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO reliability_scores (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_init_reliability_score_row
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION initialize_reliability_score_row();

-- ==========================================================================
-- 4. FUNCTIONS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- calculate_platform_health_score — composite score for platform health
-- Weights: uptime 40%, error rate 25%, fix rate 20%, MTTR 15%
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_platform_health_score(p_period_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_total_incidents integer;
    v_resolved_incidents integer;
    v_critical_count integer;
    v_high_count integer;
    v_medium_count integer;
    v_low_count integer;
    v_error_count bigint;
    v_avg_mttr_hours numeric;
    v_uptime_score numeric;
    v_error_rate_score numeric;
    v_fix_rate_score numeric;
    v_mttr_score numeric;
    v_composite_score numeric;
    v_period_start timestamptz;
BEGIN
    v_period_start := now() - (p_period_days || ' days')::interval;

    -- Count incidents by severity in the period
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('deployed', 'dismissed')),
        COUNT(*) FILTER (WHERE severity = 'critical'),
        COUNT(*) FILTER (WHERE severity = 'high'),
        COUNT(*) FILTER (WHERE severity = 'medium'),
        COUNT(*) FILTER (WHERE severity = 'low')
    INTO v_total_incidents, v_resolved_incidents,
         v_critical_count, v_high_count, v_medium_count, v_low_count
    FROM incidents
    WHERE created_at >= v_period_start;

    -- Total error logs in the period
    SELECT COUNT(*) INTO v_error_count
    FROM error_logs
    WHERE created_at >= v_period_start;

    -- Average mean time to resolution (hours)
    SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0),
        0
    ) INTO v_avg_mttr_hours
    FROM incidents
    WHERE status IN ('deployed', 'dismissed')
      AND created_at >= v_period_start;

    -- Uptime score (40%): penalised by critical/high incidents
    v_uptime_score := GREATEST(0, 100 - (v_critical_count * 20) - (v_high_count * 10) - (v_medium_count * 3));

    -- Error rate score (25%): based on error log volume
    v_error_rate_score := CASE
        WHEN v_error_count = 0 THEN 100
        WHEN v_error_count < 10 THEN 90
        WHEN v_error_count < 50 THEN 70
        WHEN v_error_count < 200 THEN 50
        ELSE 20
    END;

    -- Fix rate score (20%): ratio of resolved to total
    v_fix_rate_score := CASE
        WHEN v_total_incidents = 0 THEN 100
        ELSE ROUND((v_resolved_incidents::numeric / v_total_incidents) * 100, 2)
    END;

    -- MTTR score (15%): lower is better
    v_mttr_score := CASE
        WHEN v_avg_mttr_hours = 0 THEN 100
        WHEN v_avg_mttr_hours < 1 THEN 95
        WHEN v_avg_mttr_hours < 4 THEN 80
        WHEN v_avg_mttr_hours < 12 THEN 60
        WHEN v_avg_mttr_hours < 24 THEN 40
        ELSE 20
    END;

    -- Composite: uptime 40%, error_rate 25%, fix_rate 20%, mttr 15%
    v_composite_score := ROUND(
        (v_uptime_score * 0.40) +
        (v_error_rate_score * 0.25) +
        (v_fix_rate_score * 0.20) +
        (v_mttr_score * 0.15),
        2
    );

    -- Update the singleton cache
    UPDATE platform_health_cache
    SET score = v_composite_score,
        active_incidents = (SELECT COUNT(*) FROM incidents WHERE status NOT IN ('deployed', 'dismissed')),
        critical_count = v_critical_count,
        high_count = v_high_count,
        medium_count = v_medium_count,
        low_count = v_low_count,
        last_incident_at = (SELECT MAX(created_at) FROM incidents),
        computed_at = now(),
        metadata = jsonb_build_object(
            'period_days', p_period_days,
            'uptime_score', v_uptime_score,
            'error_rate_score', v_error_rate_score,
            'fix_rate_score', v_fix_rate_score,
            'mttr_score', v_mttr_score,
            'total_incidents', v_total_incidents,
            'resolved_incidents', v_resolved_incidents,
            'error_count', v_error_count,
            'avg_mttr_hours', v_avg_mttr_hours
        )
    WHERE id = 1;

    RETURN jsonb_build_object(
        'score', v_composite_score,
        'uptime_score', v_uptime_score,
        'error_rate_score', v_error_rate_score,
        'fix_rate_score', v_fix_rate_score,
        'mttr_score', v_mttr_score,
        'total_incidents', v_total_incidents,
        'resolved_incidents', v_resolved_incidents,
        'critical_count', v_critical_count,
        'high_count', v_high_count,
        'medium_count', v_medium_count,
        'low_count', v_low_count,
        'error_count', v_error_count,
        'avg_mttr_hours', ROUND(v_avg_mttr_hours, 2),
        'period_days', p_period_days,
        'computed_at', now()
    );
END;
$$;

-- --------------------------------------------------------------------------
-- cancel_booking_with_impact — cancels a booking and records reliability impact
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_booking_with_impact(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS TABLE (
    success             boolean,
    message             text,
    reliability_impact  integer,
    new_score           integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking ride_bookings%ROWTYPE;
    v_ride rides%ROWTYPE;
    v_hours_before numeric;
    v_impact integer;
    v_user_id uuid;
    v_current_score integer;
    v_new_score integer;
    v_user_role text;
    v_is_exempt boolean := false;
BEGIN
    v_user_id := (SELECT auth.uid());

    -- Get booking details
    SELECT * INTO v_booking FROM ride_bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Booking not found'::text, 0, 0;
        RETURN;
    END IF;

    -- Get ride details
    SELECT * INTO v_ride FROM rides WHERE id = v_booking.ride_id;

    -- Determine role and verify ownership
    IF v_booking.passenger_id = v_user_id THEN
        v_user_role := 'passenger';
    ELSIF v_ride.driver_id = v_user_id THEN
        v_user_role := 'driver';
    ELSE
        RETURN QUERY SELECT false, 'Not authorized to cancel this booking'::text, 0, 0;
        RETURN;
    END IF;

    -- Calculate hours before departure
    v_hours_before := EXTRACT(EPOCH FROM (v_ride.departure_time - now())) / 3600.0;

    -- Calculate reliability impact based on timing
    v_impact := CASE
        WHEN v_hours_before > 48 THEN -2   -- well in advance
        WHEN v_hours_before > 24 THEN -5
        WHEN v_hours_before > 6  THEN -10
        WHEN v_hours_before > 2  THEN -15
        ELSE -20                             -- last-minute
    END;

    -- Driver cancellation has heavier impact
    IF v_user_role = 'driver' THEN
        v_impact := v_impact * 2;
    END IF;

    -- Check grace period
    SELECT reliability_score, is_in_grace_period, grace_rides_remaining
    INTO v_current_score
    FROM reliability_scores
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        v_current_score := 100;
    END IF;

    -- Update booking status
    UPDATE ride_bookings
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_booking_id;

    -- Record cancellation
    INSERT INTO cancellation_history (
        user_id, ride_id, booking_id, cancellation_type,
        user_role, hours_before_departure, cancellation_reason,
        reliability_impact, is_exempt, exemption_reason
    )
    VALUES (
        v_user_id, v_booking.ride_id, p_booking_id,
        CASE WHEN v_hours_before <= 2 THEN 'last_minute' ELSE 'standard' END,
        v_user_role, v_hours_before, p_reason,
        v_impact, v_is_exempt, NULL
    );

    -- Record reliability event
    INSERT INTO reliability_events (user_id, event_type, impact, metadata)
    VALUES (
        v_user_id, 'cancellation', v_impact,
        jsonb_build_object(
            'booking_id', p_booking_id,
            'ride_id', v_booking.ride_id,
            'hours_before', ROUND(v_hours_before, 2),
            'role', v_user_role
        )
    );

    -- Update reliability score
    v_new_score := GREATEST(0, LEAST(100, v_current_score + v_impact));

    UPDATE reliability_scores
    SET reliability_score = v_new_score,
        cancelled_rides = cancelled_rides + 1,
        last_minute_cancellations = CASE
            WHEN v_hours_before <= 2 THEN last_minute_cancellations + 1
            ELSE last_minute_cancellations
        END,
        cancellation_ratio = CASE
            WHEN total_rides > 0 THEN (cancelled_rides + 1)::numeric / total_rides
            ELSE 0
        END,
        last_updated = now()
    WHERE user_id = v_user_id;

    RETURN QUERY SELECT true, 'Booking cancelled'::text, v_impact, v_new_score;
END;
$$;

-- --------------------------------------------------------------------------
-- check_and_award_achievements — checks if a user has earned any new achievements
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id uuid)
RETURNS TABLE (
    achievement_type    text,
    achievement_name    text,
    description         text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_rides integer;
    v_total_bookings integer;
    v_rating numeric;
BEGIN
    -- Get user stats
    SELECT total_rides_offered, total_bookings, average_rating
    INTO v_total_rides, v_total_bookings, v_rating
    FROM profiles
    WHERE id = p_user_id;

    -- First ride offered
    IF v_total_rides >= 1 AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.user_id = p_user_id AND ua.achievement_type = 'first_ride_offered'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description)
        VALUES (p_user_id, 'first_ride_offered', 'Road Starter', 'Offered your first ride');

        RETURN QUERY SELECT 'first_ride_offered'::text, 'Road Starter'::text, 'Offered your first ride'::text;
    END IF;

    -- 10 rides offered
    IF v_total_rides >= 10 AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.user_id = p_user_id AND ua.achievement_type = 'ten_rides_offered'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description)
        VALUES (p_user_id, 'ten_rides_offered', 'Regular Driver', 'Offered 10 rides');

        RETURN QUERY SELECT 'ten_rides_offered'::text, 'Regular Driver'::text, 'Offered 10 rides'::text;
    END IF;

    -- 50 rides offered
    IF v_total_rides >= 50 AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.user_id = p_user_id AND ua.achievement_type = 'fifty_rides_offered'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description)
        VALUES (p_user_id, 'fifty_rides_offered', 'Road Warrior', 'Offered 50 rides');

        RETURN QUERY SELECT 'fifty_rides_offered'::text, 'Road Warrior'::text, 'Offered 50 rides'::text;
    END IF;

    -- High rating
    IF v_rating >= 4.5 AND v_total_rides >= 5 AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.user_id = p_user_id AND ua.achievement_type = 'high_rating'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description)
        VALUES (p_user_id, 'high_rating', 'Top Rated', 'Maintained a 4.5+ rating over 5+ rides');

        RETURN QUERY SELECT 'high_rating'::text, 'Top Rated'::text, 'Maintained a 4.5+ rating over 5+ rides'::text;
    END IF;

    RETURN;
END;
$$;

-- --------------------------------------------------------------------------
-- calculate_environmental_impact — CO2 saved via carpooling
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_environmental_impact(p_user_id uuid)
RETURNS TABLE (
    total_rides_shared      integer,
    total_distance_km       numeric,
    co2_saved_kg            numeric,
    trees_equivalent        numeric,
    fuel_saved_litres       numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_avg_co2_per_km CONSTANT numeric := 0.12;   -- kg CO2 per km for average car
    v_avg_fuel_per_km CONSTANT numeric := 0.07;   -- litres per km
    v_co2_per_tree_year CONSTANT numeric := 22.0;  -- kg CO2 absorbed per tree per year
BEGIN
    RETURN QUERY
    WITH user_rides AS (
        SELECT
            COUNT(*) AS ride_count,
            COALESCE(SUM(r.estimated_distance), 0) AS total_km
        FROM rides r
        INNER JOIN ride_bookings rb ON rb.ride_id = r.id
        WHERE (r.driver_id = p_user_id OR rb.passenger_id = p_user_id)
          AND r.status = 'completed'
          AND rb.status = 'completed'
    )
    SELECT
        ur.ride_count::integer               AS total_rides_shared,
        ROUND(ur.total_km, 2)                AS total_distance_km,
        ROUND(ur.total_km * v_avg_co2_per_km, 2)  AS co2_saved_kg,
        ROUND(ur.total_km * v_avg_co2_per_km / v_co2_per_tree_year, 2) AS trees_equivalent,
        ROUND(ur.total_km * v_avg_fuel_per_km, 2) AS fuel_saved_litres
    FROM user_rides ur;
END;
$$;

-- --------------------------------------------------------------------------
-- get_pending_reviews — rides that need a review from this user
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pending_reviews(p_user_id uuid)
RETURNS TABLE (
    booking_id      uuid,
    ride_id         uuid,
    other_user_id   uuid,
    other_user_name text,
    origin          text,
    destination     text,
    departure_time  timestamptz,
    review_type     text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    -- Rides as passenger: review driver
    SELECT
        rb.id           AS booking_id,
        r.id            AS ride_id,
        r.driver_id     AS other_user_id,
        p.full_name     AS other_user_name,
        r.origin,
        r.destination,
        r.departure_time,
        'driver'::text  AS review_type
    FROM ride_bookings rb
    INNER JOIN rides r ON r.id = rb.ride_id
    INNER JOIN profiles p ON p.id = r.driver_id
    WHERE rb.passenger_id = p_user_id
      AND rb.status = 'completed'
      AND NOT EXISTS (
          SELECT 1 FROM ride_reviews_detailed rrd
          WHERE rrd.booking_id = rb.id
            AND rrd.reviewer_id = p_user_id
      )

    UNION ALL

    -- Rides as driver: review each passenger
    SELECT
        rb.id               AS booking_id,
        r.id                AS ride_id,
        rb.passenger_id     AS other_user_id,
        p.full_name         AS other_user_name,
        r.origin,
        r.destination,
        r.departure_time,
        'passenger'::text   AS review_type
    FROM rides r
    INNER JOIN ride_bookings rb ON rb.ride_id = r.id
    INNER JOIN profiles p ON p.id = rb.passenger_id
    WHERE r.driver_id = p_user_id
      AND rb.status = 'completed'
      AND NOT EXISTS (
          SELECT 1 FROM ride_reviews_detailed rrd
          WHERE rrd.booking_id = rb.id
            AND rrd.reviewer_id = p_user_id
      )

    ORDER BY departure_time DESC;
END;
$$;

-- ==========================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE challenges                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_reviews_detailed       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reliability_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reliability_score_cache     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reliability_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_restrictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_drivers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_modifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_preference_overrides   ENABLE ROW LEVEL SECURITY;
ALTER TABLE passenger_search_filters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_errors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_affected_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_health_cache       ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 6. RLS POLICIES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- challenges — active ones viewable by authenticated
-- --------------------------------------------------------------------------
CREATE POLICY challenges_select_active
    ON challenges FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY challenges_admin
    ON challenges FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- user_challenges — own only
-- --------------------------------------------------------------------------
CREATE POLICY user_challenges_select_own
    ON user_challenges FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_challenges_insert_own
    ON user_challenges FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_challenges_update_own
    ON user_challenges FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_challenges_admin
    ON user_challenges FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- user_achievements — own only
-- --------------------------------------------------------------------------
CREATE POLICY user_achievements_select_own
    ON user_achievements FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_achievements_admin
    ON user_achievements FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY user_achievements_service_role
    ON user_achievements FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- leaderboard_cache — public read (users opted in via leaderboard_visible)
-- --------------------------------------------------------------------------
CREATE POLICY leaderboard_cache_select_public
    ON leaderboard_cache FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = leaderboard_cache.user_id
              AND p.leaderboard_visible = true
        )
    );

CREATE POLICY leaderboard_cache_select_own
    ON leaderboard_cache FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY leaderboard_cache_admin
    ON leaderboard_cache FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY leaderboard_cache_service_role
    ON leaderboard_cache FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- ride_reviews_detailed — public read, INSERT by ride participants
-- --------------------------------------------------------------------------
CREATE POLICY ride_reviews_detailed_select_public
    ON ride_reviews_detailed FOR SELECT TO authenticated
    USING (true);

CREATE POLICY ride_reviews_detailed_insert_participant
    ON ride_reviews_detailed FOR INSERT TO authenticated
    WITH CHECK (
        reviewer_id = (SELECT auth.uid())
        AND (
            -- Reviewer was a passenger on the ride
            EXISTS (
                SELECT 1 FROM ride_bookings rb
                WHERE rb.ride_id = ride_reviews_detailed.ride_id
                  AND rb.passenger_id = (SELECT auth.uid())
                  AND rb.status = 'completed'
            )
            OR
            -- Reviewer was the driver
            EXISTS (
                SELECT 1 FROM rides r
                WHERE r.id = ride_reviews_detailed.ride_id
                  AND r.driver_id = (SELECT auth.uid())
                  AND r.status = 'completed'
            )
        )
    );

CREATE POLICY ride_reviews_detailed_admin
    ON ride_reviews_detailed FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- reliability_scores — public read (for trust)
-- --------------------------------------------------------------------------
CREATE POLICY reliability_scores_select_public
    ON reliability_scores FOR SELECT TO authenticated
    USING (true);

CREATE POLICY reliability_scores_admin
    ON reliability_scores FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY reliability_scores_service_role
    ON reliability_scores FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- reliability_score_cache — own + admin
-- --------------------------------------------------------------------------
CREATE POLICY reliability_score_cache_select_own
    ON reliability_score_cache FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY reliability_score_cache_service_role
    ON reliability_score_cache FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- reliability_events — own + admin
-- --------------------------------------------------------------------------
CREATE POLICY reliability_events_select_own
    ON reliability_events FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY reliability_events_admin
    ON reliability_events FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY reliability_events_service_role
    ON reliability_events FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- cancellation_history — own only
-- --------------------------------------------------------------------------
CREATE POLICY cancellation_history_select_own
    ON cancellation_history FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY cancellation_history_admin
    ON cancellation_history FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY cancellation_history_service_role
    ON cancellation_history FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- booking_restrictions — own + admin
-- --------------------------------------------------------------------------
CREATE POLICY booking_restrictions_select_own
    ON booking_restrictions FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY booking_restrictions_admin
    ON booking_restrictions FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- favorite_drivers — own only
-- --------------------------------------------------------------------------
CREATE POLICY favorite_drivers_select_own
    ON favorite_drivers FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY favorite_drivers_insert_own
    ON favorite_drivers FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY favorite_drivers_update_own
    ON favorite_drivers FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY favorite_drivers_delete_own
    ON favorite_drivers FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- preferred_drivers — own only
-- --------------------------------------------------------------------------
CREATE POLICY preferred_drivers_select_own
    ON preferred_drivers FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY preferred_drivers_insert_own
    ON preferred_drivers FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY preferred_drivers_update_own
    ON preferred_drivers FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY preferred_drivers_delete_own
    ON preferred_drivers FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- ride_modifications — ride participants
-- --------------------------------------------------------------------------
CREATE POLICY ride_modifications_select_participant
    ON ride_modifications FOR SELECT TO authenticated
    USING (
        modified_by = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = ride_modifications.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM ride_bookings rb
            WHERE rb.ride_id = ride_modifications.ride_id
              AND rb.passenger_id = (SELECT auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY ride_modifications_insert_participant
    ON ride_modifications FOR INSERT TO authenticated
    WITH CHECK (modified_by = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- ride_preference_overrides — driver only
-- --------------------------------------------------------------------------
CREATE POLICY ride_preference_overrides_select_driver
    ON ride_preference_overrides FOR SELECT TO authenticated
    USING (driver_id = (SELECT auth.uid()) OR is_admin());

CREATE POLICY ride_preference_overrides_insert_driver
    ON ride_preference_overrides FOR INSERT TO authenticated
    WITH CHECK (driver_id = (SELECT auth.uid()));

CREATE POLICY ride_preference_overrides_update_driver
    ON ride_preference_overrides FOR UPDATE TO authenticated
    USING (driver_id = (SELECT auth.uid()));

CREATE POLICY ride_preference_overrides_delete_driver
    ON ride_preference_overrides FOR DELETE TO authenticated
    USING (driver_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- passenger_search_filters — own only
-- --------------------------------------------------------------------------
CREATE POLICY passenger_search_filters_select_own
    ON passenger_search_filters FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY passenger_search_filters_insert_own
    ON passenger_search_filters FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY passenger_search_filters_update_own
    ON passenger_search_filters FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY passenger_search_filters_delete_own
    ON passenger_search_filters FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- incidents — admin + service_role only
-- --------------------------------------------------------------------------
CREATE POLICY incidents_admin
    ON incidents FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY incidents_service_role
    ON incidents FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- incident_errors — admin + service_role only
-- --------------------------------------------------------------------------
CREATE POLICY incident_errors_admin
    ON incident_errors FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY incident_errors_service_role
    ON incident_errors FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- incident_affected_users — admin + service_role only
-- --------------------------------------------------------------------------
CREATE POLICY incident_affected_users_admin
    ON incident_affected_users FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY incident_affected_users_service_role
    ON incident_affected_users FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- status_events — public read for is_public, admin + service_role full
-- --------------------------------------------------------------------------
CREATE POLICY status_events_select_public
    ON status_events FOR SELECT TO authenticated
    USING (is_public = true);

CREATE POLICY status_events_admin
    ON status_events FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY status_events_service_role
    ON status_events FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- platform_health_cache — admin + service_role
-- --------------------------------------------------------------------------
CREATE POLICY platform_health_cache_admin
    ON platform_health_cache FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY platform_health_cache_service_role
    ON platform_health_cache FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- End of 012_gamification_and_monitoring.sql
-- --------------------------------------------------------------------------
