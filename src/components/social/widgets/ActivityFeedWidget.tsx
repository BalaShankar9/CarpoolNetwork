import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  Heart,
  Trophy,
  MessageCircle,
  Users,
  Sparkles,
  Hand,
  Camera,
  TrendingUp,
  Zap,
  ChevronUp,
  Loader2,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import PresenceIndicator from '../shared/PresenceIndicator';
import StoryCarouselWidget from './StoryCarousel';

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
  | 'wave_received'
  | 'story_posted';

type FilterTab = 'all' | 'rides' | 'friends' | 'community' | 'achievements';

interface ActivityItem {
  id: string;
  type: ActivityType;
  text: string;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  timestamp: string;
  score: number;
  reactions: { emoji: string; count: number; hasReacted: boolean }[];
  actionLabel?: string;
  actionLink?: string;
  groupedWith?: string[];
  /** Internal grouping key used during merge */
  _groupKey?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { icon: typeof Car; color: string; bg: string; ring: string; label: string }
> = {
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
    label: 'Challenge',
  },
  post_created: {
    icon: MessageCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    ring: 'ring-blue-200',
    label: 'Post',
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
    color: 'text-social-warm-600',
    bg: 'bg-social-warm-50',
    ring: 'ring-social-warm-200',
    label: 'Milestone',
  },
  wave_received: {
    icon: Hand,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    ring: 'ring-teal-200',
    label: 'Wave',
  },
  story_posted: {
    icon: Camera,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    ring: 'ring-indigo-200',
    label: 'Story',
  },
};

const FILTER_TABS: { key: FilterTab; label: string; types: ActivityType[] }[] = [
  { key: 'all', label: 'All', types: [] },
  { key: 'rides', label: 'Rides', types: ['ride_completed'] },
  { key: 'friends', label: 'Friends', types: ['friend_added', 'wave_received'] },
  { key: 'community', label: 'Community', types: ['post_created', 'group_joined', 'story_posted'] },
  { key: 'achievements', label: 'Achievements', types: ['challenge_completed', 'milestone'] },
];

const WIDGET_PAGE_SIZE = 10;
const FETCH_LIMIT = 25;
const GROUPING_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Map reaction keys to emoji characters */
const EMOJI_MAP: Record<string, string> = {
  celebrate: '\uD83C\uDF89',
  love: '\u2764\uFE0F',
  fire: '\uD83D\uDD25',
  car: '\uD83D\uDE97',
  leaf: '\uD83C\uDF3F',
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
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Exponential decay for recency scoring.
 * Returns 1.0 at 0 hours, ~0.5 at 24h, ~0.1 at 72h.
 */
function recencyScore(isoString: string): number {
  const hoursAgo = (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60);
  return Math.exp(-0.03 * hoursAgo);
}

/** Deterministic avatar background color from a string */
function avatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-teal-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-amber-500',
    'bg-cyan-500',
  ];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Priority score = (recency * 0.3) + (social_proximity * 0.4) + (engagement * 0.3)
 */
function computeScore(
  timestamp: string,
  socialProximity: number,
  reactionCount: number,
  maxReactions: number,
): number {
  const rec = recencyScore(timestamp);
  const engagement = maxReactions > 0 ? Math.min(reactionCount / maxReactions, 1) : 0;
  return rec * 0.3 + socialProximity * 0.4 + engagement * 0.3;
}

// ---------------------------------------------------------------------------
// Smart grouping: merge similar activities within a 1-hour window
// ---------------------------------------------------------------------------

