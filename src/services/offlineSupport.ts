import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface OfflineAction {
  action_type: string;
  action_data: Record<string, any>;
  priority?: number;
}

class OfflineManager {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private queue: OfflineAction[] = [];
  private processing = false;

  constructor() {
    this.setupListeners();
    this.loadQueue();
  }

  private syncOnlineState() {
    if (typeof navigator !== 'undefined') {
      this.isOnline = navigator.onLine;
    }
  }

  private setupListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isOnline) {
          this.processQueue();
        }
      });
    }
  }

  private handleOnline() {
    this.isOnline = true;
    console.log('App is online');
    this.processQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('App is offline');
  }

  async queueAction(action: OfflineAction) {
    this.syncOnlineState();
    if (this.isOnline) {
      return this.executeAction(action);
    }

    this.queue.push(action);
    await this.saveQueue();

    try {
      const { error } = await supabase.from('offline_queue').insert({
        action_type: action.action_type,
        action_data: action.action_data,
        priority: action.priority || 5,
      });

      if (error) {
        console.error('Failed to save to offline queue:', error);
      }
    } catch (error) {
      console.error('Failed to queue offline action:', error);
    }

    return { queued: true };
  }

  private async executeAction(action: OfflineAction) {
    try {
      switch (action.action_type) {
        case 'create_ride':
          return await supabase.from('rides').insert(action.action_data);

        case 'book_ride':
          return await supabase.from('bookings').insert(action.action_data);

        case 'send_message':
        case 'send_chat_message':
          return await supabase.from('chat_messages').insert(action.action_data);

        case 'update_profile':
          return await supabase
            .from('profiles')
            .update(action.action_data.updates)
            .eq('id', action.action_data.id);

        case 'cancel_booking':
          return await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', action.action_data.id);

        default:
          console.warn('Unknown action type:', action.action_type);
          return { error: 'Unknown action type' };
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      throw error;
    }
  }

  private async processQueue() {
    this.syncOnlineState();
    if (this.processing || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.processing = true;

    const sortedQueue = [...this.queue].sort((a, b) => {
      const priorityA = a.priority || 5;
      const priorityB = b.priority || 5;
      return priorityA - priorityB;
    });

    for (const action of sortedQueue) {
      try {
        await this.executeAction(action);

        this.queue = this.queue.filter((a) => a !== action);
        await this.saveQueue();
      } catch (error) {
        console.error('Failed to process queued action:', error);
      }
    }

    this.processing = false;

    await this.syncWithDatabase();
  }

  private async syncWithDatabase() {
    try {
      const { data: queuedItems } = await supabase
        .from('offline_queue')
        .select('*')
        .eq('is_processed', false)
        .order('priority', { ascending: true });

      if (queuedItems && queuedItems.length > 0) {
        for (const item of queuedItems) {
          try {
            await this.executeAction({
              action_type: item.action_type,
              action_data: item.action_data,
            });

            await supabase
              .from('offline_queue')
              .update({ is_processed: true, processed_at: new Date().toISOString() })
              .eq('id', item.id);
          } catch (error) {
            console.error('Failed to process database queue item:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync with database queue:', error);
    }
  }

  private async loadQueue() {
    try {
      const stored = localStorage.getItem('offline_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveQueue() {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  getQueueLength() {
    return this.queue.length;
  }

  isAppOnline() {
    this.syncOnlineState();
    return this.isOnline;
  }

  clearQueue() {
    this.queue = [];
    localStorage.removeItem('offline_queue');
  }
}

export const offlineManager = new OfflineManager();

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(offlineManager.isAppOnline());
  const [queueLength, setQueueLength] = useState(offlineManager.getQueueLength());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setQueueLength(offlineManager.getQueueLength());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setIsOnline(offlineManager.isAppOnline());
      setQueueLength(offlineManager.getQueueLength());
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, queueLength };
}
