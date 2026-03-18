-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 008: Matching, Tracking, Preferences, and Search
-- ============================================================================
-- Ride/trip request matching, real-time GPS tracking, preference profiles,
-- recommendations, commute clusters, route popularity, search queries,
-- and saved searches.
--
-- Depends on:
--   001_extensions_and_utils.sql  (match_status ENUM, PostGIS extension,
--                                  update_updated_at_column(), is_admin())
--   002_core_profiles_and_auth.sql (profiles table)
--   004_rides_bookings_requests.sql (rides, ride_bookings, ride_requests,
--                                    trip_requests tables)
-- ============================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. ride_requests_matches
-- --------------------------------------------------------------------------
CREATE TABLE ride_requests_matches (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id                  uuid NOT NULL,  -- FK to ride_requests (created in 004)
    ride_id                     uuid NOT NULL,   -- FK to rides (created in 004)
    match_score                 integer NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    proximity_score             integer,
    time_compatibility_score    integer,
    route_efficiency_score      integer,
    status                      match_status NOT NULL DEFAULT 'pending',
    notified_at                 timestamptz,
    expires_at                  timestamptz,
    created_at                  timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1b. trip_requests_matches
-- --------------------------------------------------------------------------
CREATE TABLE trip_requests_matches (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_request_id             uuid NOT NULL,  -- FK to trip_requests (created in 004)
    ride_id                     uuid NOT NULL,   -- FK to rides (created in 004)
    match_score                 integer NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    proximity_score             integer,
    time_compatibility_score    integer,
    route_efficiency_score      integer,
    status                      match_status NOT NULL DEFAULT 'pending',
    notified_at                 timestamptz,
    expires_at                  timestamptz,
    created_at                  timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1c. ride_tracking
-- --------------------------------------------------------------------------
CREATE TABLE ride_tracking (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id                 uuid NOT NULL UNIQUE,  -- FK to rides (created in 004)
    driver_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_location        geography(Point, 4326),
    current_speed_kmh       numeric,
    heading_degrees         integer,
    is_on_route             boolean DEFAULT true,
    route_deviation_km      numeric DEFAULT 0,
    passengers_onboard      jsonb DEFAULT '[]'::jsonb,
    estimated_arrival_time  timestamptz,
    ride_started_at         timestamptz,
    ride_ended_at           timestamptz,
    last_updated            timestamptz DEFAULT now(),
    created_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1d. ride_tracking_sessions
-- --------------------------------------------------------------------------
CREATE TABLE ride_tracking_sessions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id     uuid NOT NULL REFERENCES ride_tracking(id) ON DELETE CASCADE,
    location        geography(Point, 4326),
    speed           numeric,
    heading         integer,
    recorded_at     timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1e. preference_profiles
-- --------------------------------------------------------------------------
CREATE TABLE preference_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active       boolean DEFAULT true,
    profile_name    text,
    preferences     jsonb,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1f. user_recommendations
-- --------------------------------------------------------------------------
CREATE TABLE user_recommendations (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommended_user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommendation_type     text,
    score                   numeric,
    reason                  text,
    created_at              timestamptz DEFAULT now(),
    expires_at              timestamptz
);

-- --------------------------------------------------------------------------
-- 1g. recommendation_feedback
-- --------------------------------------------------------------------------
CREATE TABLE recommendation_feedback (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id   uuid NOT NULL REFERENCES user_recommendations(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feedback            text,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1h. commute_clusters
-- --------------------------------------------------------------------------
CREATE TABLE commute_clusters (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    origin_area             text,
    destination_area        text,
    typical_departure_time  time,
    days_of_week            integer[],
    ride_count              integer DEFAULT 0,
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1i. route_popularity
-- --------------------------------------------------------------------------
CREATE TABLE route_popularity (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_area         text,
    destination_area    text,
    ride_count          integer DEFAULT 0,
    avg_price           numeric,
    avg_duration        integer,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1j. search_queries
-- --------------------------------------------------------------------------
CREATE TABLE search_queries (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
    query_text      text,
    filters         jsonb,
    results_count   integer,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1k. saved_searches
-- --------------------------------------------------------------------------
CREATE TABLE saved_searches (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name                text NOT NULL,
    search_params       jsonb,
    alerts_enabled      boolean DEFAULT false,
    alert_frequency     text DEFAULT 'instant',
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1l. ride_route_data
-- --------------------------------------------------------------------------
CREATE TABLE ride_route_data (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id             uuid NOT NULL,  -- FK to rides (created in 004)
    waypoints           jsonb,
    total_distance_km   numeric,
    total_duration_min  integer,
    created_at          timestamptz DEFAULT now()
);

-- ==========================================================================
-- 2. INDEXES
-- ==========================================================================

-- ride_requests_matches
CREATE INDEX idx_ride_requests_matches_request    ON ride_requests_matches (request_id);
CREATE INDEX idx_ride_requests_matches_ride       ON ride_requests_matches (ride_id);
CREATE INDEX idx_ride_requests_matches_status     ON ride_requests_matches (status);
CREATE INDEX idx_ride_requests_matches_score      ON ride_requests_matches (match_score DESC);

-- trip_requests_matches
CREATE INDEX idx_trip_requests_matches_trip       ON trip_requests_matches (trip_request_id);
CREATE INDEX idx_trip_requests_matches_ride       ON trip_requests_matches (ride_id);
CREATE INDEX idx_trip_requests_matches_status     ON trip_requests_matches (status);
CREATE INDEX idx_trip_requests_matches_score      ON trip_requests_matches (match_score DESC);

-- ride_tracking
CREATE INDEX idx_ride_tracking_ride               ON ride_tracking (ride_id);
CREATE INDEX idx_ride_tracking_driver             ON ride_tracking (driver_id);
CREATE INDEX idx_ride_tracking_location           ON ride_tracking USING gist (current_location);

-- ride_tracking_sessions
CREATE INDEX idx_ride_tracking_sessions_tracking  ON ride_tracking_sessions (tracking_id);
CREATE INDEX idx_ride_tracking_sessions_recorded  ON ride_tracking_sessions (recorded_at DESC);

-- preference_profiles
CREATE INDEX idx_preference_profiles_user         ON preference_profiles (user_id);
CREATE INDEX idx_preference_profiles_active       ON preference_profiles (is_active) WHERE is_active = true;

-- user_recommendations
CREATE INDEX idx_user_recommendations_user        ON user_recommendations (user_id);
CREATE INDEX idx_user_recommendations_recommended ON user_recommendations (recommended_user_id);
CREATE INDEX idx_user_recommendations_score       ON user_recommendations (score DESC);
CREATE INDEX idx_user_recommendations_expires     ON user_recommendations (expires_at);

-- recommendation_feedback
CREATE INDEX idx_recommendation_feedback_rec      ON recommendation_feedback (recommendation_id);
CREATE INDEX idx_recommendation_feedback_user     ON recommendation_feedback (user_id);

-- commute_clusters
CREATE INDEX idx_commute_clusters_user            ON commute_clusters (user_id);
CREATE INDEX idx_commute_clusters_origin          ON commute_clusters (origin_area);
CREATE INDEX idx_commute_clusters_destination     ON commute_clusters (destination_area);

-- route_popularity
CREATE INDEX idx_route_popularity_origin          ON route_popularity (origin_area);
CREATE INDEX idx_route_popularity_destination     ON route_popularity (destination_area);
CREATE INDEX idx_route_popularity_count           ON route_popularity (ride_count DESC);

-- search_queries
CREATE INDEX idx_search_queries_user              ON search_queries (user_id);
CREATE INDEX idx_search_queries_created           ON search_queries (created_at DESC);

-- saved_searches
CREATE INDEX idx_saved_searches_user              ON saved_searches (user_id);
CREATE INDEX idx_saved_searches_alerts            ON saved_searches (alerts_enabled) WHERE alerts_enabled = true;

-- ride_route_data
CREATE INDEX idx_ride_route_data_ride             ON ride_route_data (ride_id);

-- ==========================================================================
-- 3. TRIGGERS
-- ==========================================================================

CREATE TRIGGER trg_preference_profiles_updated_at
    BEFORE UPDATE ON preference_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_commute_clusters_updated_at
    BEFORE UPDATE ON commute_clusters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_route_popularity_updated_at
    BEFORE UPDATE ON route_popularity
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_saved_searches_updated_at
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- 4. FUNCTIONS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- get_ride_tracking_info — returns current tracking state for a ride
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_ride_tracking_info(p_ride_id uuid)
RETURNS TABLE (
    tracking_id             uuid,
    ride_id                 uuid,
    driver_id               uuid,
    latitude                double precision,
    longitude               double precision,
    current_speed_kmh       numeric,
    heading_degrees         integer,
    is_on_route             boolean,
    route_deviation_km      numeric,
    passengers_onboard      jsonb,
    estimated_arrival_time  timestamptz,
    ride_started_at         timestamptz,
    ride_ended_at           timestamptz,
    last_updated            timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rt.id                       AS tracking_id,
        rt.ride_id,
        rt.driver_id,
        ST_Y(rt.current_location::geometry) AS latitude,
        ST_X(rt.current_location::geometry) AS longitude,
        rt.current_speed_kmh,
        rt.heading_degrees,
        rt.is_on_route,
        rt.route_deviation_km,
        rt.passengers_onboard,
        rt.estimated_arrival_time,
        rt.ride_started_at,
        rt.ride_ended_at,
        rt.last_updated
    FROM ride_tracking rt
    WHERE rt.ride_id = p_ride_id;
END;
$$;

-- --------------------------------------------------------------------------
-- trigger_ride_emergency — creates an emergency record for a ride
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_ride_emergency(p_ride_id uuid, p_emergency_type text)
RETURNS TABLE (
    success         boolean,
    message         text,
    ride_id         uuid,
    driver_id       uuid,
    emergency_type  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_driver_id uuid;
    v_tracking ride_tracking%ROWTYPE;
BEGIN
    -- Get the tracking record
    SELECT * INTO v_tracking
    FROM ride_tracking rt
    WHERE rt.ride_id = p_ride_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'No active tracking found for this ride'::text,
            p_ride_id, NULL::uuid, p_emergency_type;
        RETURN;
    END IF;

    v_driver_id := v_tracking.driver_id;

    -- Log the emergency as a safety report
    INSERT INTO safety_reports (
        reporter_id, ride_id, incident_type, description,
        severity, status, incident_date
    )
    VALUES (
        (SELECT auth.uid()), p_ride_id, p_emergency_type,
        'Emergency triggered during ride tracking',
        'critical', 'pending', now()
    );

    RETURN QUERY SELECT true, 'Emergency triggered successfully'::text,
        p_ride_id, v_driver_id, p_emergency_type;
END;
$$;

-- ==========================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE ride_requests_matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_requests_matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_tracking               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_tracking_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE preference_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback     ENABLE ROW LEVEL SECURITY;
ALTER TABLE commute_clusters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_popularity            ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_route_data             ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 6. RLS POLICIES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- ride_requests_matches — visible to involved parties
-- --------------------------------------------------------------------------
CREATE POLICY ride_requests_matches_select_involved
    ON ride_requests_matches FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ride_requests rr
            WHERE rr.id = ride_requests_matches.request_id
              AND rr.requester_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = ride_requests_matches.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY ride_requests_matches_update_involved
    ON ride_requests_matches FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ride_requests rr
            WHERE rr.id = ride_requests_matches.request_id
              AND rr.requester_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = ride_requests_matches.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
    );

CREATE POLICY ride_requests_matches_service_role
    ON ride_requests_matches FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- trip_requests_matches — visible to involved parties
-- --------------------------------------------------------------------------
CREATE POLICY trip_requests_matches_select_involved
    ON trip_requests_matches FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trip_requests tr
            WHERE tr.id = trip_requests_matches.trip_request_id
              AND tr.rider_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = trip_requests_matches.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY trip_requests_matches_update_involved
    ON trip_requests_matches FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trip_requests tr
            WHERE tr.id = trip_requests_matches.trip_request_id
              AND tr.rider_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = trip_requests_matches.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
    );

CREATE POLICY trip_requests_matches_service_role
    ON trip_requests_matches FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- ride_tracking — visible to ride participants (driver + booked passengers)
-- --------------------------------------------------------------------------
CREATE POLICY ride_tracking_select_participant
    ON ride_tracking FOR SELECT TO authenticated
    USING (
        driver_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM ride_bookings rb
            WHERE rb.ride_id = ride_tracking.ride_id
              AND rb.passenger_id = (SELECT auth.uid())
              AND rb.status = 'confirmed'
        )
        OR is_admin()
    );

CREATE POLICY ride_tracking_insert_driver
    ON ride_tracking FOR INSERT TO authenticated
    WITH CHECK (driver_id = (SELECT auth.uid()));

CREATE POLICY ride_tracking_update_driver
    ON ride_tracking FOR UPDATE TO authenticated
    USING (driver_id = (SELECT auth.uid()));

CREATE POLICY ride_tracking_service_role
    ON ride_tracking FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- ride_tracking_sessions — same as ride_tracking
-- --------------------------------------------------------------------------
CREATE POLICY ride_tracking_sessions_select_participant
    ON ride_tracking_sessions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ride_tracking rt
            WHERE rt.id = ride_tracking_sessions.tracking_id
              AND (
                  rt.driver_id = (SELECT auth.uid())
                  OR EXISTS (
                      SELECT 1 FROM ride_bookings rb
                      WHERE rb.ride_id = rt.ride_id
                        AND rb.passenger_id = (SELECT auth.uid())
                        AND rb.status = 'confirmed'
                  )
              )
        )
        OR is_admin()
    );

CREATE POLICY ride_tracking_sessions_insert_driver
    ON ride_tracking_sessions FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ride_tracking rt
            WHERE rt.id = ride_tracking_sessions.tracking_id
              AND rt.driver_id = (SELECT auth.uid())
        )
    );

CREATE POLICY ride_tracking_sessions_service_role
    ON ride_tracking_sessions FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- preference_profiles — own only
-- --------------------------------------------------------------------------
CREATE POLICY preference_profiles_select_own
    ON preference_profiles FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY preference_profiles_insert_own
    ON preference_profiles FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY preference_profiles_update_own
    ON preference_profiles FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY preference_profiles_delete_own
    ON preference_profiles FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- user_recommendations — own only
-- --------------------------------------------------------------------------
CREATE POLICY user_recommendations_select_own
    ON user_recommendations FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_recommendations_service_role
    ON user_recommendations FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- recommendation_feedback — own only
-- --------------------------------------------------------------------------
CREATE POLICY recommendation_feedback_select_own
    ON recommendation_feedback FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY recommendation_feedback_insert_own
    ON recommendation_feedback FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- commute_clusters — own only
-- --------------------------------------------------------------------------
CREATE POLICY commute_clusters_select_own
    ON commute_clusters FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY commute_clusters_service_role
    ON commute_clusters FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- route_popularity — public read
-- --------------------------------------------------------------------------
CREATE POLICY route_popularity_select_authenticated
    ON route_popularity FOR SELECT TO authenticated
    USING (true);

CREATE POLICY route_popularity_service_role
    ON route_popularity FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- search_queries — own only
-- --------------------------------------------------------------------------
CREATE POLICY search_queries_select_own
    ON search_queries FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY search_queries_insert_own
    ON search_queries FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY search_queries_admin
    ON search_queries FOR SELECT TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- saved_searches — own only
-- --------------------------------------------------------------------------
CREATE POLICY saved_searches_select_own
    ON saved_searches FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY saved_searches_insert_own
    ON saved_searches FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY saved_searches_update_own
    ON saved_searches FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY saved_searches_delete_own
    ON saved_searches FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- ride_route_data — ride participants
-- --------------------------------------------------------------------------
CREATE POLICY ride_route_data_select_participant
    ON ride_route_data FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = ride_route_data.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM ride_bookings rb
            WHERE rb.ride_id = ride_route_data.ride_id
              AND rb.passenger_id = (SELECT auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY ride_route_data_service_role
    ON ride_route_data FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- End of 008_matching_and_tracking.sql
-- --------------------------------------------------------------------------
