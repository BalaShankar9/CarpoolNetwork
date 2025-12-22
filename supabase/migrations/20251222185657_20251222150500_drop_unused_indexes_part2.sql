/*
  # Drop Unused Indexes (Part 2)

  1. Performance Improvements
    - Continues removing unused indexes
    - Reduces storage and maintenance overhead
*/

-- Rides
DROP INDEX IF EXISTS idx_rides_driver_id;
DROP INDEX IF EXISTS idx_rides_status;
DROP INDEX IF EXISTS idx_rides_departure_time;
DROP INDEX IF EXISTS idx_rides_city_area;
DROP INDEX IF EXISTS idx_rides_driver_status;
DROP INDEX IF EXISTS idx_rides_vehicle_id;
DROP INDEX IF EXISTS idx_rides_created_at_status;
DROP INDEX IF EXISTS idx_rides_locations;
DROP INDEX IF EXISTS idx_rides_time_type;
DROP INDEX IF EXISTS idx_rides_time_type_departure;
DROP INDEX IF EXISTS idx_rides_departure_time_status;

-- Saved Searches
DROP INDEX IF EXISTS idx_saved_searches_user_id;
DROP INDEX IF EXISTS idx_saved_searches_alerts_enabled;

-- Conversations
DROP INDEX IF EXISTS idx_conversations_ride_id;
DROP INDEX IF EXISTS idx_conversations_trip_request_id;
DROP INDEX IF EXISTS idx_conversations_type;

-- Conversation Members
DROP INDEX IF EXISTS idx_conversation_members_conversation_id;
DROP INDEX IF EXISTS idx_conversation_members_user_id;

-- Chat Messages
DROP INDEX IF EXISTS idx_chat_messages_conversation_id;
DROP INDEX IF EXISTS idx_chat_messages_sender_id;
DROP INDEX IF EXISTS idx_chat_messages_created_at;

-- Message Reads
DROP INDEX IF EXISTS idx_message_reads_message_id;
DROP INDEX IF EXISTS idx_message_reads_user_id;

-- Two Factor Auth
DROP INDEX IF EXISTS idx_two_factor_auth_enabled;
DROP INDEX IF EXISTS idx_two_factor_recovery_codes_user_id;
DROP INDEX IF EXISTS idx_two_factor_recovery_codes_used;
DROP INDEX IF EXISTS idx_two_factor_audit_log_user_id;
DROP INDEX IF EXISTS idx_two_factor_audit_log_created_at;

-- Vehicles
DROP INDEX IF EXISTS idx_vehicles_image_url;
DROP INDEX IF EXISTS idx_vehicles_user_active;

-- Safety Incidents
DROP INDEX IF EXISTS idx_safety_incidents_number;
DROP INDEX IF EXISTS idx_safety_incidents_status;
DROP INDEX IF EXISTS idx_safety_incidents_severity;
DROP INDEX IF EXISTS idx_safety_incidents_user;

-- User Suspensions
DROP INDEX IF EXISTS idx_user_suspensions_user;
DROP INDEX IF EXISTS idx_user_suspensions_active;
DROP INDEX IF EXISTS idx_user_suspensions_dates;

-- Safety Warnings
DROP INDEX IF EXISTS idx_safety_warnings_user;
DROP INDEX IF EXISTS idx_safety_warnings_level;

-- Safety Actions Log
DROP INDEX IF EXISTS idx_safety_actions_log_type;
DROP INDEX IF EXISTS idx_safety_actions_log_date;

-- Friend Requests
DROP INDEX IF EXISTS idx_friend_requests_from_user_id;
DROP INDEX IF EXISTS idx_friend_requests_to_user_id;
DROP INDEX IF EXISTS idx_friend_requests_status;

-- Friendships
DROP INDEX IF EXISTS idx_friendships_user_a;
DROP INDEX IF EXISTS idx_friendships_user_b;

-- Blocks
DROP INDEX IF EXISTS idx_blocks_blocker_id;
DROP INDEX IF EXISTS idx_blocks_blocked_id;
DROP INDEX IF EXISTS idx_blocks_blocker_blocked;

-- Location History
DROP INDEX IF EXISTS idx_loc_hist_usr;

-- Reviews
DROP INDEX IF EXISTS idx_reviews_reviewer_id;

-- Ride Waitlist
DROP INDEX IF EXISTS idx_ride_waitlist_user_id_fk;

-- Bookings
DROP INDEX IF EXISTS idx_bookings_created_at_status;
