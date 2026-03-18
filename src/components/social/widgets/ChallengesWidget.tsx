import { useState, useEffect, useCallback, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  ChevronRight,
  Clock,
  Sparkles,
  Share2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import WidgetCard from '../shared/WidgetCard';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_type: string;
  reward_value: string;
  badge_icon: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_seasonal: boolean;
  season_theme: string | null;
}

interface UserChallengeRow {
  challenge_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
}

interface ActiveChallenge {
  challenge: ChallengeRow;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  percentComplete: number;
  daysLeft: number;
}

interface AvailableChallenge {
  challenge: ChallengeRow;
  isFeatured: boolean;
}

/* ------------------------------------------------------------------ */
/*  Season Themes                                                      */
/* ------------------------------------------------------------------ */

const SEASON_THEMES: Record<
  string,
  { gradient: string; accent: string; ringFrom: string; ringTo: string; icon: string }
> = {
  spring: {
    gradient: 'from-green-400 to-emerald-500',
    accent: 'text-green-600',
    ringFrom: '#34d399',
    ringTo: '#10b981',
    icon: '\uD83C\uDF38',
  },
  summer: {
    gradient: 'from-amber-400 to-orange-500',
    accent: 'text-amber-600',
    ringFrom: '#fbbf24',
    ringTo: '#f97316',
    icon: '\u2600\uFE0F',
  },
  autumn: {
    gradient: 'from-orange-400 to-red-500',
    accent: 'text-orange-600',
    ringFrom: '#fb923c',
    ringTo: '#ef4444',
    icon: '\uD83C\uDF42',
  },
  winter: {
    gradient: 'from-blue-400 to-indigo-500',
    accent: 'text-blue-600',
    ringFrom: '#60a5fa',
    ringTo: '#6366f1',
    icon: '\u2744\uFE0F',
  },
  default: {
    gradient: 'from-emerald-400 to-teal-500',
    accent: 'text-emerald-600',
    ringFrom: '#34d399',
    ringTo: '#14b8a6',
    icon: '\uD83C\uDFC6',
  },
};

function getSeasonTheme(seasonTheme: string | null) {
  if (!seasonTheme) return SEASON_THEMES.default;
  return SEASON_THEMES[seasonTheme] || SEASON_THEMES.default;
}

/* ------------------------------------------------------------------ */
/*  Reward display helpers                                             */
/* ------------------------------------------------------------------ */

const REWARD_ICONS: Record<string, string> = {
  badge: '\uD83C\uDFC5',
  points: '\uD83C\uDF31',
  discount: '\uD83C\uDF89',
  feature: '\u2B50',
  prize: '\uD83C\uDF81',
};

function getRewardDisplay(rewardType: string, rewardValue: string) {
  const icon = REWARD_ICONS[rewardType] || '\uD83C\uDFC6';
  return { icon, text: rewardValue };
}

/* ------------------------------------------------------------------ */
/*  Streak milestones                                                  */
/* ------------------------------------------------------------------ */

const STREAK_MILESTONES = [7, 14, 30, 60, 90];

function getNextMilestone(currentStreak: number): number {
  for (const m of STREAK_MILESTONES) {
    if (currentStreak < m) return m;
  }
  return STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
}

function getPreviousMilestone(currentStreak: number): number {
  let prev = 0;
  for (const m of STREAK_MILESTONES) {
    if (currentStreak < m) return prev;
    prev = m;
  }
  return prev;
}

/* ------------------------------------------------------------------ */
/*  Progress Ring (SVG circle with animated stroke)                    */
/* ------------------------------------------------------------------ */

