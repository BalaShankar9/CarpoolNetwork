import { supabase } from '../lib/supabase';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'rides' | 'social' | 'safety' | 'milestone';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement?: number;
  checkFn?: (stats: UserStats) => boolean;
}

export interface UserStats {
  ridesAsDriver: number;
  ridesAsPassenger: number;
  totalRides: number;
  fiveStarRatings: number;
  reviewsGiven: number;
  uniquePassengers: number;
  uniqueDrivers: number;
  co2Saved: number;
  accountAgeDays: number;
  verificationLevel: number;
  friendsCount: number;
}

export interface UnlockedAchievement extends Achievement {
  unlockedAt: string;
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Rides - Bronze
  {
    id: 'first_ride',
    name: 'First Ride',
    description: 'Complete your first ride',
    icon: 'car',
    category: 'rides',
    tier: 'bronze',
    requirement: 1,
    checkFn: (stats) => stats.totalRides >= 1,
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Complete 5 rides',
    icon: 'play',
    category: 'rides',
    tier: 'bronze',
    requirement: 5,
    checkFn: (stats) => stats.totalRides >= 5,
  },
  // Rides - Silver
  {
    id: 'road_warrior',
    name: 'Road Warrior',
    description: 'Complete 10 rides as a driver',
    icon: 'shield',
    category: 'rides',
    tier: 'silver',
    requirement: 10,
    checkFn: (stats) => stats.ridesAsDriver >= 10,
  },
  {
    id: 'frequent_rider',
    name: 'Frequent Rider',
    description: 'Complete 25 rides as a passenger',
    icon: 'trending-up',
    category: 'rides',
    tier: 'silver',
    requirement: 25,
    checkFn: (stats) => stats.ridesAsPassenger >= 25,
  },
  // Rides - Gold
  {
    id: 'half_century',
    name: 'Half Century',
    description: 'Complete 50 total rides',
    icon: 'award',
    category: 'rides',
    tier: 'gold',
    requirement: 50,
    checkFn: (stats) => stats.totalRides >= 50,
  },
  // Rides - Platinum
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Complete 100 total rides',
    icon: 'trophy',
    category: 'milestone',
    tier: 'platinum',
    requirement: 100,
    checkFn: (stats) => stats.totalRides >= 100,
  },
  // Social - Bronze
  {
    id: 'first_review',
    name: 'First Review',
    description: 'Leave your first review',
    icon: 'message-square',
    category: 'social',
    tier: 'bronze',
    requirement: 1,
    checkFn: (stats) => stats.reviewsGiven >= 1,
  },
  // Social - Silver
  {
    id: 'five_star',
    name: 'Five Star',
    description: 'Receive 10 five-star ratings',
    icon: 'star',
    category: 'social',
    tier: 'silver',
    requirement: 10,
    checkFn: (stats) => stats.fiveStarRatings >= 10,
  },
  {
    id: 'helpful_reviewer',
    name: 'Helpful Reviewer',
    description: 'Leave 15 reviews',
    icon: 'thumbs-up',
    category: 'social',
    tier: 'silver',
    requirement: 15,
    checkFn: (stats) => stats.reviewsGiven >= 15,
  },
  // Social - Gold
  {
    id: 'networker',
    name: 'Networker',
    description: 'Connect with 20 unique users',
    icon: 'users',
    category: 'social',
    tier: 'gold',
    requirement: 20,
    checkFn: (stats) => (stats.uniquePassengers + stats.uniqueDrivers) >= 20,
  },
  // Milestone - Silver
  {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Save 100kg of CO2 through carpooling',
    icon: 'leaf',
    category: 'milestone',
    tier: 'silver',
    requirement: 100,
    checkFn: (stats) => stats.co2Saved >= 100,
  },
  // Milestone - Gold
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Be a member for 1 year',
    icon: 'calendar',
    category: 'milestone',
    tier: 'gold',
    requirement: 365,
    checkFn: (stats) => stats.accountAgeDays >= 365,
  },
  // Safety - Silver
  {
    id: 'fully_verified',
    name: 'Fully Verified',
    description: 'Complete all verification steps',
    icon: 'check-circle',
    category: 'safety',
    tier: 'silver',
    requirement: 5,
    checkFn: (stats) => stats.verificationLevel >= 5,
  },
];

