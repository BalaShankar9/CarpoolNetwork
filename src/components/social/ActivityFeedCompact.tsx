import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Car, Heart, Trophy, MessageCircle, Users, Sparkles, TrendingUp,
  ChevronRight, Activity
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

interface ActivityItem {
  id: string;
  type: ActivityType;
  text: string;
  userName?: string;
  userId?: string;
  timestamp: string;
  meta?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_CONFIG: Record<ActivityType, { icon: typeof Car; color: string; bg: string }> = {
  ride_completed:      { icon: Car,            color: 'text-emerald-600', bg: 'bg-emerald-100' },
  friend_added:        { icon: Heart,          color: 'text-pink-600',    bg: 'bg-pink-100' },
  challenge_completed: { icon: Trophy,         color: 'text-amber-600',   bg: 'bg-amber-100' },
  post_created:        { icon: MessageCircle,  color: 'text-blue-600',    bg: 'bg-blue-100' },
  group_joined:        { icon: Users,          color: 'text-purple-600',  bg: 'bg-purple-100' },
  milestone:           { icon: Sparkles,       color: 'text-indigo-600',  bg: 'bg-gradient-to-br from-indigo-100 to-purple-100' },
  leaderboard_change:  { icon: TrendingUp,     color: 'text-orange-600',  bg: 'bg-orange-100' },
};

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
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function fetchActivityFeed(userId: string, limit: number): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];

  const [ridesRes, friendsRes, postsRes, challengesRes] = await Promise.allSettled([
    // Recent completed ride bookings involving the user
    supabase
      .from('ride_bookings')
      .select(`
        id, created_at, pickup_location, dropoff_location,
        rides:ride_id (origin, destination, driver_id, profiles:driver_id (full_name))
      `)
      .eq('status', 'completed')
      .or(`passenger_id.eq.${userId},rides.driver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit),

    // Recent friendships
    supabase
      .from('friendships')
      .select(`
        id, created_at, user_a, user_b,
        profile_a:user_a (id, full_name),
        profile_b:user_b (id, full_name)
      `)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit),

    // Recent community posts
    supabase
      .from('community_posts')
      .select(`
        id, title, category, created_at, author_id,
        author:profiles!community_posts_author_id_fkey (full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit),

    // Recently completed challenges
    supabase
      .from('user_challenges')
      .select(`
        id, completed_at,
        challenges:challenge_id (title, badge_icon)
      `)
      .eq('completed', true)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(limit),
  ]);

  // Process rides
  if (ridesRes.status === 'fulfilled' && ridesRes.value.data) {
    for (const booking of ridesRes.value.data) {
      const ride = Array.isArray(booking.rides) ? booking.rides[0] : booking.rides;
      const driverProfile = ride ? (Array.isArray(ride.profiles) ? ride.profiles[0] : ride.profiles) : null;
      const driverName = driverProfile?.full_name || 'Someone';
      const origin = ride?.origin || booking.pickup_location || 'Origin';
      const destination = ride?.destination || booking.dropoff_location || 'Destination';
      items.push({
        id: `ride-${booking.id}`,
        type: 'ride_completed',
        text: `${driverName} completed a ride from ${origin} to ${destination}`,
        userName: driverName,
        userId: ride?.driver_id,
        timestamp: booking.created_at,
      });
    }
  }

  // Process friendships
  if (friendsRes.status === 'fulfilled' && friendsRes.value.data) {
    for (const fs of friendsRes.value.data) {
      const profileA = Array.isArray(fs.profile_a) ? fs.profile_a[0] : fs.profile_a;
      const profileB = Array.isArray(fs.profile_b) ? fs.profile_b[0] : fs.profile_b;
      const friendProfile = profileA?.id === userId ? profileB : profileA;
      const friendName = friendProfile?.full_name || 'Someone';
      items.push({
        id: `friend-${fs.id}`,
        type: 'friend_added',
        text: `${friendName} and you are now friends`,
        userName: friendName,
        userId: friendProfile?.id,
        timestamp: fs.created_at,
      });
    }
  }

  // Process community posts
  if (postsRes.status === 'fulfilled' && postsRes.value.data) {
    for (const post of postsRes.value.data) {
      const author = Array.isArray(post.author) ? post.author[0] : post.author;
      const authorName = author?.full_name || 'Community Member';
      const title = post.title?.length > 40 ? post.title.slice(0, 40) + '...' : (post.title || 'a post');
      const categoryLabel = post.category ? ` in ${post.category}` : '';
      items.push({
        id: `post-${post.id}`,
        type: 'post_created',
        text: `${authorName} posted${categoryLabel}: "${title}"`,
        userName: authorName,
        userId: post.author_id,
        timestamp: post.created_at,
        meta: { postId: post.id },
      });
    }
  }

  // Process challenges
  if (challengesRes.status === 'fulfilled' && challengesRes.value.data) {
    for (const uc of challengesRes.value.data) {
      const challenge = Array.isArray(uc.challenges) ? uc.challenges[0] : uc.challenges;
      const title = challenge?.title || 'a challenge';
      items.push({
        id: `challenge-${uc.id}`,
        type: 'challenge_completed',
        text: `You earned the "${title}" badge`,
        timestamp: uc.completed_at || new Date().toISOString(),
      });
    }
  }

  // Sort by timestamp descending and take the requested number
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActivityFeedCompact() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadActivities = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchActivityFeed(user.id, 5);
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activity feed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Stagger-in animation trigger after data loads
  useEffect(() => {
    if (!loading && activities.length > 0) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [loading, activities.length]);

  // Realtime subscriptions for auto-refresh
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('activity-feed-compact')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_bookings' },
        () => loadActivities()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships' },
        () => loadActivities()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        () => loadActivities()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_challenges' },
        () => loadActivities()
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, loadActivities]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderSkeleton = () => (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          <Activity className="w-7 h-7 text-indigo-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">No activity yet</p>
      <p className="text-xs text-gray-400 max-w-[200px]">
        Complete rides, add friends, and join challenges to see your feed come alive.
      </p>
    </div>
  );

  const renderActivityItem = (item: ActivityItem, index: number) => {
    const config = ACTIVITY_CONFIG[item.type];
    const Icon = config.icon;

    return (
      <div
        key={item.id}
        className="flex items-start gap-3 group"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: `opacity 0.3s ease ${index * 80}ms, transform 0.3s ease ${index * 80}ms`,
        }}
      >
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0
            transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 leading-snug line-clamp-2">
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
          <p className="text-xs text-gray-400 mt-0.5">
            {relativeTime(item.timestamp)}
          </p>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <Link
          to="/activity"
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700
            transition-colors group/link"
        >
          View All
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {loading ? (
          renderSkeleton()
        ) : activities.length === 0 ? (
          renderEmpty()
        ) : (
          <div className="space-y-4">
            {activities.map((item, i) => renderActivityItem(item, i))}
          </div>
        )}
      </div>
    </div>
  );
}
