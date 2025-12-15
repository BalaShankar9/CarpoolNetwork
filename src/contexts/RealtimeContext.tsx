import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface RealtimeContextType {
  unreadNotifications: number;
  notifications: Notification[];
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationChannel, setNotificationChannel] = useState<RealtimeChannel | null>(null);
  const [bookingChannel, setBookingChannel] = useState<RealtimeChannel | null>(null);
  const [messageChannel, setMessageChannel] = useState<RealtimeChannel | null>(null);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadNotifications(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifications(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
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
      return;
    }

    loadNotifications();

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
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadNotifications(prev => prev + 1);
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
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          if (updatedNotification.is_read) {
            setUnreadNotifications(prev => Math.max(0, prev - 1));
          }
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
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          window.dispatchEvent(new CustomEvent('message-received'));
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
        notifications,
        markAsRead,
        markAllAsRead,
        refreshNotifications: loadNotifications
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
