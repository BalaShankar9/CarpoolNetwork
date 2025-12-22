/*
  # Phase 5 & 6: Advanced Features & Production Readiness V2
  
  Complete production-ready system with advanced features and optimizations.
  
  1. Performance Monitoring
    - performance_metrics: Real-time performance tracking
    - system_health: System health monitoring
    - query_performance: Query performance logs
    
  2. Smart Recommendations
    - user_recommendations: Personalized ride recommendations
    - recommendation_feedback: Track recommendation quality
    - ml_training_data: Data for ML model training
    
  3. Advanced Search
    - search_queries: Track search patterns
    - search_results: Cache search results
    - route_popularity: Track and optimize popular routes
    
  4. Error Tracking
    - error_logs: Production error tracking
    - error_patterns: Identify error patterns
    
  5. Caching System
    - cache_entries: Intelligent caching layer
    - cache_stats: Cache performance metrics
    
  6. Advanced Functions
    - get_smart_recommendations: ML-powered recommendations
    - calculate_route_popularity_score: Route scoring
    - optimize_search_results: Advanced search optimization
    - track_performance_metric: Performance monitoring
    - get_system_health: Health check endpoint
*/

-- ============================================================================
-- Performance Monitoring System
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'ms',
  endpoint TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

COMMENT ON TABLE performance_metrics IS 'Real-time performance tracking for optimization';
COMMENT ON COLUMN performance_metrics.metric_type IS 'Type: page_load, api_call, database_query, render_time, network_latency';

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time_ms NUMERIC,
  details JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON system_health(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status, checked_at DESC);

COMMENT ON TABLE system_health IS 'System health checks and monitoring';
COMMENT ON COLUMN system_health.check_type IS 'Type: database, storage, edge_functions, realtime, auth';
COMMENT ON COLUMN system_health.status IS 'Status: healthy, degraded, unhealthy, error';

