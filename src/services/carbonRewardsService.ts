import { supabase } from '../lib/supabase';

// Types
export interface CarbonStats {
  totalCO2Saved: number; // kg
  totalDistanceShared: number; // km
  ridesShared: number;
  treesEquivalent: number;
  monthlyAverage: number;
  rank?: number;
  percentile?: number;
}

export interface CarbonEntry {
  id: string;
  userId: string;
  rideId: string;
  distanceKm: number;
  co2SavedKg: number;
  passengers: number;
  vehicleType: 'car' | 'van' | 'electric' | 'hybrid';
  createdAt: Date;
}

export interface RewardPoints {
  userId: string;
  currentPoints: number;
  lifetimePoints: number;
  tier: RewardTier;
  tierProgress: number;
  nextTierPoints: number;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  source: string;
  description: string;
  referenceId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  category: 'discount' | 'voucher' | 'donation' | 'badge' | 'feature';
  pointsCost: number;
  value?: number;
  currency?: string;
  imageUrl?: string;
  partnerId?: string;
  partnerName?: string;
  stock?: number;
  featured?: boolean;
  active: boolean;
}

export interface RedemptionRecord {
  id: string;
  userId: string;
  rewardId: string;
  reward: Reward;
  pointsSpent: number;
  status: 'pending' | 'completed' | 'cancelled';
  code?: string;
  redeemedAt: Date;
  expiresAt?: Date;
}

export type RewardTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// Constants
export const CO2_EMISSIONS_PER_KM = {
  car: 0.21, // kg CO2 per km (average petrol car)
  van: 0.27,
  electric: 0.05, // Including grid electricity
  hybrid: 0.12,
};

// About 22kg CO2 absorbed per tree per year
export const CO2_PER_TREE_PER_YEAR = 22;

// Points earned per action
export const POINTS_RATES = {
  co2SavedPerKg: 10, // 10 points per kg CO2 saved
  rideCompleted: 50, // Bonus for completing a ride
  firstRideOfDay: 25, // Bonus for first ride each day
  streak7Days: 100, // Weekly streak bonus
  streak30Days: 500, // Monthly streak bonus
  referral: 200, // Referral bonus
  profileComplete: 100, // Profile completion bonus
  verifiedDriver: 150, // Driver verification bonus
};

// Tier thresholds (lifetime points)
export const TIER_THRESHOLDS: Record<RewardTier, { min: number; max: number; name: string; color: string }> = {
  bronze: { min: 0, max: 999, name: 'Bronze', color: '#CD7F32' },
  silver: { min: 1000, max: 4999, name: 'Silver', color: '#C0C0C0' },
  gold: { min: 5000, max: 14999, name: 'Gold', color: '#FFD700' },
  platinum: { min: 15000, max: 49999, name: 'Platinum', color: '#E5E4E2' },
  diamond: { min: 50000, max: Infinity, name: 'Diamond', color: '#B9F2FF' },
};

// Sample rewards catalog
export const REWARDS_CATALOG: Reward[] = [
  {
    id: 'discount-10',
    name: '10% Off Next Ride',
    description: 'Get 10% discount on your next fuel contribution',
    category: 'discount',
    pointsCost: 500,
    value: 10,
    active: true,
  },
  {
    id: 'coffee-voucher',
    name: 'Free Coffee',
    description: 'Redeem at participating Costa Coffee locations',
    category: 'voucher',
    pointsCost: 750,
    value: 3.50,
    currency: 'GBP',
    partnerName: 'Costa Coffee',
    active: true,
    featured: true,
  },
  {
    id: 'tree-plant',
    name: 'Plant a Tree',
    description: 'We\'ll plant a tree on your behalf through our partner charity',
    category: 'donation',
    pointsCost: 1000,
    partnerName: 'One Tree Planted',
    active: true,
    featured: true,
  },
  {
    id: 'premium-week',
    name: 'Premium for 1 Week',
    description: 'Enjoy Plus membership features for 7 days',
    category: 'feature',
    pointsCost: 2000,
    active: true,
  },
  {
    id: 'badge-eco-warrior',
    name: 'Eco Warrior Badge',
    description: 'Show off your environmental commitment on your profile',
    category: 'badge',
    pointsCost: 300,
    active: true,
  },
  {
    id: 'fuel-voucher-5',
    name: '£5 Fuel Voucher',
    description: 'Redeem at BP, Shell, or Esso stations',
    category: 'voucher',
    pointsCost: 2500,
    value: 5,
    currency: 'GBP',
    active: true,
    featured: true,
  },
  {
    id: 'cinema-ticket',
    name: 'Cinema Ticket',
    description: 'One standard ticket at Odeon cinemas',
    category: 'voucher',
    pointsCost: 3000,
    value: 12,
    currency: 'GBP',
    partnerName: 'Odeon',
    active: true,
  },
  {
    id: 'charity-donation-5',
    name: '£5 Charity Donation',
    description: 'Donate to environmental charities',
    category: 'donation',
    pointsCost: 2000,
    value: 5,
    currency: 'GBP',
    active: true,
  },
];

