import { Bell } from 'lucide-react';
import { useRealtime } from '../../contexts/RealtimeContext';

interface NotificationsBellProps {
    onClick: () => void;
}

export function NotificationsBell({ onClick }: NotificationsBellProps) {
    const { unreadNotifications } = useRealtime();

    return (
        <button
            onClick={onClick}
            className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            aria-label="Notifications"
        >
            <Bell className="h-6 w-6" />
            {unreadNotifications > 0 && (
                <span
                    data-testid="notification-badge"
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
            )}
        </button>
    );
}
