// Referral System Service
// Track referrals, generate codes, handle rewards

import { supabase } from '@/lib/supabase';

export interface ReferralCode {
    code: string;
    userId: string;
    createdAt: Date;
    usageCount: number;
    maxUses: number | null;
    expiresAt: Date | null;
    isActive: boolean;
}

export interface Referral {
    id: string;
    referrerId: string;
    referredId: string;
    referralCode: string;
    status: 'pending' | 'completed' | 'rewarded';
    rewardType?: 'badge' | 'premium_days' | 'featured_ride';
    rewardValue?: number;
    createdAt: Date;
    completedAt?: Date;
}

export interface ReferralStats {
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    totalRewardsEarned: {
        badges: number;
        premiumDays: number;
        featuredRides: number;
    };
    rank: number; // Position in leaderboard
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface ReferralTier {
    name: string;
    minReferrals: number;
    color: string;
    benefits: string[];
    badge: string;
}

export const REFERRAL_TIERS: ReferralTier[] = [
    {
        name: 'Bronze',
        minReferrals: 0,
        color: '#CD7F32',
        benefits: ['Standard referral rewards'],
        badge: '🥉'
    },
    {
        name: 'Silver',
        minReferrals: 5,
        color: '#C0C0C0',
        benefits: ['Double badge rewards', 'Profile silver badge'],
        badge: '🥈'
    },
    {
        name: 'Gold',
        minReferrals: 15,
        color: '#FFD700',
        benefits: ['Triple badge rewards', 'Profile gold badge', 'Priority support'],
        badge: '🥇'
    },
    {
        name: 'Platinum',
        minReferrals: 50,
        color: '#E5E4E2',
        benefits: ['Quadruple rewards', 'Platinum badge', 'Free premium month', 'Featured ambassador'],
        badge: '💎'
    }
];

class ReferralService {
    // Generate a unique referral code
    generateReferralCode(userId: string): string {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        // Add user identifier hash
        const userHash = userId.substring(0, 4).toUpperCase();
        return `${code}-${userHash}`;
    }

    // Create or get existing referral code for user
    async getOrCreateReferralCode(userId: string): Promise<ReferralCode | null> {
        // Check for existing active code
        const { data: existing } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle();

        if (existing) {
            return {
                code: existing.code,
                userId: existing.user_id,
                createdAt: new Date(existing.created_at),
                usageCount: existing.usage_count,
                maxUses: existing.max_uses,
                expiresAt: existing.expires_at ? new Date(existing.expires_at) : null,
                isActive: existing.is_active
            };
        }

        // Create new code
        const newCode = this.generateReferralCode(userId);

        const { data: created, error } = await supabase
            .from('referral_codes')
            .insert({
                code: newCode,
                user_id: userId,
                is_active: true,
                usage_count: 0
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create referral code:', error);
            return null;
        }

        return {
            code: created.code,
            userId: created.user_id,
            createdAt: new Date(created.created_at),
            usageCount: created.usage_count,
            maxUses: created.max_uses,
            expiresAt: created.expires_at ? new Date(created.expires_at) : null,
            isActive: created.is_active
        };
    }

    // Apply referral code during signup
    async applyReferralCode(
        newUserId: string,
        code: string
    ): Promise<{ success: boolean; message: string; referrerId?: string }> {
        // Find the referral code
        const { data: referralCode } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('code', code.toUpperCase().trim())
            .eq('is_active', true)
            .maybeSingle();

        if (!referralCode) {
            return { success: false, message: 'Invalid or expired referral code' };
        }

        // Check if self-referral
        if (referralCode.user_id === newUserId) {
            return { success: false, message: 'Cannot use your own referral code' };
        }

        // Check max uses
        if (referralCode.max_uses && referralCode.usage_count >= referralCode.max_uses) {
            return { success: false, message: 'This referral code has reached its limit' };
        }

        // Check expiration
        if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
            return { success: false, message: 'This referral code has expired' };
        }

        // Check if user already used a referral code
        const { data: existingReferral } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_id', newUserId)
            .maybeSingle();

        if (existingReferral) {
            return { success: false, message: 'You have already used a referral code' };
        }

        // Create referral record
        const { error: referralError } = await supabase
            .from('referrals')
            .insert({
                referrer_id: referralCode.user_id,
                referred_id: newUserId,
                referral_code: code.toUpperCase().trim(),
                status: 'pending'
            });

        if (referralError) {
            console.error('Failed to create referral:', referralError);
            return { success: false, message: 'Failed to apply referral code' };
        }

        // Increment usage count
        await supabase
            .from('referral_codes')
            .update({ usage_count: referralCode.usage_count + 1 })
            .eq('id', referralCode.id);

        return {
            success: true,
            message: 'Referral code applied! You\'ll both receive rewards when you complete your first ride.',
            referrerId: referralCode.user_id
        };
    }

