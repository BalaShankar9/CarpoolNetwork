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

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    data: Record<string, any> | null;
    created_at: string;
    read_at: string | null;
    is_read?: boolean | null; // legacy schema compatibility
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
