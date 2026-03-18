import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Car, Heart, Trophy, MessageCircle, Users, Sparkles, TrendingUp,
  RefreshCw, Loader2, CheckCircle2, Activity, Filter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActivityType =
  | 'ride_completed'
  | 'friend_added'
  | 'challenge_completed'
  | 'post_created'
  | 'group_joined'
  | 'milestone'
  | 'leaderboard_change';

type FilterTab = 'all' | 'rides' | 'friends' | 'community' | 'achievements';

interface ActivityItem {
  id: string;
  type: ActivityType;
  text: string;
  userName?: string;
  userId?: string;
  timestamp: string;
  meta?: Record<string, string>;
  actionLabel?: string;
  actionLink?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: typeof Car;
  color: string;
  bg: string;
  ring: string;
  label: string;
}> = {
  ride_completed: {
    icon: Car,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    label: 'Ride',
  },
  friend_added: {
    icon: Heart,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    ring: 'ring-pink-200',
    label: 'Friend',
  },
  challenge_completed: {
    icon: Trophy,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    label: 'Achievement',
  },
  post_created: {
    icon: MessageCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    ring: 'ring-blue-200',
    label: 'Community',
  },
  group_joined: {
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    ring: 'ring-purple-200',
    label: 'Group',
  },
  milestone: {
    icon: Sparkles,
    color: 'text-indigo-600',
    bg: 'bg-gradient-to-br from-indigo-50 to-purple-50',
    ring: 'ring-indigo-200',
    label: 'Milestone',
  },
  leaderboard_change: {
    icon: TrendingUp,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    ring: 'ring-orange-200',
    label: 'Leaderboard',
  },
};

const FILTER_TABS: { key: FilterTab; label: string; types: ActivityType[] }[] = [
  { key: 'all',          label: 'All',          types: [] },
  { key: 'rides',        label: 'Rides',        types: ['ride_completed'] },
  { key: 'friends',      label: 'Friends',      types: ['friend_added'] },
  { key: 'community',    label: 'Community',    types: ['post_created', 'group_joined', 'milestone'] },
  { key: 'achievements', label: 'Achievements', types: ['challenge_completed', 'leaderboard_change'] },
];