function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 4,
  colorFrom,
  colorTo,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  colorFrom?: string;
  colorTo?: string;
}) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${Math.round(clamped)}% complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorFrom || '#34d399'} />
            <stop offset="100%" stopColor={colorTo || '#14b8a6'} />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference - (clamped / 100) * circumference,
          }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      {/* Center percentage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-900">
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline confetti celebration                                        */
/* ------------------------------------------------------------------ */

function InlineConfetti() {
  const pieces = useMemo(() => {
    const colors = [
      'bg-social-challenges-400',
      'bg-social-friends-400',
      'bg-social-warm-400',
      'bg-social-community-400',
      'bg-yellow-400',
      'bg-pink-400',
      'bg-social-leaderboard-400',
      'bg-emerald-400',
    ];
    return Array.from({ length: 16 }, (_, i) => ({
      left: `${(i / 16) * 100}%`,
      bg: colors[i % colors.length],
      delay: `${Math.random() * 0.4}s`,
      duration: `${1 + Math.random() * 1}s`,
      rotate: `${Math.random() * 360}deg`,
      w: `${4 + Math.random() * 4}px`,
      h: `${3 + Math.random() * 5}px`,
    }));
  }, []);

  return (
    <>
      <style>{`
        @keyframes widgetConfettiFall {
          0% { transform: translateY(-8px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80px) rotate(540deg); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {pieces.map((piece, i) => (
          <div
            key={i}
            className={`absolute top-0 ${piece.bg} rounded-sm`}
            style={{
              left: piece.left,
              width: piece.w,
              height: piece.h,
              animation: `widgetConfettiFall ${piece.duration} ease-in ${piece.delay} forwards`,
              transform: `rotate(${piece.rotate})`,
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Challenge Card                                                     */
/* ------------------------------------------------------------------ */

function ChallengeCardItem({
  item,
  index,
  onShareToFeed,
}: {
  item: ActiveChallenge;
  index: number;
  onShareToFeed?: (title: string) => void;
}) {
  const theme = getSeasonTheme(item.challenge.season_theme);
  const reward = getRewardDisplay(
    item.challenge.reward_type,
    item.challenge.reward_value,
  );
  const isCompleted = item.completed || item.percentComplete >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.35 }}
      className={`relative rounded-xl border p-3 transition-colors ${
        isCompleted
          ? 'border-social-challenges-200 bg-social-challenges-50'
          : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
      }`}
    >
      {/* Confetti overlay when completed */}
      {isCompleted && <InlineConfetti />}

      <div className="relative z-10 flex items-start gap-3">
        {/* Progress ring */}
        <ProgressRing
          progress={item.percentComplete}
          size={48}
          strokeWidth={3.5}
          colorFrom={theme.ringFrom}
          colorTo={theme.ringTo}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {item.challenge.is_seasonal && (
              <span className="text-xs" aria-hidden="true">
                {theme.icon}
              </span>
            )}
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {item.challenge.title}
            </h4>
          </div>

          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
            {item.challenge.description}
          </p>

          {/* Progress text + time */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-700 tabular-nums">
              {item.progress}/{item.challenge.target_value}
            </span>
            <span className="text-gray-300">|</span>
            <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {item.daysLeft <= 0
                ? 'Ended'
                : item.daysLeft === 1
                  ? '1 day left'
                  : `${item.daysLeft} days left`}
            </span>
          </div>

          {/* Reward */}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs" aria-hidden="true">
              {reward.icon}
            </span>
            <span className={`text-xs font-medium ${theme.accent}`}>
              {reward.text}
            </span>
          </div>

          {/* Completion celebration inline */}
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 flex items-center gap-2"
            >
              <span className="text-xs font-semibold text-social-challenges-700">
                Completed!
              </span>
              {onShareToFeed && (
                <button
                  onClick={() => onShareToFeed(item.challenge.title)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-social-challenges-600 hover:text-social-challenges-800 transition-colors"
                >
                  <Share2 className="w-3 h-3" />
                  Share
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */

function ChallengesWidgetSkeleton() {
  return (
    <div className="space-y-3 animate-pulse-soft">
      {/* Streak skeleton */}
      <div className="h-10 rounded-lg bg-gray-100" />
      {/* Card skeletons */}
      {[0, 1].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded-full w-3/4" />
            <div className="h-2 bg-gray-100 rounded-full w-full" />
            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streak Banner                                                      */
/* ------------------------------------------------------------------ */

function StreakBanner({ streak }: { streak: number }) {
  const nextMilestone = getNextMilestone(streak);
  const prevMilestone = getPreviousMilestone(streak);
  const range = nextMilestone - prevMilestone;
  const progressInRange = streak - prevMilestone;
  const percent = range > 0 ? Math.min((progressInRange / range) * 100, 100) : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 px-3 py-2"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <motion.span
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-base leading-none"
          aria-hidden="true"
        >
          {'\uD83D\uDD25'}
        </motion.span>
        <span className="text-sm font-bold text-amber-800">
          {streak}-day streak!
        </span>
      </div>

      {/* Linear progress toward next milestone */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap tabular-nums">
          {Math.round(percent)}% to {nextMilestone}-day
        </span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Available Challenges CTA                                           */
/* ------------------------------------------------------------------ */

function AvailableChallengesCta({
  available,
  featured,
  onJoin,
  joining,
}: {
  available: AvailableChallenge[];
  featured: AvailableChallenge | null;
  onJoin: (challengeId: string) => void;
  joining: string | null;
}) {
  if (available.length === 0) return null;

  return (
    <div className="space-y-2 mt-1">
      {/* Featured available challenge card */}
      {featured && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-social-challenges-200 bg-gradient-to-br from-social-challenges-50 to-amber-50 p-3"
        >
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-social-challenges-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-social-challenges-600">
              Featured
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {featured.challenge.title}
          </h4>
          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 mb-2">
            {featured.challenge.description}
          </p>
          <button
            onClick={() => onJoin(featured.challenge.id)}
            disabled={joining === featured.challenge.id}
            className="w-full text-center text-xs font-semibold py-1.5 rounded-lg bg-gradient-to-r from-social-challenges-500 to-orange-500 text-white hover:from-social-challenges-600 hover:to-orange-600 disabled:opacity-60 transition-all"
          >
            {joining === featured.challenge.id ? 'Joining...' : 'Join Challenge'}
          </button>
        </motion.div>
      )}

      {/* Browse all CTA */}
      <Link
        to="/social/challenges"
        className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-social-challenges-600 hover:text-social-challenges-700 hover:bg-social-challenges-50 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {available.length === 1
          ? '1 new challenge available'
          : `${available.length} new challenges available`}
        <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Widget                                                        */
/* ------------------------------------------------------------------ */

export default function ChallengesWidget() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<AvailableChallenge[]>([]);
  const [streak, setStreak] = useState(0);
  const [joining, setJoining] = useState<string | null>(null);

  /* ---- Calculate days left from end_date ---- */
  const calcDaysLeft = useCallback((endDate: string) => {
    return Math.max(
      0,
      Math.ceil(
        (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    );
  }, []);

  /* ---- Load streak from user_streaks table ---- */
  const loadStreak = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Try user_streaks table first (maintained by the gamification system)
      const { data } = await supabase
        .from('user_streaks')
        .select('daily_streak, last_daily_activity')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const lastActivity = data.last_daily_activity
          ? new Date(data.last_daily_activity)
          : null;
        const daysSince = lastActivity
          ? Math.floor(
              (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000),
            )
          : Infinity;
        // Streak is only valid if last activity was within 1 day
        setStreak(daysSince <= 1 ? data.daily_streak || 0 : 0);
        return;
      }
    } catch {
      // user_streaks table may not exist; fall back to ride_bookings calculation
    }

    // Fallback: calculate streak from consecutive completed ride_bookings
    try {
      const { data: bookings } = await supabase
        .from('ride_bookings')
        .select('created_at')
        .eq('passenger_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!bookings || bookings.length === 0) {
        setStreak(0);
        return;
      }

      // Extract unique dates (YYYY-MM-DD)
      const dates = [
        ...new Set(
          bookings.map((b) =>
            new Date(b.created_at).toISOString().split('T')[0],
          ),
        ),
      ].sort((a, b) => (a > b ? -1 : 1)); // descending

      // Check that the most recent date is today or yesterday
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split('T')[0];
      if (dates[0] !== today && dates[0] !== yesterday) {
        setStreak(0);
        return;
      }

      // Count consecutive days
      let consecutiveDays = 1;
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diffMs = prevDate.getTime() - currDate.getTime();
        const diffDays = Math.round(diffMs / 86400000);
        if (diffDays === 1) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      setStreak(consecutiveDays);
    } catch (err) {
      console.error('[ChallengesWidget] streak fallback error:', err);
    }
  }, [user?.id]);

  /* ---- Load challenges ---- */
  const loadChallenges = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();

      // 1. Get all active challenges within date range
      const { data: allChallenges } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);

      if (!allChallenges || allChallenges.length === 0) {
        setActiveChallenges([]);
        setAvailableChallenges([]);
        return;
      }

      // 2. Get user's challenge participation
      const { data: userChallenges } = await supabase
        .from('user_challenges')
        .select('challenge_id, progress, completed, completed_at, reward_claimed')
        .eq('user_id', user.id);

      const userProgressMap = new Map<string, UserChallengeRow>();
      userChallenges?.forEach((uc) => {
        userProgressMap.set(uc.challenge_id, uc);
      });

      // 3. Separate into active (joined) and available (not joined)
      const active: ActiveChallenge[] = [];
      const available: AvailableChallenge[] = [];

      for (const c of allChallenges as ChallengeRow[]) {
        const uc = userProgressMap.get(c.id);
        if (uc) {
          const daysLeft = calcDaysLeft(c.end_date);
          const percentComplete =
            c.target_value > 0
              ? Math.min((uc.progress / c.target_value) * 100, 100)
              : 0;
          active.push({
            challenge: c,
            progress: uc.progress,
            completed: uc.completed,
            completedAt: uc.completed_at,
            percentComplete,
            daysLeft,
          });
        } else {
          available.push({
            challenge: c,
            isFeatured: c.is_seasonal || false,
          });
        }
      }

      // Sort active: completed first, then closest to completion, then closest deadline
      active.sort((a, b) => {
        // Completed challenges at the top
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        // Then by percent complete (descending)
        if (b.percentComplete !== a.percentComplete) {
          return b.percentComplete - a.percentComplete;
        }
        // Then by deadline (ascending — soonest first)
        return a.daysLeft - b.daysLeft;
      });

      setActiveChallenges(active.slice(0, 3));
      setAvailableChallenges(available);
    } catch (err) {
      console.error('[ChallengesWidget] loadChallenges error:', err);
    }
  }, [user?.id, calcDaysLeft]);

  /* ---- Initial load ---- */
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([loadStreak(), loadChallenges()]).finally(() =>
      setLoading(false),
    );
  }, [user?.id, loadStreak, loadChallenges]);

  /* ---- Quick Join ---- */
  const handleJoin = useCallback(
    async (challengeId: string) => {
      if (!user?.id || joining) return;

      setJoining(challengeId);

      // Optimistic: move challenge from available to active
      const target = availableChallenges.find(
        (a) => a.challenge.id === challengeId,
      );
      if (target) {
        const newActive: ActiveChallenge = {
          challenge: target.challenge,
          progress: 0,
          completed: false,
          completedAt: null,
          percentComplete: 0,
          daysLeft: calcDaysLeft(target.challenge.end_date),
        };
        setActiveChallenges((prev) => [...prev, newActive].slice(0, 3));
        setAvailableChallenges((prev) =>
          prev.filter((a) => a.challenge.id !== challengeId),
        );
      }

      try {
        const { error } = await supabase.from('user_challenges').insert({
          user_id: user.id,
          challenge_id: challengeId,
          progress: 0,
          completed: false,
        });

        if (error) {
          // Revert optimistic update on error
          console.error('[ChallengesWidget] join error:', error);
          await loadChallenges();
        }
      } catch (err) {
        console.error('[ChallengesWidget] join error:', err);
        await loadChallenges();
      } finally {
        setJoining(null);
      }
    },
    [user?.id, joining, availableChallenges, calcDaysLeft, loadChallenges],
  );

  /* ---- Share handler stub ---- */
  const handleShareToFeed = useCallback((_title: string) => {
    // In production this would create a community_posts entry
    // or open a share modal. For now it's a no-op placeholder.
  }, []);

  /* ---- Find a featured available challenge ---- */
  const featuredAvailable = useMemo<AvailableChallenge | null>(() => {
    // Prefer seasonal/featured, then fallback to first available
    const seasonal = availableChallenges.find((a) => a.isFeatured);
    if (seasonal) return seasonal;
    return availableChallenges.length > 0 ? availableChallenges[0] : null;
  }, [availableChallenges]);

  /* ---- Badge count for header ---- */
  const badgeCount = useMemo(() => {
    const available = availableChallenges.length;
    const inProgress = activeChallenges.filter((c) => !c.completed).length;
    return available > 0 ? available : inProgress > 0 ? inProgress : undefined;
  }, [availableChallenges, activeChallenges]);

  /* ---- Empty state ---- */
  const isEmpty = !loading && activeChallenges.length === 0 && availableChallenges.length === 0;

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <WidgetCard
      title="Challenges"
      icon={<Target className="w-4 h-4 text-white" />}
      gradient="from-social-challenges-400 to-social-challenges-600"
      seeAllLink="/social/challenges"
      seeAllLabel="See all"
      loading={loading}
      badge={badgeCount}
    >
      {loading ? (
        <ChallengesWidgetSkeleton />
      ) : isEmpty ? (
        <div className="py-6 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-social-challenges-50 flex items-center justify-center">
            <Target className="w-5 h-5 text-social-challenges-300" />
          </div>
          <p className="text-sm text-gray-500">No active challenges.</p>
          <Link
            to="/social/challenges"
            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-social-challenges-600 hover:text-social-challenges-700"
          >
            Browse available challenges
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Streak banner */}
          <AnimatePresence>
            {streak > 0 && <StreakBanner streak={streak} />}
          </AnimatePresence>

          {/* Active challenge cards (max 3) */}
          {activeChallenges.map((item, i) => (
            <ChallengeCardItem
              key={item.challenge.id}
              item={item}
              index={i}
              onShareToFeed={handleShareToFeed}
            />
          ))}

          {/* Available challenges CTA */}
          <AvailableChallengesCta
            available={availableChallenges}
            featured={featuredAvailable}
            onJoin={handleJoin}
            joining={joining}
          />
        </div>
      )}
    </WidgetCard>
  );
}
