import { useMemo } from 'react';
import { X, CheckCircle2, MessageCircle, UserPlus, MessageSquare, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { Notification, NotificationType } from '../../types/notifications';
import { useNavigate } from 'react-router-dom';
import { formatNotification } from '../../services/notificationsService';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
        case 'NEW_MESSAGE':
            return <MessageCircle className="h-5 w-5 text-blue-500" />;
        case 'FRIEND_REQUEST':
        case 'FRIEND_REQUEST_ACCEPTED':
            return <UserPlus className="h-5 w-5 text-green-500" />;
        case 'FORUM_REPLY':
        case 'FORUM_MENTION':
            return <MessageSquare className="h-5 w-5 text-purple-500" />;
        default:
            return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
};

const getNotificationText = (notification: Notification) => {
    return formatNotification(notification);
};

const getNotificationTarget = (notification: Notification) => {
    const data = notification.data || {};

    switch (notification.type) {
        case 'NEW_MESSAGE':
            return data.conversation_id
                ? { path: '/messages', state: { conversationId: data.conversation_id } }
                : { path: '/messages' };
        case 'FRIEND_REQUEST':
        case 'FRIEND_REQUEST_ACCEPTED':
            return { path: '/social/friends' };
        case 'FORUM_REPLY':
        case 'FORUM_MENTION':
            return data.thread_id
                ? { path: `/community/thread/${data.thread_id}` }
                : { path: '/community' };
        default:
            return null;
    }
};

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();
    const decorated = useMemo(
        () => notifications.map((n) => ({ ...n, data: n.data || {}, display: getNotificationText(n) })),
        [notifications]
    );

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read_at) {
            await markAsRead(notification.id);
        }

        const target = getNotificationTarget(notification);
        if (target) {
            navigate(target.path, { state: target.state });
            onClose();
        }
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-40 max-h-96 overflow-hidden md:max-h-[calc(100vh-120px)] max-h-[calc(100vh-var(--app-bottom-nav-height)-120px)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                        <button
                            data-testid="panel-mark-all-read"
                            onClick={handleMarkAllRead}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : decorated.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No notifications</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {decorated.map((notification) => {
                            const { title, description } = notification.display;
                            const isUnread = !notification.read_at;

                            return (
                                <div
                                    key={notification.id}
                                    data-testid="notification-item"
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 ${isUnread ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        {getNotificationIcon(notification.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium text-gray-900 ${isUnread ? 'font-semibold' : ''
                                                }`}>
                                                {title}
                                            </p>
                                            <p className="text-sm text-gray-600 truncate">
                                                {description}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(notification.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {isUnread && (
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                                <button
                                                    data-testid="panel-mark-read-button"
                                                    onClick={async (e) => {
                                                      e.stopPropagation();
                                                      await markAsRead(notification.id);
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
