import { useState, useEffect } from 'react';
import { Award, Trophy, Target, Star, Zap, Crown, Heart, Leaf, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export default function AchievementsBadges() {
  const { profile } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (profile?.id) {
      loadAchievements();
    }
  }, [profile?.id]);

  const loadAchievements = async () => {
    try {
      setLoading(true);

      const { data: ridesAsDriver } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', profile?.id)
        .eq('status', 'completed');

      const { data: bookingsAsPassenger } = await supabase
        .from('ride_bookings')
        .select('id')
        .eq('passenger_id', profile?.id)
        .eq('status', 'completed');

      const { data: friends } = await supabase
        .from('friends')
        .select('id')
        .eq('user_id', profile?.id)
        .eq('status', 'accepted');

      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', profile?.id);

      const totalRidesOffered = ridesAsDriver?.length || 0;
      const totalRidesTaken = bookingsAsPassenger?.length || 0;
      const totalFriends = friends?.length || 0;
      const fiveStarReviews = reviews?.filter(r => r.rating === 5).length || 0;
      const averageRating = profile?.average_rating || 0;
      const trustScore = profile?.trust_score || 0;

      const totalRides = totalRidesOffered + totalRidesTaken;

      const achievementsList: Achievement[] = [
        {
          id: 'first_ride',
          name: 'First Journey',
          description: 'Complete your first ride',
          icon: 'car',
          tier: 'bronze',
          requirement: 1,
          progress: totalRides,
          unlocked: totalRides >= 1
        },
        {
          id: 'ride_veteran',
          name: 'Ride Veteran',
          description: 'Complete 10 rides',
          icon: 'trophy',
          tier: 'silver',
          requirement: 10,
          progress: totalRides,
          unlocked: totalRides >= 10
        },
        {
          id: 'centurion',
          name: 'Centurion',
          description: 'Complete 100 rides',
          icon: 'crown',
          tier: 'gold',
          requirement: 100,
          progress: totalRides,
          unlocked: totalRides >= 100
        },
        {
          id: 'legendary',
          name: 'Legendary Carpooler',
          description: 'Complete 500 rides',
          icon: 'zap',
          tier: 'platinum',
          requirement: 500,
          progress: totalRides,
          unlocked: totalRides >= 500
        },
        {
          id: 'social_butterfly',
          name: 'Social Butterfly',
          description: 'Connect with 10 friends',
          icon: 'users',
          tier: 'silver',
          requirement: 10,
          progress: totalFriends,
          unlocked: totalFriends >= 10
        },
        {
          id: 'community_builder',
          name: 'Community Builder',
          description: 'Connect with 50 friends',
          icon: 'heart',
          tier: 'gold',
          requirement: 50,
          progress: totalFriends,
          unlocked: totalFriends >= 50
        },
        {
          id: 'five_star_hero',
          name: 'Five Star Hero',
          description: 'Receive 25 five-star reviews',
          icon: 'star',
          tier: 'gold',
          requirement: 25,
          progress: fiveStarReviews,
          unlocked: fiveStarReviews >= 25
        },
        {
          id: 'perfect_rating',
          name: 'Perfect Rating',
          description: 'Maintain a 5.0 average rating',
          icon: 'target',
          tier: 'platinum',
          requirement: 5.0,
          progress: averageRating,
          unlocked: averageRating === 5.0 && (reviews?.length || 0) >= 10
        },
        {
          id: 'trusted_member',
          name: 'Trusted Member',
          description: 'Reach 90+ trust score',
          icon: 'award',
          tier: 'gold',
          requirement: 90,
          progress: trustScore,
          unlocked: trustScore >= 90
        },
        {
          id: 'eco_warrior',
          name: 'Eco Warrior',
          description: 'Save 100kg of CO₂',
          icon: 'leaf',
          tier: 'silver',
          requirement: 100,
          progress: Math.round((totalRides * 10 * 0.171) * 10) / 10,
          unlocked: (totalRides * 10 * 0.171) >= 100
        },
        {
          id: 'driver_pro',
          name: 'Driver Pro',
          description: 'Offer 25 rides as driver',
          icon: 'trending-up',
          tier: 'silver',
          requirement: 25,
          progress: totalRidesOffered,
          unlocked: totalRidesOffered >= 25
        },
        {
          id: 'passenger_regular',
          name: 'Regular Passenger',
          description: 'Take 25 rides as passenger',
          icon: 'users',
          tier: 'silver',
          requirement: 25,
          progress: totalRidesTaken,
          unlocked: totalRidesTaken >= 25
        }
      ];

      setAchievements(achievementsList);
    } catch (err) {
      console.error('Error loading achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      car: Award,
      trophy: Trophy,
      crown: Crown,
      zap: Zap,
      users: Users,
      heart: Heart,
      star: Star,
      target: Target,
      award: Award,
      leaf: Leaf,
      'trending-up': TrendingUp
    };
    return icons[iconName] || Award;
  };

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'from-orange-400 to-orange-600',
      silver: 'from-gray-300 to-gray-500',
      gold: 'from-yellow-400 to-yellow-600',
      platinum: 'from-purple-400 to-purple-600'
    };
    return colors[tier as keyof typeof colors] || 'from-gray-400 to-gray-600';
  };

  const getTierBadgeColor = (tier: string) => {
    const colors = {
      bronze: 'bg-orange-100 text-orange-800 border-orange-300',
      silver: 'bg-gray-100 text-gray-800 border-gray-300',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      platinum: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'unlocked') return achievement.unlocked;
    if (filter === 'locked') return !achievement.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gray-900" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Achievements & Badges</h3>
              <p className="text-sm text-gray-600">
                {unlockedCount} of {totalCount} unlocked
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{Math.round((unlockedCount / totalCount) * 100)}%</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unlocked'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'locked'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Locked ({totalCount - unlockedCount})
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAchievements.map((achievement) => {
            const Icon = getIcon(achievement.icon);
            const progress = Math.min((achievement.progress / achievement.requirement) * 100, 100);

            return (
              <div
                key={achievement.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-75'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                      achievement.unlocked
                        ? `bg-gradient-to-br ${getTierColor(achievement.tier)}`
                        : 'bg-gray-300'
                    }`}
                  >
                    <Icon className={`w-8 h-8 ${achievement.unlocked ? 'text-white' : 'text-gray-500'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-bold ${achievement.unlocked ? 'text-gray-900' : 'text-gray-600'}`}>
                        {achievement.name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getTierBadgeColor(
                          achievement.tier
                        )}`}
                      >
                        {achievement.tier.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>

                    {!achievement.unlocked && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 flex justify-between">
                          <span>Progress: {achievement.progress.toFixed(1)} / {achievement.requirement}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                      </>
                    )}

                    {achievement.unlocked && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          Unlocked!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">No achievements found</p>
            <p className="text-sm">Try a different filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
