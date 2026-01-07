// Enhanced Notification Center
// Comprehensive notification management with categories and actions
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  Settings,
  Trash2,
  Filter,
  Car,
  Users,
  MessageSquare,
  Trophy,
  Calendar,
  AlertCircle,
  Gift,
  Zap,
  Clock,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationType =
  | 'ride_request'
  | 'ride_confirmed'
  | 'ride_cancelled'
  | 'ride_reminder'
  | 'message'
  | 'friend_request'
  | 'friend_accepted'
  | 'achievement'
  | 'milestone_reached'
  | 'challenge'
  | 'event'
  | 'waitlist_available'
  | 'review'
  | 'system'
  | 'promo';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  priority: 'low' | 'normal' | 'high';
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ComponentType<any>; color: string; category: string }
> = {
  ride_request: { icon: Car, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30', category: 'rides' },
  ride_confirmed: { icon: Check, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30', category: 'rides' },
  ride_cancelled: { icon: X, color: 'text-red-500 bg-red-100 dark:bg-red-900/30', category: 'rides' },
  ride_reminder: { icon: Clock, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30', category: 'rides' },
  message: { icon: MessageSquare, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30', category: 'messages' },
  friend_request: { icon: Users, color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30', category: 'social' },
  friend_accepted: { icon: Users, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30', category: 'social' },
  achievement: { icon: Trophy, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30', category: 'achievements' },
  milestone_reached: { icon: Zap, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30', category: 'achievements' },
  challenge: { icon: Trophy, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30', category: 'achievements' },
  event: { icon: Calendar, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30', category: 'events' },
  waitlist_available: { icon: Bell, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30', category: 'rides' },
  review: { icon: MessageSquare, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30', category: 'social' },
  system: { icon: AlertCircle, color: 'text-gray-500 bg-gray-100 dark:bg-gray-900/30', category: 'system' },
  promo: { icon: Gift, color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30', category: 'promo' },
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'rides', label: 'Rides' },
  { id: 'messages', label: 'Messages' },
  { id: 'social', label: 'Social' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'events', label: 'Events' },
];

interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}

export function NotificationCenter({ isOpen = true, onClose, embedded = false }: NotificationCenterProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && isOpen) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [user, isOpen]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(
        (data || []).map((n) => ({
          id: n.id,
          type: n.type as NotificationType,
          title: n.title,
          message: n.message,
          read: n.read,
          createdAt: new Date(n.created_at),
          data: n.data,
          actionUrl: n.action_url,
          actionLabel: n.action_label,
          imageUrl: n.image_url,
          priority: n.priority || 'normal',
        }))
      );
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as any;
          setNotifications((prev) => [
            {
              id: n.id,
              type: n.type as NotificationType,
              title: n.title,
              message: n.message,
              read: n.read,
              createdAt: new Date(n.created_at),
              data: n.data,
              actionUrl: n.action_url,
              actionLabel: n.action_label,
              imageUrl: n.image_url,
              priority: n.priority || 'normal',
            },
            ...prev,
          ]);

          // Play sound for high priority
          if (n.priority === 'high') {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Ignore
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = async () => {
    if (!user || !confirm('Clear all notifications?')) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  };

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => TYPE_CONFIG[n.type]?.category === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const content = (
    <div
      ref={containerRef}
      className={`flex flex-col ${
        embedded ? 'h-full' : 'max-h-[80vh]'
      } bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-emerald-500" />
          <h2 className="font-bold text-gray-900 dark:text-white">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="p-2 text-gray-400 hover:text-emerald-500 rounded-lg"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === cat.id
                ? 'bg-emerald-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No notifications</p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
                onDelete={() => deleteNotification(notification.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={clearAll}
            className="w-full py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
          >
            Clear All Notifications
          </button>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <NotificationSettings onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 p-4 pt-20"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, x: 20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 20, y: -10 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead();
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`relative group border-b border-gray-100 dark:border-gray-700 ${
        notification.read ? 'bg-white dark:bg-gray-800' : 'bg-emerald-50/50 dark:bg-emerald-900/10'
      }`}
    >
      <button
        onClick={handleClick}
        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex gap-3">
          {/* Icon */}
          <div className={`shrink-0 p-2 rounded-lg ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p
                className={`font-medium line-clamp-1 ${
                  notification.read
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {notification.title}
              </p>
              <span className="shrink-0 text-xs text-gray-500">
                {formatTimeAgo(notification.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
              {notification.message}
            </p>
            {notification.actionLabel && (
              <span className="inline-flex items-center gap-1 mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {notification.actionLabel}
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Unread indicator */}
          {!notification.read && (
            <div className="shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2" />
          )}
        </div>
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-4 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function NotificationSettings({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    rides: true,
    messages: true,
    social: true,
    achievements: true,
    events: true,
    promo: true,
    sounds: true,
    push: true,
    email: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSettings({
        rides: data.rides ?? true,
        messages: data.messages ?? true,
        social: data.social ?? true,
        achievements: data.achievements ?? true,
        events: data.events ?? true,
        promo: data.promo ?? true,
        sounds: data.sounds ?? true,
        push: data.push ?? true,
        email: data.email ?? false,
      });
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-white dark:bg-gray-800 z-10"
    >
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-white">Notification Settings</h3>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Categories */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Categories</h4>
          <div className="space-y-2">
            {[
              { key: 'rides', label: 'Ride Updates', icon: Car },
              { key: 'messages', label: 'Messages', icon: MessageSquare },
              { key: 'social', label: 'Social (Friends, Reviews)', icon: Users },
              { key: 'achievements', label: 'Achievements & Challenges', icon: Trophy },
              { key: 'events', label: 'Community Events', icon: Calendar },
              { key: 'promo', label: 'Promotions & Tips', icon: Gift },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => toggleSetting(item.key as keyof typeof settings)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{item.label}</span>
                </div>
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${
                    settings[item.key as keyof typeof settings]
                      ? 'bg-emerald-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                      settings[item.key as keyof typeof settings]
                        ? 'translate-x-5 ml-0.5'
                        : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Delivery */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Delivery</h4>
          <div className="space-y-2">
            <button
              onClick={() => toggleSetting('sounds')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {settings.sounds ? (
                  <Volume2 className="w-5 h-5 text-gray-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-gray-900 dark:text-white">Sound Effects</span>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.sounds ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                    settings.sounds ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
            <button
              onClick={() => toggleSetting('push')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">Push Notifications</span>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.push ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                    settings.push ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
            <button
              onClick={() => toggleSetting('email')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-gray-900 dark:text-white block">Email Digest</span>
                  <span className="text-xs text-gray-500">Daily summary of activity</span>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.email ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                    settings.email ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </motion.div>
  );
}

// Notification Bell Button for header
interface NotificationBellProps {
  onClick?: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      subscribeToCount();
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setUnreadCount(count || 0);
  };

  const subscribeToCount = () => {
    if (!user) return;

    const channel = supabase
      .channel(`notification_count:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-500 transition-colors"
    >
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </button>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}

export default NotificationCenter;
