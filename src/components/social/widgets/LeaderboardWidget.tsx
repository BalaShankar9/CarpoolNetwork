import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Lightbulb,
  Car,
  Leaf,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import WidgetCard from '../shared/WidgetCard';
import { AnimatedLinearProgress } from '../shared/AnimatedProgress';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'overall' | 'co2' | 'rides' | 'social';

interface LeaderboardEntry {
  user_id: string;
  rank: number;
  score: number;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    profile_photo_url?: string | null;
  } | null;
}

interface RankData {
  rank: number;
  score: number;
  trend: number; // positive = improved, negative = dropped, 0 = no change
  totalParticipants: number;
}

interface FriendComparison {
  friendName: string;
  friendScore: number;
  scoreDiff: number;
  isAhead: boolean; // Is the current user ahead of this friend?
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEDAL: Record<number, string> = { 1: '\uD83E\uDD47', 2: '\uD83E\uDD48', 3: '\uD83E\uDD49' };

const MEDAL_BG: Record<number, string> = {
  1: 'bg-amber-50 border-amber-200',
  2: 'bg-gray-50 border-gray-200',
  3: 'bg-orange-50 border-orange-200',
};

const CATEGORY_META: Record<Category, { label: string; icon: typeof Trophy }> = {
  overall: { label: 'Overall', icon: Trophy },
  co2: { label: 'CO\u2082', icon: Leaf },
  rides: { label: 'Rides', icon: Car },
  social: { label: 'Social', icon: Users },
};

const LEADERBOARD_PERIOD = 'week'; // Widget uses weekly leaderboard

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

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

function formatScore(score: number): string {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return score.toLocaleString();
}

function getDisplayName(
  entry: LeaderboardEntry,
  truncate = true,
): string {
  const name =
    entry.profile?.full_name || 'Unknown';
  if (!truncate) return name;
  // Abbreviate: "Sarah M." style
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }
  return parts[0];
}