    // Complete referral after first ride
    async completeReferral(referredUserId: string): Promise<void> {
        // Find pending referral
        const { data: referral } = await supabase
            .from('referrals')
            .select('*')
            .eq('referred_id', referredUserId)
            .eq('status', 'pending')
            .maybeSingle();

        if (!referral) return;

        // Check if user has completed a ride
        const { count } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('passenger_id', referredUserId)
            .eq('status', 'confirmed');

        if (!count || count === 0) return;

        // Update referral status
        await supabase
            .from('referrals')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', referral.id);

        // Award rewards to both users
        await this.awardReferralRewards(referral.referrer_id, referral.referred_id);
    }

    // Award rewards for completed referral
    private async awardReferralRewards(referrerId: string, referredId: string): Promise<void> {
        // Get referrer's tier for multiplier
        const stats = await this.getReferralStats(referrerId);
        const tierMultiplier = this.getTierMultiplier(stats.tier);

        // Award badge to referrer (Community Champion)
        await supabase
            .from('user_badges')
            .upsert({
                user_id: referrerId,
                badge_type: 'community_champion',
                earned_at: new Date().toISOString(),
                badge_count: tierMultiplier
            }, {
                onConflict: 'user_id,badge_type'
            });

        // Award badge to referred user (Welcome bonus)
        await supabase
            .from('user_badges')
            .upsert({
                user_id: referredId,
                badge_type: 'welcome_bonus',
                earned_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,badge_type'
            });

        // Create notifications
        await supabase.from('notifications').insert([
            {
                user_id: referrerId,
                type: 'referral_complete',
                title: 'Referral Reward! 🎉',
                message: `Your friend completed their first ride! You earned ${tierMultiplier} Community Champion badge${tierMultiplier > 1 ? 's' : ''}.`,
                data: { referredId }
            },
            {
                user_id: referredId,
                type: 'welcome_bonus',
                title: 'Welcome to CarpoolNetwork! 🚗',
                message: 'You earned a Welcome Bonus badge for joining through a referral!',
                data: { referrerId }
            }
        ]);
    }

    private getTierMultiplier(tier: string): number {
        switch (tier) {
            case 'platinum': return 4;
            case 'gold': return 3;
            case 'silver': return 2;
            default: return 1;
        }
    }

