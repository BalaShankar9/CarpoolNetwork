/*
  # Drop Unused Indexes (Part 4)

  1. Performance Improvements
    - Final batch of unused indexes
    - Analytics and performance monitoring indexes
*/

-- Ride Tracking
DROP INDEX IF EXISTS idx_ride_tracking_ride;
DROP INDEX IF EXISTS idx_ride_tracking_driver;
DROP INDEX IF EXISTS idx_ride_tracking_location;
DROP INDEX IF EXISTS idx_ride_tracking_active;

-- Ride Reviews Detailed
DROP INDEX IF EXISTS idx_reviews_detailed_booking;
DROP INDEX IF EXISTS idx_reviews_detailed_ride;
DROP INDEX IF EXISTS idx_reviews_detailed_reviewee;
DROP INDEX IF EXISTS idx_reviews_detailed_reviewer;

-- Favorite Drivers
DROP INDEX IF EXISTS idx_favorites_passenger;
DROP INDEX IF EXISTS idx_favorites_driver;
DROP INDEX IF EXISTS idx_favorites_auto_accept;

-- Notification Queue
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_notifications_status;
DROP INDEX IF EXISTS idx_notifications_scheduled;
DROP INDEX IF EXISTS idx_notifications_priority;

-- Ride Modifications
DROP INDEX IF EXISTS idx_modifications_ride;
DROP INDEX IF EXISTS idx_modifications_booking;
DROP INDEX IF EXISTS idx_modifications_created;

-- Cancellation History
DROP INDEX IF EXISTS idx_cancellation_history_user;
DROP INDEX IF EXISTS idx_cancellation_history_created;
DROP INDEX IF EXISTS idx_cancellation_history_ride;

-- Reliability Scores
DROP INDEX IF EXISTS idx_reliability_scores_score;

-- Booking Restrictions
DROP INDEX IF EXISTS idx_booking_restrictions_active;

-- Performance Metrics
DROP INDEX IF EXISTS idx_performance_metrics_type;
DROP INDEX IF EXISTS idx_performance_metrics_endpoint;
DROP INDEX IF EXISTS idx_performance_metrics_created_at;

-- System Health
DROP INDEX IF EXISTS idx_system_health_timestamp;
DROP INDEX IF EXISTS idx_system_health_checked_at;
DROP INDEX IF EXISTS idx_system_health_status;

-- API Performance
DROP INDEX IF EXISTS idx_api_performance_timestamp;
DROP INDEX IF EXISTS idx_api_performance_endpoint;
DROP INDEX IF EXISTS idx_api_performance_status;

-- Database Performance
DROP INDEX IF EXISTS idx_db_performance_timestamp;
DROP INDEX IF EXISTS idx_db_performance_table;

-- Query Performance
DROP INDEX IF EXISTS idx_query_performance_query_name;
DROP INDEX IF EXISTS idx_query_performance_execution_time;

-- Error Logs
DROP INDEX IF EXISTS idx_error_logs_severity;
DROP INDEX IF EXISTS idx_error_logs_status;
DROP INDEX IF EXISTS idx_error_logs_last_seen;
DROP INDEX IF EXISTS idx_error_logs_type;
DROP INDEX IF EXISTS idx_error_logs_unresolved;

-- Service Uptime
DROP INDEX IF EXISTS idx_service_uptime_status;
DROP INDEX IF EXISTS idx_service_uptime_last_check;

-- Ride Analytics
DROP INDEX IF EXISTS idx_ride_analytics_ride_id;
DROP INDEX IF EXISTS idx_ride_analytics_time;
DROP INDEX IF EXISTS idx_ride_analytics_day;

-- User Recommendations
DROP INDEX IF EXISTS idx_user_recommendations_user;
DROP INDEX IF EXISTS idx_user_recommendations_score;
DROP INDEX IF EXISTS idx_user_recommendations_active;

-- Geographic Analytics
DROP INDEX IF EXISTS idx_geographic_region;
DROP INDEX IF EXISTS idx_geographic_city;

-- User Behavior
DROP INDEX IF EXISTS idx_user_behavior_user;
DROP INDEX IF EXISTS idx_user_behavior_date;
DROP INDEX IF EXISTS idx_user_behavior_churn;

-- Growth Metrics
DROP INDEX IF EXISTS idx_growth_metrics_date;
DROP INDEX IF EXISTS idx_growth_metrics_source;

-- Cohort Analysis
DROP INDEX IF EXISTS idx_cohort_month;

-- Performance Benchmarks
DROP INDEX IF EXISTS idx_benchmarks_date;
DROP INDEX IF EXISTS idx_benchmarks_category;

-- Transactions
DROP INDEX IF EXISTS idx_transactions_user;
DROP INDEX IF EXISTS idx_transactions_ride;
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_transactions_created;
DROP INDEX IF EXISTS idx_transactions_type;

-- Revenue Tracking
DROP INDEX IF EXISTS idx_revenue_date;

-- Push Notifications
DROP INDEX IF EXISTS idx_push_scheduled;
DROP INDEX IF EXISTS idx_push_status;
