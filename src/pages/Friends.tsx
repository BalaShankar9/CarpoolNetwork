import { useState, useEffect, useCallback } from 'react';
import {
  Users, UsersRound, MessageSquare, Globe, Search,
  Plus, Zap, Trophy, Target, Car,
  ChevronRight, Sparkles, Heart, Star, Award,
  MessageCircle, Flame, ArrowRight,
  Layers
} from 'lucide-react';
import FriendsManager from '../components/social/FriendsManager';
import SocialGroups from '../components/social/SocialGroups';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SocialTab = 'friends' | 'groups';

interface SocialStats {
  friendsCount: number;
  groupsCount: number;
  karmaScore: number;
  poolsCount: number;
  activeChallenges: number;
  completedChallenges: number;
}

interface RecentActivity {
  id: string;
  type: 'friend_joined' | 'ride_completed' | 'challenge_achieved' | 'post_trending';
  message: string;
  timestamp: string;
  icon: typeof Users;
  color: string;
}

interface CommunityPostPreview {
  id: string;
  title: string;
  author_name: string;
  category: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------
function useAnimatedCounter(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    let start = 0;
    const increment = target / (duration / 16);
    let raf: number;

    const step = () => {
      start += increment;
      if (start >= target) {
        setCurrent(target);
      } else {
        setCurrent(Math.floor(start));
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  gradient: string;
}) {
  const display = useAnimatedCounter(value);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-2xl font-bold text-white tabular-nums">{display}</span>
      <span className="text-xs text-white/70 font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

function QuickActionCard({
  label,
  icon: Icon,
  gradient,
  to,
  onClick,
}: {
  label: string;
  icon: typeof Users;
  gradient: string;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex flex-col items-center gap-2.5 min-w-[5.5rem] group cursor-pointer">
      <div
        className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center shadow-md
                    group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
        {label}
      </span>
    </div>
  );

  if (to) {
    return <Link to={to}>{inner}</Link>;
  }
  return <button onClick={onClick} type="button">{inner}</button>;
}

function ActivityFeedCompact({ activities }: { activities: RecentActivity[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        No recent activity yet. Start connecting!
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {activities.map((a) => {
        const Icon = a.icon;
        return (
          <div
            key={a.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group"
          >
            <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-600 flex-1 leading-snug">{a.message}</p>
            <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{a.timestamp}</span>
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  gradient,
  to,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Users;
  gradient: string;
  to: string;
  badge?: number | string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg
                 hover:-translate-y-1 transition-all duration-300 overflow-hidden group block"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center shadow-md
                        group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          {badge !== undefined && (
            <span
              className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700
                         animate-pulse"
            >
              {badge}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 text-base mb-0.5">{title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{subtitle}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
      <div
        className="flex items-center justify-between px-5 py-2.5 bg-gray-50/80 border-t border-gray-100
                    group-hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-medium text-emerald-600">View</span>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Friends() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<SocialTab>('friends');
  const [stats, setStats] = useState<SocialStats>({
    friendsCount: 0,
    groupsCount: 0,
    karmaScore: 0,
    poolsCount: 0,
    activeChallenges: 0,
    completedChallenges: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [recentPost, setRecentPost] = useState<CommunityPostPreview | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ---- data loading ----
  const loadStats = useCallback(async () => {
    if (!profile?.id && !user?.id) return;
    const uid = profile?.id || user?.id;
    if (!uid) return;

    setStatsLoading(true);

    try {
      // Parallel fetches
      const [
        friendsRes,
        groupsRes,
        poolsRes,
        challengesRes,
        karmaRes,
        postRes,
      ] = await Promise.allSettled([
        // friends count
        supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`user_a.eq.${uid},user_b.eq.${uid}`),
        // groups count
        supabase
          .from('social_group_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid),
        // pools count
        supabase
          .from('carpool_pool_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid),
        // challenges
        supabase
          .from('user_challenges')
          .select('completed, progress')
          .eq('user_id', uid),
        // karma: net upvotes on user's posts
        supabase
          .from('community_posts')
          .select('id')
          .eq('author_id', uid),
        // recent community post
        supabase
          .from('community_posts_with_stats')
          .select('id, title, author_name, category, score')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const friendsCount =
        friendsRes.status === 'fulfilled' ? friendsRes.value.count || 0 : 0;
      const groupsCount =
        groupsRes.status === 'fulfilled' ? groupsRes.value.count || 0 : 0;
      const poolsCount =
        poolsRes.status === 'fulfilled' ? poolsRes.value.count || 0 : 0;

      let activeChallenges = 0;
      let completedChallenges = 0;
      if (challengesRes.status === 'fulfilled' && challengesRes.value.data) {
        completedChallenges = challengesRes.value.data.filter(
          (c: { completed: boolean }) => c.completed,
        ).length;
        activeChallenges = challengesRes.value.data.filter(
          (c: { completed: boolean; progress: number }) => !c.completed && c.progress > 0,
        ).length;
      }

      // Karma = number of posts * 10 as a simple proxy (we can't easily sum votes across posts
      // without a server function, so use post count as karma basis)
      let karmaScore = 0;
      if (karmaRes.status === 'fulfilled' && karmaRes.value.data) {
        karmaScore = karmaRes.value.data.length * 10;
      }
      // Add completed challenges bonus
      karmaScore += completedChallenges * 25;

      setStats({
        friendsCount,
        groupsCount,
        karmaScore,
        poolsCount,
        activeChallenges,
        completedChallenges,
      });

      // Recent post for the Community card
      if (postRes.status === 'fulfilled' && postRes.value.data) {
        setRecentPost(postRes.value.data as CommunityPostPreview);
      }

      // Build activity feed
      const feed: RecentActivity[] = [];

      if (friendsCount > 0) {
        feed.push({
          id: 'friends-active',
          type: 'friend_joined',
          message: `You have ${friendsCount} friend${friendsCount !== 1 ? 's' : ''} on CarpoolNetwork`,
          timestamp: 'Now',
          icon: Heart,
          color: 'bg-pink-500',
        });
      }

      if (completedChallenges > 0) {
        feed.push({
          id: 'challenges-done',
          type: 'challenge_achieved',
          message: `${completedChallenges} challenge${completedChallenges !== 1 ? 's' : ''} completed -- keep it up!`,
          timestamp: 'Recent',
          icon: Trophy,
          color: 'bg-amber-500',
        });
      }

      if (groupsCount > 0) {
        feed.push({
          id: 'groups-member',
          type: 'friend_joined',
          message: `Active member in ${groupsCount} group${groupsCount !== 1 ? 's' : ''}`,
          timestamp: 'Active',
          icon: UsersRound,
          color: 'bg-violet-500',
        });
      }

      if (postRes.status === 'fulfilled' && postRes.value.data) {
        const post = postRes.value.data as CommunityPostPreview;
        feed.push({
          id: 'post-trending',
          type: 'post_trending',
          message: `"${post.title.length > 40 ? post.title.slice(0, 40) + '...' : post.title}" is getting attention`,
          timestamp: 'Trending',
          icon: Flame,
          color: 'bg-orange-500',
        });
      }

      setActivities(feed.slice(0, 4));
    } catch (err) {
      console.error('Failed to load social stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, [profile?.id, user?.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ---- quick action handlers ----
  const handleTabSwitch = (tab: SocialTab) => setActiveTab(tab);

  // ---- render ----
  return (
    <div className="min-h-screen pb-12">
      {/* ================================================================= */}
      {/* HERO SECTION                                                       */}
      {/* ================================================================= */}
      <div
        className="relative overflow-hidden rounded-3xl mx-auto mb-8
                    bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700"
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-teal-400/20 rounded-full blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl" />

        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-12">
          {/* Title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/15 backdrop-blur rounded-xl">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Social Hub
              </h1>
              <p className="text-emerald-100/80 text-sm mt-0.5">
                Your carpooling community at a glance
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-3 sm:grid-cols-3 gap-6 max-w-md">
            <StatCard
              label="Friends"
              value={stats.friendsCount}
              icon={Users}
              gradient="bg-white/15 backdrop-blur"
            />
            <StatCard
              label="Groups"
              value={stats.groupsCount}
              icon={UsersRound}
              gradient="bg-white/15 backdrop-blur"
            />
            <StatCard
              label="Karma"
              value={stats.karmaScore}
              icon={Star}
              gradient="bg-white/15 backdrop-blur"
            />
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* QUICK ACTIONS BAR                                                  */}
      {/* ================================================================= */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">
          Quick Actions
        </h2>
        <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          <QuickActionCard
            label="Find Friends"
            icon={Search}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            onClick={() => handleTabSwitch('friends')}
          />
          <QuickActionCard
            label="Create Group"
            icon={Plus}
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            onClick={() => handleTabSwitch('groups')}
          />
          <QuickActionCard
            label="New Post"
            icon={MessageCircle}
            gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            to="/community"
          />
          <QuickActionCard
            label="Start Chat"
            icon={MessageSquare}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            to="/messages"
          />
          <QuickActionCard
            label="Challenges"
            icon={Target}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            to="/challenges"
          />
        </div>
      </div>

      {/* ================================================================= */}
      {/* ACTIVITY FEED + SECTION CARDS                                      */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Activity Feed - takes 1 col on lg */}
        <div className="lg:col-span-1">
          <div
            className="bg-white/80 backdrop-blur border border-gray-100 rounded-2xl shadow-sm p-5 h-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Recent Activity
              </h2>
              <span className="text-xs text-gray-400">Live</span>
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : (
              <ActivityFeedCompact activities={activities} />
            )}
          </div>
        </div>

        {/* Section Cards grid - takes 2 cols on lg */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SectionCard
            title="Friends"
            subtitle="Your carpooling network"
            icon={Users}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            to="/friends"
            badge={stats.friendsCount > 0 ? stats.friendsCount : undefined}
          >
            {/* Online indicator dots */}
            <div className="flex -space-x-1">
              {[...Array(Math.min(stats.friendsCount, 5))].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
              {stats.friendsCount > 5 && (
                <span className="text-[10px] text-gray-400 ml-1.5 self-center">
                  +{stats.friendsCount - 5}
                </span>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Groups"
            subtitle="Shared commutes"
            icon={UsersRound}
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            to="/friends"
            badge={stats.groupsCount > 0 ? stats.groupsCount : undefined}
          >
            {/* Stacked avatar placeholders */}
            <div className="flex -space-x-2">
              {[...Array(Math.min(stats.groupsCount, 4))].map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-200 to-purple-300 border-2 border-white flex items-center justify-center"
                >
                  <UsersRound className="w-3 h-3 text-violet-600" />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Community"
            subtitle={recentPost ? `"${recentPost.title.slice(0, 28)}..."` : 'Join the conversation'}
            icon={Globe}
            gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            to="/community"
          />

          <SectionCard
            title="Leaderboards"
            subtitle="See where you rank"
            icon={Trophy}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            to="/leaderboards"
            badge={stats.karmaScore > 0 ? `${stats.karmaScore} pts` : undefined}
          >
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500 font-medium">
                {stats.karmaScore > 100 ? 'Top contributor' : 'Climb the ranks'}
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title="Challenges"
            subtitle={
              stats.activeChallenges > 0
                ? `${stats.activeChallenges} in progress`
                : 'Earn badges & rewards'
            }
            icon={Target}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            to="/challenges"
            badge={stats.completedChallenges > 0 ? `${stats.completedChallenges} done` : undefined}
          >
            {stats.activeChallenges > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((stats.completedChallenges / Math.max(stats.activeChallenges + stats.completedChallenges, 1)) * 100, 100)}%` }}
                />
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Pools"
            subtitle="Recurring carpools"
            icon={Layers}
            gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
            to="/pools"
            badge={stats.poolsCount > 0 ? stats.poolsCount : undefined}
          >
            <div className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-gray-500 font-medium">
                {stats.poolsCount > 0
                  ? `${stats.poolsCount} active pool${stats.poolsCount !== 1 ? 's' : ''}`
                  : 'Join a pool'}
              </span>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TABBED INTERFACE - Friends / Groups                                */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar with animated underline */}
        <div className="relative flex border-b border-gray-200">
          {/* Sliding underline */}
          <div
            className="absolute bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ease-out"
            style={{
              width: '50%',
              left: activeTab === 'friends' ? '0%' : '50%',
            }}
          />

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-4 text-sm font-semibold
                        transition-colors duration-300 relative
                        ${activeTab === 'friends'
                ? 'text-emerald-700'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Users className="w-5 h-5" />
            <span>Friends</span>
            {stats.friendsCount > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full transition-colors duration-300
                            ${activeTab === 'friends'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}
              >
                {stats.friendsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-4 text-sm font-semibold
                        transition-colors duration-300 relative
                        ${activeTab === 'groups'
                ? 'text-emerald-700'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <UsersRound className="w-5 h-5" />
            <span>Groups</span>
            {stats.groupsCount > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full transition-colors duration-300
                            ${activeTab === 'groups'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}
              >
                {stats.groupsCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick links row beneath tabs */}
        <div className="flex items-center justify-end gap-4 px-5 py-2.5 bg-gray-50/60 border-b border-gray-100">
          <Link
            to="/community"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            Community
            <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            to="/messages"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Messages
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Tab Content */}
        <div className="p-0">
          {activeTab === 'friends' && <FriendsManager />}
          {activeTab === 'groups' && <SocialGroups />}
        </div>
      </div>
    </div>
  );
}