    // Get referral statistics
    async getReferralStats(userId: string): Promise<ReferralStats> {
        // Get all referrals
        const { data: referrals } = await supabase
            .from('referrals')
            .select('id, status, created_at')
            .eq('referrer_id', userId);

        const totalReferrals = referrals?.length || 0;
        const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
        const completedReferrals = referrals?.filter(r => r.status === 'completed' || r.status === 'rewarded').length || 0;

        // Get badges earned from referrals
        const { data: badges } = await supabase
            .from('user_badges')
            .select('badge_type, badge_count')
            .eq('user_id', userId)
            .eq('badge_type', 'community_champion')
            .maybeSingle();

        // Determine tier
        let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
        if (completedReferrals >= 50) tier = 'platinum';
        else if (completedReferrals >= 15) tier = 'gold';
        else if (completedReferrals >= 5) tier = 'silver';

        // Get rank (position among all referrers)
        const { data: leaderboard } = await supabase
            .from('referrals')
            .select('referrer_id')
            .in('status', ['completed', 'rewarded']);

        const referrerCounts = new Map<string, number>();
        leaderboard?.forEach(r => {
            referrerCounts.set(r.referrer_id, (referrerCounts.get(r.referrer_id) || 0) + 1);
        });

        const sortedReferrers = Array.from(referrerCounts.entries())
            .sort((a, b) => b[1] - a[1]);

        const rank = sortedReferrers.findIndex(([id]) => id === userId) + 1 || sortedReferrers.length + 1;

        return {
            totalReferrals,
            pendingReferrals,
            completedReferrals,
            totalRewardsEarned: {
                badges: badges?.badge_count || 0,
                premiumDays: 0,
                featuredRides: 0
            },
            rank,
            tier
        };
    }

    // Get referral leaderboard
    async getLeaderboard(limit: number = 10): Promise<{
        userId: string;
        name: string;
        avatar?: string;
        referralCount: number;
        tier: string;
    }[]> {
        const { data: referrals } = await supabase
            .from('referrals')
            .select(`
        referrer_id,
        referrer:profiles!referrals_referrer_id_fkey (
          full_name,
          avatar_url
        )
      `)
            .in('status', ['completed', 'rewarded']);

        if (!referrals) return [];

        const counts = new Map<string, { count: number; name: string; avatar?: string }>();

        referrals.forEach((r: any) => {
            const current = counts.get(r.referrer_id) || {
                count: 0,
                name: r.referrer?.full_name || 'User',
                avatar: r.referrer?.avatar_url
            };
            counts.set(r.referrer_id, { ...current, count: current.count + 1 });
        });

        return Array.from(counts.entries())
            .map(([userId, data]) => ({
                userId,
                name: data.name,
                avatar: data.avatar,
                referralCount: data.count,
                tier: this.getTierName(data.count)
            }))
            .sort((a, b) => b.referralCount - a.referralCount)
            .slice(0, limit);
    }

    private getTierName(count: number): string {
        if (count >= 50) return 'platinum';
        if (count >= 15) return 'gold';
        if (count >= 5) return 'silver';
        return 'bronze';
    }

    // Generate share link
    getShareLink(code: string): string {
        const baseUrl = window.location.origin;
        return `${baseUrl}/signup?ref=${code}`;
    }

    // Generate share text for social media
    getShareText(code: string, platform: 'twitter' | 'whatsapp' | 'email' | 'generic'): string {
        const link = this.getShareLink(code);

        switch (platform) {
            case 'twitter':
                return encodeURIComponent(
                    `Join me on CarpoolNetwork - the community carpooling app! 🚗🌱 Save money and reduce emissions together. Use my referral code ${code}: ${link}`
                );
            case 'whatsapp':
                return encodeURIComponent(
                    `Hey! I've been using CarpoolNetwork for my commute - it's great for saving money and being eco-friendly. Join using my code ${code} and we both get rewards! ${link}`
                );
            case 'email':
                return `subject=${encodeURIComponent('Join me on CarpoolNetwork!')}&body=${encodeURIComponent(
                    `Hi!\n\nI wanted to share CarpoolNetwork with you - it's a community carpooling app that helps you save money and reduce your carbon footprint.\n\nUse my referral code ${code} when you sign up and we'll both earn rewards!\n\nSign up here: ${link}\n\nSee you on the road! 🚗`
                )}`;
            default:
                return `Join CarpoolNetwork with my code ${code}: ${link}`;
        }
    }
}

export const referralService = new ReferralService();
export default referralService;
