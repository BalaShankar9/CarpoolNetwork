import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Star,
  Medal,
  Award,
  Crown,
  Flame,
  Target,
  Users,
  Leaf,
  Shield,
  Calendar,
  ChevronRight,
  Lock,
  Sparkles,
  TrendingUp,
  Zap,
  Loader2,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  TIER_COLORS,
  TIER_BG_COLORS,
  getUserAchievements,
  getUserStats,
  calculateProgress,
  UnlockedAchievement,
  Achievement,
  UserStats,
} from '../../services/achievementService';
import { useAuth } from '../../contexts/AuthContext';

// Icon mapping for achievements
const iconMap: Record<string, React.ReactNode> = {
  car: <Trophy className="w-6 h-6" />,
  play: <Zap className="w-6 h-6" />,
  shield: <Shield className="w-6 h-6" />,
  'trending-up': <TrendingUp className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  trophy: <Crown className="w-6 h-6" />,
  'message-square': <Star className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  'thumbs-up': <Medal className="w-6 h-6" />,
  users: <Users className="w-6 h-6" />,
  leaf: <Leaf className="w-6 h-6" />,
  calendar: <Calendar className="w-6 h-6" />,
  'check-circle': <Shield className="w-6 h-6" />,
};

type FilterCategory = 'all' | 'rides' | 'social' | 'safety' | 'milestone';

export function AchievementCenter() {
  const { user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [achievements, stats] = await Promise.all([
        getUserAchievements(user.id),
        getUserStats(user.id),
      ]);
      setUnlockedAchievements(achievements);
      setUserStats(stats);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));

  const filteredAchievements = ACHIEVEMENTS.filter(
    (a) => filter === 'all' || a.category === filter
  );

  const totalUnlocked = unlockedAchievements.length;
  const totalAchievements = ACHIEVEMENTS.length;
  const progressPercent = (totalUnlocked / totalAchievements) * 100;

  const categoryStats = {
    rides: {
      total: ACHIEVEMENTS.filter((a) => a.category === 'rides').length,
      unlocked: unlockedAchievements.filter((a) => a.category === 'rides').length,
    },
    social: {
      total: ACHIEVEMENTS.filter((a) => a.category === 'social').length,
      unlocked: unlockedAchievements.filter((a) => a.category === 'social').length,
    },
    safety: {
      total: ACHIEVEMENTS.filter((a) => a.category === 'safety').length,
      unlocked: unlockedAchievements.filter((a) => a.category === 'safety').length,
    },
    milestone: {
      total: ACHIEVEMENTS.filter((a) => a.category === 'milestone').length,
      unlocked: unlockedAchievements.filter((a) => a.category === 'milestone').length,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Achievements</h1>
            <p className="text-purple-200">Unlock badges by using CarpoolNetwork</p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span>{totalUnlocked} / {totalAchievements}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Category Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          {Object.entries(categoryStats).map(([category, stats]) => (
            <div
              key={category}
              className="bg-white/10 rounded-lg p-3 text-center cursor-pointer hover:bg-white/20 transition-colors"
              onClick={() => setFilter(category as FilterCategory)}
            >
              <p className="text-2xl font-bold">{stats.unlocked}</p>
              <p className="text-xs text-purple-200 capitalize">{category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'rides', 'social', 'safety', 'milestone'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === cat
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
            {cat !== 'all' && (
              <span className="ml-1 text-xs opacity-70">
                ({categoryStats[cat as keyof typeof categoryStats].unlocked}/
                {categoryStats[cat as keyof typeof categoryStats].total})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const unlockedData = unlockedAchievements.find((a) => a.id === achievement.id);
          const progress = userStats ? calculateProgress(achievement, userStats) : 0;

          return (
            <motion.div
              key={achievement.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                isUnlocked
                  ? TIER_BG_COLORS[achievement.tier]
                  : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => setSelectedAchievement(achievement)}
            >
              {/* Unlocked Sparkle Effect */}
              {isUnlocked && (
                <div className="absolute top-2 right-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`p-3 rounded-lg ${
                    isUnlocked
                      ? `bg-gradient-to-br ${TIER_COLORS[achievement.tier]} text-white`
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isUnlocked ? (
                    iconMap[achievement.icon] || <Trophy className="w-6 h-6" />
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                    {achievement.name}
                  </h3>
                  <p className={`text-sm ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                    {achievement.description}
                  </p>

                  {/* Progress Bar (if not unlocked) */}
                  {!isUnlocked && achievement.requirement && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Unlocked Date */}
                  {isUnlocked && unlockedData && (
                    <p className="text-xs text-gray-500 mt-2">
                      Unlocked {new Date(unlockedData.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Tier Badge */}
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                    isUnlocked
                      ? `bg-gradient-to-r ${TIER_COLORS[achievement.tier]} text-white`
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {achievement.tier}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-md w-full p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const isUnlocked = unlockedIds.has(selectedAchievement.id);
                const progress = userStats
                  ? calculateProgress(selectedAchievement, userStats)
                  : 0;

                return (
                  <>
                    <div className="text-center">
                      <div
                        className={`inline-flex p-4 rounded-2xl ${
                          isUnlocked
                            ? `bg-gradient-to-br ${TIER_COLORS[selectedAchievement.tier]} text-white`
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isUnlocked ? (
                          iconMap[selectedAchievement.icon] || <Trophy className="w-12 h-12" />
                        ) : (
                          <Lock className="w-12 h-12" />
                        )}
                      </div>
                      <h2 className="text-xl font-bold mt-4">{selectedAchievement.name}</h2>
                      <p className="text-gray-600 mt-1">{selectedAchievement.description}</p>
                      <span
                        className={`inline-block mt-3 text-sm font-medium px-3 py-1 rounded-full capitalize ${
                          isUnlocked
                            ? `bg-gradient-to-r ${TIER_COLORS[selectedAchievement.tier]} text-white`
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {selectedAchievement.tier}
                      </span>
                    </div>

                    {!isUnlocked && selectedAchievement.requirement && (
                      <div className="mt-6">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Progress to unlock</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${TIER_COLORS[selectedAchievement.tier]} rounded-full`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          Keep going! You're {100 - progress}% away from unlocking this achievement.
                        </p>
                      </div>
                    )}

                    {isUnlocked && (
                      <div className="mt-6 p-4 bg-green-50 rounded-lg text-center">
                        <Sparkles className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-green-700 font-medium">Achievement Unlocked!</p>
                        <p className="text-sm text-green-600">
                          You earned this on{' '}
                          {new Date(
                            unlockedAchievements.find((a) => a.id === selectedAchievement.id)
                              ?.unlockedAt || ''
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedAchievement(null)}
                      className="w-full mt-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Close
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AchievementCenter;