function groupActivities(items: ActivityItem[]): ActivityItem[] {
  const groups = new Map<string, ActivityItem[]>();

  for (const item of items) {
    const hourBucket = Math.floor(new Date(item.timestamp).getTime() / GROUPING_WINDOW_MS);
    const key = `${item.type}:${hourBucket}:${item._groupKey || ''}`;

    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const result: ActivityItem[] = [];
  for (const [, group] of groups) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Merge: keep the most recent item as primary, attach others' names
    const sorted = [...group].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const primary = { ...sorted[0] };
    const otherNames = sorted
      .slice(1)
      .map((i) => i.userName)
      .filter((n): n is string => !!n);

    if (otherNames.length > 0) {
      primary.groupedWith = otherNames;
      const count = otherNames.length;
      const suffix = count > 1 ? 's' : '';

      if (primary.type === 'challenge_completed') {
        primary.text = `${primary.userName || 'Someone'} and ${count} other${suffix} completed a challenge`;
      } else if (primary.type === 'ride_completed') {
        primary.text = `${primary.userName || 'Someone'} and ${count} other${suffix} completed rides`;
      } else if (primary.type === 'group_joined') {
        primary.text = `${primary.userName || 'Someone'} and ${count} other${suffix} joined a group`;
      } else if (primary.type === 'friend_added') {
        primary.text = `${primary.userName || 'Someone'} and ${count} other${suffix} became friends`;
      }

      primary.score = Math.max(...sorted.map((s) => s.score));
    }

    result.push(primary);
  }

  return result.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function fetchFeedData(
  userId: string,
  friendIds: Set<string>,
  groupMemberIds: Set<string>,
): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];
  const defaultReactions: ActivityItem['reactions'] = [];

  /** Social proximity helper */
  function proximity(uid?: string | null): number {
    if (!uid) return 0.3;
    if (uid === userId) return 1.0;
    if (friendIds.has(uid)) return 1.0;
    if (groupMemberIds.has(uid)) return 0.7;
    return 0.3;
  }

  const [ridesRes, friendsRes, postsRes, challengesRes, groupsRes] = await Promise.allSettled([
    supabase
      .from('ride_bookings')
      .select(`
        id, created_at, pickup_location, dropoff_location, passenger_id,
        rides:ride_id (id, origin, destination, driver_id, profiles:driver_id (full_name, avatar_url))
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT),

    supabase
      .from('friendships')
      .select(`
        id, created_at, user_a, user_b,
        profile_a:user_a (id, full_name, avatar_url),
        profile_b:user_b (id, full_name, avatar_url)
      `)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT),

    supabase
      .from('community_posts')
      .select(`
        id, title, body, category, created_at, author_id,
        author:profiles!community_posts_author_id_fkey (full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT),

    supabase
      .from('user_challenges')
      .select(`
        id, completed_at, user_id,
        challenges:challenge_id (title, badge_icon),
        profiles:user_id (full_name, avatar_url)
      `)
      .eq('completed', true)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(FETCH_LIMIT),

    supabase
      .from('social_group_members')
      .select(`
        id, joined_at, user_id,
        social_groups:group_id (id, name),
        profiles:user_id (full_name, avatar_url)
      `)
      .order('joined_at', { ascending: false })
      .limit(FETCH_LIMIT),
  ]);

  // --- Process rides ---
  if (ridesRes.status === 'fulfilled' && ridesRes.value.data) {
    for (const booking of ridesRes.value.data) {
      const ride: any = Array.isArray(booking.rides) ? booking.rides[0] : booking.rides;
      const driverProfile = ride
        ? Array.isArray(ride.profiles)
          ? ride.profiles[0]
          : ride.profiles
        : null;
      const driverName: string = driverProfile?.full_name || 'Someone';
      const driverAvatar: string | undefined = driverProfile?.avatar_url || undefined;
      const origin: string = ride?.origin || booking.pickup_location || 'Origin';
      const destination: string = ride?.destination || booking.dropoff_location || 'Destination';
      const rideId: string | undefined = ride?.id;
      const driverUid: string | undefined = ride?.driver_id;

      items.push({
        id: `ride-${booking.id}`,
        type: 'ride_completed',
        text: `${driverName} completed a ride from ${origin} to ${destination}`,
        userName: driverName,
        userAvatar: driverAvatar,
        userId: driverUid,
        timestamp: booking.created_at,
        score: computeScore(booking.created_at, proximity(driverUid), 0, 1),
        reactions: defaultReactions,
        actionLabel: rideId ? 'View Ride' : undefined,
        actionLink: rideId ? `/rides/${rideId}` : undefined,
        _groupKey: 'rides',
      });
    }
  }

  // --- Process friendships ---
  if (friendsRes.status === 'fulfilled' && friendsRes.value.data) {
    for (const fs of friendsRes.value.data) {
      const profileA: any = Array.isArray(fs.profile_a) ? fs.profile_a[0] : fs.profile_a;
      const profileB: any = Array.isArray(fs.profile_b) ? fs.profile_b[0] : fs.profile_b;
      const friendProfile = profileA?.id === userId ? profileB : profileA;
      const friendName: string = friendProfile?.full_name || 'Someone';
      const friendAvatar: string | undefined = friendProfile?.avatar_url || undefined;

      items.push({
        id: `friend-${fs.id}`,
        type: 'friend_added',
        text: `${friendName} and you are now friends`,
        userName: friendName,
        userAvatar: friendAvatar,
        userId: friendProfile?.id,
        timestamp: fs.created_at,
        score: computeScore(fs.created_at, 1.0, 0, 1),
        reactions: defaultReactions,
        actionLabel: 'Congratulate',
        actionLink: friendProfile?.id ? `/profile/${friendProfile.id}` : undefined,
        _groupKey: 'friends',
      });
    }
  }

  // --- Process community posts ---
  if (postsRes.status === 'fulfilled' && postsRes.value.data) {
    for (const post of postsRes.value.data) {
      const author: any = Array.isArray(post.author) ? post.author[0] : post.author;
      const authorName: string = author?.full_name || 'Community Member';
      const authorAvatar: string | undefined = author?.avatar_url || undefined;
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
        userAvatar: authorAvatar,
        userId: post.author_id,
        timestamp: post.created_at,
        score: computeScore(post.created_at, proximity(post.author_id), 0, 1),
        reactions: defaultReactions,
        actionLabel: 'View Post',
        actionLink: `/community/post/${post.id}`,
      });
    }
  }

  // --- Process challenges ---
  if (challengesRes.status === 'fulfilled' && challengesRes.value.data) {
    for (const uc of challengesRes.value.data) {
      const challenge: any = Array.isArray(uc.challenges) ? uc.challenges[0] : uc.challenges;
      const userProfile: any = Array.isArray(uc.profiles) ? uc.profiles[0] : uc.profiles;
      const title: string = challenge?.title || 'a challenge';
      const isCurrentUser = uc.user_id === userId;
      const name: string = isCurrentUser ? 'You' : userProfile?.full_name || 'Someone';
      const avatar: string | undefined = userProfile?.avatar_url || undefined;
      const ts = uc.completed_at || new Date().toISOString();

      items.push({
        id: `challenge-${uc.id}`,
        type: 'challenge_completed',
        text: isCurrentUser
          ? `You earned the "${title}" badge`
          : `${name} completed the "${title}" challenge`,
        userName: name,
        userAvatar: avatar,
        userId: uc.user_id,
        timestamp: ts,
        score: computeScore(ts, proximity(uc.user_id), 0, 1),
        reactions: defaultReactions,
        actionLabel: 'View Challenges',
        actionLink: '/challenges',
        _groupKey: title,
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

      const memberName: string = memberProfile?.full_name || 'Someone';
      const memberAvatar: string | undefined = memberProfile?.avatar_url || undefined;
      const ts = member.joined_at || new Date().toISOString();

      items.push({
        id: `group-${member.id}`,
        type: 'group_joined',
        text: `${memberName} joined "${group.name}"`,
        userName: memberName,
        userAvatar: memberAvatar,
        userId: member.user_id,
        timestamp: ts,
        score: computeScore(ts, proximity(member.user_id), 0, 1),
        reactions: defaultReactions,
        actionLabel: 'View Group',
        actionLink: group.id ? `/social/groups/${group.id}` : undefined,
        _groupKey: group.name,
      });
    }
  }

  return items;
}

/** Fetch the current user's friend IDs for social proximity scoring */
async function fetchFriendIds(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('friendships')
      .select('user_a, user_b')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    const ids = new Set<string>();
    if (data) {
      for (const f of data) {
        ids.add(f.user_a === userId ? f.user_b : f.user_a);
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

/** Fetch member IDs from groups the user belongs to */
async function fetchGroupMemberIds(userId: string): Promise<Set<string>> {
  try {
    const { data: myGroups } = await supabase
      .from('social_group_members')
      .select('group_id')
      .eq('user_id', userId);

    const ids = new Set<string>();
    if (!myGroups || myGroups.length === 0) return ids;

    const groupIds = myGroups.map((g) => g.group_id);
    const { data: members } = await supabase
      .from('social_group_members')
      .select('user_id')
      .in('group_id', groupIds);

    if (members) {
      for (const m of members) {
        if (m.user_id !== userId) ids.add(m.user_id);
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Skeleton loading state for the feed */
function FeedSkeleton() {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-5 py-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-4/5" />
              <div className="h-3 bg-gray-100 rounded w-3/5" />
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-14 bg-gray-100 rounded-full" />
                <div className="h-6 w-14 bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Empty state illustration */
function FeedEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-social-warm-100 via-social-community-100 to-social-groups-100 flex items-center justify-center">
          <Activity className="w-9 h-9 text-social-warm-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-social-community-400 to-social-groups-500 flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-base font-semibold text-gray-800 mb-1.5">No activity yet</p>
      <p className="text-sm text-gray-400 max-w-[260px] leading-relaxed">
        Start connecting! Complete rides, add friends, and join challenges to see your feed come alive.
      </p>
      <div className="flex gap-3 mt-5">
        <Link
          to="/search-rides"
          className="px-4 py-2 rounded-full text-sm font-medium bg-social-warm-500 text-white hover:bg-social-warm-600 transition-colors shadow-md shadow-social-warm-200"
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
}

/** Single feed item with stagger animation */
const FeedItem = forwardRef<HTMLDivElement, { item: ActivityItem; index: number }>(function FeedItem({ item, index }, _ref) {
  const config = ACTIVITY_CONFIG[item.type];
  const Icon = config.icon;

  // Split text so the user name can be styled separately
  const nameEnd =
    item.userName && item.text.startsWith(item.userName)
      ? item.userName.length
      : -1;
  const restOfText = nameEnd > 0 ? item.text.slice(nameEnd) : item.text;
  const showNameLink = nameEnd > 0 && item.userId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
      className="px-5 py-3.5 hover:bg-gray-50/60 transition-colors duration-150 group"
    >
      <div className="flex items-start gap-3">
        {/* Avatar with type badge and presence dot */}
        <div className="relative flex-shrink-0">
          {item.userAvatar ? (
            <img
              src={item.userAvatar}
              alt={item.userName || 'User'}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full ${avatarColor(item.userName || item.id)} flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white`}
            >
              {getInitials(item.userName || '?')}
            </div>
          )}
          {/* Activity type icon badge */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${config.bg} ring-1 ${config.ring} flex items-center justify-center`}
          >
            <Icon className={`w-2.5 h-2.5 ${config.color}`} />
          </div>
          {/* Presence dot */}
          <div className="absolute -top-0.5 -right-0.5">
            <PresenceIndicator status="online" size="sm" />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Activity text */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {showNameLink ? (
              <>
                <Link
                  to={`/profile/${item.userId}`}
                  className="font-semibold text-gray-900 hover:text-social-warm-600 transition-colors"
                >
                  {item.userName}
                </Link>
                <span>{restOfText}</span>
              </>
            ) : (
              <span>{item.text}</span>
            )}
          </p>

          {/* Grouped "and X others" badge */}
          {item.groupedWith && item.groupedWith.length > 0 && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-500">
              +{item.groupedWith.length} other
              {item.groupedWith.length > 1 ? 's' : ''}
            </span>
          )}

          {/* Timestamp and type badge */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-400">
              {relativeTime(item.timestamp)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
          </div>

          {/* Reactions + quick action row */}
          <div className="flex items-center justify-between mt-2.5">
            {/* Inline reactions */}
            <div className="flex items-center gap-1.5">
              {item.reactions.length > 0 ? (
                item.reactions.map((r) => {
                  const emojiChar = EMOJI_MAP[r.emoji] || r.emoji;
                  return (
                    <button
                      key={r.emoji}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                        r.hasReacted
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <span role="img" aria-hidden="true">
                        {emojiChar}
                      </span>
                      <span className="font-medium tabular-nums">{r.count}</span>
                    </button>
                  );
                })
              ) : (
                /* Show hover-revealed quick react buttons when no reactions exist */
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {['\uD83C\uDF89', '\u2764\uFE0F', '\uD83D\uDD25'].map((emoji) => (
                    <button
                      key={emoji}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-sm transition-colors"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Context-specific quick action */}
            {item.actionLabel && item.actionLink && (
              <Link
                to={item.actionLink}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-social-warm-50 text-social-warm-600 hover:bg-social-warm-100 transition-colors opacity-0 group-hover:opacity-100 duration-200"
              >
                {item.actionLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Main Widget Component
// ---------------------------------------------------------------------------

export default function ActivityFeedWidget() {
  const { user } = useAuth();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [displayCount, setDisplayCount] = useState(WIDGET_PAGE_SIZE);

  // New activity pill state
  const [newCount, setNewCount] = useState(0);
  const feedTopRef = useRef<HTMLDivElement>(null);

  // Refs for cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Social proximity caches (populated once on first load)
  const friendIdsRef = useRef<Set<string>>(new Set());
  const groupMemberIdsRef = useRef<Set<string>>(new Set());
  const proximityLoadedRef = useRef(false);

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  const loadActivities = useCallback(
    async (isRefresh = false) => {
      if (!user) return;

      if (!isRefresh) {
        setLoading(true);
      }

      try {
        // Load social graph for proximity scoring (only once)
        if (!proximityLoadedRef.current) {
          const [friends, groupMembers] = await Promise.all([
            fetchFriendIds(user.id),
            fetchGroupMemberIds(user.id),
          ]);
          friendIdsRef.current = friends;
          groupMemberIdsRef.current = groupMembers;
          proximityLoadedRef.current = true;
        }

        const rawItems = await fetchFeedData(
          user.id,
          friendIdsRef.current,
          groupMemberIdsRef.current,
        );

        const grouped = groupActivities(rawItems);

        setActivities(grouped);
        setHasMore(grouped.length > WIDGET_PAGE_SIZE);
        setDisplayCount(WIDGET_PAGE_SIZE);

        if (isRefresh) {
          setNewCount(0);
        }
      } catch (err) {
        console.error('ActivityFeedWidget: failed to load activities', err);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  // Initial load
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // ------------------------------------------------------------------
  // Realtime: increment new count on inserts, show pill
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('activity-feed-widget')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_bookings' }, () =>
        setNewCount((c) => c + 1),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, () =>
        setNewCount((c) => c + 1),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        () => setNewCount((c) => c + 1),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_challenges' },
        () => setNewCount((c) => c + 1),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_group_members' },
        () => setNewCount((c) => c + 1),
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  // ------------------------------------------------------------------
  // Infinite scroll sentinel
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!sentinelRef.current || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          setDisplayCount((prev) => {
            const next = prev + WIDGET_PAGE_SIZE;
            setHasMore(activities.length > next);
            setLoadingMore(false);
            return next;
          });
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, activities.length]);

  // ------------------------------------------------------------------
  // Filtering
  // ------------------------------------------------------------------

  const filteredActivities = useMemo(() => {
    const base =
      activeFilter === 'all'
        ? activities
        : activities.filter((a) => {
            const tab = FILTER_TABS.find((t) => t.key === activeFilter);
            return tab?.types.includes(a.type);
          });

    return base.slice(0, displayCount);
  }, [activities, activeFilter, displayCount]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleNewPillClick = () => {
    loadActivities(true);
    feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-3" ref={feedTopRef}>
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-social-warm-500" />
          Activity Feed
        </h2>
        <Link
          to="/activity"
          className="text-sm text-social-warm-600 hover:text-social-warm-700 font-medium transition-colors"
        >
          See all &rarr;
        </Link>
      </div>

      {/* Story carousel at top */}
      <StoryCarouselWidget />

      {/* Filter tabs */}
      <div
        className="px-5 pb-3 flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {FILTER_TABS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setActiveFilter(f.key);
              setDisplayCount(WIDGET_PAGE_SIZE);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeFilter === f.key
                ? 'bg-social-warm-100 text-social-warm-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* "New activities" floating pill */}
      <AnimatePresence>
        {newCount > 0 && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex justify-center py-2"
          >
            <button
              onClick={handleNewPillClick}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-social-warm-500 text-white text-xs font-medium shadow-lg shadow-social-warm-200 hover:bg-social-warm-600 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              {newCount} new activit{newCount === 1 ? 'y' : 'ies'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed content */}
      {loading ? (
        <FeedSkeleton />
      ) : activities.length === 0 ? (
        <FeedEmpty />
      ) : filteredActivities.length === 0 ? (
        /* Filter-specific empty state */
        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">
            No{' '}
            {FILTER_TABS.find((t) => t.key === activeFilter)?.label.toLowerCase() || ''}{' '}
            activity
          </p>
          <p className="text-xs text-gray-400 max-w-[220px]">
            Try a different filter or check back later.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          <AnimatePresence mode="popLayout">
            {filteredActivities.map((item, i) => (
              <FeedItem key={item.id} item={item} index={i} />
            ))}
          </AnimatePresence>

          {/* Loading more spinner */}
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-social-warm-500 animate-spin" />
              <span className="ml-2 text-xs text-gray-500">Loading more...</span>
            </div>
          )}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} className="h-1" />}
        </div>
      )}
    </div>
  );
}
