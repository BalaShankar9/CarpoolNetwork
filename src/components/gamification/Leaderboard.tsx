import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  ChevronDown,
  TrendingUp,
  Car,
  Leaf,
  Star,
  Flame,
  Zap,
  Loader2,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  value: number;
  isCurrentUser: boolean;
}

type LeaderboardType = 'rides' | 'co2' | 'rating' | 'streak';
type LeaderboardPeriod = 'week' | 'month' | 'all';

const typeConfig = {
  rides: {
    label: 'Most Rides',
    icon: <Car className="w-5 h-5" />,
    unit: 'rides',
    color: 'from-blue-500 to-indigo-600',
  },
  co2: {
    label: 'CO₂ Saved',
    icon: <Leaf className="w-5 h-5" />,
    unit: 'kg',
    color: 'from-green-500 to-emerald-600',
  },
  rating: {
    label: 'Top Rated',
    icon: <Star className="w-5 h-5" />,
    unit: '',
    color: 'from-amber-500 to-orange-600',
  },
  streak: {
    label: 'Longest Streak',
    icon: <Flame className="w-5 h-5" />,
    unit: 'days',
    color: 'from-red-500 to-pink-600',
  },
};

export function Leaderboard() {
  const { user } = useAuth();
  const [type, setType] = useState<LeaderboardType>('rides');
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [type, period, user]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaderboard(type, period, user?.id);
      setEntries(data.entries);
      setUserRank(data.userRank);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const config = typeConfig[type];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-br ${config.color} rounded-2xl p-6 text-white`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-xl">{config.icon}</div>
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-white/80">See how you rank against other carpoolers</p>
          </div>
        </div>

        {userRank && (
          <div className="mt-4 p-4 bg-white/10 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Your Rank</span>
              <div className="flex items-center gap-2">
                {userRank <= 3 && getRankIcon(userRank)}
                <span className="text-2xl font-bold">#{userRank}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Type Selector */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(typeConfig) as LeaderboardType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                type === t
                  ? `bg-gradient-to-r ${typeConfig[t].color} text-white`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {typeConfig[t].icon}
              {typeConfig[t].label}
            </button>
          ))}
        </div>

        {/* Period Selector */}
        <div className="relative ml-auto">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as LeaderboardPeriod)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Leaderboard List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-2">
          {/* Top 3 Podium */}
          {entries.length >= 3 && (
            <div className="flex justify-center items-end gap-4 py-8">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <div className="relative">
                  {entries[1].avatar ? (
                    <img
                      src={entries[1].avatar}
                      alt={entries[1].name}
                      className="w-16 h-16 rounded-full object-cover border-4 border-gray-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <Medal className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <p className="mt-4 font-medium text-gray-900 truncate max-w-[100px]">
                  {entries[1].name}
                </p>
                <p className="text-sm text-gray-500">
                  {entries[1].value} {config.unit}
                </p>
                <div className="mt-2 h-16 w-20 bg-gray-200 rounded-t-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-600">2</span>
                </div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="relative">
                  {entries[0].avatar ? (
                    <img
                      src={entries[0].avatar}
                      alt={entries[0].name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center border-4 border-yellow-400">
                      <User className="w-10 h-10 text-yellow-600" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <Crown className="w-10 h-10 text-yellow-500" />
                  </div>
                </div>
                <p className="mt-4 font-semibold text-gray-900 truncate max-w-[120px]">
                  {entries[0].name}
                </p>
                <p className="text-sm text-gray-500">
                  {entries[0].value} {config.unit}
                </p>
                <div className="mt-2 h-24 w-24 bg-yellow-400 rounded-t-lg flex items-center justify-center">
                  <span className="text-3xl font-bold text-yellow-800">1</span>
                </div>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="relative">
                  {entries[2].avatar ? (
                    <img
                      src={entries[2].avatar}
                      alt={entries[2].name}
                      className="w-16 h-16 rounded-full object-cover border-4 border-amber-600"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center border-4 border-amber-600">
                      <User className="w-8 h-8 text-amber-600" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <Medal className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
                <p className="mt-4 font-medium text-gray-900 truncate max-w-[100px]">
                  {entries[2].name}
                </p>
                <p className="text-sm text-gray-500">
                  {entries[2].value} {config.unit}
                </p>
                <div className="mt-2 h-12 w-20 bg-amber-600 rounded-t-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-100">3</span>
                </div>
              </motion.div>
            </div>
          )}

          {/* Rest of the list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {entries.slice(3).map((entry, index) => (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 ${
                  index > 0 ? 'border-t border-gray-100' : ''
                } ${entry.isCurrentUser ? 'bg-blue-50' : ''}`}
              >
                {/* Rank */}
                <div className="w-10 text-center">
                  <span className="text-lg font-bold text-gray-400">
                    {entry.rank}
                  </span>
                </div>

                {/* Avatar */}
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt={entry.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${entry.isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
                    {entry.name}
                    {entry.isCurrentUser && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </p>
                </div>

                {/* Value */}
                <div className="text-right">
                  <span className="font-bold text-gray-900">{entry.value}</span>
                  <span className="text-gray-500 text-sm ml-1">{config.unit}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No entries yet for this period</p>
          <p className="text-sm">Be the first to make it to the leaderboard!</p>
        </div>
      )}
    </div>
  );
}

