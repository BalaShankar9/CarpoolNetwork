import { useMemo, useState } from 'react';
import { Bell, X, Check, AlertTriangle, MessageCircle, Star, Calendar, Shield, Trash2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { formatNotification, NotificationsService } from '../../services/notificationsService';
import { Notification } from '../../types/notifications';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh } = useNotifications();

  const decoratedNotifications = useMemo(() => {
    return notifications.map((notification) => {
      const display = formatNotification(notification);
      return {
        ...notification,
        display,
      };
    });
  }, [notifications]);

  const deleteNotification = async (notificationId: string) => {
    try {
      await NotificationsService.deleteNotification(notificationId);
      await refresh();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    if (notification.data?.ride_id || notification.data?.rideId) {
      navigate(`/rides/${notification.data?.ride_id || notification.data?.rideId}`);
      setIsOpen(false);
    } else if (notification.data?.booking_id || notification.data?.bookingId) {
      navigate(`/bookings/${notification.data?.booking_id || notification.data?.bookingId}`);
      setIsOpen(false);
    } else if (notification.type === 'NEW_MESSAGE') {
      const conversationId = notification.data?.conversation_id;
      navigate('/messages', conversationId ? { state: { conversationId } } : undefined);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      RIDE_MATCH: Calendar,
      BOOKING_REQUEST: Calendar,
      BOOKING_CONFIRMED: Check,
      BOOKING_CANCELLED: X,
      NEW_MESSAGE: MessageCircle,
      REVIEW: Star,
      SAFETY_ALERT: AlertTriangle,
      SYSTEM: Bell
    };
    const Icon = icons[type as keyof typeof icons] || Bell;
    return Icon;
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      RIDE_MATCH: 'blue',
      BOOKING_REQUEST: 'indigo',
      BOOKING_CONFIRMED: 'green',
      BOOKING_CANCELLED: 'red',
      NEW_MESSAGE: 'purple',
      REVIEW: 'amber',
      SAFETY_ALERT: 'red',
      SYSTEM: 'gray'
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const filteredNotifications = filter === 'unread'
    ? decoratedNotifications.filter(n => !n.read_at)
    : decoratedNotifications;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'unread'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                {unreadCount > 0 && (
                  <button
                    data-testid="mark-all-read-button"
                    onClick={markAllAsRead}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Bell className="w-12 h-12 mb-3 text-gray-400" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map(notification => {
                    const Icon = getNotificationIcon(notification.type);
                    const color = getNotificationColor(notification.type);

                    return (
                      <div
                        key={notification.id}
                        data-testid="notification-item"
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.read_at ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full bg-${color}-100 flex-shrink-0`}>
                            <Icon className={`w-5 h-5 text-${color}-600`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={`font-semibold text-sm ${
                                !notification.read_at ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.display.title}
                              </p>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {notification.display.description}
                            </p>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4 text-gray-500" />
                          </button>
                          {!notification.read_at && (
                            <button
                              data-testid="mark-read-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                              title="Mark as read"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                        </div>

                        {!notification.read_at && (
                          <div className="ml-11 mt-2">
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
