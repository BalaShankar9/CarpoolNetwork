-- ============================================================================
-- PRODUCTION DEPLOYMENT VERIFICATION QUERIES
-- Run these in Supabase SQL Editor before, during, and after deployment
-- ============================================================================

-- ============================================================================
-- PRE-DEPLOY CHECKS (Run BEFORE any deployment)
-- ============================================================================

-- 1. CRITICAL: System Invariants Check
-- Expected: {"healthy": true, "total_violations": 0}
SELECT check_system_invariants() AS invariants_check;

-- 2. CRITICAL: No Demo Data in Production
-- Expected: {"clean": true, "counts": {all zeros}}
SELECT verify_no_demo_data() AS demo_data_check;

-- 3. System Health Summary
SELECT get_system_health_summary() AS health_summary;

-- 4. Feature Flags Status
SELECT flag_name, is_enabled, 
       COALESCE(metadata->>'description', 'No description') as description
FROM feature_flags 
ORDER BY flag_name;

-- 5. Admin Accounts Exist
SELECT COUNT(*) as admin_count,
       array_agg(admin_role) as roles
FROM profiles 
WHERE admin_role IS NOT NULL;

-- 6. Background Jobs Last Run
SELECT job_name, 
       MAX(started_at) as last_run,
       MAX(CASE WHEN status = 'completed' THEN started_at END) as last_success,
       MAX(CASE WHEN status = 'failed' THEN started_at END) as last_failure
FROM system_job_log
GROUP BY job_name
ORDER BY last_run DESC;

-- 7. Seat Integrity Check (should return 0 rows)
SELECT 'SEAT_MISMATCH' as issue_type,
       r.id as ride_id, 
       r.total_seats,
       r.available_seats as current_available,
       r.total_seats - COALESCE(SUM(rb.seats_requested), 0) as expected_available
FROM rides r
LEFT JOIN ride_bookings rb ON rb.ride_id = r.id 
  AND rb.status IN ('pending', 'confirmed')
WHERE r.status IN ('active', 'in-progress')
GROUP BY r.id, r.total_seats, r.available_seats
HAVING r.available_seats != r.total_seats - COALESCE(SUM(rb.seats_requested), 0);

-- 8. Orphaned Bookings Check (should return 0 rows)
SELECT 'ORPHANED_BOOKING' as issue_type,
       rb.id as booking_id,
       rb.status as booking_status,
       r.status as ride_status
FROM ride_bookings rb
JOIN rides r ON r.id = rb.ride_id
WHERE rb.status IN ('pending', 'confirmed')
  AND r.status IN ('completed', 'cancelled');

-- 9. Community Membership Integrity (Phase G)
SELECT COUNT(*) as rides_without_community
FROM rides
WHERE status = 'active'
  AND community_id IS NULL;

-- ============================================================================
-- POST-DEPLOY VERIFICATION (Run AFTER deployment)
-- ============================================================================

-- 10. Re-run Critical Checks
SELECT 'POST_DEPLOY_INVARIANTS' as check_name, check_system_invariants() as result
UNION ALL
SELECT 'POST_DEPLOY_DEMO_DATA' as check_name, verify_no_demo_data() as result;

-- 11. Verify New Features Work
-- Test smart matching function (should return rows)
SELECT COUNT(*) as matching_rides_found
FROM get_suggested_rides(
  (SELECT id FROM profiles LIMIT 1),  -- Any user
  37.7749, -122.4194,  -- San Francisco origin
  37.3861, -122.0839,  -- Mountain View destination
  now()
);

-- 12. Verify Reliability Scoring Works
SELECT user_id, overall_score, explanation
FROM reliability_score_cache
LIMIT 5;

-- 13. Community Health (Phase G)
SELECT 
  (SELECT COUNT(*) FROM communities WHERE status = 'active') as active_communities,
  (SELECT COUNT(*) FROM community_memberships WHERE status = 'active') as active_memberships,
  (SELECT COUNT(*) FROM community_partnerships WHERE status = 'active') as active_partnerships;

