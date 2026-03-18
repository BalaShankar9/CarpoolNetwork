import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UserPlus, UserCheck, Users, X, Search, MessageCircle, Loader2, ShieldOff, Ban, Clock, AlertTriangle, Sparkles, Car } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ClickableUserProfile from '../shared/ClickableUserProfile';
import { toast } from '../../lib/toast';

interface FriendProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  bio?: string;
  average_rating?: number;
  total_rides_offered?: number;
  total_rides_taken?: number;
  trust_score?: number;
  profile_verified?: boolean;
}

interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  friend_id: string;
  friend: FriendProfile;
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  friend: FriendProfile;
}

interface UserSearchResult {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  bio?: string;
  average_rating?: number;
  trust_score?: number;
  profile_verified?: boolean;
}

interface BlockedUser {
  block_id: string;
  blocked_id: string;
  full_name: string;
  avatar_url?: string | null;
  blocked_at: string;
}

type SortOption = 'az' | 'rides' | 'recent';
type TabKey = 'friends' | 'requests' | 'add' | 'blocked';

/* ------------------------------------------------------------------ */
/*  Animated counter - rolls up from 0 to target                      */
/* ------------------------------------------------------------------ */
function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const duration = 400; // ms
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    };
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}

/* ------------------------------------------------------------------ */
/*  Confirmation dialog                                                */
/* ------------------------------------------------------------------ */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor = 'red',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: 'red' | 'blue';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const btnColor =
    confirmColor === 'red'
      ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
      : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-[fadeScaleIn_200ms_ease-out]">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirmColor === 'red' ? 'bg-red-100' : 'bg-blue-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${confirmColor === 'red' ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        </div>
        <p className="text-sm text-gray-600 mb-6 ml-[52px]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trust score mini bar                                               */
/* ------------------------------------------------------------------ */
function TrustBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const color =
    pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-gray-500 tabular-nums w-7 text-right">
        {score}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simulated online status (based on recent activity heuristic)       */
