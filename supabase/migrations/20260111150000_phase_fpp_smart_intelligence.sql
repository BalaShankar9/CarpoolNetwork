-- Phase F++: Smart Commute Intelligence Schema
-- Adds explainable matching, clustering, and enhanced reliability tracking
-- All features are ADVISORY - they do not affect core booking/seat logic

-- ============================================================
-- F++1: Route Similarity Support
-- ============================================================

-- Store computed route data for rides (optional, enhances matching)
CREATE TABLE IF NOT EXISTS ride_route_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    
    -- Geocoded coordinates (may differ from text addresses)
    origin_lat double precision,
    origin_lng double precision,
    destination_lat double precision,
    destination_lng double precision,
    
    -- Computed route data
    route_polyline text,                    -- Encoded polyline from Google Maps
    route_distance_meters int,              -- Total route distance
    route_duration_seconds int,             -- Estimated duration
    bearing_degrees double precision,       -- Direction of travel (0-360)
    
    -- Metadata
    geocoded_at timestamptz DEFAULT now(),
    source text DEFAULT 'google_maps',      -- 'google_maps', 'manual', 'estimated'
    
    CONSTRAINT unique_ride_route UNIQUE (ride_id)
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_ride_route_origin ON ride_route_data (origin_lat, origin_lng);
CREATE INDEX IF NOT EXISTS idx_ride_route_destination ON ride_route_data (destination_lat, destination_lng);

-- ============================================================
-- F++2: Commute Clustering
-- ============================================================

-- Identified commute clusters (descriptive, not prescriptive)
CREATE TABLE IF NOT EXISTS commute_clusters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cluster definition
    name text NOT NULL,                     -- Human-readable name
    description text,                       -- "Morning commute to Downtown Tech"
    
    -- Spatial bounds
    centroid_lat double precision NOT NULL,
    centroid_lng double precision NOT NULL,
    radius_meters int NOT NULL DEFAULT 2000,
    
    -- Time bounds
    time_window_start time NOT NULL,        -- e.g., '07:00'
    time_window_end time NOT NULL,          -- e.g., '09:00'
    days_of_week int[] DEFAULT '{1,2,3,4,5}', -- 1=Mon, 7=Sun
    
    -- Cluster health
    ride_count int DEFAULT 0,               -- Current rides in cluster
    last_computed_at timestamptz DEFAULT now(),
    confidence_score double precision DEFAULT 0.5,
    
    -- Status
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    
    -- Community scope (Phase G ready)
    community_id uuid                       -- NULL = platform-wide
);

CREATE INDEX IF NOT EXISTS idx_clusters_location ON commute_clusters (centroid_lat, centroid_lng);
CREATE INDEX IF NOT EXISTS idx_clusters_time ON commute_clusters (time_window_start, time_window_end);

-- Ride-to-cluster assignments (soft, optional)
CREATE TABLE IF NOT EXISTS ride_cluster_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    cluster_id uuid NOT NULL REFERENCES commute_clusters(id) ON DELETE CASCADE,
    
    -- Assignment confidence
    match_score double precision NOT NULL,  -- 0-1, how well ride fits cluster
    assigned_at timestamptz DEFAULT now(),
    
    CONSTRAINT unique_ride_cluster UNIQUE (ride_id, cluster_id)
);

-- ============================================================
-- F++3: Enhanced Reliability Tracking
-- ============================================================

-- Detailed reliability events (feeds into scoring)
CREATE TABLE IF NOT EXISTS reliability_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Event details
    event_type text NOT NULL,               -- 'completion', 'cancellation', 'late_cancel', 'no_show'
    event_timestamp timestamptz NOT NULL DEFAULT now(),
    
    -- Context
    related_ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
    related_booking_id uuid REFERENCES ride_bookings(id) ON DELETE SET NULL,
    
    -- Impact
    impact_score double precision NOT NULL, -- Positive for good, negative for bad
    decay_days int NOT NULL DEFAULT 30,     -- How quickly this fades
    
    -- Audit
    details jsonb DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'completion', 'cancellation', 'late_cancel', 'no_show',
        'ride_posted', 'ride_completed_as_driver'
    ))
);

