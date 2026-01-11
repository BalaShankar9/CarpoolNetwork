/**
 * CANONICAL Notification Types (Phase B)
 * These 12 types are the ONLY valid notification types in the database.
 * Do NOT add new types without updating the DB CHECK constraint.
 */
export type NotificationType =
    | 'NEW_MESSAGE'
    | 'FRIEND_REQUEST'
    | 'FRIEND_REQUEST_ACCEPTED'
    | 'FORUM_REPLY'
    | 'FORUM_MENTION'
    | 'RIDE_MATCH'
    | 'BOOKING_REQUEST'
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_CANCELLED'
    | 'REVIEW'
    | 'SAFETY_ALERT'
    | 'SYSTEM';

// Note: The following types have been REMOVED as they are not in the DB constraint:
// RIDE_STARTED, RIDE_LOCATION_UPDATE, RIDE_COMPLETED, RIDE_DELAYED, DRIVER_ARRIVING
// ACHIEVEMENT_UNLOCKED, BADGE_EARNED, LEVEL_UP, ECO_MILESTONE, CO2_SAVED
// Use SYSTEM type with appropriate data.original_type for these use cases.

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    data: Record<string, any> | null;
    created_at: string;
    read_at: string | null;
    // Note: is_read is DEPRECATED - use (read_at !== null) instead
}

export interface NotificationData {
    sender_name?: string;
    conversation_id?: string;
    preview?: string;
    thread_id?: string;
    ride_id?: string;
    booking_id?: string;
    // Add other data fields as needed
}