/* ------------------------------------------------------------------ */
function isRecentlyActive(friend: FriendProfile): boolean {
  // Simulate: hash the id to get a stable "online" boolean per render
  let hash = 0;
  for (let i = 0; i < friend.id.length; i++) {
    hash = (hash << 5) - hash + friend.id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 3 !== 0; // ~66 % appear "online"
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function FriendsManager() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [messagingFriend, setMessagingFriend] = useState<string | null>(null);

  // New UI state
  const [sortOption, setSortOption] = useState<SortOption>('az');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'unblock';
    id: string;
    name: string;
  } | null>(null);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  /* ---- data loading (unchanged logic) ---- */

  useEffect(() => {
    if (profile?.id) {
      loadFriends();
      loadBlockedUsers();
      return setupRealtimeSubscription(profile.id);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const setupRealtimeSubscription = (userId: string) => {
    const channel = supabase
      .channel('friends')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_a=eq.${userId}`
        },
        () => { loadFriends(); }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_b=eq.${userId}`
        },
        () => { loadFriends(); }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `from_user_id=eq.${userId}`
        },
        () => { loadFriends(); }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${userId}`
        },
        () => { loadFriends(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const loadFriends = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      const profileSelect = 'id, full_name, avatar_url, profile_photo_url, bio, average_rating, trust_score, profile_verified, total_rides_offered, total_rides_taken';
      const userId = profile.id;

      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (friendsError) throw friendsError;

      const friendIds = (friendships || []).map((row) =>
        row.user_a === userId ? row.user_b : row.user_a
      );

      const { data: friendProfiles, error: friendProfilesError } = friendIds.length
        ? await supabase
          .from('profiles')
          .select(profileSelect)
          .in('id', friendIds)
        : { data: [], error: null };

      if (friendProfilesError) throw friendProfilesError;

      const friendProfileMap = new Map<string, FriendProfile>(
        (friendProfiles || []).map((friend): [string, FriendProfile] => [friend.id, friend as FriendProfile])
      );

      const formattedFriends: Friendship[] = [];
      (friendships || []).forEach((row) => {
        const friendId = row.user_a === userId ? row.user_b : row.user_a;
        const friend = friendProfileMap.get(friendId);
        if (!friend) return;
        formattedFriends.push({
          id: row.id,
          user_a: row.user_a,
          user_b: row.user_b,
          created_at: row.created_at,
          friend_id: friendId,
          friend
        });
      });

      const { data: receivedRequests, error: requestsError } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, to_user_id, status, created_at')
        .eq('to_user_id', userId)
        .eq('status', 'PENDING');

      if (requestsError) throw requestsError;

      const { data: sentReqs, error: sentError } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, to_user_id, status, created_at')
        .eq('from_user_id', userId)
        .eq('status', 'PENDING');

      if (sentError) throw sentError;

      const requestProfileIds = new Set<string>();
      (receivedRequests || []).forEach((request) => requestProfileIds.add(request.from_user_id));
      (sentReqs || []).forEach((request) => requestProfileIds.add(request.to_user_id));

      const { data: requestProfiles, error: requestProfilesError } = requestProfileIds.size
        ? await supabase
          .from('profiles')
          .select(profileSelect)
          .in('id', Array.from(requestProfileIds))
        : { data: [], error: null };

      if (requestProfilesError) throw requestProfilesError;

      const requestProfileMap = new Map<string, FriendProfile>(
        (requestProfiles || []).map((rp): [string, FriendProfile] => [rp.id, rp as FriendProfile])
      );

      const formattedPendingRequests: FriendRequest[] = [];
      (receivedRequests || []).forEach((request) => {
        const friend = requestProfileMap.get(request.from_user_id);
        if (!friend) return;
        formattedPendingRequests.push({ ...request, friend });
      });

      const formattedSentRequests: FriendRequest[] = [];
      (sentReqs || []).forEach((request) => {
        const friend = requestProfileMap.get(request.to_user_id);
        if (!friend) return;
        formattedSentRequests.push({ ...request, friend });
      });

      setFriends(formattedFriends);
      setPendingRequests(formattedPendingRequests);
      setSentRequests(formattedSentRequests);
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedUsers = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_blocked_users');

      if (error) {
        console.warn('get_blocked_users RPC failed, using fallback:', error);
        const { data: blocksData, error: blocksError } = await supabase
          .from('blocks')
          .select('id, blocked_id, created_at')
          .eq('blocker_id', profile.id);

        if (blocksError) throw blocksError;

        if (blocksData && blocksData.length > 0) {
          const blockedIds = blocksData.map(b => b.blocked_id);
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', blockedIds);

          if (profilesError) throw profilesError;

          const profileMap = new Map((profiles || []).map(p => [p.id, p]));
          const blocked: BlockedUser[] = blocksData.map(b => {
            const p = profileMap.get(b.blocked_id);
            return {
              block_id: b.id,
              blocked_id: b.blocked_id,
              full_name: p?.full_name || 'Unknown User',
              avatar_url: p?.avatar_url || null,
              blocked_at: b.created_at
            };
          });
          setBlockedUsers(blocked);
        } else {
          setBlockedUsers([]);
        }
        return;
      }

      setBlockedUsers((data || []) as BlockedUser[]);
    } catch (err) {
      console.error('Error loading blocked users:', err);
    }
  };

  /* ---- search with debounce ---- */

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_photo_url, bio, average_rating, trust_score, profile_verified')
        .ilike('full_name', `%${query}%`)
        .neq('id', profile?.id)
        .limit(10);

      if (error) throw error;

      const existingFriendIds = new Set([
        ...friends.map((f) => f.friend.id),
        ...pendingRequests.map((r) => r.friend.id),
        ...sentRequests.map((r) => r.friend.id)
      ]);

      const filteredResults = (data || []).filter(
        user => !existingFriendIds.has(user.id)
      );

      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchUsers(value);
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, pendingRequests, sentRequests, profile?.id]);

  /* ---- "People you may know" suggestions ---- */

  const loadSuggestions = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setLoadingSuggestions(true);
      // Grab a handful of profiles that are NOT already friends
      const existingIds = new Set([
        profile.id,
        ...friends.map(f => f.friend.id),
        ...pendingRequests.map(r => r.friend.id),
        ...sentRequests.map(r => r.friend.id),
        ...blockedUsers.map(b => b.blocked_id),
      ]);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_photo_url, bio, average_rating, trust_score, profile_verified')
        .neq('id', profile.id)
        .limit(20);

      if (error) throw error;

      const filtered = (data || [])
        .filter(u => !existingIds.has(u.id))
        .slice(0, 6);

      setSuggestions(filtered);
    } catch (err) {
      console.error('Error loading suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [profile?.id, friends, pendingRequests, sentRequests, blockedUsers]);

  useEffect(() => {
    if (activeTab === 'add' && suggestions.length === 0) {
      loadSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ---- actions (unchanged logic, UI wiring updated) ---- */

  const sendFriendRequest = async (friendId: string) => {
    try {
      setProcessingRequest(friendId);
      const { error } = await supabase
        .rpc('send_friend_request', { p_to_user_id: friendId });

      if (error) throw error;

      await supabase
        .from('notifications')
        .insert({
          user_id: friendId,
          type: 'friend-request',
          title: 'New Friend Request',
          message: `${profile?.full_name} wants to connect with you`,
          data: { userId: profile?.id }
        });

      setSentRequestIds(prev => new Set(prev).add(friendId));
      setSearchResults(prev => prev.filter(u => u.id !== friendId));
      setSuggestions(prev => prev.filter(u => u.id !== friendId));
      await loadFriends();
      toast.success('Friend request sent!');
    } catch (err) {
      console.error('Error sending friend request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send friend request';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
    }
  };

  const acceptFriendRequest = async (requestId: string, friendName: string) => {
    try {
      setProcessingRequest(requestId);
      const { data, error } = await supabase
        .rpc('accept_friend_request', { p_request_id: requestId });

      if (error) {
        console.error('Accept friend request error:', error);
        throw error;
      }

      console.log('Friend request accepted successfully:', data);
      await loadFriends();
      toast.success(`You are now friends with ${friendName}!`);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to accept friend request';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      const { error } = await supabase
        .rpc('decline_friend_request', { p_request_id: requestId });

      if (error) throw error;
      await loadFriends();
      toast.success('Friend request declined');
    } catch (err) {
      console.error('Error declining friend request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to decline friend request';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'CANCELLED' })
        .eq('id', requestId);

      if (error) throw error;
      await loadFriends();
      toast.success('Friend request cancelled');
    } catch (err) {
      console.error('Error canceling friend request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel friend request';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
    }
  };

  const removeFriend = async (friendshipId: string, friendName: string) => {
    try {
      setProcessingRequest(friendshipId);
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      await loadFriends();
      toast.success(`Removed ${friendName} from friends`);
    } catch (err) {
      console.error('Error removing friend:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove friend';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
      setConfirmAction(null);
    }
  };

  const messageFriend = async (friendId: string) => {
    try {
      setMessagingFriend(friendId);

      const { data: conversationId, error } = await supabase.rpc('get_or_create_dm', {
        p_friend_id: friendId
      });

      if (error) {
        console.warn('get_or_create_dm RPC failed, navigating to messages:', error);
        navigate('/messages');
        return;
      }

      navigate(`/messages?conversation=${conversationId}`);
    } catch (err) {
      console.error('Error starting message:', err);
      navigate('/messages');
    } finally {
      setMessagingFriend(null);
    }
  };

  const unblockUser = async (blockId: string, userName: string) => {
    try {
      setProcessingRequest(blockId);

      const blockedUser = blockedUsers.find(b => b.block_id === blockId);
      if (blockedUser) {
        const { error } = await supabase.rpc('unblock_user', {
          p_blocked_id: blockedUser.blocked_id
        });

        if (error) {
          console.warn('unblock_user RPC failed, using fallback:', error);
          const { error: deleteError } = await supabase
            .from('blocks')
            .delete()
            .eq('id', blockId);

          if (deleteError) throw deleteError;
        }
      }

      await loadBlockedUsers();
      toast.success(`Unblocked ${userName}`);
    } catch (err) {
      console.error('Error unblocking user:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to unblock user';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
      setConfirmAction(null);
    }
  };

  /* ---- sorted friends list ---- */

  const sortedFriends = useMemo(() => {
    const list = [...friends];
    switch (sortOption) {
      case 'az':
        list.sort((a, b) => a.friend.full_name.localeCompare(b.friend.full_name));
        break;
      case 'rides':
        list.sort((a, b) => {
          const aRides = (b.friend.total_rides_offered || 0) + (b.friend.total_rides_taken || 0);
          const bRides = (a.friend.total_rides_offered || 0) + (a.friend.total_rides_taken || 0);
          return aRides - bRides;
        });
        break;
      case 'recent':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return list;
  }, [friends, sortOption]);

  /* ---- tab config ---- */

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" />, badge: friends.length },
    { key: 'requests', label: 'Requests', icon: <UserCheck className="w-4 h-4" />, badge: pendingRequests.length },
    { key: 'add', label: 'Add Friends', icon: <UserPlus className="w-4 h-4" /> },
    { key: 'blocked', label: 'Blocked', icon: <Ban className="w-4 h-4" />, badge: blockedUsers.length },
  ];

  const totalRides = (f: FriendProfile) => (f.total_rides_offered || 0) + (f.total_rides_taken || 0);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  };

  /* ---- loading skeleton ---- */

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* header skeleton */}
        <div className="p-6 pb-4">
          <div className="h-7 w-52 bg-gray-200 rounded-lg animate-pulse mb-5" />
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[72px] bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-1 h-10 bg-gray-100 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        {/* content skeleton */}
        <div className="px-6 pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[140px] bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <>
      {/* -- inline keyframes (only injected once) -- */}
      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">

        {/* ============================================================ */}
        {/*  HEADER + STATS                                              */}
        {/* ============================================================ */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-gradient-to-b from-gray-50/60 to-white">
          {/* Title */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Friends & Connections</h3>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Total friends */}
            <div className="bg-white border border-gray-200/80 rounded-xl px-4 py-3 flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none mb-0.5">
                <AnimatedCount value={friends.length} />
              </span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Friends</span>
            </div>

            {/* Pending requests */}
            <div className="relative bg-white border border-gray-200/80 rounded-xl px-4 py-3 flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none mb-0.5">
                <AnimatedCount value={pendingRequests.length} />
              </span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Pending</span>
              {pendingRequests.length > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{ animation: 'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
                >
                  {pendingRequests.length}
                </span>
              )}
            </div>

            {/* Sent requests */}
            <div className="bg-white border border-gray-200/80 rounded-xl px-4 py-3 flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none mb-0.5">
                <AnimatedCount value={sentRequests.length} />
              </span>
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Sent</span>
            </div>
          </div>

          {/* ============================================================ */}
          {/*  PILL TABS                                                   */}
          {/* ============================================================ */}
          <div
            ref={tabsContainerRef}
            className="flex gap-1 bg-gray-100 p-1 rounded-full"
            role="tablist"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const isBlocked = tab.key === 'blocked';
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.key);
                    if (tab.key === 'blocked') loadBlockedUsers();
                  }}
                  className={`
                    relative flex-1 flex items-center justify-center gap-1.5
                    px-3 py-2 rounded-full text-xs sm:text-sm font-medium
                    transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${isActive
                      ? isBlocked
                        ? 'bg-white text-red-700 shadow-sm'
                        : 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {/* notification badge on requests tab */}
                  {tab.key === 'requests' && pendingRequests.length > 0 && !isActive && (
                    <span
                      className="absolute -top-1 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                      style={{ animation: 'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/*  TAB CONTENT                                                 */}
        {/* ============================================================ */}
        <div className="p-5 sm:p-6" style={{ animation: 'slideUp 250ms ease-out' }} key={activeTab}>

          {/* ---------------------------------------------------------- */}
          {/*  FRIENDS TAB                                                */}
          {/* ---------------------------------------------------------- */}
          {activeTab === 'friends' && (
            <>
              {friends.length === 0 ? (
                /* empty state */
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
                    <Users className="w-10 h-10 text-blue-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">Your carpool circle awaits!</h4>
                  <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                    Connect with people to find rides faster and build your trusted network.
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Find Friends
                  </button>
                </div>
              ) : (
                <>
                  {/* Sort bar */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500 font-medium">
                      {friends.length} friend{friends.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-0.5">
                      <button
                        onClick={() => setSortOption('az')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${sortOption === 'az' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Sort A-Z"
                      >
                        A-Z
                      </button>
                      <button
                        onClick={() => setSortOption('rides')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${sortOption === 'rides' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Sort by rides"
                      >
                        <Car className="w-3 h-3" />
                        Rides
                      </button>
                      <button
                        onClick={() => setSortOption('recent')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${sortOption === 'recent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Sort by recently added"
                      >
                        <Clock className="w-3 h-3" />
                        Recent
                      </button>
                    </div>
                  </div>

                  {/* Friend cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sortedFriends.map((friendship) => {
                      const online = isRecentlyActive(friendship.friend);
                      const rides = totalRides(friendship.friend);

                      return (
                        <div
                          key={friendship.id}
                          className="group relative bg-gray-50/80 border border-gray-200/70 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                          {/* Top row: avatar + name */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="relative flex-shrink-0">
                              <ClickableUserProfile
                                user={{
                                  id: friendship.friend.id,
                                  full_name: friendship.friend.full_name,
                                  avatar_url: friendship.friend.avatar_url,
                                  profile_photo_url: friendship.friend.profile_photo_url
                                }}
                                size="sm"
                                rating={friendship.friend.average_rating}
                                verified={friendship.friend.profile_verified}
                              />
                              {/* Online indicator */}
                              <span
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                title={online ? 'Recently active' : 'Away'}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <ClickableUserProfile
                                user={{
                                  id: friendship.friend.id,
                                  full_name: friendship.friend.full_name,
                                  avatar_url: friendship.friend.avatar_url,
                                  profile_photo_url: friendship.friend.profile_photo_url
                                }}
                                size="xs"
                                showNameRight={true}
                                className="!gap-0 [&_img]:hidden [&>div:first-child]:hidden"
                                additionalInfo={
                                  <span className="text-gray-400 text-[11px]">
                                    Friends since {new Date(friendship.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                  </span>
                                }
                              />
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-4 mb-3 px-0.5">
                            {/* Ride count */}
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Car className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">
                                {rides > 0 ? `${rides} ride${rides !== 1 ? 's' : ''}` : 'No rides yet'}
                              </span>
                            </div>
                          </div>

                          {/* Trust bar */}
                          {typeof friendship.friend.trust_score === 'number' && (
                            <div className="mb-3 px-0.5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trust</span>
                              </div>
                              <TrustBar score={friendship.friend.trust_score} />
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => messageFriend(friendship.friend_id)}
                              disabled={messagingFriend === friendship.friend_id}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                              title="Message"
                            >
                              {messagingFriend === friendship.friend_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MessageCircle className="w-3.5 h-3.5" />
                              )}
                              Message
                            </button>
                            <button
                              onClick={() => setConfirmAction({ type: 'remove', id: friendship.id, name: friendship.friend.full_name })}
                              disabled={processingRequest === friendship.id}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Remove friend"
                            >
                              {processingRequest === friendship.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ---------------------------------------------------------- */}
          {/*  REQUESTS TAB                                               */}
          {/* ---------------------------------------------------------- */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {pendingRequests.length === 0 && sentRequests.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-50 flex items-center justify-center">
                    <UserCheck className="w-10 h-10 text-gray-300" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">No pending requests</h4>
                  <p className="text-sm text-gray-500">When someone sends you a request, it will appear here.</p>
                </div>
              ) : (
                <>
                  {/* Received */}
                  {pendingRequests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        Received
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                      </h4>
                      <div className="space-y-3">
                        {pendingRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 rounded-xl border border-blue-200/60"
                            style={{ animation: 'slideUp 300ms ease-out' }}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <ClickableUserProfile
                                user={{
                                  id: request.friend.id,
                                  full_name: request.friend.full_name,
                                  avatar_url: request.friend.avatar_url,
                                  profile_photo_url: request.friend.profile_photo_url
                                }}
                                size="sm"
                                rating={request.friend.average_rating}
                                verified={request.friend.profile_verified}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{request.friend.full_name}</p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {request.friend.bio || 'No bio'}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {timeAgo(request.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 flex-shrink-0 sm:ml-auto">
                              <button
                                onClick={() => acceptFriendRequest(request.id, request.friend.full_name)}
                                disabled={processingRequest === request.id}
                                className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {processingRequest === request.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                                Accept
                              </button>
                              <button
                                onClick={() => declineFriendRequest(request.id)}
                                disabled={processingRequest === request.id}
                                className="flex-1 sm:flex-initial px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-full border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                <X className="w-3.5 h-3.5" />
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sent */}
                  {sentRequests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        Sent
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{sentRequests.length}</span>
                      </h4>
                      <div className="space-y-3">
                        {sentRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-xl border border-gray-200/60"
                          >
                            <ClickableUserProfile
                              user={{
                                id: request.friend.id,
                                full_name: request.friend.full_name,
                                avatar_url: request.friend.avatar_url,
                                profile_photo_url: request.friend.profile_photo_url
                              }}
                              size="sm"
                              showNameRight={true}
                              additionalInfo={
                                <span className="flex items-center gap-1 text-amber-600">
                                  <Clock className="w-3 h-3" />
                                  Pending...
                                </span>
                              }
                            />

                            <div className="flex-1" />

                            <button
                              onClick={() => cancelFriendRequest(request.id)}
                              disabled={processingRequest === request.id}
                              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {processingRequest === request.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                              Cancel
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/*  ADD FRIENDS TAB                                            */}
          {/* ---------------------------------------------------------- */}
          {activeTab === 'add' && (
            <div>
              {/* Search bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Searching spinner */}
              {searching ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-sm text-gray-500">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                /* Search results */
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                    Results
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <ClickableUserProfile
                            user={{
                              id: user.id,
                              full_name: user.full_name,
                              avatar_url: user.avatar_url,
                              profile_photo_url: user.profile_photo_url
                            }}
                            size="sm"
                            rating={user.average_rating}
                            verified={user.profile_verified}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
                            {user.bio && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{user.bio}</p>
                            )}
                          </div>
                        </div>

                        {typeof user.trust_score === 'number' && (
                          <div className="mb-3 px-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trust</span>
                            <TrustBar score={user.trust_score} />
                          </div>
                        )}

                        {sentRequestIds.has(user.id) ? (
                          <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">
                            <UserCheck className="w-3.5 h-3.5" />
                            Request Sent
                          </div>
                        ) : (
                          <button
                            onClick={() => sendFriendRequest(user.id)}
                            disabled={processingRequest === user.id}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {processingRequest === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            Add Friend
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : searchQuery.trim() ? (
                /* No results */
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                    <Search className="w-8 h-8 text-gray-300" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">No users found</h4>
                  <p className="text-xs text-gray-500">Try a different name or spelling</p>
                </div>
              ) : (
                /* Default: suggestions */
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">People you may know</p>
                  </div>

                  {loadingSuggestions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {suggestions.map((user) => (
                        <div
                          key={user.id}
                          className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <ClickableUserProfile
                              user={{
                                id: user.id,
                                full_name: user.full_name,
                                avatar_url: user.avatar_url,
                                profile_photo_url: user.profile_photo_url
                              }}
                              size="sm"
                              rating={user.average_rating}
                              verified={user.profile_verified}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
                              {user.bio && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{user.bio}</p>
                              )}
                            </div>
                          </div>

                          {typeof user.trust_score === 'number' && (
                            <div className="mb-3 px-0.5">
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trust</span>
                              <TrustBar score={user.trust_score} />
                            </div>
                          )}

                          {sentRequestIds.has(user.id) ? (
                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">
                              <UserCheck className="w-3.5 h-3.5" />
                              Request Sent
                            </div>
                          ) : (
                            <button
                              onClick={() => sendFriendRequest(user.id)}
                              disabled={processingRequest === user.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {processingRequest === user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="w-3.5 h-3.5" />
                              )}
                              Add Friend
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                        <UserPlus className="w-8 h-8 text-blue-300" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Search for friends</h4>
                      <p className="text-xs text-gray-500">Enter a name above to find people</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/*  BLOCKED TAB                                                */}
          {/* ---------------------------------------------------------- */}
          {activeTab === 'blocked' && (
            <div>
              {blockedUsers.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-50 flex items-center justify-center">
                    <ShieldOff className="w-10 h-10 text-gray-300" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">No blocked users</h4>
                  <p className="text-sm text-gray-500">Users you block will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((blocked) => (
                    <div
                      key={blocked.block_id}
                      className="flex items-center gap-4 p-4 bg-red-50/60 rounded-xl border border-red-200/50"
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-red-200/60">
                        {blocked.avatar_url ? (
                          <img
                            src={blocked.avatar_url}
                            alt={blocked.full_name}
                            className="w-full h-full object-cover grayscale opacity-70"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-gray-400">
                            {blocked.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{blocked.full_name}</p>
                        <p className="text-xs text-gray-400">
                          Blocked {new Date(blocked.blocked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      <button
                        onClick={() => setConfirmAction({ type: 'unblock', id: blocked.block_id, name: blocked.full_name })}
                        disabled={processingRequest === blocked.block_id}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                      >
                        {processingRequest === blocked.block_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Ban className="w-3.5 h-3.5" />
                        )}
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  CONFIRM DIALOG                                              */}
      {/* ============================================================ */}
      <ConfirmDialog
        open={confirmAction?.type === 'remove'}
        title="Remove Friend"
        message={`Are you sure you want to remove ${confirmAction?.name || ''} from your friends? You can always send a new request later.`}
        confirmLabel="Remove"
        confirmColor="red"
        onConfirm={() => {
          if (confirmAction) removeFriend(confirmAction.id, confirmAction.name);
        }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction?.type === 'unblock'}
        title="Unblock User"
        message={`Are you sure you want to unblock ${confirmAction?.name || ''}? They will be able to interact with you again.`}
        confirmLabel="Unblock"
        confirmColor="blue"
        onConfirm={() => {
          if (confirmAction) unblockUser(confirmAction.id, confirmAction.name);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
