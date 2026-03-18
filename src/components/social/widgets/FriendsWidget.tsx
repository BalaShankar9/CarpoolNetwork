import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Hand,
  UserPlus,
  ChevronRight,
  Sparkles,
  Search,
  Car,
  Eye,
  Trophy,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../../../lib/toast';
import WidgetCard from '../shared/WidgetCard';
import PresenceIndicator from '../shared/PresenceIndicator';
import QuickActionMenu from '../shared/QuickActionMenu';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FriendWithPresence {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  presence: 'online' | 'idle' | 'offline';
  last_seen_at?: string;
  friendship_id: string;
}

interface PendingRequest {
  id: string;
  from_user_id: string;
  from_user: {
    full_name: string;
    avatar_url?: string | null;
    profile_photo_url?: string | null;
  };
  created_at: string;
}

interface FriendSuggestion {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  mutualInfo: string;
}

interface IncomingWave {
  id: string;
  from_user_id: string;
  from_user_name: string;
  from_user_avatar?: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoString: string | undefined): string {
  if (!isoString) return '';
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function getAvatarUrl(user: {
  avatar_url?: string | null;
  profile_photo_url?: string | null;
}): string | null {
  return user.profile_photo_url || user.avatar_url || null;
}

function getInitial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

/** Stable hash-based color for avatar fallback backgrounds. */
function initialColor(name: string): string {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

const PRESENCE_ORDER: Record<string, number> = { online: 0, idle: 1, offline: 2 };
const MAX_VISIBLE_FRIENDS = 6;
const MAX_ONLINE_AVATARS = 5;
const MAX_SUGGESTIONS = 2;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({
  url,
  name,
  size = 'md',
  className = '',
}: {
  url: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${initialColor(name)} ${className}`}
    >
      <span className={textSize}>{getInitial(name)}</span>
    </div>
  );
}

function AvatarWithPresence({
  friend,
  size = 'md',
}: {
  friend: FriendWithPresence;
  size?: 'sm' | 'md' | 'lg';
}) {
  const presenceSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';
  const posClass = size === 'sm' ? '-bottom-0.5 -right-0.5' : '-bottom-0.5 -right-0.5';

  return (
    <div className="relative inline-flex flex-shrink-0">
      <Avatar url={getAvatarUrl(friend)} name={friend.full_name} size={size} />
      <span className={`absolute ${posClass}`}>
        <PresenceIndicator status={friend.presence} size={presenceSize} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

export default function FriendsWidget() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [friends, setFriends] = useState<FriendWithPresence[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [incomingWaves, setIncomingWaves] = useState<IncomingWave[]>([]);
  const [loading, setLoading] = useState(true);

  // Action state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [waveSentIds, setWaveSentIds] = useState<Set<string>>(new Set());

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const pa = PRESENCE_ORDER[a.presence] ?? 2;
      const pb = PRESENCE_ORDER[b.presence] ?? 2;
      if (pa !== pb) return pa - pb;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [friends]);

  const onlineFriends = useMemo(
    () => sortedFriends.filter((f) => f.presence === 'online'),
    [sortedFriends],
  );

  const visibleFriends = useMemo(
    () => sortedFriends.slice(0, MAX_VISIBLE_FRIENDS),
    [sortedFriends],
  );

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const loadFriends = useCallback(async () => {
    if (!user) return;
    const userId = user.id;

    try {
      // 1. Get friendships
      const { data: friendships, error: fErr } = await supabase
        .from('friendships')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (fErr) throw fErr;

      const friendIds = (friendships || []).map((row) =>
        row.user_a === userId ? row.user_b : row.user_a,
      );

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      // 2. Get profiles for friends
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_photo_url')
        .in('id', friendIds);

      if (pErr) throw pErr;

      // 3. Get presence data
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, status, last_seen_at')
        .in('user_id', friendIds);

      const presenceMap = new Map(
        (presenceData || []).map((p) => [p.user_id, p]),
      );

      // 4. Build friendship map for quick lookup
      const friendshipMap = new Map(
        (friendships || []).map((row) => {
          const fid = row.user_a === userId ? row.user_b : row.user_a;
          return [fid, row.id];
        }),
      );

      // 5. Assemble friends list
      const assembled: FriendWithPresence[] = (profiles || []).map((p) => {
        const presence = presenceMap.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name || 'Unknown',
          avatar_url: p.avatar_url,
          profile_photo_url: p.profile_photo_url,
          presence: (presence?.status as FriendWithPresence['presence']) || 'offline',
          last_seen_at: presence?.last_seen_at,
          friendship_id: friendshipMap.get(p.id) || '',
        };
      });

      setFriends(assembled);
    } catch (err) {
      console.error('[FriendsWidget] Failed to load friends:', err);
    }
  }, [user]);

  const loadPendingRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data: requests, error: rErr } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, to_user_id, status, created_at')
        .eq('to_user_id', user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(5);

      if (rErr) throw rErr;

      if (!requests || requests.length === 0) {
        setPendingRequests([]);
        return;
      }

      const fromIds = requests.map((r) => r.from_user_id);
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_photo_url')
        .in('id', fromIds);

      if (pErr) throw pErr;

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p]),
      );

      const assembled: PendingRequest[] = requests
        .map((r) => {
          const p = profileMap.get(r.from_user_id);
          if (!p) return null;
          return {
            id: r.id,
            from_user_id: r.from_user_id,
            from_user: {
              full_name: p.full_name || 'Unknown',
              avatar_url: p.avatar_url,
              profile_photo_url: p.profile_photo_url,
            },
            created_at: r.created_at,
          };
        })
        .filter(Boolean) as PendingRequest[];

      setPendingRequests(assembled);
    } catch (err) {
      console.error('[FriendsWidget] Failed to load pending requests:', err);
    }
  }, [user]);

  const loadSuggestions = useCallback(async () => {
    if (!user) return;
    const userId = user.id;

    try {
      // 1. Collect IDs to exclude (friends + pending + self)
      const excludeIds = new Set<string>([userId]);
      friends.forEach((f) => excludeIds.add(f.id));
      pendingRequests.forEach((r) => excludeIds.add(r.from_user_id));

      // Also exclude any outgoing pending requests
      const { data: sentReqs } = await supabase
        .from('friend_requests')
        .select('to_user_id')
        .eq('from_user_id', userId)
        .eq('status', 'PENDING');

      (sentReqs || []).forEach((r) => excludeIds.add(r.to_user_id));

      // 2. Find groups the user belongs to
      const { data: myMemberships } = await supabase
        .from('social_group_members')
        .select('group_id, social_groups:group_id (id, name)')
        .eq('user_id', userId);

      const myGroupIds = (myMemberships || []).map((m) => m.group_id);
      const groupNameMap = new Map<string, string>();
      (myMemberships || []).forEach((m) => {
        const group: any = Array.isArray(m.social_groups)
          ? m.social_groups[0]
          : m.social_groups;
        if (group?.name) groupNameMap.set(group.id, group.name);
      });

      // 3. Find group mates
      let candidateMap = new Map<string, string>(); // userId -> mutualInfo
      if (myGroupIds.length > 0) {
        const { data: groupMates } = await supabase
          .from('social_group_members')
          .select('user_id, group_id')
          .in('group_id', myGroupIds)
          .neq('user_id', userId)
          .limit(50);

        (groupMates || []).forEach((gm) => {
          if (!excludeIds.has(gm.user_id) && !candidateMap.has(gm.user_id)) {
            const groupName = groupNameMap.get(gm.group_id);
            candidateMap.set(
              gm.user_id,
              groupName ? `In ${groupName}` : 'Shared group',
            );
          }
        });
      }

      // 4. Count mutual friends for each candidate
      const friendIds = friends.map((f) => f.id);
      if (friendIds.length > 0 && candidateMap.size < MAX_SUGGESTIONS) {
        const { data: fof } = await supabase
          .from('friendships')
          .select('user_a, user_b')
          .or(
            friendIds.map((id) => `user_a.eq.${id},user_b.eq.${id}`).join(','),
          )
          .limit(100);

        const mutualCount = new Map<string, number>();
        (fof || []).forEach((row) => {
          [row.user_a, row.user_b].forEach((uid) => {
            if (!excludeIds.has(uid) && uid !== userId) {
              mutualCount.set(uid, (mutualCount.get(uid) || 0) + 1);
            }
          });
        });

        mutualCount.forEach((count, uid) => {
          if (!candidateMap.has(uid)) {
            candidateMap.set(
              uid,
              `${count} mutual friend${count > 1 ? 's' : ''}`,
            );
          }
        });
      }

      // 5. Fallback: random non-friend profiles
      if (candidateMap.size < MAX_SUGGESTIONS) {
        const excludeArr = Array.from(excludeIds);
        const alreadyCandidates = Array.from(candidateMap.keys());
        const allExclude = [...excludeArr, ...alreadyCandidates];

        const { data: fallback } = await supabase
          .from('profiles')
          .select('id')
          .not('id', 'in', `(${allExclude.join(',')})`)
          .limit(MAX_SUGGESTIONS);

        (fallback || []).forEach((p) => {
          if (!candidateMap.has(p.id)) {
            candidateMap.set(p.id, 'Suggested for you');
          }
        });
      }

      // 6. Fetch profiles for candidates
      const candidateIds = Array.from(candidateMap.keys()).slice(0, MAX_SUGGESTIONS);
      if (candidateIds.length === 0) {
        setSuggestions([]);
        return;
      }

      const { data: candidateProfiles, error: cpErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_photo_url')
        .in('id', candidateIds);

      if (cpErr) throw cpErr;

      const assembled: FriendSuggestion[] = (candidateProfiles || []).map((p) => ({
        id: p.id,
        full_name: p.full_name || 'Unknown',
        avatar_url: p.avatar_url,
        profile_photo_url: p.profile_photo_url,
        mutualInfo: candidateMap.get(p.id) || 'Suggested for you',
      }));

      setSuggestions(assembled);
    } catch (err) {
      console.error('[FriendsWidget] Failed to load suggestions:', err);
    }
  }, [user, friends, pendingRequests]);

  const loadIncomingWaves = useCallback(async () => {
    if (!user) return;

    try {
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data: waves, error: wErr } = await supabase
        .from('social_waves')
        .select('id, from_user_id, created_at')
        .eq('to_user_id', user.id)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (wErr) throw wErr;

      if (!waves || waves.length === 0) {
        setIncomingWaves([]);
        return;
      }

      const fromIds = waves.map((w) => w.from_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_photo_url')
        .in('id', fromIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p]),
      );

      const assembled: IncomingWave[] = waves
        .map((w) => {
          const p = profileMap.get(w.from_user_id);
          return {
            id: w.id,
            from_user_id: w.from_user_id,
            from_user_name: p?.full_name || 'Someone',
            from_user_avatar: p?.profile_photo_url || p?.avatar_url || null,
            created_at: w.created_at,
          };
        });

      setIncomingWaves(assembled);
    } catch (err) {
      console.error('[FriendsWidget] Failed to load waves:', err);
    }
  }, [user]);

  // -------------------------------------------------------------------------
  // Initial data load
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      await Promise.allSettled([
        loadFriends(),
        loadPendingRequests(),
        loadIncomingWaves(),
      ]);
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user, loadFriends, loadPendingRequests, loadIncomingWaves]);

  // Load suggestions after friends/requests are loaded (depends on them)
  useEffect(() => {
    if (!loading && user) {
      loadSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  // -------------------------------------------------------------------------
  // Realtime subscriptions
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const channel = supabase
      .channel('friends-widget')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_a=eq.${userId}` },
        () => loadFriends(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_b=eq.${userId}` },
        () => loadFriends(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `to_user_id=eq.${userId}` },
        () => loadPendingRequests(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => loadFriends(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_waves', filter: `to_user_id=eq.${userId}` },
        () => loadIncomingWaves(),
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, loadFriends, loadPendingRequests, loadIncomingWaves]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const sendWave = useCallback(
    async (friendId: string, friendName: string) => {
      if (!user || waveSentIds.has(friendId)) return;

      // Optimistic
      setWaveSentIds((prev) => new Set(prev).add(friendId));

      try {
        const { error } = await supabase.from('social_waves').insert({
          from_user_id: user.id,
          to_user_id: friendId,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;

        toast.success(`Wave sent to ${friendName}!`);
      } catch (err) {
        // Rollback
        setWaveSentIds((prev) => {
          const next = new Set(prev);
          next.delete(friendId);
          return next;
        });
        console.error('[FriendsWidget] Failed to send wave:', err);
        toast.error('Failed to send wave. Please try again.');
      }
    },
    [user, waveSentIds],
  );

  const waveBack = useCallback(
    async (wave: IncomingWave) => {
      await sendWave(wave.from_user_id, wave.from_user_name);
      // Remove from incoming waves list optimistically
      setIncomingWaves((prev) => prev.filter((w) => w.id !== wave.id));
    },
    [sendWave],
  );

  const acceptRequest = useCallback(
    async (requestId: string, friendName: string) => {
      if (!user) return;
      setProcessingId(requestId);

      // Optimistic removal
      const previousRequests = pendingRequests;
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));

      try {
        const { error } = await supabase.rpc('accept_friend_request', {
          p_request_id: requestId,
        });

        if (error) throw error;

        toast.success(`You are now friends with ${friendName}!`);
        await loadFriends();
      } catch (err) {
        // Rollback
        setPendingRequests(previousRequests);
        console.error('[FriendsWidget] Failed to accept request:', err);
        const msg = err instanceof Error ? err.message : 'Failed to accept request';
        toast.error(msg);
      } finally {
        setProcessingId(null);
      }
    },
    [user, pendingRequests, loadFriends],
  );

  const declineRequest = useCallback(
    async (requestId: string) => {
      if (!user) return;
      setProcessingId(requestId);

      const previousRequests = pendingRequests;
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));

      try {
        const { error } = await supabase.rpc('decline_friend_request', {
          p_request_id: requestId,
        });

        if (error) throw error;
        toast.success('Friend request declined');
      } catch (err) {
        setPendingRequests(previousRequests);
        console.error('[FriendsWidget] Failed to decline request:', err);
        const msg = err instanceof Error ? err.message : 'Failed to decline request';
        toast.error(msg);
      } finally {
        setProcessingId(null);
      }
    },
    [user, pendingRequests],
  );

  const sendFriendRequest = useCallback(
    async (targetId: string, targetName: string) => {
      if (!user) return;
      setProcessingId(targetId);

      // Optimistic removal from suggestions
      const previousSuggestions = suggestions;
      setSuggestions((prev) => prev.filter((s) => s.id !== targetId));

      try {
        const { error } = await supabase.rpc('send_friend_request', {
          p_to_user_id: targetId,
        });

        if (error) throw error;

        // Send notification
        await supabase.from('notifications').insert({
          user_id: targetId,
          type: 'friend-request',
          title: 'New Friend Request',
          message: `${profile?.full_name || 'Someone'} wants to connect with you`,
          data: { userId: user.id },
        });

        toast.success(`Friend request sent to ${targetName}!`);
      } catch (err) {
        setSuggestions(previousSuggestions);
        console.error('[FriendsWidget] Failed to send friend request:', err);
        const msg = err instanceof Error ? err.message : 'Failed to send friend request';
        toast.error(msg);
      } finally {
        setProcessingId(null);
      }
    },
    [user, profile, suggestions],
  );

  // -------------------------------------------------------------------------
  // Render: Loading skeleton
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <WidgetCard
        title="Friends"
        icon={<Users className="w-4 h-4 text-white" />}
        gradient="from-social-friends-400 to-social-friends-600"
        seeAllLink="/social/friends"
        seeAllLabel="Manage friends"
        loading
      >
        {null}
      </WidgetCard>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Empty state
  // -------------------------------------------------------------------------

  if (friends.length === 0 && pendingRequests.length === 0 && suggestions.length === 0) {
    return (
      <WidgetCard
        title="Friends"
        icon={<Users className="w-4 h-4 text-white" />}
        gradient="from-social-friends-400 to-social-friends-600"
        seeAllLink="/social/friends"
        seeAllLabel="Find friends"
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-social-friends-100 to-social-friends-200 flex items-center justify-center">
              <Search className="w-7 h-7 text-social-friends-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-social-friends-400 to-social-friends-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No friends yet</p>
          <p className="text-xs text-gray-400 max-w-[200px] mb-3">
            Find people to carpool with and grow your network!
          </p>
          <Link
            to="/social/friends"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-social-friends-500 hover:bg-social-friends-600 rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Find Friends
          </Link>
        </div>
      </WidgetCard>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Populated widget
  // -------------------------------------------------------------------------

  const badgeCount = pendingRequests.length > 0 ? pendingRequests.length : undefined;

  return (
    <WidgetCard
      title="Friends"
      icon={<Users className="w-4 h-4 text-white" />}
      gradient="from-social-friends-400 to-social-friends-600"
      seeAllLink="/social/friends"
      seeAllLabel="Manage friends"
      badge={badgeCount}
    >
      <div className="space-y-3">
        {/* --- Online friends banner --- */}
        {onlineFriends.length > 0 && (
          <div className="flex items-center gap-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-presence-pulse flex-shrink-0" />
              <span className="text-xs font-semibold text-emerald-700">
                {onlineFriends.length} friend{onlineFriends.length > 1 ? 's' : ''} online
              </span>
            </div>
            {/* Online avatar stack */}
            <div className="flex -space-x-2 ml-auto">
              {onlineFriends.slice(0, MAX_ONLINE_AVATARS).map((friend) => (
                <Link
                  key={friend.id}
                  to={`/profile/${friend.id}`}
                  title={friend.full_name}
                  className="relative hover:z-10 transition-transform hover:scale-110"
                >
                  <Avatar
                    url={getAvatarUrl(friend)}
                    name={friend.full_name}
                    size="sm"
                    className="ring-2 ring-white"
                  />
                </Link>
              ))}
              {onlineFriends.length > MAX_ONLINE_AVATARS && (
                <div className="w-8 h-8 rounded-full bg-social-friends-100 ring-2 ring-white flex items-center justify-center text-xs font-semibold text-social-friends-700">
                  +{onlineFriends.length - MAX_ONLINE_AVATARS}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Incoming wave banners --- */}
        <AnimatePresence mode="popLayout">
          {incomingWaves.slice(0, 2).map((wave) => (
            <motion.div
              key={wave.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                <Avatar
                  url={wave.from_user_avatar}
                  name={wave.from_user_name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">
                    <span className="font-semibold">{wave.from_user_name}</span>{' '}
                    waved at you!
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {relativeTime(wave.created_at)}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => waveBack(wave)}
                  disabled={waveSentIds.has(wave.from_user_id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Hand className="w-3 h-3" />
                  Wave back
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* --- Friends list --- */}
        {visibleFriends.length > 0 && (
          <div className="space-y-0.5">
            {visibleFriends.map((friend, index) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className="group flex items-center gap-2.5 px-2 py-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {/* Avatar with presence */}
                <Link to={`/profile/${friend.id}`} className="flex-shrink-0">
                  <AvatarWithPresence friend={friend} />
                </Link>

                {/* Name & status */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${friend.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-social-friends-700 transition-colors truncate block"
                  >
                    {friend.full_name}
                  </Link>
                  {friend.presence === 'online' ? (
                    <p className="text-[11px] text-emerald-500">Online</p>
                  ) : friend.presence === 'idle' ? (
                    <p className="text-[11px] text-amber-500">Idle</p>
                  ) : friend.last_seen_at ? (
                    <p className="text-[11px] text-gray-400 truncate">
                      Last seen {relativeTime(friend.last_seen_at)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400">Offline</p>
                  )}
                </div>

                {/* Quick action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
                  {/* Wave button */}
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => sendWave(friend.id, friend.full_name)}
                    disabled={waveSentIds.has(friend.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:cursor-default"
                    title={waveSentIds.has(friend.id) ? 'Wave sent!' : `Wave at ${friend.full_name}`}
                  >
                    <Hand className="w-4 h-4" />
                  </motion.button>

                  {/* Message button */}
                  <button
                    onClick={() => navigate('/messages')}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-social-friends-600 hover:bg-social-friends-50 transition-colors"
                    title={`Message ${friend.full_name}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>

                  {/* More actions menu */}
                  <QuickActionMenu
                    position="bottom"
                    trigger={
                      <span className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors inline-flex">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </span>
                    }
                    actions={[
                      {
                        icon: <MessageCircle className="w-4 h-4" />,
                        label: 'Message',
                        onClick: () => navigate('/messages'),
                      },
                      {
                        icon: <Car className="w-4 h-4" />,
                        label: 'Invite to Ride',
                        onClick: () => navigate('/search'),
                      },
                      {
                        icon: <Trophy className="w-4 h-4" />,
                        label: 'Challenge',
                        onClick: () => navigate('/social/challenges'),
                      },
                      {
                        icon: <Eye className="w-4 h-4" />,
                        label: 'View Profile',
                        onClick: () => navigate(`/profile/${friend.id}`),
                      },
                    ]}
                  />
                </div>
              </motion.div>
            ))}

            {/* Show more link */}
            {sortedFriends.length > MAX_VISIBLE_FRIENDS && (
              <Link
                to="/social/friends"
                className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-social-friends-600 hover:text-social-friends-700 transition-colors"
              >
                View all {sortedFriends.length} friends
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        {/* --- Pending requests section --- */}
        {pendingRequests.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-social-warm-500 animate-pulse-soft" />
              <span className="text-xs font-semibold text-gray-600">
                {pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Show the most recent request inline */}
            <AnimatePresence mode="popLayout">
              {pendingRequests.slice(0, 1).map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2.5 p-2.5 bg-social-warm-50 border border-social-warm-100 rounded-xl"
                >
                  <Avatar
                    url={getAvatarUrl(request.from_user)}
                    name={request.from_user.full_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {request.from_user.full_name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {relativeTime(request.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        acceptRequest(request.id, request.from_user.full_name)
                      }
                      disabled={processingId === request.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-social-friends-500 hover:bg-social-friends-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Accept
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => declineRequest(request.id)}
                      disabled={processingId === request.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Decline"
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {pendingRequests.length > 1 && (
              <Link
                to="/social/friends"
                className="flex items-center justify-center gap-1 mt-2 text-xs font-medium text-social-warm-600 hover:text-social-warm-700 transition-colors"
              >
                View all requests
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        {/* --- Friend suggestions --- */}
        {suggestions.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-social-friends-500" />
              <span className="text-xs font-semibold text-gray-600">
                People you may know
              </span>
            </div>

            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2.5"
                >
                  <Link to={`/profile/${suggestion.id}`} className="flex-shrink-0">
                    <Avatar
                      url={getAvatarUrl(suggestion)}
                      name={suggestion.full_name}
                      size="sm"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${suggestion.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-social-friends-700 transition-colors truncate block"
                    >
                      {suggestion.full_name}
                    </Link>
                    <p className="text-[11px] text-gray-400 truncate">
                      {suggestion.mutualInfo}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      sendFriendRequest(suggestion.id, suggestion.full_name)
                    }
                    disabled={processingId === suggestion.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-social-friends-700 bg-social-friends-50 hover:bg-social-friends-100 border border-social-friends-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processingId === suggestion.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <UserPlus className="w-3 h-3" />
                    )}
                    Add
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
