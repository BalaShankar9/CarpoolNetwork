import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Car,
  Leaf,
  Users,
  Target,
  Flame,
  Award,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import WidgetCard from '../shared/WidgetCard';
import { AnimatedLinearProgress } from '../shared/AnimatedProgress';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = 'week' | 'month' | 'all';

interface StatValue {
  current: number;
  previous: number;
}

interface StatsData {
  rides: StatValue;
  co2: StatValue;
  friends: StatValue;
  challenges: StatValue;
  streak: number;
}

interface Milestone {
  id: string;
  label: string;
  icon: typeof Award;
  target: number;
  current: number;
  unit: string;
  gradient: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'week', label: 'This Week' },
  { value: 'all', label: 'All Time' },
];

const CO2_PER_RIDE_KG = 2.3; // Rough estimate of kg CO2 saved per shared ride

// ---------------------------------------------------------------------------
// AnimatedCounter
// ---------------------------------------------------------------------------

function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
}: {
  value: number;
  duration?: number;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }

    const start = performance.now();
    const from = 0;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (value - from) * eased;

      if (progress >= 1) {
        setDisplay(value);
      } else {
        setDisplay(
          decimals > 0
            ? parseFloat(current.toFixed(decimals))
            : Math.floor(current),
        );
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, decimals]);

  return <>{decimals > 0 ? display.toFixed(decimals) : display}</>;
}

// ---------------------------------------------------------------------------
// TrendBadge
// ---------------------------------------------------------------------------

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  // Don't show trend when there's no previous data to compare
  if (previous === -1) return null;

  const diff = current - previous;
  if (diff === 0) return null;

  const isUp = diff > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
        isUp ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {isUp ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      {isUp ? '+' : ''}
      {Math.abs(Math.round(diff * 10) / 10)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  value,
  label,
  suffix,
  color,
  bgColor,
  previous,
  decimals = 0,
  index,
}: {
  icon: typeof Car;
  value: number;
  label: string;
  suffix?: string;
  color: string;
  bgColor: string;
  previous: number;
  decimals?: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className={`flex flex-col items-center justify-center p-3 rounded-xl ${bgColor} border border-gray-100`}
    >
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <span className="text-lg font-bold text-gray-900 tabular-nums leading-none">
        <AnimatedCounter value={value} decimals={decimals} />
        {suffix && (
          <span className="text-xs font-medium text-gray-500 ml-0.5">
            {suffix}
          </span>
        )}
      </span>
      <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">
        {label}
      </span>
      <TrendBadge current={value} previous={previous} />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Date Helpers
// ---------------------------------------------------------------------------

function getDateRange(period: Period): { start: Date; previousStart: Date; previousEnd: Date } {
  const now = new Date();
  let start: Date;
  let previousStart: Date;
  let previousEnd: Date;

  if (period === 'week') {
    const dayOfWeek = now.getDay();
    start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);

    previousEnd = new Date(start);
    previousEnd.setMilliseconds(-1);
    previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 7);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);

    previousEnd = new Date(start);
    previousEnd.setMilliseconds(-1);
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else {
    // 'all' -- no previous period comparison
    start = new Date(0);
    previousStart = new Date(0);
    previousEnd = new Date(0);
  }

  return { start, previousStart, previousEnd };
}

// ---------------------------------------------------------------------------
// Milestone computation
// ---------------------------------------------------------------------------

function computeMilestone(stats: StatsData): Milestone | null {
  const milestones: Milestone[] = [
    {
      id: 'eco_warrior',
      label: 'Eco Warrior',
      icon: Leaf,
      target: 20,
      current: stats.rides.current,
      unit: 'ride',
      gradient: 'from-emerald-400 to-emerald-600',
    },
    {
      id: 'social_butterfly',
      label: 'Social Butterfly',
      icon: Users,
      target: 10,
      current: stats.friends.current,
      unit: 'friend',
      gradient: 'from-social-friends-400 to-social-friends-600',
    },
    {
      id: 'green_champion',
      label: 'Green Champion',
      icon: Leaf,
      target: 100,
      current: stats.co2.current,
      unit: 'kg CO\u2082',
      gradient: 'from-green-400 to-teal-500',
    },
  ];

  // Find the closest incomplete milestone
  const incomplete = milestones
    .filter((m) => m.current < m.target)
    .sort((a, b) => {
      const aRemaining = (a.target - a.current) / a.target;
      const bRemaining = (b.target - b.current) / b.target;
      return aRemaining - bRemaining;
    });

  return incomplete.length > 0 ? incomplete[0] : null;
}

