/*
  # Drop Unused Indexes (Part 5 - Final)

  1. Performance Improvements
    - Final batch of unused indexes
    - Communication and ML indexes
*/

-- Recommendation Feedback
DROP INDEX IF EXISTS idx_recommendation_feedback_recommendation;
DROP INDEX IF EXISTS idx_recommendation_feedback_user;

-- ML Training Data
DROP INDEX IF EXISTS idx_ml_training_data_type;

-- Financial Reports
DROP INDEX IF EXISTS idx_reports_type;
DROP INDEX IF EXISTS idx_reports_period;
DROP INDEX IF EXISTS idx_reports_generated;

-- Search Queries
DROP INDEX IF EXISTS idx_search_queries_user;
DROP INDEX IF EXISTS idx_search_queries_type;
DROP INDEX IF EXISTS idx_search_queries_query_text;

-- Pricing Rules
DROP INDEX IF EXISTS idx_pricing_active;
DROP INDEX IF EXISTS idx_pricing_type;
DROP INDEX IF EXISTS idx_pricing_priority;

-- Email Campaigns
DROP INDEX IF EXISTS idx_email_campaigns_status;
DROP INDEX IF EXISTS idx_email_campaigns_scheduled;

-- Search Results Cache
DROP INDEX IF EXISTS idx_search_results_cache_key;
DROP INDEX IF EXISTS idx_search_results_cache_expires;

-- SMS Campaigns
DROP INDEX IF EXISTS idx_sms_status;
DROP INDEX IF EXISTS idx_sms_scheduled;

-- Route Popularity
DROP INDEX IF EXISTS idx_route_popularity_search_count;

-- In-App Messages
DROP INDEX IF EXISTS idx_in_app_active;
DROP INDEX IF EXISTS idx_in_app_priority;
DROP INDEX IF EXISTS idx_in_app_valid;

-- Communication Templates
DROP INDEX IF EXISTS idx_templates_type;
DROP INDEX IF EXISTS idx_templates_category;
DROP INDEX IF EXISTS idx_templates_active;

-- Campaign Analytics
DROP INDEX IF EXISTS idx_campaign_analytics_id;
DROP INDEX IF EXISTS idx_campaign_analytics_timestamp;

-- Error Patterns
DROP INDEX IF EXISTS idx_error_patterns_occurrence;
DROP INDEX IF EXISTS idx_error_patterns_last_seen;

-- User Communication Preferences
DROP INDEX IF EXISTS idx_user_comm_prefs_user;

-- ML Predictions
DROP INDEX IF EXISTS idx_ml_predictions_type;
DROP INDEX IF EXISTS idx_ml_predictions_created;

-- Demand Forecasts
DROP INDEX IF EXISTS idx_demand_forecast_date;
DROP INDEX IF EXISTS idx_demand_forecast_region;

-- Cache Entries
DROP INDEX IF EXISTS idx_cache_entries_key;
DROP INDEX IF EXISTS idx_cache_entries_expires;
DROP INDEX IF EXISTS idx_cache_entries_type;

-- Cache Stats
DROP INDEX IF EXISTS idx_cache_stats_recorded;
DROP INDEX IF EXISTS idx_cache_stats_type;

-- Recommendations
DROP INDEX IF EXISTS idx_recommendations_user;
DROP INDEX IF EXISTS idx_recommendations_type;
DROP INDEX IF EXISTS idx_recommendations_shown;

-- Fraud Alerts
DROP INDEX IF EXISTS idx_fraud_alerts_user;
DROP INDEX IF EXISTS idx_fraud_alerts_status;
DROP INDEX IF EXISTS idx_fraud_alerts_severity;
DROP INDEX IF EXISTS idx_fraud_alerts_created;

-- Suspicious Activities
DROP INDEX IF EXISTS idx_suspicious_user;
DROP INDEX IF EXISTS idx_suspicious_reviewed;
DROP INDEX IF EXISTS idx_suspicious_risk;

-- Admin Audit Log
DROP INDEX IF EXISTS idx_audit_admin;
DROP INDEX IF EXISTS idx_audit_resource;

-- Data Access Log
DROP INDEX IF EXISTS idx_data_access_user;
DROP INDEX IF EXISTS idx_data_access_resource;
DROP INDEX IF EXISTS idx_data_access_created;

-- Content Moderation
DROP INDEX IF EXISTS idx_moderation_status;
DROP INDEX IF EXISTS idx_moderation_severity;

-- Automated Content Filters
DROP INDEX IF EXISTS idx_filters_active;
DROP INDEX IF EXISTS idx_filters_type;

-- Push Notification Tokens
DROP INDEX IF EXISTS idx_push_tokens_user_act;

-- Live Locations
DROP INDEX IF EXISTS idx_live_locs_rid;