-- ============================================================================
-- MONITORING QUERIES (Run every 15-30 minutes for first 24 hours)
-- ============================================================================

-- 14. Real-time Health Dashboard
SELECT 
  jsonb_build_object(
    'timestamp', now(),
    'invariants_healthy', (SELECT (check_system_invariants()->>'healthy')::boolean),
    'active_rides', (SELECT COUNT(*) FROM rides WHERE status = 'active'),
    'active_bookings', (SELECT COUNT(*) FROM ride_bookings WHERE status IN ('pending', 'confirmed')),
    'recent_job_failures', (
      SELECT COUNT(*) FROM system_job_log 
      WHERE status = 'failed' AND started_at > now() - interval '1 hour'
    ),
    'seat_mismatches', (
      SELECT COUNT(*) FROM (
        SELECT r.id
        FROM rides r
        LEFT JOIN ride_bookings rb ON rb.ride_id = r.id AND rb.status IN ('pending', 'confirmed')
        WHERE r.status IN ('active', 'in-progress')
        GROUP BY r.id, r.total_seats, r.available_seats
        HAVING r.available_seats != r.total_seats - COALESCE(SUM(rb.seats_requested), 0)
      ) mismatches
    )
  ) as health_dashboard;

-- 15. Notification Delivery Check
SELECT 
  COUNT(*) as total_bookings_1h,
  COUNT(*) FILTER (WHERE notification_sent) as with_notification,
  COUNT(*) FILTER (WHERE NOT notification_sent) as missing_notification
FROM (
  SELECT rb.id,
         EXISTS (
           SELECT 1 FROM notifications n 
           WHERE n.user_id = rb.passenger_id 
             AND n.created_at BETWEEN rb.created_at - interval '1 minute' AND rb.created_at + interval '5 minutes'
         ) as notification_sent
  FROM ride_bookings rb
  WHERE rb.created_at > now() - interval '1 hour'
) booking_notifications;

-- 16. Community Isolation Audit (should return 0)
SELECT COUNT(*) as cross_community_violations
FROM ride_bookings rb
JOIN rides r ON r.id = rb.ride_id
JOIN profiles p ON p.id = rb.passenger_id
WHERE r.community_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.user_id = p.id 
      AND cm.community_id = r.community_id
      AND cm.status = 'active'
  );

-- 17. Smart Matching Performance
SELECT 
  flag_name,
  is_enabled,
  (SELECT COUNT(*) FROM ride_route_data) as routes_cached,
  (SELECT COUNT(*) FROM commute_clusters WHERE is_active) as active_clusters,
  (SELECT COUNT(*) FROM reliability_score_cache) as reliability_scores_cached
FROM feature_flags
WHERE flag_name = 'smart_route_matching';

-- ============================================================================
-- EMERGENCY REPAIR QUERIES (Only if issues detected)
-- ============================================================================

-- 18. Repair Seat Counts (if mismatches found)
-- SELECT reconcile_seat_counts();

-- 19. Repair Missing Notifications (if notifications missing)
-- SELECT repair_missing_notifications();

-- 20. Expire Stale Rides (if rides stuck)
-- SELECT expire_rides();

-- 21. Refresh Reliability Cache (if scores stale)
-- SELECT refresh_reliability_cache();

-- ============================================================================
-- FEATURE FLAG CONTROLS (For emergency disable)
-- ============================================================================

-- Disable smart matching (instant rollback)
-- UPDATE feature_flags SET is_enabled = false WHERE flag_name = 'smart_route_matching';

-- Disable all intelligence features
-- UPDATE feature_flags SET is_enabled = false 
-- WHERE flag_name IN ('smart_route_matching', 'commute_clustering', 'reliability_scoring_v2', 'fair_matching');

-- Disable cross-community visibility
-- UPDATE feature_flags SET is_enabled = false WHERE flag_name = 'cross_community_visibility';

-- Re-enable after fix
-- UPDATE feature_flags SET is_enabled = true WHERE flag_name = 'smart_route_matching';