// Helper function to get rank icon
function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return null;
  }
}

// Fetch leaderboard data
async function fetchLeaderboard(
  type: LeaderboardType,
  period: LeaderboardPeriod,
  currentUserId?: string
): Promise<{ entries: LeaderboardEntry[]; userRank: number | null }> {
  const dateFilter = getDateFilter(period);
  let entries: LeaderboardEntry[] = [];

  switch (type) {
    case 'rides':
      entries = await fetchRidesLeaderboard(dateFilter);
      break;
    case 'co2':
      entries = await fetchCo2Leaderboard(dateFilter);
      break;
    case 'rating':
      entries = await fetchRatingLeaderboard();
      break;
    case 'streak':
      entries = await fetchStreakLeaderboard();
      break;
  }

  // Mark current user and find their rank
  let userRank: number | null = null;
  entries = entries.map((e, i) => {
    const isCurrentUser = e.userId === currentUserId;
    if (isCurrentUser) userRank = i + 1;
    return { ...e, isCurrentUser, rank: i + 1 };
  });

  return { entries, userRank };
}

function getDateFilter(period: LeaderboardPeriod): Date | null {
  if (period === 'all') return null;
  const date = new Date();
  if (period === 'week') date.setDate(date.getDate() - 7);
  if (period === 'month') date.setMonth(date.getMonth() - 1);
  return date;
}

async function fetchRidesLeaderboard(dateFilter: Date | null): Promise<LeaderboardEntry[]> {
  let query = supabase
    .from('rides')
    .select('driver_id');

  if (dateFilter) {
    query = query.gte('departure_time', dateFilter.toISOString());
  }

  const { data: rides } = await query;

  // Count rides per driver
  const counts = new Map<string, number>();
  rides?.forEach((r) => {
    counts.set(r.driver_id, (counts.get(r.driver_id) || 0) + 1);
  });

  // Get user profiles
  const userIds = Array.from(counts.keys());
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  return Array.from(counts.entries())
    .map(([userId, count]) => {
      const profile = profileMap.get(userId);
      return {
        rank: 0,
        userId,
        name: profile?.full_name || 'Unknown User',
        avatar: profile?.avatar_url,
        value: count,
        isCurrentUser: false,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);
}

async function fetchCo2Leaderboard(dateFilter: Date | null): Promise<LeaderboardEntry[]> {
  let query = supabase
    .from('rides')
    .select('driver_id, distance_km');

  if (dateFilter) {
    query = query.gte('departure_time', dateFilter.toISOString());
  }

  const { data: rides } = await query;

  // Calculate CO2 per driver
  const co2Map = new Map<string, number>();
  rides?.forEach((r) => {
    const co2 = (r.distance_km || 0) * 0.21; // kg CO2 per km
    co2Map.set(r.driver_id, (co2Map.get(r.driver_id) || 0) + co2);
  });

  // Get user profiles
  const userIds = Array.from(co2Map.keys());
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  return Array.from(co2Map.entries())
    .map(([userId, co2]) => {
      const profile = profileMap.get(userId);
      return {
        rank: 0,
        userId,
        name: profile?.full_name || 'Unknown User',
        avatar: profile?.avatar_url,
        value: Math.round(co2),
        isCurrentUser: false,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);
}

async function fetchRatingLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('reviewee_id, rating');

  // Calculate average ratings
  const ratingMap = new Map<string, { sum: number; count: number }>();
  reviews?.forEach((r) => {
    const existing = ratingMap.get(r.reviewee_id) || { sum: 0, count: 0 };
    existing.sum += r.rating;
    existing.count++;
    ratingMap.set(r.reviewee_id, existing);
  });

  // Filter to users with at least 5 reviews
  const qualifiedUsers = Array.from(ratingMap.entries())
    .filter(([, data]) => data.count >= 5)
    .map(([userId, data]) => ({
      userId,
      avgRating: data.sum / data.count,
    }));

  // Get user profiles
  const userIds = qualifiedUsers.map((u) => u.userId);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  return qualifiedUsers
    .map((u) => {
      const profile = profileMap.get(u.userId);
      return {
        rank: 0,
        userId: u.userId,
        name: profile?.full_name || 'Unknown User',
        avatar: profile?.avatar_url,
        value: parseFloat(u.avgRating.toFixed(2)),
        isCurrentUser: false,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);
}

async function fetchStreakLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await supabase
    .from('user_streaks')
    .select('user_id, daily_streak')
    .order('daily_streak', { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return [];

  // Get user profiles
  const userIds = data.map((d) => d.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  return data.map((d) => {
    const profile = profileMap.get(d.user_id);
    return {
      rank: 0,
      userId: d.user_id,
      name: profile?.full_name || 'Unknown User',
      avatar: profile?.avatar_url,
      value: d.daily_streak || 0,
      isCurrentUser: false,
    };
  });
}

export default Leaderboard;