CREATE INDEX IF NOT EXISTS idx_reliability_user ON reliability_events (user_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reliability_type ON reliability_events (event_type, event_timestamp DESC);

-- Cached reliability scores (recomputed periodically)
CREATE TABLE IF NOT EXISTS reliability_score_cache (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Computed scores
    overall_score double precision NOT NULL DEFAULT 0.70,
    completion_rate double precision,
    cancellation_rate double precision,
    late_cancel_rate double precision,
    no_show_count int DEFAULT 0,
    
    -- Metadata
    rides_counted int DEFAULT 0,
    last_computed_at timestamptz DEFAULT now(),
    explanation text,
    
    -- Breakdown for transparency
    score_breakdown jsonb DEFAULT '{}'::jsonb
);

-- ============================================================
-- F++4: Fair Matching Support
-- ============================================================

-- Track exposure for fairness balancing
CREATE TABLE IF NOT EXISTS driver_exposure_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Exposure metrics
    search_appearances int DEFAULT 0,       -- Times shown in search results
    top_10_appearances int DEFAULT 0,       -- Times in top 10
    bookings_received int DEFAULT 0,        -- Bookings from searches
    
    -- Time window
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    
    -- Computed fairness
    exposure_ratio double precision,        -- appearances / expected
    
    CONSTRAINT unique_driver_period UNIQUE (driver_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_exposure_driver ON driver_exposure_tracking (driver_id, period_start DESC);

-- ============================================================
-- F++: Feature Configuration
-- ============================================================

-- Intelligence feature flags and weights
INSERT INTO feature_flags (flag_name, is_enabled, metadata)
VALUES 
    ('smart_route_matching', true, '{
        "weight_origin": 0.25,
        "weight_destination": 0.35,
        "weight_direction": 0.20,
        "weight_overlap": 0.20,
        "max_origin_radius_m": 5000,
        "max_dest_radius_m": 3000
    }'::jsonb),
    ('commute_clustering', true, '{
        "min_cluster_size": 3,
        "cluster_radius_default_m": 2000,
        "time_bucket_minutes": 30
    }'::jsonb),
    ('reliability_scoring_v2', true, '{
        "weight_completion": 0.40,
        "weight_cancellation": 0.25,
        "weight_late_cancel": 0.20,
        "weight_no_show": 0.15,
        "decay_days_default": 30,
        "new_user_threshold": 5,
        "new_user_score": 0.70
    }'::jsonb),
    ('fair_matching', true, '{
        "score_smoothing_factor": 0.6,
        "min_exposure_ratio": 0.2,
        "randomize_threshold": 0.05
    }'::jsonb)
ON CONFLICT (flag_name) DO UPDATE
SET metadata = EXCLUDED.metadata,
    updated_at = now();

-- ============================================================
-- F++: Core Functions
-- ============================================================

-- Calculate Haversine distance between two points
CREATE OR REPLACE FUNCTION haversine_distance(
    lat1 double precision,
    lng1 double precision,
    lat2 double precision,
    lng2 double precision
) RETURNS double precision AS $$
DECLARE
    R constant double precision := 6371000; -- Earth radius in meters
    phi1 double precision;
    phi2 double precision;
    delta_phi double precision;
    delta_lambda double precision;
    a double precision;
    c double precision;
BEGIN
    -- Convert to radians
    phi1 := radians(lat1);
    phi2 := radians(lat2);
    delta_phi := radians(lat2 - lat1);
    delta_lambda := radians(lng2 - lng1);
    
    -- Haversine formula
    a := sin(delta_phi/2) * sin(delta_phi/2) +
         cos(phi1) * cos(phi2) *
         sin(delta_lambda/2) * sin(delta_lambda/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- Calculate bearing between two points
CREATE OR REPLACE FUNCTION calculate_bearing(
    lat1 double precision,
    lng1 double precision,
    lat2 double precision,
    lng2 double precision
) RETURNS double precision AS $$
DECLARE
    phi1 double precision;
    phi2 double precision;
    delta_lambda double precision;
    x double precision;
    y double precision;
    bearing double precision;
BEGIN
    phi1 := radians(lat1);
    phi2 := radians(lat2);
    delta_lambda := radians(lng2 - lng1);
    
    y := sin(delta_lambda) * cos(phi2);
    x := cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(delta_lambda);
    
    bearing := degrees(atan2(y, x));
    
    -- Normalize to 0-360
    RETURN (bearing + 360)::int % 360;
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- Calculate route similarity score
CREATE OR REPLACE FUNCTION calculate_route_similarity(
    -- Passenger search
    p_origin_lat double precision,
    p_origin_lng double precision,
    p_dest_lat double precision,
    p_dest_lng double precision,
    -- Ride
    r_origin_lat double precision,
    r_origin_lng double precision,
    r_dest_lat double precision,
    r_dest_lng double precision
) RETURNS jsonb AS $$
DECLARE
    v_origin_distance double precision;
    v_dest_distance double precision;
    v_passenger_bearing double precision;
    v_ride_bearing double precision;
    v_bearing_delta double precision;
    v_origin_score double precision;
    v_dest_score double precision;
    v_direction_score double precision;
    v_combined_score double precision;
    v_config jsonb;
    v_max_origin_radius double precision;
    v_max_dest_radius double precision;
    v_explanation text[];
BEGIN
    -- Get config
    SELECT COALESCE(metadata, '{}'::jsonb) INTO v_config
    FROM feature_flags
    WHERE flag_name = 'smart_route_matching';
    
    v_max_origin_radius := COALESCE((v_config->>'max_origin_radius_m')::double precision, 5000);
    v_max_dest_radius := COALESCE((v_config->>'max_dest_radius_m')::double precision, 3000);
    
    -- Calculate distances
    v_origin_distance := haversine_distance(p_origin_lat, p_origin_lng, r_origin_lat, r_origin_lng);
    v_dest_distance := haversine_distance(p_dest_lat, p_dest_lng, r_dest_lat, r_dest_lng);
    
    -- Calculate bearings
    v_passenger_bearing := calculate_bearing(p_origin_lat, p_origin_lng, p_dest_lat, p_dest_lng);
    v_ride_bearing := calculate_bearing(r_origin_lat, r_origin_lng, r_dest_lat, r_dest_lng);
    
    -- Bearing delta (handle wrap-around)
    v_bearing_delta := abs(v_passenger_bearing - v_ride_bearing);
    IF v_bearing_delta > 180 THEN
        v_bearing_delta := 360 - v_bearing_delta;
    END IF;
    
    -- Calculate component scores
    v_origin_score := GREATEST(0, 1 - (v_origin_distance / v_max_origin_radius));
    v_dest_score := GREATEST(0, 1 - (v_dest_distance / v_max_dest_radius));
    v_direction_score := GREATEST(0, 1 - (v_bearing_delta / 90));
    
    -- Combined score (weighted)
    v_combined_score := (
        v_origin_score * COALESCE((v_config->>'weight_origin')::double precision, 0.25) +
        v_dest_score * COALESCE((v_config->>'weight_destination')::double precision, 0.35) +
        v_direction_score * COALESCE((v_config->>'weight_direction')::double precision, 0.20)
    ) / 0.80; -- Normalize (overlap weight excluded when no polyline)
    
    -- Build explanation
    IF v_origin_distance < 1000 THEN
        v_explanation := array_append(v_explanation, 
            format('Pickup %sm from your origin', round(v_origin_distance)::int));
    END IF;
    IF v_dest_distance < 500 THEN
        v_explanation := array_append(v_explanation, 
            format('Drop-off %sm from your destination', round(v_dest_distance)::int));
    END IF;
    IF v_direction_score > 0.8 THEN
        v_explanation := array_append(v_explanation, 'Same direction of travel');
    END IF;
    
    RETURN jsonb_build_object(
        'score', round(v_combined_score::numeric, 3),
        'origin_distance_m', round(v_origin_distance::numeric, 1),
        'destination_distance_m', round(v_dest_distance::numeric, 1),
        'bearing_delta_deg', round(v_bearing_delta::numeric, 1),
        'origin_score', round(v_origin_score::numeric, 3),
        'destination_score', round(v_dest_score::numeric, 3),
        'direction_score', round(v_direction_score::numeric, 3),
        'explanation', COALESCE(array_to_string(v_explanation, ' • '), 'Partial route match')
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate reliability score for a user
CREATE OR REPLACE FUNCTION calculate_user_reliability(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_total_bookings int;
    v_completed int;
    v_cancelled int;
    v_late_cancelled int;
    v_no_shows int;
    v_completion_rate double precision;
    v_cancellation_rate double precision;
    v_late_cancel_rate double precision;
    v_score double precision;
    v_config jsonb;
    v_explanation text;
BEGIN
    -- Get config
    SELECT COALESCE(metadata, '{}'::jsonb) INTO v_config
    FROM feature_flags
    WHERE flag_name = 'reliability_scoring_v2';
    
    -- Count bookings in last 90 days
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE rb.status = 'completed'),
        COUNT(*) FILTER (WHERE rb.status = 'cancelled'),
        COUNT(*) FILTER (WHERE rb.status = 'cancelled' AND 
            rb.cancelled_at > r.departure_time - interval '2 hours'),
        COUNT(*) FILTER (WHERE rb.status = 'cancelled' AND 
            rb.cancellation_reason ILIKE '%no-show%')
    INTO v_total_bookings, v_completed, v_cancelled, v_late_cancelled, v_no_shows
    FROM ride_bookings rb
    JOIN rides r ON r.id = rb.ride_id
    WHERE rb.passenger_id = p_user_id
      AND r.departure_time > now() - interval '90 days';
    
    -- Handle new users
    IF v_total_bookings < COALESCE((v_config->>'new_user_threshold')::int, 5) THEN
        RETURN jsonb_build_object(
            'score', COALESCE((v_config->>'new_user_score')::double precision, 0.70),
            'is_new_user', true,
            'rides_counted', v_total_bookings,
            'explanation', 'New user - building history'
        );
    END IF;
    
    -- Calculate rates
    v_completion_rate := v_completed::double precision / v_total_bookings;
    v_cancellation_rate := v_cancelled::double precision / v_total_bookings;
    v_late_cancel_rate := CASE 
        WHEN v_cancelled > 0 THEN v_late_cancelled::double precision / v_cancelled 
        ELSE 0 
    END;
    
    -- Weighted combination
    v_score := (
        v_completion_rate * COALESCE((v_config->>'weight_completion')::double precision, 0.40) +
        (1 - v_cancellation_rate) * COALESCE((v_config->>'weight_cancellation')::double precision, 0.25) +
        (1 - v_late_cancel_rate) * COALESCE((v_config->>'weight_late_cancel')::double precision, 0.20) +
        GREATEST(0, 1 - (v_no_shows * 0.10)) * COALESCE((v_config->>'weight_no_show')::double precision, 0.15)
    );
    
    -- Clamp
    v_score := GREATEST(0, LEAST(1, v_score));
    
    -- Build explanation
    IF v_score >= 0.90 THEN
        v_explanation := format('Excellent reliability - %s%% completion', round(v_completion_rate * 100)::int);
    ELSIF v_score >= 0.75 THEN
        v_explanation := format('Good reliability - %s%% completion', round(v_completion_rate * 100)::int);
    ELSIF v_score >= 0.60 THEN
        v_explanation := format('Fair reliability - %s%% completion, %s%% cancelled', 
            round(v_completion_rate * 100)::int, round(v_cancellation_rate * 100)::int);
    ELSE
        v_explanation := 'Improving reliability - recent issues noted';
    END IF;
    
    RETURN jsonb_build_object(
        'score', round(v_score::numeric, 3),
        'is_new_user', false,
        'rides_counted', v_total_bookings,
        'completion_rate', round(v_completion_rate::numeric, 3),
        'cancellation_rate', round(v_cancellation_rate::numeric, 3),
        'late_cancel_rate', round(v_late_cancel_rate::numeric, 3),
        'no_show_count', v_no_shows,
        'explanation', v_explanation
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get suggested rides with scoring
CREATE OR REPLACE FUNCTION get_suggested_rides(
    p_user_id uuid,
    p_origin_lat double precision,
    p_origin_lng double precision,
    p_dest_lat double precision,
    p_dest_lng double precision,
    p_departure_after timestamptz DEFAULT now(),
    p_limit int DEFAULT 20
) RETURNS TABLE (
    ride_id uuid,
    route_similarity jsonb,
    driver_reliability jsonb,
    combined_score double precision,
    suggestion_reason text
) AS $$
DECLARE
    v_route_enabled boolean;
    v_reliability_enabled boolean;
    v_fair_config jsonb;
BEGIN
    -- Check feature flags
    SELECT is_enabled INTO v_route_enabled
    FROM feature_flags WHERE flag_name = 'smart_route_matching';
    
    SELECT is_enabled INTO v_reliability_enabled
    FROM feature_flags WHERE flag_name = 'reliability_scoring_v2';
    
    SELECT metadata INTO v_fair_config
    FROM feature_flags WHERE flag_name = 'fair_matching';
    
    RETURN QUERY
    WITH ride_scores AS (
        SELECT 
            r.id as rid,
            r.driver_id,
            -- Route similarity
            CASE WHEN v_route_enabled AND rd.origin_lat IS NOT NULL THEN
                calculate_route_similarity(
                    p_origin_lat, p_origin_lng, p_dest_lat, p_dest_lng,
                    rd.origin_lat, rd.origin_lng, rd.destination_lat, rd.destination_lng
                )
            ELSE
                jsonb_build_object('score', 0.5, 'explanation', 'Route data unavailable')
            END as route_sim,
            -- Driver reliability
            CASE WHEN v_reliability_enabled THEN
                calculate_user_reliability(r.driver_id)
            ELSE
                jsonb_build_object('score', 0.7, 'explanation', 'Reliability scoring disabled')
            END as reliability
        FROM rides r
        LEFT JOIN ride_route_data rd ON rd.ride_id = r.id
        WHERE r.status = 'active'
          AND r.departure_time > p_departure_after
          AND r.available_seats > 0
          AND r.driver_id != p_user_id
    ),
    scored_rides AS (
        SELECT 
            rid,
            route_sim,
            reliability,
            -- Combined score with fairness smoothing
            (
                (route_sim->>'score')::double precision * 0.50 +
                (reliability->>'score')::double precision * 0.25 +
                random() * COALESCE((v_fair_config->>'randomize_threshold')::double precision, 0.05) -- Tie-breaking
            ) as raw_score,
            -- Build suggestion reason
            CONCAT_WS(' • ',
                CASE WHEN (route_sim->>'score')::double precision > 0.7 
                     THEN format('%s%% route match', round(((route_sim->>'score')::double precision * 100)::numeric))
                     ELSE NULL END,
                CASE WHEN (reliability->>'score')::double precision > 0.85 
                     THEN 'Reliable driver'
                     ELSE NULL END,
                CASE WHEN (reliability->>'is_new_user')::boolean 
                     THEN 'New to community'
                     ELSE NULL END
            ) as reason
        FROM ride_scores
        WHERE (route_sim->>'score')::double precision > 0.3 -- Minimum route relevance
    )
    SELECT 
        rid,
        route_sim,
        reliability,
        -- Apply score smoothing for fairness
        0.5 + (raw_score - 0.5) * COALESCE((v_fair_config->>'score_smoothing_factor')::double precision, 0.6),
        COALESCE(NULLIF(reason, ''), 'Available ride')
    FROM scored_rides
    ORDER BY raw_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Refresh reliability score cache (run periodically)
CREATE OR REPLACE FUNCTION refresh_reliability_cache()
RETURNS int AS $$
DECLARE
    v_updated int := 0;
BEGIN
    INSERT INTO reliability_score_cache (
        user_id, overall_score, completion_rate, cancellation_rate,
        late_cancel_rate, no_show_count, rides_counted, explanation, score_breakdown
    )
    SELECT 
        p.id,
        (r.reliability->>'score')::double precision,
        (r.reliability->>'completion_rate')::double precision,
        (r.reliability->>'cancellation_rate')::double precision,
        (r.reliability->>'late_cancel_rate')::double precision,
        COALESCE((r.reliability->>'no_show_count')::int, 0),
        COALESCE((r.reliability->>'rides_counted')::int, 0),
        r.reliability->>'explanation',
        r.reliability
    FROM profiles p
    CROSS JOIN LATERAL calculate_user_reliability(p.id) as r(reliability)
    WHERE p.is_demo IS NOT TRUE
    ON CONFLICT (user_id) DO UPDATE
    SET 
        overall_score = EXCLUDED.overall_score,
        completion_rate = EXCLUDED.completion_rate,
        cancellation_rate = EXCLUDED.cancellation_rate,
        late_cancel_rate = EXCLUDED.late_cancel_rate,
        no_show_count = EXCLUDED.no_show_count,
        rides_counted = EXCLUDED.rides_counted,
        explanation = EXCLUDED.explanation,
        score_breakdown = EXCLUDED.score_breakdown,
        last_computed_at = now();
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    -- Log job execution
    INSERT INTO system_job_log (job_name, status, details)
    VALUES ('refresh_reliability_cache', 'success', 
        jsonb_build_object('users_updated', v_updated));
    
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Update commute clusters (run daily)
CREATE OR REPLACE FUNCTION update_commute_clusters()
RETURNS int AS $$
DECLARE
    v_clusters_updated int := 0;
BEGIN
    -- Update ride counts for existing clusters
    UPDATE commute_clusters c
    SET 
        ride_count = (
            SELECT COUNT(*)
            FROM ride_cluster_assignments rca
            JOIN rides r ON r.id = rca.ride_id
            WHERE rca.cluster_id = c.id
              AND r.status = 'active'
              AND r.departure_time > now()
        ),
        last_computed_at = now(),
        -- Decay confidence if cluster is getting sparse
        confidence_score = LEAST(1.0, ride_count::double precision / 10)
    WHERE c.is_active;
    
    GET DIAGNOSTICS v_clusters_updated = ROW_COUNT;
    
    -- Log job execution
    INSERT INTO system_job_log (job_name, status, details)
    VALUES ('update_commute_clusters', 'success', 
        jsonb_build_object('clusters_updated', v_clusters_updated));
    
    RETURN v_clusters_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS Policies for Intelligence Tables
-- ============================================================

ALTER TABLE ride_route_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE commute_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_cluster_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reliability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reliability_score_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_exposure_tracking ENABLE ROW LEVEL SECURITY;

-- Route data: readable by all authenticated, writable by system
CREATE POLICY "Authenticated users can view route data"
ON ride_route_data FOR SELECT
TO authenticated
USING (true);

-- Clusters: readable by all authenticated
CREATE POLICY "Authenticated users can view clusters"
ON commute_clusters FOR SELECT
TO authenticated
USING (true);

-- Cluster assignments: readable by all authenticated
CREATE POLICY "Authenticated users can view cluster assignments"
ON ride_cluster_assignments FOR SELECT
TO authenticated
USING (true);

-- Reliability events: users see only their own
CREATE POLICY "Users can view own reliability events"
ON reliability_events FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Reliability cache: users see only their own, admins see all
CREATE POLICY "Users can view own reliability score"
ON reliability_score_cache FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role IS NOT NULL
    )
);

-- Exposure tracking: admins only
CREATE POLICY "Admins can view exposure tracking"
ON driver_exposure_tracking FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role IN ('super_admin', 'moderator')
    )
);

-- ============================================================
-- Schedule Background Jobs (if pg_cron available)
-- ============================================================

-- These should be run via pg_cron or external scheduler:
-- SELECT cron.schedule('refresh-reliability', '0 * * * *', 'SELECT refresh_reliability_cache()');
-- SELECT cron.schedule('update-clusters', '0 3 * * *', 'SELECT update_commute_clusters()');

COMMENT ON FUNCTION refresh_reliability_cache IS 'Run hourly to update cached reliability scores';
COMMENT ON FUNCTION update_commute_clusters IS 'Run daily to refresh cluster ride counts';
COMMENT ON FUNCTION get_suggested_rides IS 'Get ranked ride suggestions with explainable scoring';