function getAvatarUrl(entry: LeaderboardEntry): string | null {
  return (
    entry.profile?.profile_photo_url ||
    entry.profile?.avatar_url ||
    null
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MiniAvatar({
  url,
  name,
  className = '',
}: {
  url: string | null;
  name: string;
  className?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`w-7 h-7 rounded-full object-cover flex-shrink-0 ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${initialColor(name)} ${className}`}
    >
      {getInitial(name)}
    </div>
  );
}

function RankTrendBadge({ trend }: { trend: number }) {
  if (trend === 0) return null;

  const improved = trend > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        improved ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {improved ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {improved ? '+' : ''}
      {trend}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LeaderboardWidget
// ---------------------------------------------------------------------------

export default function LeaderboardWidget() {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>('overall');
  const [rankData, setRankData] = useState<RankData | null>(null);
  const [top3, setTop3] = useState<LeaderboardEntry[]>([]);
  const [friendComparison, setFriendComparison] = useState<FriendComparison | null>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const loadLeaderboard = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Determine the category to query. The leaderboard_cache may use 'rides'
      // for the overall category depending on how the backend populates it.
      // We query whatever the user selected.
      const queryCategory = category === 'overall' ? 'rides' : category;

      // 1. Get user's rank
      const { data: userRankData } = await supabase
        .from('leaderboard_cache')
        .select('user_id, rank, score')
        .eq('user_id', user.id)
        .eq('category', queryCategory)
        .eq('period', LEADERBOARD_PERIOD)
        .is('region', null)
        .maybeSingle();

      // 2. Get total participants for percentile calculation
      const { count: totalCount } = await supabase
        .from('leaderboard_cache')
        .select('*', { count: 'exact', head: true })
        .eq('category', queryCategory)
        .eq('period', LEADERBOARD_PERIOD)
        .is('region', null);

      // 3. Get top 3
      const { data: top3Data } = await supabase
        .from('leaderboard_cache')
        .select(`
          user_id,
          rank,
          score,
          profiles:user_id (
            full_name,
            avatar_url,
            profile_photo_url
          )
        `)
        .eq('category', queryCategory)
        .eq('period', LEADERBOARD_PERIOD)
        .is('region', null)
        .order('rank', { ascending: true })
        .limit(3);

      // Format top3
      const formattedTop3: LeaderboardEntry[] = (top3Data || []).map((item: any) => ({
        user_id: item.user_id,
        rank: item.rank,
        score: item.score,
        profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
      }));

      setTop3(formattedTop3);

      // Compute rank data
      if (userRankData) {
        const total = totalCount || 1;
        // Trend: try to get previous period rank for comparison
        // We check the monthly leaderboard as a proxy for last period
        let trend = 0;
        const { data: prevData } = await supabase
          .from('leaderboard_cache')
          .select('rank')
          .eq('user_id', user.id)
          .eq('category', queryCategory)
          .eq('period', 'month')
          .is('region', null)
          .maybeSingle();

        if (prevData && prevData.rank > 0) {
          // Positive trend = rank improved (went down in number)
          trend = prevData.rank - userRankData.rank;
        }

        setRankData({
          rank: userRankData.rank,
          score: userRankData.score,
          trend,
          totalParticipants: total,
        });
      } else {
        setRankData(null);
      }

      // 4. Friend comparison
      await loadFriendComparison(queryCategory, userRankData?.score ?? 0);
    } catch (err) {
      console.error('[LeaderboardWidget] loadLeaderboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, category]);

  const loadFriendComparison = useCallback(
    async (queryCategory: string, userScore: number) => {
      if (!user?.id) return;

      try {
        // Get friend IDs
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_a, user_b')
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

        const friendIds = (friendships || []).map((f) =>
          f.user_a === user.id ? f.user_b : f.user_a,
        );

        if (friendIds.length === 0) {
          setFriendComparison(null);
          return;
        }

        // Get friend leaderboard entries
        const { data: friendEntries } = await supabase
          .from('leaderboard_cache')
          .select(`
            user_id,
            rank,
            score,
            profiles:user_id (
              full_name,
              avatar_url
            )
          `)
          .in('user_id', friendIds)
          .eq('category', queryCategory)
          .eq('period', LEADERBOARD_PERIOD)
          .is('region', null)
          .order('score', { ascending: false });

        if (!friendEntries || friendEntries.length === 0) {
          setFriendComparison(null);
          return;
        }

        // Find the nearest friend (closest score difference)
        let closest: FriendComparison | null = null;
        let smallestDiff = Infinity;

        for (const entry of friendEntries) {
          const profile: any = Array.isArray(entry.profiles)
            ? entry.profiles[0]
            : entry.profiles;
          const diff = Math.abs(entry.score - userScore);
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closest = {
              friendName: getDisplayName({
                user_id: entry.user_id,
                rank: entry.rank,
                score: entry.score,
                profile: profile
                  ? {
                      full_name: profile.full_name || 'Unknown',
                      avatar_url: profile.avatar_url,
                    }
                  : null,
              }),
              friendScore: entry.score,
              scoreDiff: Math.abs(userScore - entry.score),
              isAhead: userScore >= entry.score,
            };
          }
        }

        setFriendComparison(closest);
      } catch (err) {
        console.error('[LeaderboardWidget] loadFriendComparison error:', err);
        setFriendComparison(null);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    setLoading(true);
    loadLeaderboard();
  }, [loadLeaderboard]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const percentile =
    rankData && rankData.totalParticipants > 0
      ? Math.max(
          1,
          Math.round(
            ((rankData.totalParticipants - rankData.rank + 1) /
              rankData.totalParticipants) *
              100,
          ),
        )
      : null;

  const percentileLabel = percentile ? `Top ${100 - percentile + 1}%` : null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <WidgetCard
      title="Leaderboard"
      icon={<Trophy className="w-4 h-4 text-white" />}
      gradient="from-social-leaderboard-400 to-social-leaderboard-600"
      seeAllLink="/social/leaderboards"
      seeAllLabel="Full leaderboard"
      loading={loading}
    >
      <div className="space-y-3">
        {/* Category tabs */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-1 py-1.5 text-[10px] font-semibold rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-social-leaderboard-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Rank card */}
        {rankData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-social-leaderboard-50 to-blue-50 border border-social-leaderboard-200 rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-social-leaderboard-600">
                Your Rank
              </span>
              <RankTrendBadge trend={rankData.trend} />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black text-gray-900 tabular-nums">
                #{rankData.rank}
              </span>
              <span className="text-xs text-gray-500">
                {formatScore(rankData.score)} pts
              </span>
            </div>

            {/* Percentile bar */}
            {percentile !== null && (
              <div className="flex items-center gap-2">
                <AnimatedLinearProgress
                  value={percentile}
                  gradient="from-social-leaderboard-400 to-social-leaderboard-600"
                  height={5}
                  className="flex-1"
                />
                <span className="text-[10px] font-semibold text-social-leaderboard-600 whitespace-nowrap">
                  {percentileLabel}
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          /* Empty rank state */
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
            <Trophy className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs text-gray-500">
              Your ranking will appear after your first ride!
            </p>
          </div>
        )}

        {/* Top 3 podium */}
        {top3.length > 0 && (
          <div className="space-y-1">
            {top3.map((entry, index) => {
              const isCurrentUser = entry.user_id === user?.id;
              const medal = MEDAL[entry.rank] || '';
              const medalBg = MEDAL_BG[entry.rank] || 'bg-gray-50 border-gray-100';

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.25 }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-colors ${
                    isCurrentUser
                      ? 'bg-social-leaderboard-50 border-social-leaderboard-200 ring-1 ring-social-leaderboard-200'
                      : medalBg
                  }`}
                >
                  {/* Medal */}
                  <span className="text-base leading-none w-5 text-center flex-shrink-0">
                    {medal}
                  </span>

                  {/* Avatar */}
                  <MiniAvatar
                    url={getAvatarUrl(entry)}
                    name={entry.profile?.full_name || 'Unknown'}
                  />

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isCurrentUser
                          ? 'text-social-leaderboard-700'
                          : 'text-gray-900'
                      }`}
                    >
                      {isCurrentUser ? 'You' : getDisplayName(entry)}
                    </p>
                  </div>

                  {/* Score */}
                  <span className="text-xs font-semibold text-gray-500 tabular-nums whitespace-nowrap">
                    {formatScore(entry.score)} pts
                  </span>
                </motion.div>
              );
            })}

            {/* User position indicator if not in top 3 */}
            {rankData && rankData.rank > 3 && (
              <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="flex-1 border-t border-dashed border-gray-200" />
                <span className="text-[10px] font-semibold text-social-leaderboard-600 bg-social-leaderboard-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  You #{rankData.rank}
                </span>
                <div className="flex-1 border-t border-dashed border-gray-200" />
              </div>
            )}
          </div>
        )}

        {/* Friend comparison nudge */}
        {friendComparison && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="flex items-start gap-2 pt-2 border-t border-gray-100"
          >
            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">
              {friendComparison.isAhead ? (
                <>
                  <span className="font-semibold text-emerald-700">
                    {Math.round(friendComparison.scoreDiff)} pts ahead
                  </span>{' '}
                  of {friendComparison.friendName} this week
                </>
              ) : (
                <>
                  <span className="font-semibold text-amber-700">
                    {friendComparison.friendName}
                  </span>{' '}
                  is{' '}
                  <span className="font-semibold text-amber-700">
                    {Math.round(friendComparison.scoreDiff)} pts ahead
                  </span>{' '}
                  &mdash; you can catch up!
                </>
              )}
            </p>
          </motion.div>
        )}

        {/* Empty state when no top3 and no rank */}
        {top3.length === 0 && !rankData && (
          <div className="py-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500 mb-1">
              Leaderboard data will appear after your first ride!
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-1 text-xs font-medium text-social-leaderboard-600 hover:text-social-leaderboard-700 transition-colors"
            >
              Find a ride
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