// Carbon & Rewards Service
export const carbonRewardsService = {
  // ==================== CARBON TRACKING ====================

  // Calculate CO2 saved for a shared ride
  calculateCO2Saved(
    distanceKm: number,
    passengers: number,
    vehicleType: keyof typeof CO2_EMISSIONS_PER_KM = 'car'
  ): number {
    // CO2 saved = emissions that would have been produced if everyone drove separately
    // minus the emissions from the shared ride
    const emissionsPerKm = CO2_EMISSIONS_PER_KM[vehicleType];
    const totalIfSeparate = distanceKm * emissionsPerKm * (passengers + 1);
    const actualEmissions = distanceKm * emissionsPerKm;
    const saved = totalIfSeparate - actualEmissions;

    return Math.round(saved * 100) / 100;
  },

  // Convert CO2 saved to equivalent trees planted
  calculateTreesEquivalent(co2SavedKg: number): number {
    // How many trees would absorb this much CO2 in a year
    return Math.round((co2SavedKg / CO2_PER_TREE_PER_YEAR) * 10) / 10;
  },

  // Record carbon savings for a ride
  async recordCarbonSavings(
    userId: string,
    rideId: string,
    distanceKm: number,
    passengers: number,
    vehicleType: 'car' | 'van' | 'electric' | 'hybrid' = 'car'
  ): Promise<CarbonEntry | null> {
    const co2Saved = this.calculateCO2Saved(distanceKm, passengers, vehicleType);

    const entry: CarbonEntry = {
      id: crypto.randomUUID(),
      userId,
      rideId,
      distanceKm,
      co2SavedKg: co2Saved,
      passengers,
      vehicleType,
      createdAt: new Date(),
    };

    try {
      const { error } = await supabase.from('carbon_entries').insert({
        id: entry.id,
        user_id: entry.userId,
        ride_id: entry.rideId,
        distance_km: entry.distanceKm,
        co2_saved_kg: entry.co2SavedKg,
        passengers: entry.passengers,
        vehicle_type: entry.vehicleType,
        created_at: entry.createdAt.toISOString(),
      });

      if (error) throw error;

      // Award points for carbon savings
      await this.awardPoints(
        userId,
        Math.round(co2Saved * POINTS_RATES.co2SavedPerKg),
        'earned',
        'carbon_savings',
        `Carbon savings: ${co2Saved.toFixed(2)} kg CO2`,
        rideId
      );

      // Award ride completion bonus
      await this.awardPoints(
        userId,
        POINTS_RATES.rideCompleted,
        'earned',
        'ride_completed',
        'Ride completed bonus',
        rideId
      );

      return entry;
    } catch (error) {
      console.error('Failed to record carbon savings:', error);
      return null;
    }
  },

  // Get user's carbon statistics
  async getCarbonStats(userId: string): Promise<CarbonStats> {
    try {
      const { data, error } = await supabase
        .from('carbon_entries')
        .select('co2_saved_kg, distance_km')
        .eq('user_id', userId);

      if (error) throw error;

      const entries = data || [];
      const totalCO2Saved = entries.reduce((sum, e) => sum + (e.co2_saved_kg || 0), 0);
      const totalDistanceShared = entries.reduce((sum, e) => sum + (e.distance_km || 0), 0);

      // Calculate monthly average (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data: recentData } = await supabase
        .from('carbon_entries')
        .select('co2_saved_kg')
        .eq('user_id', userId)
        .gte('created_at', twelveMonthsAgo.toISOString());

      const recentTotal = (recentData || []).reduce((sum, e) => sum + (e.co2_saved_kg || 0), 0);
      const monthlyAverage = recentTotal / 12;

      return {
        totalCO2Saved: Math.round(totalCO2Saved * 100) / 100,
        totalDistanceShared: Math.round(totalDistanceShared * 10) / 10,
        ridesShared: entries.length,
        treesEquivalent: this.calculateTreesEquivalent(totalCO2Saved),
        monthlyAverage: Math.round(monthlyAverage * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get carbon stats:', error);
      return {
        totalCO2Saved: 0,
        totalDistanceShared: 0,
        ridesShared: 0,
        treesEquivalent: 0,
        monthlyAverage: 0,
      };
    }
  },

  // Get leaderboard
  async getLeaderboard(limit: number = 10): Promise<Array<{ userId: string; userName: string; co2Saved: number }>> {
    try {
      const { data, error } = await supabase.rpc('get_carbon_leaderboard', { limit_count: limit });

      if (error) throw error;
      return data || [];
    } catch {
      // Fallback if RPC doesn't exist
      return [];
    }
  },

  // ==================== REWARDS & POINTS ====================

  // Award points to user
  async awardPoints(
    userId: string,
    amount: number,
    type: PointTransaction['type'],
    source: string,
    description: string,
    referenceId?: string
  ): Promise<boolean> {
    if (amount <= 0) return false;

    try {
      // Create transaction record
      const { error: txError } = await supabase.from('point_transactions').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        amount,
        type,
        source,
        description,
        reference_id: referenceId,
        created_at: new Date().toISOString(),
      });

      if (txError) throw txError;

      // Update user's points balance
      const { error: updateError } = await supabase.rpc('increment_user_points', {
        p_user_id: userId,
        p_amount: amount,
      });

      if (updateError) {
        // Fallback: upsert if RPC doesn't exist
        await supabase.from('user_rewards').upsert({
          user_id: userId,
          current_points: amount,
          lifetime_points: amount,
          updated_at: new Date().toISOString(),
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to award points:', error);
      return false;
    }
  },

  // Get user's reward points
  async getRewardPoints(userId: string): Promise<RewardPoints> {
    try {
      const { data, error } = await supabase
        .from('user_rewards')
        .select('current_points, lifetime_points')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const currentPoints = data?.current_points || 0;
      const lifetimePoints = data?.lifetime_points || 0;
      const tier = this.calculateTier(lifetimePoints);
      const { progress, nextThreshold } = this.calculateTierProgress(lifetimePoints);

      return {
        userId,
        currentPoints,
        lifetimePoints,
        tier,
        tierProgress: progress,
        nextTierPoints: nextThreshold,
      };
    } catch (error) {
      console.error('Failed to get reward points:', error);
      return {
        userId,
        currentPoints: 0,
        lifetimePoints: 0,
        tier: 'bronze',
        tierProgress: 0,
        nextTierPoints: TIER_THRESHOLDS.silver.min,
      };
    }
  },

  // Calculate user's tier based on lifetime points
  calculateTier(lifetimePoints: number): RewardTier {
    if (lifetimePoints >= TIER_THRESHOLDS.diamond.min) return 'diamond';
    if (lifetimePoints >= TIER_THRESHOLDS.platinum.min) return 'platinum';
    if (lifetimePoints >= TIER_THRESHOLDS.gold.min) return 'gold';
    if (lifetimePoints >= TIER_THRESHOLDS.silver.min) return 'silver';
    return 'bronze';
  },

  // Calculate progress to next tier
  calculateTierProgress(lifetimePoints: number): { progress: number; nextThreshold: number } {
    const tier = this.calculateTier(lifetimePoints);
    const current = TIER_THRESHOLDS[tier];

    if (tier === 'diamond') {
      return { progress: 100, nextThreshold: lifetimePoints };
    }

    const tiers: RewardTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const nextTierIndex = tiers.indexOf(tier) + 1;
    const nextTier = tiers[nextTierIndex];
    const nextThreshold = TIER_THRESHOLDS[nextTier].min;

    const pointsInCurrentTier = lifetimePoints - current.min;
    const pointsNeeded = nextThreshold - current.min;
    const progress = Math.min(100, Math.round((pointsInCurrentTier / pointsNeeded) * 100));

    return { progress, nextThreshold };
  },

  // Get available rewards
  getAvailableRewards(userPoints?: number): Reward[] {
    let rewards = REWARDS_CATALOG.filter((r) => r.active);

    if (userPoints !== undefined) {
      rewards = rewards.map((r) => ({
        ...r,
        canAfford: r.pointsCost <= userPoints,
      })) as any;
    }

    return rewards.sort((a, b) => {
      // Featured first, then by points cost
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.pointsCost - b.pointsCost;
    });
  },

  // Redeem a reward
  async redeemReward(userId: string, rewardId: string): Promise<RedemptionRecord | null> {
    const reward = REWARDS_CATALOG.find((r) => r.id === rewardId);
    if (!reward || !reward.active) return null;

    try {
      // Check user has enough points
      const userPoints = await this.getRewardPoints(userId);
      if (userPoints.currentPoints < reward.pointsCost) {
        throw new Error('Insufficient points');
      }

      // Create redemption record
      const redemption: RedemptionRecord = {
        id: crypto.randomUUID(),
        userId,
        rewardId,
        reward,
        pointsSpent: reward.pointsCost,
        status: 'completed',
        code: this.generateRedemptionCode(),
        redeemedAt: new Date(),
        expiresAt: reward.category === 'voucher' ? this.addDays(new Date(), 90) : undefined,
      };

      // Deduct points
      const { error: txError } = await supabase.from('point_transactions').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: -reward.pointsCost,
        type: 'redeemed',
        source: 'reward_redemption',
        description: `Redeemed: ${reward.name}`,
        reference_id: redemption.id,
        created_at: new Date().toISOString(),
      });

      if (txError) throw txError;

      // Update user's points balance
      await supabase.rpc('decrement_user_points', {
        p_user_id: userId,
        p_amount: reward.pointsCost,
      });

      // Save redemption record
      await supabase.from('reward_redemptions').insert({
        id: redemption.id,
        user_id: userId,
        reward_id: rewardId,
        points_spent: reward.pointsCost,
        status: redemption.status,
        code: redemption.code,
        redeemed_at: redemption.redeemedAt.toISOString(),
        expires_at: redemption.expiresAt?.toISOString(),
      });

      return redemption;
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      return null;
    }
  },

  // Get user's redemption history
  async getRedemptionHistory(userId: string): Promise<RedemptionRecord[]> {
    try {
      const { data, error } = await supabase
        .from('reward_redemptions')
        .select('*')
        .eq('user_id', userId)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        rewardId: r.reward_id,
        reward: REWARDS_CATALOG.find((rew) => rew.id === r.reward_id) || ({} as Reward),
        pointsSpent: r.points_spent,
        status: r.status,
        code: r.code,
        redeemedAt: new Date(r.redeemed_at),
        expiresAt: r.expires_at ? new Date(r.expires_at) : undefined,
      }));
    } catch (error) {
      console.error('Failed to get redemption history:', error);
      return [];
    }
  },

  // Get points transaction history
  async getPointsHistory(userId: string, limit: number = 50): Promise<PointTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((t) => ({
        id: t.id,
        userId: t.user_id,
        amount: t.amount,
        type: t.type,
        source: t.source,
        description: t.description,
        referenceId: t.reference_id,
        createdAt: new Date(t.created_at),
        expiresAt: t.expires_at ? new Date(t.expires_at) : undefined,
      }));
    } catch (error) {
      console.error('Failed to get points history:', error);
      return [];
    }
  },

  // Helper functions
  generateRedemptionCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
};
