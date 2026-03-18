import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FriendSummary {
  id: string;
  name: string;
  avatar?: string;
  presence?: 'online' | 'idle' | 'offline';
}

interface GroupSummary {
  id: string;
  name: string;
  memberCount: number;
  unread?: number;
}

interface SocialCounts {
  friendRequests: number;
  groupInvites: number;
  unreadMessages: number;
  activeChallenges: number;
  newWaves: number;
}

interface SocialContextType {
  // Social graph (cached)
  friends: FriendSummary[];
  friendRequests: { incoming: number; outgoing: number };
  groups: GroupSummary[];

  // Presence
  onlineFriends: FriendSummary[];
  myPresence: 'online' | 'idle' | 'offline';

  // Notification counts for widgets
  counts: SocialCounts;

  // Quick actions
  sendWave: (toUserId: string) => Promise<void>;

  // Loading states
  loading: boolean;
  refreshAll: () => Promise<void>;
}

const DEFAULT_COUNTS: SocialCounts = {
  friendRequests: 0,
  groupInvites: 0,
  unreadMessages: 0,
  activeChallenges: 0,
  newWaves: 0,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SocialContext = createContext<SocialContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();

  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: 0, outgoing: 0 });
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<FriendSummary[]>([]);
  const [myPresence, setMyPresence] = useState<'online' | 'idle' | 'offline'>('online');
  const [counts, setCounts] = useState<SocialCounts>(DEFAULT_COUNTS);
  const [loading, setLoading] = useState(true);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  // ------------------------------------------------------------------
  // Data loaders
  // ------------------------------------------------------------------

  const loadFriends = useCallback(async (userId: string): Promise<FriendSummary[]> => {
    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const friendIds = rows.map((r) => (r.user_a === userId ? r.user_b : r.user_a));

      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_photo_url')
        .in('id', friendIds);

      if (pError) throw pError;

      return (profiles || []).map((p) => ({
        id: p.id,
        name: p.full_name || 'User',
        avatar: p.profile_photo_url || p.avatar_url || undefined,
        presence: 'offline' as const,
      }));
    } catch (err) {
      console.error('[SocialContext] loadFriends error:', err);
      return [];
    }
  }, []);

  const loadFriendRequestCounts = useCallback(async (userId: string) => {
    try {
      const [incomingRes, outgoingRes] = await Promise.allSettled([
        supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', userId)
          .eq('status', 'PENDING'),
        supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('from_user_id', userId)
          .eq('status', 'PENDING'),
      ]);

      return {
        incoming: incomingRes.status === 'fulfilled' ? incomingRes.value.count || 0 : 0,
        outgoing: outgoingRes.status === 'fulfilled' ? outgoingRes.value.count || 0 : 0,
      };
    } catch {
      return { incoming: 0, outgoing: 0 };
    }
  }, []);

  const loadGroups = useCallback(async (userId: string): Promise<GroupSummary[]> => {
    try {
      const { data: memberships, error } = await supabase
        .from('social_group_members')
        .select(`
          group_id,
          social_groups:group_id (id, name, member_count)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      if (!memberships) return [];

      return memberships
        .map((m) => {
          const group: any = Array.isArray(m.social_groups)
            ? m.social_groups[0]
            : m.social_groups;
          if (!group) return null;
          return {
            id: group.id,
            name: group.name,
            memberCount: group.member_count || 0,
          };
        })
        .filter(Boolean) as GroupSummary[];
    } catch (err) {
      console.error('[SocialContext] loadGroups error:', err);
      return [];
    }
  }, []);

  const loadCounts = useCallback(async (userId: string): Promise<SocialCounts> => {
    try {
      const [frReqs, grpInvites, challenges, waves] = await Promise.allSettled([
        // Friend requests
        supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', userId)
          .eq('status', 'PENDING'),
        // Group invites
        supabase
          .from('social_group_invites')
          .select('*', { count: 'exact', head: true })
          .eq('invitee_id', userId)
          .eq('status', 'PENDING'),
        // Active challenges
        supabase
          .from('user_challenges')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('completed', false),
        // Waves in the last 24 hours
        supabase
          .from('social_waves')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', userId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        friendRequests: frReqs.status === 'fulfilled' ? frReqs.value.count || 0 : 0,
        groupInvites: grpInvites.status === 'fulfilled' ? grpInvites.value.count || 0 : 0,
        unreadMessages: 0, // handled by RealtimeContext
        activeChallenges: challenges.status === 'fulfilled' ? challenges.value.count || 0 : 0,
        newWaves: waves.status === 'fulfilled' ? waves.value.count || 0 : 0,
      };
    } catch {
      return DEFAULT_COUNTS;
    }
  }, []);

  const loadPresence = useCallback(async (friendsList: FriendSummary[]): Promise<FriendSummary[]> => {
    if (friendsList.length === 0) return [];
    const friendIds = friendsList.map((f) => f.id);

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, status')
        .in('user_id', friendIds);

      if (error) throw error;

      const presenceMap = new Map<string, 'online' | 'idle' | 'offline'>();
      (data || []).forEach((row) => {
        presenceMap.set(row.user_id, row.status as 'online' | 'idle' | 'offline');
      });

      return friendsList.map((f) => ({
        ...f,
        presence: presenceMap.get(f.id) || 'offline',
      }));
    } catch {
      // user_presence table may not exist yet -- return friends without presence
      return friendsList;
    }
  }, []);

  // ------------------------------------------------------------------
  // Master refresh
  // ------------------------------------------------------------------

  const refreshAll = useCallback(async () => {
    const userId = user?.id || profile?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [friendsList, frReqCounts, groupsList, newCounts] = await Promise.allSettled([
        loadFriends(userId),
        loadFriendRequestCounts(userId),
        loadGroups(userId),
        loadCounts(userId),
      ]);

      if (!mountedRef.current) return;

      const resolvedFriends =
        friendsList.status === 'fulfilled' ? friendsList.value : [];
      const resolvedFrReqs =
        frReqCounts.status === 'fulfilled' ? frReqCounts.value : { incoming: 0, outgoing: 0 };
      const resolvedGroups =
        groupsList.status === 'fulfilled' ? groupsList.value : [];
      const resolvedCounts =
        newCounts.status === 'fulfilled' ? newCounts.value : DEFAULT_COUNTS;

      // Enrich friends with presence
      const friendsWithPresence = await loadPresence(resolvedFriends);

      if (!mountedRef.current) return;

      setFriends(friendsWithPresence);
      setFriendRequests(resolvedFrReqs);
      setGroups(resolvedGroups);
      setCounts(resolvedCounts);
      setOnlineFriends(friendsWithPresence.filter((f) => f.presence === 'online'));
    } catch (err) {
      console.error('[SocialContext] refreshAll error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id, profile?.id, loadFriends, loadFriendRequestCounts, loadGroups, loadCounts, loadPresence]);

  // ------------------------------------------------------------------
  // Presence heartbeat
  // ------------------------------------------------------------------

  const startHeartbeat = useCallback((userId: string) => {
    const upsertPresence = async (status: 'online' | 'idle' | 'offline') => {
      try {
        await supabase.from('user_presence').upsert(
          { user_id: userId, status, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
      } catch {
        // silently ignore -- table may not exist
      }
    };

    // Set online immediately
    upsertPresence('online');
    setMyPresence('online');

    // Heartbeat every 30 seconds
    heartbeatRef.current = setInterval(() => {
      upsertPresence(document.hidden ? 'idle' : 'online');
    }, 30_000);

    // Track tab visibility for idle detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        upsertPresence('idle');
        setMyPresence('idle');
      } else {
        upsertPresence('online');
        setMyPresence('online');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // On beforeunload, mark offline
    const handleUnload = () => {
      upsertPresence('offline');
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      upsertPresence('offline');
    };
  }, []);

  // ------------------------------------------------------------------
  // Realtime subscriptions
  // ------------------------------------------------------------------

  const setupRealtime = useCallback((userId: string) => {
    const channel = supabase
      .channel('social-hub')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_a=eq.${userId}` },
        () => refreshAll(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_b=eq.${userId}` },
        () => refreshAll(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `to_user_id=eq.${userId}` },
        () => refreshAll(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_group_invites', filter: `invitee_id=eq.${userId}` },
        () => refreshAll(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_waves', filter: `to_user_id=eq.${userId}` },
        () => refreshAll(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => {
          // Friend came online/went offline — refresh presence data
          if (mountedRef.current) {
            loadPresence(friends).then((updated) => {
              if (mountedRef.current) {
                setFriends(updated);
                setOnlineFriends(updated.filter((f) => f.presence === 'online'));
              }
            });
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  // ------------------------------------------------------------------
  // Quick actions
  // ------------------------------------------------------------------

  const sendWave = useCallback(async (toUserId: string) => {
    const userId = user?.id;
    if (!userId) return;

    try {
      await supabase.from('social_waves').insert({
        from_user_id: userId,
        to_user_id: toUserId,
      });

      // Create a notification for the recipient
      await supabase.from('notifications').insert({
        user_id: toUserId,
        type: 'SOCIAL_WAVE',
        title: `${profile?.full_name || 'Someone'} waved at you!`,
        body: 'Wave back to say hello.',
        data: { from_user_id: userId },
      });
    } catch (err) {
      console.error('[SocialContext] sendWave error:', err);
    }
  }, [user?.id, profile?.full_name]);

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    const userId = user?.id || profile?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    // Load data
    refreshAll();

    // Start presence heartbeat
    const stopHeartbeat = startHeartbeat(userId);

    // Setup realtime subscriptions
    const stopRealtime = setupRealtime(userId);

    return () => {
      mountedRef.current = false;
      stopHeartbeat();
      stopRealtime();
    };
  }, [user?.id, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Value
  // ------------------------------------------------------------------

  const value: SocialContextType = {
    friends,
    friendRequests,
    groups,
    onlineFriends,
    myPresence,
    counts,
    sendWave,
    loading,
    refreshAll,
  };

  return (
    <SocialContext.Provider value={value}>
      {children}
    </SocialContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
