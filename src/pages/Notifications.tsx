import { useState, useMemo } from 'react';
import {
    Bell,
    CheckCircle2,
    MessageCircle,
    UserPlus,
    MessageSquare,
    AlertTriangle,
    Car,
    Star,
    Trophy,
    Navigation,
    Leaf,
    Filter,
    Trash2,
    CheckCheck,
    Settings,
    Calendar
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Notification, NotificationType } from '../types/notifications';
import { useNavigate } from 'react-router-dom';
import { formatNotification } from '../services/notificationsService';
import { supabase } from '../lib/supabase';

type FilterType = 'all' | 'unread' | NotificationType;

const NOTIFICATION_CATEGORIES = [
    { id: 'all' as FilterType, label: 'All', icon: Bell },
    { id: 'unread' as FilterType, label: 'Unread', icon: CheckCircle2 },
    { id: 'RIDE_MATCH' as FilterType, label: 'Rides', icon: Car },
    { id: 'NEW_MESSAGE' as FilterType, label: 'Messages', icon: MessageCircle },
    { id: 'FRIEND_REQUEST' as FilterType, label: 'Social', icon: UserPlus },
    { id: 'FORUM_REPLY' as FilterType, label: 'Community', icon: MessageSquare },
    { id: 'REVIEW' as FilterType, label: 'Reviews', icon: Star },
    { id: 'ACHIEVEMENT_UNLOCKED' as FilterType, label: 'Achievements', icon: Trophy },
    { id: 'SAFETY_ALERT' as FilterType, label: 'Safety', icon: AlertTriangle },
];

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
        case 'RIDE_MATCH':
            return <Car className="h-5 w-5 text-blue-600" />;
        case 'BOOKING_REQUEST':
        case 'BOOKING_CONFIRMED':
        case 'BOOKING_CANCELLED':
            return <Calendar className="h-5 w-5 text-orange-500" />;
        case 'REVIEW':
            return <Star className="h-5 w-5 text-yellow-500" />;
        case 'RIDE_STARTED':
        case 'RIDE_LOCATION_UPDATE':
        case 'RIDE_COMPLETED':
            return <Navigation className="h-5 w-5 text-teal-500" />;
        case 'ACHIEVEMENT_UNLOCKED':
            return <Trophy className="h-5 w-5 text-amber-500" />;
        case 'ECO_MILESTONE':
            return <Leaf className="h-5 w-5 text-green-600" />;
        case 'SAFETY_ALERT':
            return <AlertTriangle className="h-5 w-5 text-red-500" />;
        default:
            return <Bell className="h-5 w-5 text-gray-500" />;
    }
};

const getNotificationTarget = (notification: Notification) => {
    const data = notification.data || {};

    switch (notification.type) {
        case 'NEW_MESSAGE':
            return data.conversation_id
                ? { path: `/messages?c=${data.conversation_id}`, state: { conversationId: data.conversation_id } }
                : { path: '/messages' };
        case 'FRIEND_REQUEST':
        case 'FRIEND_REQUEST_ACCEPTED':
            return { path: '/social/friends' };
        case 'FORUM_REPLY':
        case 'FORUM_MENTION':
            return data.thread_id
                ? { path: `/community/thread/${data.thread_id}` }
                : { path: '/community' };
        case 'RIDE_MATCH':
        case 'RIDE_STARTED':
        case 'RIDE_LOCATION_UPDATE':
        case 'RIDE_COMPLETED':
            return data.ride_id
                ? { path: `/ride/${data.ride_id}` }
                : { path: '/my-rides' };
        case 'BOOKING_REQUEST':
        case 'BOOKING_CONFIRMED':
        case 'BOOKING_CANCELLED':
            return data.booking_id
                ? { path: `/booking/${data.booking_id}` }
                : { path: '/my-rides' };
        case 'REVIEW':
            return { path: '/profile?tab=reviews' };
        case 'ACHIEVEMENT_UNLOCKED':
            return { path: '/profile?tab=achievements' };
        case 'ECO_MILESTONE':
            return { path: '/profile?tab=impact' };
        default:
            return null;
    }
};

