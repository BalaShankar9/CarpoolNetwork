import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Trophy,
  Calendar,
  Sparkles,
  CheckCircle,
  Flame,
  Award,
  Users,
  Clock,
  Bell,
  ChevronRight,
  Zap,
  Star,
  TrendingUp,
} from 'lucide-react';

import ChallengeGrid from '../components/challenges/ChallengeGrid';
import CompletedChallenges from '../components/challenges/CompletedChallenges';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ChallengeStats {
  active: number;
  completed: number;
  inProgress: number;
}

interface FeaturedChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_value: string;
  badge_icon: string;
  end_date: string;
  participant_count: number;
  userProgress: number | null;
  userJoined: boolean;
}

interface Badge {
  id: string;
  badge_type: string;
  earned_at: string;
  name: string;
  icon: string;
}

/* ------------------------------------------------------------------ */
/*  Circular progress ring (SVG)                                      */
/* ------------------------------------------------------------------ */
function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 6,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated number counter                                           */
/* ------------------------------------------------------------------ */
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    let start = 0;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{display}</>;
}

/* ------------------------------------------------------------------ */
/*  Badge icon mapping helper                                         */
/* ------------------------------------------------------------------ */
const BADGE_META: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  verified_driver: { name: 'Verified Driver', icon: <CheckCircle className="w-5 h-5" />, color: 'text-blue-500' },
  top_rated: { name: 'Top Rated', icon: <Star className="w-5 h-5" />, color: 'text-yellow-500' },
  eco_warrior: { name: 'Eco Warrior', icon: <Sparkles className="w-5 h-5" />, color: 'text-green-500' },
  community_champion: { name: 'Community Champion', icon: <Users className="w-5 h-5" />, color: 'text-purple-500' },
  early_adopter: { name: 'Early Adopter', icon: <Zap className="w-5 h-5" />, color: 'text-orange-500' },
  streak_master: { name: 'Streak Master', icon: <Flame className="w-5 h-5" />, color: 'text-red-500' },
  first_ride: { name: 'First Ride', icon: <TrendingUp className="w-5 h-5" />, color: 'text-indigo-500' },
  social_butterfly: { name: 'Social Butterfly', icon: <Users className="w-5 h-5" />, color: 'text-pink-500' },
};

