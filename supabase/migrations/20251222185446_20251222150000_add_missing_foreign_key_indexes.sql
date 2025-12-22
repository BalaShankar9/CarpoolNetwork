/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Adds indexes for all unindexed foreign keys
    - Improves JOIN performance and referential integrity checks
    - Reduces query execution time for foreign key lookups

  2. Security
    - Better query performance prevents potential DoS through slow queries
    - Improves overall database responsiveness
*/

-- API Performance Logs
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_user_id ON public.api_performance_logs(user_id);

-- Booking Restrictions
CREATE INDEX IF NOT EXISTS idx_booking_restrictions_reviewed_by ON public.booking_restrictions(reviewed_by);

-- Cancellation History
CREATE INDEX IF NOT EXISTS idx_cancellation_history_booking_id ON public.cancellation_history(booking_id);

-- Communication Templates
CREATE INDEX IF NOT EXISTS idx_communication_templates_created_by ON public.communication_templates(created_by);

-- Content Moderation Queue
CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_reported_by ON public.content_moderation_queue(reported_by);
CREATE INDEX IF NOT EXISTS idx_content_moderation_queue_reviewed_by ON public.content_moderation_queue(reviewed_by);

-- Critical Alerts
CREATE INDEX IF NOT EXISTS idx_critical_alerts_acknowledged_by ON public.critical_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_related_ride_id ON public.critical_alerts(related_ride_id);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_related_user_id ON public.critical_alerts(related_user_id);

-- Email Campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON public.email_campaigns(created_by);

-- Error Logs
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by ON public.error_logs(resolved_by);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);

-- Error Logs Aggregated
CREATE INDEX IF NOT EXISTS idx_error_logs_aggregated_assigned_to ON public.error_logs_aggregated(assigned_to);

-- Financial Reports
CREATE INDEX IF NOT EXISTS idx_financial_reports_generated_by ON public.financial_reports(generated_by);

-- Fraud Alerts
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_investigated_by ON public.fraud_alerts(investigated_by);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_ride_id ON public.fraud_alerts(ride_id);

-- In-App Messages
CREATE INDEX IF NOT EXISTS idx_in_app_messages_created_by ON public.in_app_messages(created_by);

-- Incident Evidence
CREATE INDEX IF NOT EXISTS idx_incident_evidence_incident_id ON public.incident_evidence(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_report_id ON public.incident_evidence(report_id);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_uploaded_by ON public.incident_evidence(uploaded_by);

-- Location History
CREATE INDEX IF NOT EXISTS idx_location_history_ride_id ON public.location_history(ride_id);

-- Passkey Challenges
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user_id ON public.passkey_challenges(user_id);

-- Performance Metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);

-- Push Notifications
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_by ON public.push_notifications(created_by);

-- Query Performance
CREATE INDEX IF NOT EXISTS idx_query_performance_user_id ON public.query_performance(user_id);

-- Recurring Ride Templates
CREATE INDEX IF NOT EXISTS idx_recurring_ride_templates_vehicle_id ON public.recurring_ride_templates(vehicle_id);

-- Ride Modifications
CREATE INDEX IF NOT EXISTS idx_ride_modifications_modified_by ON public.ride_modifications(modified_by);

-- Ride Tracking Sessions
CREATE INDEX IF NOT EXISTS idx_ride_tracking_sessions_driver_id ON public.ride_tracking_sessions(driver_id);

-- Safety Actions Log
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_incident_id ON public.safety_actions_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_performed_by ON public.safety_actions_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_report_id ON public.safety_actions_log(report_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_suspension_id ON public.safety_actions_log(suspension_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_user_id ON public.safety_actions_log(user_id);

-- Safety Incidents
CREATE INDEX IF NOT EXISTS idx_safety_incidents_investigator_id ON public.safety_incidents(investigator_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_resolved_by ON public.safety_incidents(resolved_by);

-- Safety Reports
CREATE INDEX IF NOT EXISTS idx_safety_reports_booking_id ON public.safety_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_resolved_by ON public.safety_reports(resolved_by);

-- Safety Warnings
CREATE INDEX IF NOT EXISTS idx_safety_warnings_incident_id ON public.safety_warnings(incident_id);
CREATE INDEX IF NOT EXISTS idx_safety_warnings_issued_by ON public.safety_warnings(issued_by);
CREATE INDEX IF NOT EXISTS idx_safety_warnings_report_id ON public.safety_warnings(report_id);

-- Search History Analytics
CREATE INDEX IF NOT EXISTS idx_search_history_analytics_result_clicked ON public.search_history_analytics(result_clicked);

-- SMS Campaigns
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_by ON public.sms_campaigns(created_by);

-- Suspicious Activities
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_reviewed_by ON public.suspicious_activities(reviewed_by);

-- User Challenges
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);

-- User Recommendations
CREATE INDEX IF NOT EXISTS idx_user_recommendations_driver_id ON public.user_recommendations(driver_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_ride_id ON public.user_recommendations(ride_id);

-- User Suspensions
CREATE INDEX IF NOT EXISTS idx_user_suspensions_incident_id ON public.user_suspensions(incident_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_lifted_by ON public.user_suspensions(lifted_by);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_suspended_by ON public.user_suspensions(suspended_by);
