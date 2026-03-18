// =============================================================================
// Presence Service — real-time online/idle/offline indicators
// =============================================================================
// Manages the `user_presence` table and Supabase Realtime subscriptions.
// All functions are pure async (no React hooks).
// =============================================================================

import { supabase } from '../lib/supabase';
import type { UserPresence, PresenceStatus } from '../types/social';

/** Default heartbeat interval in milliseconds. */
const DEFAULT_HEARTBEAT_MS = 30_000;

/** Duration of inactivity (ms) before a user is considered idle. */
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const presenceService = {
  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  /**
   * Upsert the current user's presence status.
   * Uses `ON CONFLICT` so it works whether the row already exists or not.
   */
  async updatePresence(userId: string, status: PresenceStatus): Promise<void> {
    try {
      const { error } = await supabase.from('user_presence').upsert(
        {
          user_id: userId,
          status,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      if (error) throw error;
    } catch (err) {
      // Presence failures should never crash the app
      console.error('[presenceService.updatePresence]', err);
    }
  },

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  /**
   * Get a single user's current presence.
   */
  async getPresence(userId: string): Promise<UserPresence | null> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, status, last_seen_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserPresence | null;
    } catch (err) {
      console.error('[presenceService.getPresence]', err);
      return null;
    }
  },

  /**
   * Batch-fetch presence for a list of friend IDs.
   */
  async getFriendsPresence(friendIds: string[]): Promise<UserPresence[]> {
    if (friendIds.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, status, last_seen_at')
        .in('user_id', friendIds);

      if (error) throw error;
      return (data ?? []) as UserPresence[];
    } catch (err) {
      console.error('[presenceService.getFriendsPresence]', err);
      return [];
    }
  },

  // -------------------------------------------------------------------------
  // Heartbeat
  // -------------------------------------------------------------------------

  /**
   * Start a periodic heartbeat that keeps the user marked as "online".
   *
   * It also listens for visibility changes: when the tab is hidden the user
   * transitions to "idle", and when the tab is visible again the user goes
   * back to "online". When the page is unloaded the user is set to "offline".
   *
   * @returns A cleanup function that stops the heartbeat and removes listeners.
   */
  startHeartbeat(userId: string, intervalMs: number = DEFAULT_HEARTBEAT_MS): () => void {
    let timer: ReturnType<typeof setInterval> | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let currentStatus: PresenceStatus = 'online';
    let destroyed = false;

    const setStatus = (status: PresenceStatus) => {
      if (destroyed) return;
      currentStatus = status;
      presenceService.updatePresence(userId, status).catch(() => {});
    };

    // Mark online immediately
    setStatus('online');

    // Periodic heartbeat
    timer = setInterval(() => {
      if (!destroyed) {
        presenceService.updatePresence(userId, currentStatus).catch(() => {});
      }
    }, intervalMs);

    // Visibility change handler
    const handleVisibility = () => {
      if (document.hidden) {
        // Start idle countdown
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          setStatus('idle');
        }, IDLE_TIMEOUT_MS);
      } else {
        // Came back — cancel idle countdown and mark online
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
        setStatus('online');
      }
    };

    // Before-unload handler — mark offline
    const handleBeforeUnload = () => {
      // Use a synchronous-style call via sendBeacon if available
      try {
        const body = JSON.stringify({
          user_id: userId,
          status: 'offline' as PresenceStatus,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Best-effort; sendBeacon may not be available in all contexts
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          // We can't reliably upsert via sendBeacon, so just fire-and-forget
          presenceService.updatePresence(userId, 'offline').catch(() => {});
        } else {
          presenceService.updatePresence(userId, 'offline').catch(() => {});
        }
      } catch {
        // Swallow — we're tearing down
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Cleanup function
    return () => {
      destroyed = true;
      if (timer) clearInterval(timer);
      if (idleTimer) clearTimeout(idleTimer);

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }

      // Mark offline on teardown
      presenceService.updatePresence(userId, 'offline').catch(() => {});
    };
  },

  // -------------------------------------------------------------------------
  // Realtime subscription
  // -------------------------------------------------------------------------

  /**
   * Subscribe to presence changes for a list of friend IDs.
   *
   * @returns A cleanup function that removes the Supabase channel.
   */
  subscribeToPresence(
    friendIds: string[],
    onUpdate: (presence: UserPresence) => void,
  ): () => void {
    if (friendIds.length === 0) return () => {};

    const channel = supabase
      .channel('presence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | undefined;
          if (!row) return;

          const presenceUserId = row.user_id as string;
          if (friendIds.includes(presenceUserId)) {
            onUpdate({
              user_id: presenceUserId,
              status: row.status as PresenceStatus,
              last_seen_at: row.last_seen_at as string,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
