/*
  # Drop Unused Indexes (Part 1)

  1. Performance Improvements
    - Removes unused indexes to reduce storage overhead
    - Speeds up INSERT, UPDATE, DELETE operations
    - Reduces maintenance burden

  2. Notes
    - Only dropping indexes that are confirmed unused
    - Keeping critical performance indexes
*/

-- Booking History
DROP INDEX IF EXISTS idx_booking_history_user_id;

-- Conversation Read Markers
DROP INDEX IF EXISTS idx_conversation_read_markers_conversation;
DROP INDEX IF EXISTS idx_conversation_read_markers_user;
DROP INDEX IF EXISTS idx_conversation_read_markers_last_read_message_id;

-- Trip Requests (renamed from ride_requests)
DROP INDEX IF EXISTS idx_ride_requests_requester;
DROP INDEX IF EXISTS idx_ride_requests_departure;

-- Chat Messages
DROP INDEX IF EXISTS idx_chat_messages_conversation_created;
DROP INDEX IF EXISTS idx_chat_messages_reply_to_message_id;

-- Message Reports
DROP INDEX IF EXISTS idx_message_reports_message;
DROP INDEX IF EXISTS idx_message_reports_reporter_id;

-- Bug Reports
DROP INDEX IF EXISTS idx_bug_reports_user_id;

-- Emergency Alerts
DROP INDEX IF EXISTS idx_emergency_alerts_user_id;
DROP INDEX IF EXISTS idx_emergency_alerts_ride_id;
DROP INDEX IF EXISTS idx_emergency_alerts_status;

-- Emergency Notifications
DROP INDEX IF EXISTS idx_emergency_notifications_alert_id;
DROP INDEX IF EXISTS idx_emergency_notifications_contact_id;

-- Profiles
DROP INDEX IF EXISTS idx_profiles_whatsapp;
DROP INDEX IF EXISTS idx_profiles_avatar_url;
DROP INDEX IF EXISTS idx_profiles_phone_e164;
DROP INDEX IF EXISTS idx_profiles_created_at;
DROP INDEX IF EXISTS idx_profiles_is_admin;

-- AI Chat History
DROP INDEX IF EXISTS idx_ai_chat_history_user_id;
DROP INDEX IF EXISTS idx_ai_chat_history_created_at;

-- Ride Requests
DROP INDEX IF EXISTS idx_ride_requests_rider_id;
DROP INDEX IF EXISTS idx_ride_requests_expires_at;
DROP INDEX IF EXISTS idx_ride_requests_ride_status;
DROP INDEX IF EXISTS idx_ride_requests_rider_status;

-- Vehicle Insurance
DROP INDEX IF EXISTS idx_vehicle_insurance_vehicle_id;
DROP INDEX IF EXISTS idx_vehicle_insurance_expiry;

-- Trip Offers
DROP INDEX IF EXISTS idx_trip_offers_trip_request_id;
DROP INDEX IF EXISTS idx_trip_offers_driver_id;
DROP INDEX IF EXISTS idx_trip_offers_status;
DROP INDEX IF EXISTS idx_trip_offers_ride_id;

-- Messages
DROP INDEX IF EXISTS idx_messages_ride_id;

-- Notifications
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_created_at;

-- Rate Limits
DROP INDEX IF EXISTS idx_rate_limits_user_id;

-- Ride Stops
DROP INDEX IF EXISTS idx_ride_stops_user_id;

-- Safety Reports
DROP INDEX IF EXISTS idx_safety_reports_reported_user_id;
DROP INDEX IF EXISTS idx_safety_reports_reporter_id;
DROP INDEX IF EXISTS idx_safety_reports_assigned;
DROP INDEX IF EXISTS idx_safety_reports_priority;
DROP INDEX IF EXISTS idx_safety_reports_updated;