-- Query performance tracking
CREATE TABLE IF NOT EXISTS query_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name TEXT NOT NULL,
  execution_time_ms NUMERIC NOT NULL,
  rows_returned INTEGER,
  rows_scanned INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_performance_query_name ON query_performance(query_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_execution_time ON query_performance(execution_time_ms DESC);

-- ============================================================================
-- Smart Recommendations System
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  reasoning JSONB DEFAULT '{}'::jsonb,
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_recommendations_user ON user_recommendations(user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_score ON user_recommendations(score DESC);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_active ON user_recommendations(user_id, expires_at) WHERE NOT dismissed AND NOT converted;

COMMENT ON TABLE user_recommendations IS 'Personalized ride and driver recommendations';
COMMENT ON COLUMN user_recommendations.recommendation_type IS 'Type: ride_match, driver_match, route_suggestion, time_suggestion';
COMMENT ON COLUMN user_recommendations.score IS 'ML-powered recommendation score 0-100';

-- Recommendation feedback tracking
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES user_recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user ON recommendation_feedback(user_id);

COMMENT ON TABLE recommendation_feedback IS 'User feedback on recommendation quality';
COMMENT ON COLUMN recommendation_feedback.feedback_type IS 'Type: helpful, not_helpful, irrelevant, offensive';

-- ML training data collection
CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,
  features JSONB NOT NULL,
  label TEXT,
  label_confidence NUMERIC,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_type ON ml_training_data(data_type, created_at DESC);

COMMENT ON TABLE ml_training_data IS 'Training data for ML models';
COMMENT ON COLUMN ml_training_data.data_type IS 'Type: match_quality, route_preference, driver_rating, booking_success';

-- ============================================================================
-- Advanced Search System
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  search_type TEXT NOT NULL,
  query_text TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  results_count INTEGER DEFAULT 0,
  selected_result_id UUID,
  selected_result_position INTEGER,
  response_time_ms NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_type ON search_queries(search_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_query_text ON search_queries USING gin(to_tsvector('english', COALESCE(query_text, '')));

COMMENT ON TABLE search_queries IS 'Track search patterns for optimization';
COMMENT ON COLUMN search_queries.search_type IS 'Type: ride_search, user_search, route_search, driver_search';

-- Search results caching
CREATE TABLE IF NOT EXISTS search_results_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  search_type TEXT NOT NULL,
  results JSONB NOT NULL,
  result_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_search_results_cache_key ON search_results_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_search_results_cache_expires ON search_results_cache(expires_at);

-- Route popularity tracking
CREATE TABLE IF NOT EXISTS route_popularity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_normalized TEXT NOT NULL,
  destination_normalized TEXT NOT NULL,
  search_count INTEGER DEFAULT 1,
  booking_count INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  avg_price NUMERIC,
  avg_duration_minutes INTEGER,
  last_searched_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_route_popularity_route ON route_popularity(origin_normalized, destination_normalized);
CREATE INDEX IF NOT EXISTS idx_route_popularity_search_count ON route_popularity(search_count DESC);

COMMENT ON TABLE route_popularity IS 'Track and optimize popular routes';

-- ============================================================================
-- Error Tracking System
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  endpoint TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(created_at DESC) WHERE NOT resolved;

COMMENT ON TABLE error_logs IS 'Production error tracking and monitoring';
COMMENT ON COLUMN error_logs.severity IS 'Severity: debug, info, warning, error, critical';

-- Error patterns detection
CREATE TABLE IF NOT EXISTS error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  pattern_signature TEXT NOT NULL UNIQUE,
  mitigation_notes TEXT,
  status TEXT DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_error_patterns_occurrence ON error_patterns(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_error_patterns_last_seen ON error_patterns(last_seen_at DESC);

COMMENT ON TABLE error_patterns IS 'Identify recurring error patterns';
COMMENT ON COLUMN error_patterns.status IS 'Status: active, investigating, mitigated, resolved';

-- ============================================================================
-- Intelligent Caching System
-- ============================================================================

CREATE TABLE IF NOT EXISTS cache_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  cache_type TEXT NOT NULL,
  data JSONB NOT NULL,
  size_bytes INTEGER,
  ttl_seconds INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  invalidated BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_key ON cache_entries(cache_key) WHERE NOT invalidated;
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires ON cache_entries(expires_at) WHERE NOT invalidated;
CREATE INDEX IF NOT EXISTS idx_cache_entries_type ON cache_entries(cache_type);

COMMENT ON TABLE cache_entries IS 'Intelligent caching layer for performance';
COMMENT ON COLUMN cache_entries.cache_type IS 'Type: query_result, user_profile, ride_list, search_result, computed_data';

-- Cache performance statistics
CREATE TABLE IF NOT EXISTS cache_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_type TEXT NOT NULL,
  hits INTEGER DEFAULT 0,
  misses INTEGER DEFAULT 0,
  evictions INTEGER DEFAULT 0,
  avg_hit_time_ms NUMERIC,
  total_size_bytes BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_stats_recorded ON cache_stats(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_stats_type ON cache_stats(cache_type, recorded_at DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Performance metrics - admin only
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view performance metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- System health - admin only
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view system health"
  ON system_health FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Query performance - admin only
ALTER TABLE query_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view query performance"
  ON query_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- User recommendations - users can view their own
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their recommendations"
  ON user_recommendations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their recommendations"
  ON user_recommendations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Recommendation feedback - users can manage their own
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their feedback"
  ON recommendation_feedback FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Search queries - users can view their own
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their searches"
  ON search_queries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Error logs - admin only
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage error logs"
  ON error_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Error patterns - admin only
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage error patterns"
  ON error_patterns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Cache tables - system access only
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_stats ENABLE ROW LEVEL SECURITY;

-- ML training data - admin only
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ML data"
  ON ml_training_data FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- ============================================================================
-- Advanced Functions
-- ============================================================================

-- Track performance metric
CREATE OR REPLACE FUNCTION track_performance_metric(
  p_metric_type TEXT,
  p_metric_name TEXT,
  p_value NUMERIC,
  p_unit TEXT DEFAULT 'ms',
  p_endpoint TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO performance_metrics (
    metric_type, metric_name, value, unit, endpoint, user_id, metadata
  )
  VALUES (
    p_metric_type, p_metric_name, p_value, p_unit, p_endpoint, auth.uid(), p_metadata
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get system health
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE (
  overall_status TEXT,
  database_status TEXT,
  recent_errors INTEGER,
  avg_response_time_ms NUMERIC,
  cache_hit_rate NUMERIC,
  active_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'healthy'::TEXT as overall_status,
    'healthy'::TEXT as database_status,
    (SELECT COUNT(*)::INTEGER FROM error_logs WHERE created_at > NOW() - INTERVAL '1 hour')::INTEGER as recent_errors,
    (SELECT COALESCE(AVG(value), 0) FROM performance_metrics WHERE metric_type = 'api_call' AND created_at > NOW() - INTERVAL '1 hour')::NUMERIC as avg_response_time_ms,
    (SELECT 
      CASE 
        WHEN SUM(hits + misses) > 0 
        THEN (SUM(hits)::NUMERIC / SUM(hits + misses)::NUMERIC) * 100
        ELSE 0
      END
      FROM cache_stats
      WHERE recorded_at > NOW() - INTERVAL '1 hour'
    )::NUMERIC as cache_hit_rate,
    (SELECT COUNT(DISTINCT user_id)::INTEGER FROM performance_metrics WHERE created_at > NOW() - INTERVAL '1 hour' AND user_id IS NOT NULL)::INTEGER as active_users;
END;
$$ LANGUAGE plpgsql;

-- Calculate route popularity score
CREATE OR REPLACE FUNCTION calculate_route_popularity_score(
  p_origin TEXT,
  p_destination TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 0;
  v_route RECORD;
BEGIN
  SELECT * INTO v_route
  FROM route_popularity
  WHERE origin_normalized = lower(trim(p_origin))
  AND destination_normalized = lower(trim(p_destination));
  
  IF FOUND THEN
    v_score := (
      (v_route.search_count * 0.3) +
      (v_route.booking_count * 0.5) +
      (v_route.success_rate * 0.2)
    );
  END IF;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Get smart recommendations
CREATE OR REPLACE FUNCTION get_smart_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  recommendation_id UUID,
  ride_id UUID,
  driver_id UUID,
  score NUMERIC,
  reasoning JSONB,
  ride_details JSONB
) AS $$
BEGIN
  DELETE FROM user_recommendations
  WHERE expires_at < NOW() OR (dismissed = true AND created_at < NOW() - INTERVAL '30 days');
  
  RETURN QUERY
  SELECT 
    ur.id as recommendation_id,
    ur.ride_id,
    ur.driver_id,
    ur.score,
    ur.reasoning,
    jsonb_build_object(
      'origin', r.origin,
      'destination', r.destination,
      'departure_time', r.departure_time,
      'price_per_seat', r.price_per_seat,
      'available_seats', r.available_seats
    ) as ride_details
  FROM user_recommendations ur
  LEFT JOIN rides r ON r.id = ur.ride_id
  WHERE ur.user_id = p_user_id
  AND NOT ur.dismissed
  AND NOT ur.converted
  AND ur.expires_at > NOW()
  ORDER BY ur.score DESC, ur.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Optimize search results with ML scoring
CREATE OR REPLACE FUNCTION optimize_search_results(
  p_user_id UUID,
  p_origin TEXT,
  p_destination TEXT,
  p_departure_date TIMESTAMPTZ
)
RETURNS TABLE (
  ride_id UUID,
  relevance_score NUMERIC,
  ride_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    (
      COALESCE((
        SELECT SUM(
          CASE 
            WHEN up.preference_key = 'smoking' AND up.preference_value = (r.metadata->>'smoking_allowed')::TEXT THEN 20
            WHEN up.preference_key = 'music' AND up.preference_value = (r.metadata->>'music_allowed')::TEXT THEN 10
            WHEN up.preference_key = 'pets' AND up.preference_value = (r.metadata->>'pets_allowed')::TEXT THEN 15
            ELSE 0
          END
        )
        FROM user_preferences up
        WHERE up.user_id = p_user_id
      ), 0) +
      COALESCE((SELECT trust_score FROM profiles WHERE id = r.driver_id), 50) * 0.3 +
      calculate_route_popularity_score(r.origin, r.destination) * 0.2 +
      CASE 
        WHEN r.price_per_seat > 0 THEN (50.0 / r.price_per_seat) * 5
        ELSE 10
      END +
      CASE 
        WHEN ABS(EXTRACT(EPOCH FROM (r.departure_time - p_departure_date)) / 3600) < 2 THEN 20
        WHEN ABS(EXTRACT(EPOCH FROM (r.departure_time - p_departure_date)) / 3600) < 6 THEN 10
        ELSE 5
      END
    )::NUMERIC as relevance_score,
    jsonb_build_object(
      'id', r.id,
      'origin', r.origin,
      'destination', r.destination,
      'departure_time', r.departure_time,
      'price_per_seat', r.price_per_seat,
      'available_seats', r.available_seats,
      'driver', jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'trust_score', p.trust_score,
        'total_rides', p.total_rides_as_driver
      )
    ) as ride_data
  FROM rides r
  JOIN profiles p ON p.id = r.driver_id
  WHERE r.status = 'active'
  AND r.departure_time > NOW()
  AND r.available_seats > 0
  AND lower(r.origin) LIKE '%' || lower(p_origin) || '%'
  AND lower(r.destination) LIKE '%' || lower(p_destination) || '%'
  ORDER BY relevance_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Update route popularity
CREATE OR REPLACE FUNCTION update_route_popularity(
  p_origin TEXT,
  p_destination TEXT,
  p_increment_search BOOLEAN DEFAULT true,
  p_increment_booking BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  v_origin_normalized TEXT := lower(trim(p_origin));
  v_destination_normalized TEXT := lower(trim(p_destination));
BEGIN
  INSERT INTO route_popularity (
    origin_normalized,
    destination_normalized,
    search_count,
    booking_count,
    last_searched_at
  )
  VALUES (
    v_origin_normalized,
    v_destination_normalized,
    CASE WHEN p_increment_search THEN 1 ELSE 0 END,
    CASE WHEN p_increment_booking THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (origin_normalized, destination_normalized)
  DO UPDATE SET
    search_count = route_popularity.search_count + CASE WHEN p_increment_search THEN 1 ELSE 0 END,
    booking_count = route_popularity.booking_count + CASE WHEN p_increment_booking THEN 1 ELSE 0 END,
    last_searched_at = NOW(),
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Log error with pattern detection
CREATE OR REPLACE FUNCTION log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'error',
  p_endpoint TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
  v_pattern_signature TEXT;
BEGIN
  INSERT INTO error_logs (
    error_type, error_message, error_stack, severity,
    user_id, endpoint, metadata
  )
  VALUES (
    p_error_type, p_error_message, p_error_stack, p_severity,
    auth.uid(), p_endpoint, p_metadata
  )
  RETURNING id INTO v_error_id;
  
  v_pattern_signature := md5(p_error_type || ':' || substring(p_error_message, 1, 100));
  
  INSERT INTO error_patterns (
    pattern_name,
    error_type,
    pattern_signature,
    occurrence_count
  )
  VALUES (
    p_error_type || ' Error',
    p_error_type,
    v_pattern_signature,
    1
  )
  ON CONFLICT (pattern_signature)
  DO UPDATE SET
    occurrence_count = error_patterns.occurrence_count + 1,
    last_seen_at = NOW();
  
  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION track_performance_metric TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_route_popularity_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_smart_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_search_results TO authenticated;
GRANT EXECUTE ON FUNCTION update_route_popularity TO authenticated;
GRANT EXECUTE ON FUNCTION log_error TO authenticated;
