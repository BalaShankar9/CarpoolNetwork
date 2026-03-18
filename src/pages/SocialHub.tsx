import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Users, Hand, RefreshCw } from 'lucide-react';
import { useSocial } from '../contexts/SocialContext';
import { useAuth } from '../contexts/AuthContext';

// Widget imports -- these are either placeholder stubs or full implementations
import ActivityFeedWidget from '../components/social/widgets/ActivityFeedWidget';
import FriendsWidget from '../components/social/widgets/FriendsWidget';
import GroupsWidget from '../components/social/widgets/GroupsWidget';
import CommunityWidget from '../components/social/widgets/CommunityWidget';
import ChallengesWidget from '../components/social/widgets/ChallengesWidget';
import LeaderboardWidget from '../components/social/widgets/LeaderboardWidget';
import RideMatchWidget from '../components/social/widgets/RideMatchWidget';
import StatsWidget from '../components/social/widgets/StatsWidget';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const widgetVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
    },
  },
};

const bannerVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// ---------------------------------------------------------------------------
// Loading skeleton for the whole hub
// ---------------------------------------------------------------------------

function HubSkeleton() {
  return (
    <div className="min-h-screen pb-12 animate-pulse-soft">
      {/* Banner skeleton */}
      <div className="rounded-3xl mb-8 bg-gray-200 h-44" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 h-64" />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 h-48" />
          <div className="bg-white rounded-2xl border border-gray-100 h-48" />
          <div className="bg-white rounded-2xl border border-gray-100 h-48" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SocialHub() {
  const { profile } = useAuth();
  const { onlineFriends, counts, loading, refreshAll } = useSocial();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');

  // Scroll to a section if ?section=X is in the URL
  useEffect(() => {
    if (section) {
      // Small delay to ensure DOM is painted after animations
      const timer = setTimeout(() => {
        document.getElementById(`widget-${section}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [section]);

  if (loading) {
    return <HubSkeleton />;
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Total pending items for the "action needed" indicator
  const totalPending = counts.friendRequests + counts.groupInvites + counts.newWaves;

  return (
    <div className="min-h-screen pb-12">
      {/* ================================================================= */}
      {/* WELCOME BANNER with presence                                      */}
      {/* ================================================================= */}
      <motion.div
        variants={bannerVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-br from-social-warm-500 via-social-warm-600 to-social-community-600"
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-56 h-56 bg-social-warm-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl flex-shrink-0">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                  Welcome back, {firstName}
                </h1>
                <p className="text-white/70 text-sm mt-0.5">
                  Your community is waiting
                </p>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => refreshAll()}
              className="p-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl transition-colors flex-shrink-0"
              title="Refresh"
              aria-label="Refresh social data"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Pending actions strip */}
          {totalPending > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <Hand className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/90">
                {totalPending} item{totalPending !== 1 ? 's' : ''} need{totalPending === 1 ? 's' : ''} your attention
              </span>
            </div>
          )}

          {/* Online friends strip */}
          {onlineFriends.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-2">
                {onlineFriends.slice(0, 5).map((f) => (
                  <div
                    key={f.id}
                    className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center overflow-hidden flex-shrink-0"
                    title={f.name}
                  >
                    {f.avatar ? (
                      <img
                        src={f.avatar}
                        alt={f.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-white font-bold">
                        {f.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {onlineFriends.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-white font-bold">
                      +{onlineFriends.length - 5}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm text-white/80">
                {onlineFriends.length === 1
                  ? `${onlineFriends[0].name} is online`
                  : `${onlineFriends[0].name} and ${onlineFriends.length - 1} other${onlineFriends.length - 1 !== 1 ? 's' : ''} online`}
              </span>
            </div>
          )}

          {onlineFriends.length === 0 && (
            <div className="mt-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/60">
                No friends online right now
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ================================================================= */}
      {/* STORY CAROUSEL placeholder                                        */}
      {/* ================================================================= */}
      <div id="widget-stories" className="mb-8">
        {/* StoryCarousel slot -- will be populated by other agents */}
      </div>

      {/* ================================================================= */}
      {/* DASHBOARD GRID                                                    */}
      {/* ================================================================= */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* LEFT COLUMN: Activity Feed (7 cols on desktop) */}
        <motion.div className="lg:col-span-7 space-y-6" variants={widgetVariants}>
          <div id="widget-feed">
            <ActivityFeedWidget />
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Stacked widgets (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Personal Stats */}
          <motion.div id="widget-stats" variants={widgetVariants}>
            <StatsWidget />
          </motion.div>

          {/* Friends with presence */}
          <motion.div id="widget-friends" variants={widgetVariants}>
            <FriendsWidget />
          </motion.div>

          {/* Active Challenges */}
          <motion.div id="widget-challenges" variants={widgetVariants}>
            <ChallengesWidget />
          </motion.div>

          {/* Leaderboard Position */}
          <motion.div id="widget-leaderboards" variants={widgetVariants}>
            <LeaderboardWidget />
          </motion.div>

          {/* Groups */}
          <motion.div id="widget-groups" variants={widgetVariants}>
            <GroupsWidget />
          </motion.div>

          {/* Ride Matches */}
          <motion.div id="widget-rides" variants={widgetVariants}>
            <RideMatchWidget />
          </motion.div>

          {/* Community Trending */}
          <motion.div id="widget-community" variants={widgetVariants}>
            <CommunityWidget />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