// Tier colors for UI
export const TIER_COLORS = {
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-gray-400 to-gray-500',
  gold: 'from-yellow-400 to-amber-500',
  platinum: 'from-purple-400 to-indigo-500',
};

export const TIER_BG_COLORS = {
  bronze: 'bg-amber-100 border-amber-300',
  silver: 'bg-gray-100 border-gray-300',
  gold: 'bg-yellow-100 border-yellow-300',
  platinum: 'bg-purple-100 border-purple-300',
};

/**
 * Get user statistics for achievement checking
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [
    ridesAsDriverResult,
    ridesAsPassengerResult,
    fiveStarResult,
    reviewsGivenResult,
    profileResult,
    friendsResult,
  ] = await Promise.all([
    supabase
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('passenger_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('reviewee_id', userId)
      .eq('rating', 5),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('reviewer_id', userId),
    supabase
      .from('profiles')
      .select('created_at, email_verified, phone_verified, face_verified, license_verified, insurance_verified')
      .eq('id', userId)
      .single(),
    supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted'),
  ]);

  const ridesAsDriver = ridesAsDriverResult.count || 0;
  const ridesAsPassenger = ridesAsPassengerResult.count || 0;

  const profile = profileResult.data;
  const accountAgeDays = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const verificationLevel = profile
    ? [
        profile.email_verified,
        profile.phone_verified,
        profile.face_verified,
        profile.license_verified,
        profile.insurance_verified,
      ].filter(Boolean).length
    : 0;

  return {
    ridesAsDriver,
    ridesAsPassenger,
    totalRides: ridesAsDriver + ridesAsPassenger,
    fiveStarRatings: fiveStarResult.count || 0,
    reviewsGiven: reviewsGivenResult.count || 0,
    uniquePassengers: 0, // Would need separate query
    uniqueDrivers: 0, // Would need separate query
    co2Saved: (ridesAsDriver + ridesAsPassenger) * 2.3, // ~2.3kg per shared ride
    accountAgeDays,
    verificationLevel,
    friendsCount: friendsResult.count || 0,
  };
}

/**
 * Check all achievements and return newly unlocked ones
 */
export async function checkAllAchievements(userId: string): Promise<string[]> {
  const stats = await getUserStats(userId);

  // Get existing achievements
  const { data: existingAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const existingIds = new Set((existingAchievements || []).map(a => a.achievement_id));
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (existingIds.has(achievement.id)) continue;

    // Check if achievement is earned
    if (achievement.checkFn?.(stats)) {
      // Insert achievement
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
        });

      if (!error) {
        newlyUnlocked.push(achievement.id);

        // Create notification
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'achievement_unlocked',
          title: `Achievement Unlocked: ${achievement.name}`,
          message: achievement.description,
          data: { achievement_id: achievement.id },
        });
      }
    }
  }

  return newlyUnlocked;
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', userId);

  return (data || [])
    .map(ua => {
      const achievement = ACHIEVEMENTS.find(a => a.id === ua.achievement_id);
      if (!achievement) return null;
      return {
        ...achievement,
        unlockedAt: ua.unlocked_at,
      };
    })
    .filter((a): a is UnlockedAchievement => a !== null);
}

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

/**
 * Calculate progress towards an achievement
 */
export function calculateProgress(achievement: Achievement, stats: UserStats): number {
  if (!achievement.requirement) return achievement.checkFn?.(stats) ? 100 : 0;

  let current = 0;

  switch (achievement.id) {
    case 'first_ride':
    case 'getting_started':
    case 'half_century':
    case 'century_club':
      current = stats.totalRides;
      break;
    case 'road_warrior':
      current = stats.ridesAsDriver;
      break;
    case 'frequent_rider':
      current = stats.ridesAsPassenger;
      break;
    case 'five_star':
      current = stats.fiveStarRatings;
      break;
    case 'first_review':
    case 'helpful_reviewer':
      current = stats.reviewsGiven;
      break;
    case 'networker':
      current = stats.uniquePassengers + stats.uniqueDrivers;
      break;
    case 'eco_warrior':
      current = stats.co2Saved;
      break;
    case 'veteran':
      current = stats.accountAgeDays;
      break;
    case 'fully_verified':
      current = stats.verificationLevel;
      break;
  }

  return Math.min(100, Math.round((current / achievement.requirement) * 100));
}
