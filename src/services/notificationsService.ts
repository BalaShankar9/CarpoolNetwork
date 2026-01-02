import { supabase } from '../lib/supabase';
import { Notification, NotificationType, NotificationData } from '../types/notifications';

const hasReadAtColumnError = (error: any) =>
  error?.code === '42703' || (typeof error?.message === 'string' && error.message.includes('read_at'));

export function normalizeNotification(raw: any): Notification {
  const normalizedType = (raw?.type || 'SYSTEM').toString().toUpperCase() as NotificationType;
  const read_at =
    raw?.read_at ??
    (typeof raw?.is_read === 'boolean'
      ? raw.is_read
        ? raw?.created_at || new Date().toISOString()
        : null
      : null);

  return {
    id: raw.id,
    user_id: raw.user_id,
    type: normalizedType,
    data: raw?.data || {},
    created_at: raw.created_at,
    read_at,
  };
}

export class NotificationsService {
    static async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(normalizeNotification);
    }

    static async getUnreadCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('read_at', null);

        if (error && hasReadAtColumnError(error)) {
            const { count: legacyCount, error: legacyError } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false as any);
            if (legacyError) throw legacyError;
            return legacyCount || 0;
        }

        if (error) throw error;
        return count || 0;
    }

    static async markAsRead(notificationId: string): Promise<void> {
        const timestamp = new Date().toISOString();

        const { error } = await supabase
            .from('notifications')
            .update({ read_at: timestamp })
            .eq('id', notificationId);

        if (error && hasReadAtColumnError(error)) {
            const { error: legacyError } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);
            if (legacyError) throw legacyError;
        } else if (error) {
            throw error;
        }
    }

    static async markAllAsRead(userId: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const { error } = await supabase
            .from('notifications')
            .update({ read_at: timestamp })
            .eq('user_id', userId)
            .is('read_at', null);

        if (error && hasReadAtColumnError(error)) {
            const { error: legacyError } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (legacyError) throw legacyError;
        } else if (error) {
            throw error;
        }
    }

    static async createNotification(
        userId: string,
        type: NotificationType,
        data: NotificationData
    ): Promise<Notification> {
        const { data: notification, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                data,
            })
            .select()
            .single();

        if (error && hasReadAtColumnError(error)) {
            const { data: legacyNotification, error: legacyError } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    type: type.toLowerCase(),
                    title: (data as any)?.title || 'Notification',
                    message: (data as any)?.message || 'You have a new notification',
                    data,
                    is_read: false,
                } as any)
                .select()
                .single();
            if (legacyError) throw legacyError;
            return normalizeNotification(legacyNotification);
        }

        if (error) throw error;
        return normalizeNotification(notification);
    }

    static async deleteNotification(notificationId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
    }
}

export function formatNotification(notification: Notification) {
    const data = notification.data || {};

    switch (notification.type) {
        case 'NEW_MESSAGE':
            return {
                title: 'New Message',
                description: `${data.sender_name || 'Someone'} sent you a message${data.preview ? `: "${data.preview}"` : ''}`,
            };
        case 'FRIEND_REQUEST':
            return {
                title: 'Friend Request',
                description: `${data.sender_name || 'Someone'} sent you a friend request`,
            };
        case 'FRIEND_REQUEST_ACCEPTED':
            return {
                title: 'Friend Request Accepted',
                description: `${data.sender_name || 'Someone'} accepted your friend request`,
            };
        case 'FORUM_REPLY':
            return {
                title: 'Forum Reply',
                description: `${data.sender_name || 'Someone'} replied to your post${data.preview ? `: "${data.preview}"` : ''}`,
            };
        case 'FORUM_MENTION':
            return {
                title: 'Forum Mention',
                description: `${data.sender_name || 'Someone'} mentioned you${data.preview ? `: "${data.preview}"` : ''}`,
            };
        case 'RIDE_MATCH':
            return {
                title: 'Ride Match',
                description: data.message || 'We found a ride that matches your request.',
            };
        case 'BOOKING_REQUEST':
            return {
                title: 'New Booking Request',
                description: data.message || 'A rider sent you a booking request.',
            };
        case 'BOOKING_CONFIRMED':
            return {
                title: 'Booking Confirmed',
                description: data.message || 'Your booking was confirmed.',
            };
        case 'BOOKING_CANCELLED':
            return {
                title: 'Booking Cancelled',
                description: data.message || 'A booking was cancelled.',
            };
        case 'REVIEW':
            return {
                title: 'New Review',
                description: data.message || 'You received a new review.',
            };
        case 'SAFETY_ALERT':
            return {
                title: 'Safety Alert',
                description: data.message || 'Please review this safety notice.',
            };
        case 'SYSTEM':
        default:
            return {
                title: data.title || 'Notification',
                description: data.message || 'You have a new notification.',
            };
    }
}
