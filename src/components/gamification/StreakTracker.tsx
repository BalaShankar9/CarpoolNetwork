import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar, Target, TrendingUp, Award, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StreakData {
  dailyStreak: number;
  longestDailyStreak: number;
  weeklyStreak: number;
  longestWeeklyStreak: number;
  lastActivity: Date | null;
  isActiveToday: boolean;
  daysUntilLost: number;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

export function StreakTracker() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekActivity, setWeekActivity] = useState<boolean[]>([]);

  useEffect(() => {
    if (user) {
      loadStreak();
    }
  }, [user]);

  const loadStreak = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastActivity = data?.last_daily_activity
        ? new Date(data.last_daily_activity)
        : null;
      const lastActivityDate = lastActivity?.toISOString().split('T')[0];

      const daysSinceActivity = lastActivity
        ? Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))
        : Infinity;

      const isActiveToday = lastActivityDate === today;
      const isStreakActive = daysSinceActivity <= 1;

      setStreak({
        dailyStreak: isStreakActive ? (data?.daily_streak || 0) : 0,
        longestDailyStreak: data?.longest_daily_streak || 0,
        weeklyStreak: data?.weekly_streak || 0,
        longestWeeklyStreak: data?.longest_weekly_streak || 0,
        lastActivity,
        isActiveToday,
        daysUntilLost: isStreakActive ? Math.max(0, 2 - daysSinceActivity) : 0,
      });

      // Load week activity
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      
      const { data: recentRides } = await supabase
        .from('rides')
        .select('departure_time')
        .eq('driver_id', user.id)
        .gte('departure_time', weekStart.toISOString());

      const { data: recentBookings } = await supabase
        .from('ride_bookings')
        .select('created_at')
        .eq('passenger_id', user.id)
        .eq('status', 'confirmed')
        .gte('created_at', weekStart.toISOString());

      const activityDates = new Set<string>();
      recentRides?.forEach((r) => {
        activityDates.add(new Date(r.departure_time).toISOString().split('T')[0]);
      });
      recentBookings?.forEach((b) => {
        activityDates.add(new Date(b.created_at).toISOString().split('T')[0]);
      });

      const weekActivityArr: boolean[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        weekActivityArr.push(activityDates.has(date.toISOString().split('T')[0]));
      }
      setWeekActivity(weekActivityArr);
    } catch (error) {
      console.error('Failed to load streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!streak) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
        <Flame className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>Start carpooling to build your streak!</p>
      </div>
    );
  }

  const nextMilestone = STREAK_MILESTONES.find((m) => m > streak.dailyStreak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const progressToMilestone = (streak.dailyStreak / nextMilestone) * 100;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  const orderedDays = [...dayNames.slice(today), ...dayNames.slice(0, today)].slice(-7);

  return (
    <div className="space-y-4">
      {/* Main Streak Card */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: streak.dailyStreak > 0 ? [1, 1.2, 1] : 1,
              }}
              transition={{
                duration: 1,
                repeat: streak.dailyStreak > 0 ? Infinity : 0,
                repeatDelay: 2,
              }}
              className="p-3 bg-white/20 rounded-xl"
            >
              <Flame className="w-8 h-8" />
            </motion.div>
            <div>
              <p className="text-white/80 text-sm">Current Streak</p>
              <p className="text-4xl font-bold">{streak.dailyStreak} days</p>
            </div>
          </div>

          {!streak.isActiveToday && streak.dailyStreak > 0 && (
            <div className="text-right">
              <p className="text-white/80 text-sm">Keep it going!</p>
              <p className="text-lg font-semibold">
                {streak.daysUntilLost > 0
                  ? `${streak.daysUntilLost} day${streak.daysUntilLost > 1 ? 's' : ''} left`
                  : 'Carpool today!'}
              </p>
            </div>
          )}
        </div>

        {/* Week Activity */}
        <div className="mt-6">
          <p className="text-white/80 text-sm mb-2">This Week</p>
          <div className="flex justify-between gap-2">
            {weekActivity.map((active, i) => (
              <div key={i} className="flex-1 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`aspect-square rounded-lg flex items-center justify-center ${
                    active ? 'bg-white text-orange-500' : 'bg-white/20'
                  }`}
                >
                  {active ? (
                    <Flame className="w-5 h-5" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/30" />
                  )}
                </motion.div>
                <p className="text-xs mt-1 text-white/60">{orderedDays[i]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress to Next Milestone */}
        {streak.dailyStreak > 0 && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/80">Next milestone</span>
              <span className="font-medium">{nextMilestone} days</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressToMilestone}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="text-xs text-white/60 mt-1">
              {nextMilestone - streak.dailyStreak} more days to go!
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Award className="w-5 h-5" />
            <span className="text-sm font-medium">Best Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {streak.longestDailyStreak} days
          </p>
          {streak.dailyStreak === streak.longestDailyStreak && streak.dailyStreak > 0 && (
            <p className="text-xs text-orange-600 mt-1">🎉 New record!</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Weekly Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {streak.weeklyStreak} weeks
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Best: {streak.longestWeeklyStreak} weeks
          </p>
        </div>
      </div>

      {/* Streak Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Streak Tips</p>
            <ul className="text-sm text-amber-700 mt-1 space-y-1">
              <li>• Carpool at least once per day to maintain your streak</li>
              <li>• You have until midnight to complete today's activity</li>
              <li>• Both driving and riding count toward your streak</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          Streak Milestones
        </h3>
        <div className="flex flex-wrap gap-2">
          {STREAK_MILESTONES.map((milestone) => {
            const isAchieved = streak.longestDailyStreak >= milestone;
            const isCurrent = streak.dailyStreak >= milestone;
            return (
              <div
                key={milestone}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isAchieved
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-gray-100 text-gray-400'
                } ${isCurrent ? 'ring-2 ring-orange-400' : ''}`}
              >
                {milestone} days
                {isAchieved && <span className="ml-1">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StreakTracker;
