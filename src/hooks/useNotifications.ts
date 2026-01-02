import { useRealtime } from '../contexts/RealtimeContext';

// Legacy wrapper to keep existing components working while using the shared realtime state
export function useNotifications() {
    const {
        notifications,
        unreadNotifications,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
    } = useRealtime();

    return {
        notifications,
        unreadCount: unreadNotifications,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: refreshNotifications,
    };
}