const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function dateGroupLabel(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 30) return 'This Month';
  return 'Earlier';
}

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function fetchFullActivityFeed(
  userId: string,
  limit: number,
  offset: number,
): Promise<{ items: ActivityItem[]; hasMore: boolean }> {
  const items: ActivityItem[] = [];
  const fetchLimit = limit + offset + 5; // over-fetch to guarantee enough items after merge

  const [ridesRes, friendsRes, postsRes, challengesRes, groupsRes, leaderboardRes] =
    await Promise.allSettled([
      // Completed ride bookings
      supabase
        .from('ride_bookings')
        .select(`
          id, created_at, pickup_location, dropoff_location, passenger_id,
          rides:ride_id (id, origin, destination, driver_id, profiles:driver_id (full_name))
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(fetchLimit),

      // Friendships
      supabase
        .from('friendships')
        .select(`
          id, created_at, user_a, user_b,
          profile_a:user_a (id, full_name),
          profile_b:user_b (id, full_name)
        `)
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(fetchLimit),

      // Community posts
      supabase
        .from('community_posts')
        .select(`
          id, title, body, category, created_at, author_id,
          author:profiles!community_posts_author_id_fkey (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(fetchLimit),

      // Completed challenges
      supabase
        .from('user_challenges')
        .select(`
          id, completed_at, user_id,
          challenges:challenge_id (title, badge_icon)
        `)
        .eq('completed', true)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(fetchLimit),

      // Group joins (recent members)
      supabase
        .from('social_group_members')
        .select(`
          id, joined_at, user_id,
          social_groups:group_id (id, name),
          profiles:user_id (full_name)
        `)
        .order('joined_at', { ascending: false })
        .limit(fetchLimit),

      // Leaderboard position changes for the current user
      supabase
        .from('leaderboard_cache')
        .select('user_id, rank, score, category, period, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5),
    ]);

  // --- Process rides ---
  if (ridesRes.status === 'fulfilled' && ridesRes.value.data) {
    for (const booking of ridesRes.value.data) {
      const ride: any = Array.isArray(booking.rides) ? booking.rides[0] : booking.rides;
      const driverProfile = ride
        ? (Array.isArray(ride.profiles) ? ride.profiles[0] : ride.profiles)
        : null;
      const driverName = driverProfile?.full_name || 'Someone';
      const origin = ride?.origin || booking.pickup_location || 'Origin';
      const destination = ride?.destination || booking.dropoff_location || 'Destination';
      const rideId = ride?.id;

      items.push({
        id: `ride-${booking.id}`,
        type: 'ride_completed',
        text: `${driverName} completed a ride from ${origin} to ${destination}`,
        userName: driverName,
        userId: ride?.driver_id,
        timestamp: booking.created_at,
        actionLabel: rideId ? 'View Ride' : undefined,
        actionLink: rideId ? `/rides/${rideId}` : undefined,
      });
    }
  }

  // --- Process friendships ---
  if (friendsRes.status === 'fulfilled' && friendsRes.value.data) {
    for (const fs of friendsRes.value.data) {
      const profileA: any = Array.isArray(fs.profile_a) ? fs.profile_a[0] : fs.profile_a;
      const profileB: any = Array.isArray(fs.profile_b) ? fs.profile_b[0] : fs.profile_b;
      const friendProfile = profileA?.id === userId ? profileB : profileA;
      const friendName = friendProfile?.full_name || 'Someone';

      items.push({
        id: `friend-${fs.id}`,
        type: 'friend_added',
        text: `${friendName} and you are now friends`,
        userName: friendName,
        userId: friendProfile?.id,
        timestamp: fs.created_at,
        actionLabel: 'Congratulate',
        actionLink: friendProfile?.id ? `/profile/${friendProfile.id}` : undefined,
      });
    }
  }

  // --- Process community posts ---
  if (postsRes.status === 'fulfilled' && postsRes.value.data) {
    for (const post of postsRes.value.data) {
      const author: any = Array.isArray(post.author) ? post.author[0] : post.author;
      const authorName = author?.full_name || 'Community Member';
      const title =
        post.title && post.title.length > 50
          ? post.title.slice(0, 50) + '...'
          : post.title || 'a new post';
      const categoryLabel = post.category ? ` in ${post.category}` : '';

      items.push({
        id: `post-${post.id}`,
        type: 'post_created',
        text: `${authorName} posted${categoryLabel}: "${title}"`,
        userName: authorName,
        userId: post.author_id,
        timestamp: post.created_at,
        meta: { postId: post.id },
        actionLabel: 'View Post',
        actionLink: `/community/post/${post.id}`,
      });
    }
  }

  // --- Process challenges ---
  if (challengesRes.status === 'fulfilled' && challengesRes.value.data) {
    for (const uc of challengesRes.value.data) {
      const challenge: any = Array.isArray(uc.challenges) ? uc.challenges[0] : uc.challenges;
      const title = challenge?.title || 'a challenge';
      const isCurrentUser = uc.user_id === userId;

      items.push({
        id: `challenge-${uc.id}`,
        type: 'challenge_completed',
        text: isCurrentUser
          ? `You earned the "${title}" badge`
          : `Someone earned the "${title}" badge`,
        timestamp: uc.completed_at || new Date().toISOString(),
        actionLabel: 'View Challenges',
        actionLink: '/challenges',
      });
    }
  }

  // --- Process group joins ---
  if (groupsRes.status === 'fulfilled' && groupsRes.value.data) {
    for (const member of groupsRes.value.data) {
      const group: any = Array.isArray(member.social_groups)
        ? member.social_groups[0]
        : member.social_groups;
      const memberProfile: any = Array.isArray(member.profiles)
        ? member.profiles[0]
        : member.profiles;

      if (!group) continue;

      const memberName = memberProfile?.full_name || 'Someone';
      items.push({
        id: `group-${member.id}`,
        type: 'group_joined',
        text: `${memberName} joined "${group.name}"`,
        userName: memberName,
        userId: member.user_id,
        timestamp: member.joined_at || new Date().toISOString(),
        actionLabel: 'View Group',
        actionLink: group.id ? `/social/groups/${group.id}` : undefined,
      });
    }
  }

  // --- Process leaderboard changes ---
  if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.data) {
    for (const entry of leaderboardRes.value.data) {
      if (entry.rank <= 10) {
        items.push({
          id: `leaderboard-${entry.category}-${entry.period}`,
          type: 'leaderboard_change',
          text: `You moved up to #${entry.rank} on the ${entry.category.replace('_', ' ')} leaderboard`,
          timestamp: entry.updated_at || new Date().toISOString(),
          actionLabel: 'View Leaderboard',
          actionLink: '/leaderboards',
        });
      }
    }
  }

  // Sort by timestamp descending
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Paginate
  const paged = items.slice(offset, offset + limit);
  const hasMore = items.length > offset + limit;

  return { items: paged, hasMore };
}

// ---------------------------------------------------------------------------
// Skeleton component
// ---------------------------------------------------------------------------

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-4/5" />
              <div className="h-3 bg-gray-100 rounded w-2/5" />
            </div>
            <div className="w-20 h-7 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActivityFeed() {
  const { user } = useAuth();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const offsetRef = useRef(0);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadActivities = useCallback(
    async (reset = true) => {
      if (!user) return;

      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }

      try {
        const { items, hasMore: more } = await fetchFullActivityFeed(
          user.id,
          PAGE_SIZE,
          reset ? 0 : offsetRef.current,
        );

        if (reset) {
          setActivities(items);
          offsetRef.current = items.length;
        } else {
          setActivities((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const newItems = items.filter((a) => !existingIds.has(a.id));
            offsetRef.current += newItems.length;
            return [...prev, ...newItems];
          });
        }
        setHasMore(more);
      } catch (err) {
        console.error('Failed to load activity feed:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user],
  );

  // Initial load
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // -----------------------------------------------------------------------
  // Refresh handler
  // -----------------------------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities(true);
    // Keep the animation visible for a satisfying spin
    setTimeout(() => setRefreshing(false), 600);
  };

  // -----------------------------------------------------------------------
  // Stagger-in animation with IntersectionObserver
  // -----------------------------------------------------------------------

  const itemObserverCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    const newIds = new Set<string>();
    for (const entry of entries) {
      if (entry.isIntersecting) {
        newIds.add(entry.target.getAttribute('data-activity-id') || '');
      }
    }
    if (newIds.size > 0) {
      setVisibleIds((prev) => new Set([...prev, ...newIds]));
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(itemObserverCallback, {
      threshold: 0.1,
      rootMargin: '40px',
    });
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [itemObserverCallback]);

  // -----------------------------------------------------------------------
  // Infinite scroll sentinel
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!sentinelRef.current || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          loadActivities(false);
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadActivities]);

  // -----------------------------------------------------------------------
  // Realtime subscriptions
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('activity-feed-full')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_bookings' },
        () => loadActivities(true),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships' },
        () => loadActivities(true),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        () => loadActivities(true),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_challenges' },
        () => loadActivities(true),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_group_members' },
        () => loadActivities(true),
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, loadActivities]);

  // -----------------------------------------------------------------------
  // Filtering
  // -----------------------------------------------------------------------

  const filteredActivities =
    activeFilter === 'all'
      ? activities
      : activities.filter((a) => {
          const tab = FILTER_TABS.find((t) => t.key === activeFilter);
          return tab?.types.includes(a.type);
        });

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderFilterTabs = () => (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-all duration-200 flex-shrink-0
              ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  const renderActivityCard = (item: ActivityItem, index: number) => {
    const config = ACTIVITY_CONFIG[item.type];
    const Icon = config.icon;
    const isVisible = visibleIds.has(item.id);

    return (
      <div
        key={item.id}
        data-activity-id={item.id}
        ref={(el) => {
          if (el && observerRef.current) {
            observerRef.current.observe(el);
          }
        }}
        className={`
          bg-white rounded-xl border border-gray-100 p-4
          transition-all duration-300 ease-out
          hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
        `}
        style={{
          transitionDelay: `${(index % PAGE_SIZE) * 40}ms`,
        }}
      >
        <div className="flex items-start gap-3.5">
          {/* Activity icon */}
          <div
            className={`
              w-10 h-10 rounded-full ${config.bg} ring-2 ${config.ring}
              flex items-center justify-center flex-shrink-0
              transition-transform duration-200 hover:scale-110
            `}
          >
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-relaxed">
              {item.userName && item.userId ? (
                <>
                  <Link
                    to={`/profile/${item.userId}`}
                    className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                  >
                    {item.userName}
                  </Link>
                  {item.text.replace(item.userName, '')}
                </>
              ) : (
                <span>{item.text}</span>
              )}
            </p>

            <div className="flex items-center gap-3 mt-2">
              {/* Timestamp */}
              <span className="text-xs text-gray-400">{relativeTime(item.timestamp)}</span>

              {/* Activity type badge */}
              <span
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                  ${config.bg} ${config.color}
                `}
              >
                {config.label}
              </span>
            </div>
          </div>

          {/* Action button */}
          {item.actionLabel && item.actionLink && (
            <Link
              to={item.actionLink}
              className="
                flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                bg-gray-50 text-gray-600 border border-gray-200
                hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200
                transition-all duration-200
              "
            >
              {item.actionLabel}
            </Link>
          )}
        </div>
      </div>
    );
  };

  const renderCaughtUp = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
      </div>
      <p className="text-base font-semibold text-gray-800 mb-1">You're all caught up!</p>
      <p className="text-sm text-gray-400 max-w-xs">
        You've seen all the recent activity. Check back later for more updates.
      </p>
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center">
          <Activity className="w-9 h-9 text-indigo-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-lg font-semibold text-gray-800 mb-2">No activity yet</p>
      <p className="text-sm text-gray-400 max-w-[280px] leading-relaxed">
        Your feed will light up as you complete rides, add friends, join groups, and earn achievements.
      </p>
      <div className="flex gap-3 mt-6">
        <Link
          to="/search-rides"
          className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
        >
          Find a Ride
        </Link>
        <Link
          to="/friends"
          className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Add Friends
        </Link>
      </div>
    </div>
  );

  const renderFilterEmpty = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Filter className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">
        No{' '}
        {FILTER_TABS.find((t) => t.key === activeFilter)?.label.toLowerCase() || ''}{' '}
        activity
      </p>
      <p className="text-xs text-gray-400 max-w-[220px]">
        Try selecting a different filter or check back later.
      </p>
    </div>
  );

  // -----------------------------------------------------------------------
  // Group activities by date
  // -----------------------------------------------------------------------

  const groupedActivities: { label: string; items: ActivityItem[] }[] = [];
  let currentGroup = '';
  for (const item of filteredActivities) {
    const group = dateGroupLabel(item.timestamp);
    if (group !== currentGroup) {
      currentGroup = group;
      groupedActivities.push({ label: group, items: [item] });
    } else {
      groupedActivities[groupedActivities.length - 1].items.push(item);
    }
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            See what's happening in your carpool network
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="
            w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm
            flex items-center justify-center
            hover:bg-gray-50 hover:border-gray-300
            active:scale-95
            transition-all duration-200
            disabled:opacity-50
          "
          title="Refresh feed"
        >
          <RefreshCw
            className={`w-4.5 h-4.5 text-gray-600 transition-transform duration-600 ${
              refreshing ? 'animate-spin' : ''
            }`}
          />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-5">{renderFilterTabs()}</div>

      {/* Feed content */}
      {loading ? (
        <ActivitySkeleton />
      ) : activities.length === 0 ? (
        renderEmpty()
      ) : filteredActivities.length === 0 ? (
        renderFilterEmpty()
      ) : (
        <div className="space-y-6">
          {groupedActivities.map((group) => (
            <div key={group.label}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Activity cards */}
              <div className="space-y-3">
                {group.items.map((item, i) => renderActivityCard(item, i))}
              </div>
            </div>
          ))}

          {/* Loading more spinner */}
          {loadingMore && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading more...</span>
            </div>
          )}

          {/* Caught up message */}
          {!hasMore && !loadingMore && filteredActivities.length > 0 && renderCaughtUp()}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} className="h-1" />}
        </div>
      )}
    </div>
  );
}
