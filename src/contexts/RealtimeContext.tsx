import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Notification } from '../types/notifications';
import { NotificationsService, normalizeNotification } from '../services/notificationsService';

interface RealtimeContextType {
  unreadNotifications: number;
  unreadMessages: number;
  notifications: Notification[];
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshUnreadMessages: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notificationChannel, setNotificationChannel] = useState<RealtimeChannel | null>(null);
  const [bookingChannel, setBookingChannel] = useState<RealtimeChannel | null>(null);
  const [messageChannel, setMessageChannel] = useState<RealtimeChannel | null>(null);

  const loadUnreadMessages = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_total_unread_messages');
      if (error) throw error;
      setUnreadMessages(Number(data || 0));
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await NotificationsService.getNotifications(user.id);
      setNotifications(data);
      setUnreadNotifications(data.filter(n => !n.read_at).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const timestamp = new Date().toISOString();
    let wasUnread = false;

    setNotifications(prev =>
      prev.map(n => {
        if (n.id === notificationId && !n.read_at) {
          wasUnread = true;
          return { ...n, read_at: timestamp };
        }
        return n;
      })
    );
    if (wasUnread) {
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    }

    try {
      await NotificationsService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const timestamp = new Date().toISOString();
    setNotifications(prev => prev.map(n => ({ ...n, read_at: timestamp })));
    setUnreadNotifications(0);

    try {
      await NotificationsService.markAllAsRead(user.id);
    } catch (error) {
      console.error('Error marking all as read:', error);
      loadNotifications();
    }
  };

  useEffect(() => {
    if (!user) {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
        setNotificationChannel(null);
      }
      if (bookingChannel) {
        supabase.removeChannel(bookingChannel);
        setBookingChannel(null);
      }
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
        setMessageChannel(null);
      }
      setNotifications([]);
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    loadNotifications();
    loadUnreadMessages();

    const notifChannel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = normalizeNotification(payload.new);
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadNotifications(prev => prev + (newNotification.read_at ? 0 : 1));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = normalizeNotification(payload.new);
          setNotifications(prev => {
            let wasUnread = false;
            const next = prev.map(n => {
              if (n.id === updatedNotification.id) {
                wasUnread = !n.read_at;
                return updatedNotification;
              }
              return n;
            });
            if (wasUnread && updatedNotification.read_at) {
              setUnreadNotifications(prevCount => Math.max(0, prevCount - 1));
            }
            return next;
          });
        }
      )
      .subscribe();

    const bookingChan = supabase
      .channel('bookings-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_bookings'
        },
        () => {
          window.dispatchEvent(new CustomEvent('booking-update'));
        }
      )
      .subscribe();

    const messageChan = supabase
      .channel(`chat-messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          window.dispatchEvent(new CustomEvent('message-received'));
          loadUnreadMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUnreadMessages();
        }
      )
      .subscribe();

    setNotificationChannel(notifChannel);
    setBookingChannel(bookingChan);
    setMessageChannel(messageChan);

    return () => {
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (bookingChan) supabase.removeChannel(bookingChan);
      if (messageChan) supabase.removeChannel(messageChan);
    };
  }, [user]);

  return (
    <RealtimeContext.Provider
      value={{
        unreadNotifications,
        unreadMessages,
        notifications,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications: loadNotifications,
        refreshUnreadMessages: loadUnreadMessages
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