const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

export default function Notifications() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh } = useNotifications();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<FilterType>('all');
    const [showSettings, setShowSettings] = useState(false);

    const filteredNotifications = useMemo(() => {
        if (filter === 'all') return notifications;
        if (filter === 'unread') return notifications.filter(n => !n.read_at);
        return notifications.filter(n => n.type === filter);
    }, [notifications, filter]);

    const groupedNotifications = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const groups: Record<string, Notification[]> = {
            today: [],
            yesterday: [],
            thisWeek: [],
            older: [],
        };

        filteredNotifications.forEach(notification => {
            const date = new Date(notification.created_at);
            date.setHours(0, 0, 0, 0);

            if (date.getTime() === today.getTime()) {
                groups.today.push(notification);
            } else if (date.getTime() === yesterday.getTime()) {
                groups.yesterday.push(notification);
            } else if (date > weekAgo) {
                groups.thisWeek.push(notification);
            } else {
                groups.older.push(notification);
            }
        });

        return groups;
    }, [filteredNotifications]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read_at) {
            await markAsRead(notification.id);
        }

        const target = getNotificationTarget(notification);
        if (target) {
            navigate(target.path, { state: target.state });
        }
    };

    const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        try {
            await supabase.from('notifications').delete().eq('id', notificationId);
            refresh();
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const renderNotificationGroup = (title: string, notifications: Notification[]) => {
        if (notifications.length === 0) return null;

        return (
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">{title}</h3>
                <div className="space-y-2">
                    {notifications.map(notification => {
                        const { title, description } = formatNotification(notification);
                        const isUnread = !notification.read_at;

                        return (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-4 rounded-lg cursor-pointer transition-all hover:shadow-md ${isUnread
                                        ? 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                                        : 'bg-white border border-gray-100 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 p-2 rounded-full ${isUnread ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}>
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {title}
                                            </p>
                                            {isUnread && (
                                                <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                            {description}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {formatTimeAgo(notification.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {isUnread && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                                title="Mark as read"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                                            className="p-1.5 hover:bg-red-100 rounded-full transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-600 mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <CheckCheck className="w-4 h-4" />
                            Mark all read
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Notification settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
                {NOTIFICATION_CATEGORIES.map(category => {
                    const Icon = category.icon;
                    const isActive = filter === category.id;
                    const count = category.id === 'all'
                        ? notifications.length
                        : category.id === 'unread'
                            ? unreadCount
                            : notifications.filter(n => n.type === category.id).length;

                    return (
                        <button
                            key={category.id}
                            onClick={() => setFilter(category.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {category.label}
                            {count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-3">Notification Preferences</h3>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Email notifications</span>
                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Push notifications</span>
                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Ride updates</span>
                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Social activity</span>
                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Community updates</span>
                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" defaultChecked />
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        <a href="/settings?tab=notifications" className="text-blue-600 hover:underline">
                            Manage all notification settings →
                        </a>
                    </p>
                </div>
            )}

            {/* Notifications List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 mt-4">Loading notifications...</p>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                        <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
                    <p className="text-gray-600 text-center max-w-sm">
                        {filter === 'unread'
                            ? "You're all caught up! No unread notifications."
                            : filter !== 'all'
                                ? `No ${NOTIFICATION_CATEGORIES.find(c => c.id === filter)?.label.toLowerCase()} notifications yet.`
                                : "You don't have any notifications yet. They'll show up here when you get them."
                        }
                    </p>
                </div>
            ) : (
                <div>
                    {renderNotificationGroup('Today', groupedNotifications.today)}
                    {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
                    {renderNotificationGroup('This Week', groupedNotifications.thisWeek)}
                    {renderNotificationGroup('Older', groupedNotifications.older)}
                </div>
            )}
        </div>
    );
}
