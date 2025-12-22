/*
  # Drop Unused Indexes (Part 3)

  1. Performance Improvements
    - Continues removing unused indexes
    - Final batch of unused indexes
*/

-- Leaderboard Cache
DROP INDEX IF EXISTS idx_leaderboard_cache_user_id;
DROP INDEX IF EXISTS idx_leaderboard_cache_category_period;
DROP INDEX IF EXISTS idx_leaderboard_cache_rank;

-- Challenges
DROP INDEX IF EXISTS idx_challenges_active;
DROP INDEX IF EXISTS idx_challenges_type;

-- User Challenges
DROP INDEX IF EXISTS idx_user_challenges_user_id;
DROP INDEX IF EXISTS idx_user_challenges_completed;

-- Driver Licenses
DROP INDEX IF EXISTS idx_driver_licenses_verified;
DROP INDEX IF EXISTS idx_driver_licenses_expiry;

-- Ride Tracking Sessions
DROP INDEX IF EXISTS idx_track_rid;

-- Passkey Credentials
DROP INDEX IF EXISTS idx_passkey_credentials_credential_id;

-- Passkey Challenges
DROP INDEX IF EXISTS idx_passkey_challenges_challenge;
DROP INDEX IF EXISTS idx_passkey_challenges_expires_at;

-- Offline Queue
DROP INDEX IF EXISTS idx_offq_usr;

-- Activity Logs
DROP INDEX IF EXISTS idx_activity_logs_created_at;
DROP INDEX IF EXISTS idx_activity_logs_type;
DROP INDEX IF EXISTS idx_activity_logs_severity;
DROP INDEX IF EXISTS idx_activity_logs_actor;
DROP INDEX IF EXISTS idx_activity_logs_target;

-- Critical Alerts
DROP INDEX IF EXISTS idx_critical_alerts_status;
DROP INDEX IF EXISTS idx_critical_alerts_type;
DROP INDEX IF EXISTS idx_critical_alerts_severity;

-- Passenger Search Filters
DROP INDEX IF EXISTS idx_passenger_search_filters_user_id;
DROP INDEX IF EXISTS idx_passenger_search_filters_default;

-- Preferred Drivers
DROP INDEX IF EXISTS idx_preferred_drivers_user_id;
DROP INDEX IF EXISTS idx_preferred_drivers_driver_id;

-- Bulk Operations
DROP INDEX IF EXISTS idx_bulk_operations_status;
DROP INDEX IF EXISTS idx_bulk_operations_type;
DROP INDEX IF EXISTS idx_bulk_operations_initiated_by;
DROP INDEX IF EXISTS idx_bulk_operation_items_operation;
DROP INDEX IF EXISTS idx_bulk_operation_items_target;

-- Blocked Users
DROP INDEX IF EXISTS idx_blocked_users_user_id;
DROP INDEX IF EXISTS idx_blocked_users_blocked_id;

-- Recurring Ride Templates
DROP INDEX IF EXISTS idx_recurring_ride_templates_user_id;
DROP INDEX IF EXISTS idx_recurring_ride_templates_active;

-- Search History
DROP INDEX IF EXISTS idx_search_history_user_id;
DROP INDEX IF EXISTS idx_search_history_timestamp;

-- Scheduled Operations
DROP INDEX IF EXISTS idx_scheduled_operations_next_run;
DROP INDEX IF EXISTS idx_scheduled_operations_scheduled_by;

-- Preference Profiles
DROP INDEX IF EXISTS idx_preference_profiles_user_id;
DROP INDEX IF EXISTS idx_preference_profiles_active;

-- Ride Request Matches
DROP INDEX IF EXISTS idx_ride_requests_matches_request;
DROP INDEX IF EXISTS idx_ride_requests_matches_ride;
DROP INDEX IF EXISTS idx_ride_requests_matches_status;
DROP INDEX IF EXISTS idx_ride_requests_matches_score;
DROP INDEX IF EXISTS idx_ride_requests_matches_expires;

-- Trip Request Matches
DROP INDEX IF EXISTS idx_trip_requests_matches_request;
DROP INDEX IF EXISTS idx_trip_requests_matches_ride;
DROP INDEX IF EXISTS idx_trip_requests_matches_status;
DROP INDEX IF EXISTS idx_trip_requests_matches_score;
DROP INDEX IF EXISTS idx_trip_requests_matches_expires;

-- Trip Requests
DROP INDEX IF EXISTS idx_trip_requests_time_type;
DROP INDEX IF EXISTS idx_trip_requests_time_type_departure;
DROP INDEX IF EXISTS idx_trip_requests_departure_status;