function getBadgeMeta(type: string) {
  return (
    BADGE_META[type] || {
      name: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: <Award className="w-5 h-5" />,
      color: 'text-gray-500',
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */
export default function Challenges() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChallengeStats>({
    active: 0,
    completed: 0,
    inProgress: 0,
  });
  const [streak, setStreak] = useState(0);
  const [weeklyPercent, setWeeklyPercent] = useState(0);
  const [featured, setFeatured] = useState<FeaturedChallenge | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  /* ---- data loading ---- */
  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      const { data: userChallenges } = await supabase
        .from('user_challenges')
        .select('completed, progress, challenge_id')
        .eq('user_id', user.id);

      const completed = userChallenges?.filter((uc) => uc.completed).length || 0;
      const inProgress =
        userChallenges?.filter((uc) => !uc.completed && uc.progress > 0).length || 0;

      const { count: activeCount } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString());

      setStats({
        active: activeCount || 0,
        completed,
        inProgress,
      });

      // Weekly completion percent — how many of this week's challenges are done
      const totalJoined = userChallenges?.length || 0;
      const weekPercent = totalJoined > 0 ? Math.round((completed / totalJoined) * 100) : 0;
      setWeeklyPercent(weekPercent);
    } catch (error) {
      console.error('Error loading challenge stats:', error);
    }
  }, [user]);

  const loadStreak = useCallback(async () => {
    if (!user) return;
    try {
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
        setStreak(daysSince <= 1 ? data.daily_streak || 0 : 0);
      }
    } catch {
      // streak table may not exist for all users
    }
  }, [user]);

  const loadFeatured = useCallback(async () => {
    if (!user) return;
    try {
      const now = new Date().toISOString();
      const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', now)
        .lte('start_date', now)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!challenges || challenges.length === 0) return;

      // Pick the challenge with most participants (or first one)
      let best = challenges[0];
      let bestCount = 0;

      for (const c of challenges) {
        const { count } = await supabase
          .from('user_challenges')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', c.id);
        const cnt = count || 0;
        if (cnt > bestCount) {
          bestCount = cnt;
          best = c;
        }
      }

      // Check user progress for this challenge
      const { data: userProgress } = await supabase
        .from('user_challenges')
        .select('progress, completed')
        .eq('user_id', user.id)
        .eq('challenge_id', best.id)
        .single();

      setFeatured({
        id: best.id,
        title: best.title,
        description: best.description,
        challenge_type: best.challenge_type,
        target_value: best.target_value,
        reward_value: best.reward_value,
        badge_icon: best.badge_icon,
        end_date: best.end_date,
        participant_count: bestCount,
        userProgress: userProgress?.progress ?? null,
        userJoined: !!userProgress,
      });
    } catch (error) {
      console.error('Error loading featured challenge:', error);
    }
  }, [user]);

  const loadBadges = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_badges')
        .select('id, badge_type, earned_at')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(8);

      if (data) {
        setBadges(
          data.map((b) => {
            const meta = getBadgeMeta(b.badge_type);
            return {
              id: b.id,
              badge_type: b.badge_type,
              earned_at: b.earned_at,
              name: meta.name,
              icon: b.badge_type,
            };
          }),
        );
      }
    } catch {
      // user_badges table may not exist yet
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadStats(), loadStreak(), loadFeatured(), loadBadges()]).finally(() =>
      setLoading(false),
    );
  }, [user, loadStats, loadStreak, loadFeatured, loadBadges]);

  const featuredDaysLeft = useMemo(() => {
    if (!featured) return 0;
    return Math.max(
      0,
      Math.ceil(
        (new Date(featured.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    );
  }, [featured]);

  const featuredProgressPercent = useMemo(() => {
    if (!featured || !featured.userJoined || featured.target_value === 0) return 0;
    return Math.min(((featured.userProgress || 0) / featured.target_value) * 100, 100);
  }, [featured]);

  /* ---- join featured challenge ---- */
  const handleJoinFeatured = async () => {
    if (!user || !featured) return;
    try {
      await supabase.from('user_challenges').insert({
        user_id: user.id,
        challenge_id: featured.id,
        progress: 0,
      });
      await loadFeatured();
      await loadStats();
    } catch (error) {
      console.error('Error joining featured challenge:', error);
    }
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================================ */}
      {/*  HERO SECTION                                                */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500">
        {/* decorative blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* left: title + streak */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl"
                >
                  <Trophy className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                    Your Challenge Dashboard
                  </h1>
                  <p className="text-white/80 mt-1 text-sm md:text-base">
                    Complete challenges, earn badges, and climb the leaderboard
                  </p>
                </div>
              </div>

              {/* streak badge */}
              {streak > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 mt-2"
                >
                  <Flame className="w-5 h-5 text-amber-300" />
                  <span className="text-white font-bold text-sm">
                    {streak} day streak
                  </span>
                </motion.div>
              )}
            </div>

            {/* right: weekly progress ring */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex items-center justify-center">
                <ProgressRing percent={loading ? 0 : weeklyPercent} size={96} strokeWidth={7} />
                <span className="absolute text-white font-extrabold text-xl">
                  {loading ? '--' : `${weeklyPercent}%`}
                </span>
              </div>
              <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                Weekly Progress
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-10 pb-12">
        {/* ============================================================ */}
        {/*  STATS CARDS                                                 */}
        {/* ============================================================ */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl h-28 shadow-lg"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {/* Active card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group relative bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
            >
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '2px' }} />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Calendar className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-extrabold text-gray-900">
                    <AnimatedNumber value={stats.active} />
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    <p className="text-sm text-gray-500 font-medium">Active Now</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* In-Progress card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group relative bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
            >
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br from-amber-400 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '2px' }} />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-xl">
                  <Sparkles className="w-7 h-7 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-extrabold text-gray-900">
                    <AnimatedNumber value={stats.inProgress} />
                  </p>
                  <p className="text-sm text-gray-500 font-medium">In Progress</p>
                  {/* mini progress bar */}
                  {stats.inProgress > 0 && (
                    <div className="mt-2 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: '60%' }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Completed card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
            >
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br from-emerald-400 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '2px' }} />
              <div className="flex items-center gap-4">
                <div className="relative p-3 bg-emerald-50 rounded-xl">
                  <Trophy className="w-7 h-7 text-emerald-600" />
                  {stats.completed > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full" />
                      <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full" />
                      <span className="absolute -top-0.5 -left-1 w-2 h-2 bg-blue-400 rounded-full" />
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-extrabold text-gray-900">
                    <AnimatedNumber value={stats.completed} />
                  </p>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-sm text-gray-500 font-medium">Completed</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  FEATURED CHALLENGE                                          */}
        {/* ============================================================ */}
        {!loading && featured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-10"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Featured Challenge
            </h2>
            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl">
              {/* decorative */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

              <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider bg-white/20 rounded-full px-3 py-1">
                      <Flame className="w-3 h-3" /> Hot
                    </span>
                    {featured.participant_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs bg-white/15 rounded-full px-3 py-1">
                        <Users className="w-3 h-3" /> {featured.participant_count} joined
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl md:text-3xl font-extrabold mb-2 leading-tight">
                    {featured.title}
                  </h3>
                  <p className="text-white/80 text-sm md:text-base mb-4 line-clamp-2">
                    {featured.description}
                  </p>

                  {/* progress or CTA */}
                  {featured.userJoined ? (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/70">Your progress</span>
                        <span className="font-bold">
                          {featured.userProgress ?? 0} / {featured.target_value}
                        </span>
                      </div>
                      <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${featuredProgressPercent}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleJoinFeatured}
                      className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
                    >
                      Join Challenge
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* right side: time remaining */}
                <div className="flex flex-row md:flex-col items-center gap-3 md:gap-1 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-center shrink-0">
                  <Clock className="w-6 h-6 text-white/80" />
                  <span className="text-3xl font-extrabold">{featuredDaysLeft}</span>
                  <span className="text-xs text-white/70 uppercase tracking-wider">
                    {featuredDaysLeft === 1 ? 'Day Left' : 'Days Left'}
                  </span>
                </div>
              </div>

              {/* reward tag */}
              <div className="relative mt-4 inline-flex items-center gap-2 text-xs bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5">
                <Award className="w-3.5 h-3.5" />
                Reward: {featured.reward_value}
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/*  TAB NAVIGATION                                              */}
        {/* ============================================================ */}
        <div className="mb-6">
          <div className="relative inline-flex bg-gray-100 rounded-xl p-1">
            {/* sliding indicator */}
            <motion.div
              className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm"
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              style={{
                left: activeTab === 'active' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
            />
            <button
              onClick={() => setActiveTab('active')}
              className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'active' ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Target className="w-4 h-4" />
              Active Challenges
              {stats.active > 0 && (
                <span
                  className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'active'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {stats.active}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'completed' ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Completed
              {stats.completed > 0 && (
                <span
                  className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'completed'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {stats.completed}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  CHALLENGE GRID AREA                                         */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-10">
          <AnimatePresence mode="wait">
            {activeTab === 'active' ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <ChallengeGrid onChallengeUpdate={loadStats} />
              </motion.div>
            ) : (
              <motion.div
                key="completed"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CompletedChallenges />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================ */}
        {/*  ACHIEVEMENTS SHOWCASE                                       */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Recent Achievements
            </h2>
            {badges.length > 0 && (
              <button className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                View All Badges
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {badges.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {badges.map((badge, idx) => {
                const meta = getBadgeMeta(badge.badge_type);
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * idx }}
                    className="flex-shrink-0 w-28 bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-md transition-shadow"
                  >
                    <div
                      className={`mx-auto w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2 ${meta.color}`}
                    >
                      {meta.icon}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight mb-1">
                      {meta.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(badge.earned_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-6 text-center">
              <Star className="w-8 h-8 text-amber-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-amber-800">
                Complete challenges to earn badges!
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Your earned badges will appear here
              </p>
            </div>
          )}
        </motion.div>

        {/* ============================================================ */}
        {/*  HOW IT WORKS — Visual Stepper                               */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-6 md:p-8 border border-purple-100"
        >
          <h2 className="text-lg font-bold text-purple-900 mb-8 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            How It Works
          </h2>

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-0">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center flex-1 max-w-[180px]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200 mb-3">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Join a Challenge</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Browse active challenges and pick one that excites you
              </p>
            </div>

            {/* connector */}
            <div className="hidden md:flex items-center flex-1 max-w-[100px] mt-7">
              <div className="w-full border-t-2 border-dashed border-purple-200" />
              <ChevronRight className="w-5 h-5 text-purple-300 -ml-1 flex-shrink-0" />
            </div>
            <div className="md:hidden w-px h-6 border-l-2 border-dashed border-purple-200" />

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center flex-1 max-w-[180px]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200 mb-3">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Complete Activities</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Share rides, save CO2, and connect with your community
              </p>
            </div>

            {/* connector */}
            <div className="hidden md:flex items-center flex-1 max-w-[100px] mt-7">
              <div className="w-full border-t-2 border-dashed border-purple-200" />
              <ChevronRight className="w-5 h-5 text-purple-300 -ml-1 flex-shrink-0" />
            </div>
            <div className="md:hidden w-px h-6 border-l-2 border-dashed border-purple-200" />

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center flex-1 max-w-[180px]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 mb-3">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Earn Rewards</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Collect badges and climb the community leaderboard
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