// ---------------------------------------------------------------------------
// StatsWidget
// ---------------------------------------------------------------------------

export default function StatsWidget() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<StatsData>({
    rides: { current: 0, previous: -1 },
    co2: { current: 0, previous: -1 },
    friends: { current: 0, previous: -1 },
    challenges: { current: 0, previous: -1 },
    streak: 0,
  });
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const loadStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { start, previousStart, previousEnd } = getDateRange(period);
      const startISO = start.toISOString();
      const isAllTime = period === 'all';

      // Build all queries in parallel
      const queries: Promise<any>[] = [];

      // 1. Rides — current period
      let ridesQuery = supabase
        .from('ride_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('passenger_id', user.id)
        .eq('status', 'completed');
      if (!isAllTime) ridesQuery = ridesQuery.gte('created_at', startISO);
      queries.push(ridesQuery);

      // 2. Rides — previous period (skip for all-time)
      if (!isAllTime) {
        queries.push(
          supabase
            .from('ride_bookings')
            .select('*', { count: 'exact', head: true })
            .eq('passenger_id', user.id)
            .eq('status', 'completed')
            .gte('created_at', previousStart.toISOString())
            .lte('created_at', previousEnd.toISOString()),
        );
      } else {
        queries.push(Promise.resolve({ count: -1 }));
      }

      // 3. Friends — current period
      let friendsQuery = supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      if (!isAllTime) friendsQuery = friendsQuery.gte('created_at', startISO);
      queries.push(friendsQuery);

      // 4. Friends — previous period
      if (!isAllTime) {
        queries.push(
          supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
            .gte('created_at', previousStart.toISOString())
            .lte('created_at', previousEnd.toISOString()),
        );
      } else {
        queries.push(Promise.resolve({ count: -1 }));
      }

      // 5. Challenges completed — current period
      let challengesQuery = supabase
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);
      if (!isAllTime) challengesQuery = challengesQuery.gte('completed_at', startISO);
      queries.push(challengesQuery);

      // 6. Challenges completed — previous period
      if (!isAllTime) {
        queries.push(
          supabase
            .from('user_challenges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('completed', true)
            .gte('completed_at', previousStart.toISOString())
            .lte('completed_at', previousEnd.toISOString()),
        );
      } else {
        queries.push(Promise.resolve({ count: -1 }));
      }

      // 7. Streak from user_streaks table
      queries.push(
        supabase
          .from('user_streaks')
          .select('daily_streak, last_daily_activity')
          .eq('user_id', user.id)
          .maybeSingle(),
      );

      const results = await Promise.allSettled(queries);

      // Extract counts safely
      const getCount = (r: PromiseSettledResult<any>): number => {
        if (r.status === 'fulfilled') {
          if (r.value?.count !== undefined && r.value.count !== null) {
            return r.value.count;
          }
          if (r.value?.data?.count !== undefined) {
            return r.value.data.count;
          }
        }
        return 0;
      };

      const getPreviousCount = (r: PromiseSettledResult<any>): number => {
        if (r.status === 'fulfilled') {
          if (r.value?.count === -1) return -1; // sentinel for "no comparison"
          return r.value?.count ?? 0;
        }
        return -1;
      };

      const ridesCurrent = getCount(results[0]);
      const ridesPrevious = getPreviousCount(results[1]);
      const friendsCurrent = getCount(results[2]);
      const friendsPrevious = getPreviousCount(results[3]);
      const challengesCurrent = getCount(results[4]);
      const challengesPrevious = getPreviousCount(results[5]);

      // CO2 calculation
      const co2Current = Math.round(ridesCurrent * CO2_PER_RIDE_KG * 10) / 10;
      const co2Previous =
        ridesPrevious === -1
          ? -1
          : Math.round(ridesPrevious * CO2_PER_RIDE_KG * 10) / 10;

      // Streak
      let streak = 0;
      if (results[6].status === 'fulfilled' && results[6].value?.data) {
        const streakData = results[6].value.data;
        const lastActivity = streakData.last_daily_activity
          ? new Date(streakData.last_daily_activity)
          : null;
        const daysSince = lastActivity
          ? Math.floor(
              (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000),
            )
          : Infinity;
        streak = daysSince <= 1 ? streakData.daily_streak || 0 : 0;
      }

      setStats({
        rides: { current: ridesCurrent, previous: ridesPrevious },
        co2: { current: co2Current, previous: co2Previous },
        friends: { current: friendsCurrent, previous: friendsPrevious },
        challenges: { current: challengesCurrent, previous: challengesPrevious },
        streak,
      });
    } catch (err) {
      console.error('[StatsWidget] loadStats error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, period]);

  useEffect(() => {
    setLoading(true);
    loadStats();
  }, [loadStats]);

  // -------------------------------------------------------------------------
  // Milestone
  // -------------------------------------------------------------------------

  const milestone = computeMilestone(stats);
  const milestoneProgress = milestone
    ? Math.min(100, Math.round((milestone.current / milestone.target) * 100))
    : 0;
  const milestoneRemaining = milestone
    ? Math.max(0, milestone.target - milestone.current)
    : 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <WidgetCard
      title="Your Stats"
      icon={<TrendingUp className="w-4 h-4 text-white" />}
      gradient="from-social-warm-400 to-social-warm-600"
      loading={loading}
    >
      <div className="space-y-3">
        {/* Period selector */}
        <div className="flex justify-end -mt-1">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-2 py-1 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-social-warm-300 cursor-pointer"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            icon={Car}
            value={stats.rides.current}
            label="Rides"
            color="text-blue-500"
            bgColor="bg-blue-50/60"
            previous={stats.rides.previous}
            index={0}
          />
          <StatCard
            icon={Leaf}
            value={stats.co2.current}
            label="kg CO\u2082"
            color="text-emerald-500"
            bgColor="bg-emerald-50/60"
            previous={stats.co2.previous}
            decimals={1}
            index={1}
          />
          <StatCard
            icon={Users}
            value={stats.friends.current}
            label="Friends"
            color="text-social-friends-500"
            bgColor="bg-social-friends-50/60"
            previous={stats.friends.previous}
            index={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={Target}
            value={stats.challenges.current}
            label="Challenges"
            color="text-social-challenges-500"
            bgColor="bg-social-challenges-50/60"
            previous={stats.challenges.previous}
            index={3}
          />
          <StatCard
            icon={Flame}
            value={stats.streak}
            label="Streak"
            suffix="days"
            color="text-orange-500"
            bgColor="bg-orange-50/60"
            previous={-1}
            index={4}
          />
        </div>

        {/* Milestone tracker */}
        {milestone && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="pt-2 border-t border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-6 h-6 rounded-lg bg-gradient-to-br ${milestone.gradient} flex items-center justify-center`}
              >
                <Award className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs text-gray-700">
                <span className="font-semibold text-gray-900">
                  {milestoneRemaining > 0
                    ? `${Math.round(milestoneRemaining)} more ${milestone.unit}${milestoneRemaining !== 1 ? 's' : ''}`
                    : 'Almost there'}
                </span>
                {' '}to{' '}
                <span className="font-semibold text-gray-900">
                  &ldquo;{milestone.label}&rdquo;
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <AnimatedLinearProgress
                value={milestoneProgress}
                gradient={milestone.gradient}
                height={6}
                className="flex-1"
              />
              <span className="text-[10px] font-semibold text-gray-500 tabular-nums w-8 text-right">
                {milestoneProgress}%
              </span>
            </div>
          </motion.div>
        )}

        {/* All milestones completed */}
        {!milestone &&
          stats.rides.current > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="flex items-center gap-2 pt-2 border-t border-gray-100"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Award className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs text-gray-600">
                All milestones reached! Keep going!
              </p>
            </motion.div>
          )}
      </div>
    </WidgetCard>
  );
}
