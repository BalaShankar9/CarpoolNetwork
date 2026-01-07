import { supabase } from '@/lib/supabase';

export interface SafetyScore {
    userId: string;
    overallScore: number;
    components: {
        ratingScore: number;
        verificationScore: number;
        historyScore: number;
        responseScore: number;
        safetyIncidents: number;
    };
    tier: 'new' | 'standard' | 'trusted' | 'verified' | 'elite';
    badges: SafetyBadge[];
    lastUpdated: string;
}

export interface SafetyBadge {
    id: string;
    type: BadgeType;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
}

export type BadgeType =
    | 'verified_id'
    | 'verified_phone'
    | 'verified_email'
    | 'verified_driver'
    | 'safe_driver'
    | 'trusted_user'
    | 'elite_member'
    | '100_rides'
    | '500_rides'
    | 'perfect_rating'
    | 'community_helper';

export interface VerificationStatus {
    userId: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    idVerified: boolean;
    driverLicenseVerified: boolean;
    vehicleVerified: boolean;
    backgroundCheckPassed: boolean;
    verificationLevel: 'none' | 'basic' | 'standard' | 'enhanced' | 'full';
}

export interface BlockedUser {
    id: string;
    blockerId: string;
    blockedId: string;
    reason?: string;
    createdAt: string;
}

class TrustVerificationService {
    // ==================== SAFETY SCORE ====================

    async calculateSafetyScore(userId: string): Promise<SafetyScore> {
        // Get user data
        const [ratings, verification, history, incidents] = await Promise.all([
            this.getUserRatings(userId),
            this.getVerificationStatus(userId),
            this.getRideHistory(userId),
            this.getSafetyIncidents(userId),
        ]);

        // Calculate component scores (0-100)
        const ratingScore = this.calculateRatingScore(ratings);
        const verificationScore = this.calculateVerificationScore(verification);
        const historyScore = this.calculateHistoryScore(history);
        const responseScore = await this.calculateResponseScore(userId);
        const incidentPenalty = incidents.length * 10;

        // Calculate overall score
        const weights = {
            rating: 0.35,
            verification: 0.25,
            history: 0.20,
            response: 0.20,
        };

        const rawScore =
            ratingScore * weights.rating +
            verificationScore * weights.verification +
            historyScore * weights.history +
            responseScore * weights.response -
            incidentPenalty;

        const overallScore = Math.max(0, Math.min(100, rawScore));

        // Determine tier
        const tier = this.determineTier(overallScore, verification, history.totalRides);

        // Get earned badges
        const badges = await this.getUserBadges(userId);

        // Update stored score
        await supabase.from('safety_scores').upsert({
            user_id: userId,
            overall_score: overallScore,
            rating_score: ratingScore,
            verification_score: verificationScore,
            history_score: historyScore,
            response_score: responseScore,
            safety_incidents: incidents.length,
            tier,
            updated_at: new Date().toISOString(),
        });

        return {
            userId,
            overallScore,
            components: {
                ratingScore,
                verificationScore,
                historyScore,
                responseScore,
                safetyIncidents: incidents.length,
            },
            tier,
            badges,
            lastUpdated: new Date().toISOString(),
        };
    }

    private async getUserRatings(userId: string): Promise<{
        average: number;
        count: number;
        distribution: number[];
    }> {
        const { data } = await supabase
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', userId);

        if (!data || data.length === 0) {
            return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
        }

        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        const distribution = [0, 0, 0, 0, 0];
        data.forEach((r) => {
            if (r.rating >= 1 && r.rating <= 5) {
                distribution[r.rating - 1]++;
            }
        });

        return {
            average: sum / data.length,
            count: data.length,
            distribution,
        };
    }

    private calculateRatingScore(ratings: {
        average: number;
        count: number;
        distribution: number[];
    }): number {
        if (ratings.count === 0) return 50; // Default for new users

        // Base score from average rating
        const baseScore = (ratings.average / 5) * 100;

        // Confidence factor based on number of ratings
        const confidenceFactor = Math.min(1, ratings.count / 20);

        return Math.round(50 + (baseScore - 50) * confidenceFactor);
    }

    private calculateVerificationScore(verification: VerificationStatus): number {
        let score = 0;
        const weights = {
            email: 10,
            phone: 15,
            id: 25,
            driverLicense: 25,
            vehicle: 15,
            backgroundCheck: 10,
        };

        if (verification.emailVerified) score += weights.email;
        if (verification.phoneVerified) score += weights.phone;
        if (verification.idVerified) score += weights.id;
        if (verification.driverLicenseVerified) score += weights.driverLicense;
        if (verification.vehicleVerified) score += weights.vehicle;
        if (verification.backgroundCheckPassed) score += weights.backgroundCheck;

        return score;
    }

    private calculateHistoryScore(history: {
        totalRides: number;
        completedRides: number;
        cancelledRides: number;
        noShows: number;
    }): number {
        if (history.totalRides === 0) return 50;

        const completionRate = history.completedRides / history.totalRides;
        const noShowRate = history.noShows / history.totalRides;

        let score = completionRate * 80;
        score -= noShowRate * 40;
        score += Math.min(20, history.totalRides / 5); // Bonus for experience

        return Math.max(0, Math.min(100, score));
    }

    private async calculateResponseScore(userId: string): Promise<number> {
        // Calculate based on message response time
        const { data: conversations } = await supabase
            .from('messages')
            .select('created_at, read_at')
            .eq('recipient_id', userId)
            .not('read_at', 'is', null)
            .limit(50);

        if (!conversations || conversations.length === 0) return 70;

        const responseTimes = conversations.map((c) => {
            const created = new Date(c.created_at).getTime();
            const read = new Date(c.read_at).getTime();
            return (read - created) / (1000 * 60); // minutes
        });

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        // Score based on response time (faster = better)
        if (avgResponseTime < 15) return 100;
        if (avgResponseTime < 30) return 90;
        if (avgResponseTime < 60) return 80;
        if (avgResponseTime < 120) return 70;
        if (avgResponseTime < 240) return 60;
        return 50;
    }

    private async getRideHistory(userId: string): Promise<{
        totalRides: number;
        completedRides: number;
        cancelledRides: number;
        noShows: number;
    }> {
        const { data: asDriver } = await supabase
            .from('rides')
            .select('status')
            .eq('driver_id', userId);

        const { data: asPassenger } = await supabase
            .from('bookings')
            .select('status')
            .eq('user_id', userId);

        const allRides = [...(asDriver || []), ...(asPassenger || [])];

        return {
            totalRides: allRides.length,
            completedRides: allRides.filter((r) => r.status === 'completed').length,
            cancelledRides: allRides.filter((r) => r.status === 'cancelled').length,
            noShows: allRides.filter((r) => r.status === 'no_show').length,
        };
    }

    private async getSafetyIncidents(userId: string): Promise<{ id: string; type: string }[]> {
        const { data } = await supabase
            .from('content_reports')
            .select('id, category')
            .eq('reported_user_id', userId)
            .eq('status', 'action_taken');

        return data?.map((d) => ({ id: d.id, type: d.category })) || [];
    }

    private determineTier(
        score: number,
        verification: VerificationStatus,
        totalRides: number
    ): SafetyScore['tier'] {
        if (totalRides < 3) return 'new';
        if (score >= 90 && verification.verificationLevel === 'full') return 'elite';
        if (score >= 80 && verification.idVerified) return 'verified';
        if (score >= 70) return 'trusted';
        return 'standard';
    }

    // ==================== VERIFICATION ====================

    async getVerificationStatus(userId: string): Promise<VerificationStatus> {
        const { data } = await supabase
            .from('user_verifications')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!data) {
            return {
                userId,
                emailVerified: false,
                phoneVerified: false,
                idVerified: false,
                driverLicenseVerified: false,
                vehicleVerified: false,
                backgroundCheckPassed: false,
                verificationLevel: 'none',
            };
        }

        const verificationLevel = this.calculateVerificationLevel(data);

        return {
            userId,
            emailVerified: data.email_verified || false,
            phoneVerified: data.phone_verified || false,
            idVerified: data.id_verified || false,
            driverLicenseVerified: data.driver_license_verified || false,
            vehicleVerified: data.vehicle_verified || false,
            backgroundCheckPassed: data.background_check_passed || false,
            verificationLevel,
        };
    }

    private calculateVerificationLevel(
        data: Record<string, boolean>
    ): VerificationStatus['verificationLevel'] {
        const checks = [
            data.email_verified,
            data.phone_verified,
            data.id_verified,
            data.driver_license_verified,
            data.vehicle_verified,
            data.background_check_passed,
        ];

        const verified = checks.filter(Boolean).length;

        if (verified >= 6) return 'full';
        if (verified >= 4) return 'enhanced';
        if (verified >= 2) return 'standard';
        if (verified >= 1) return 'basic';
        return 'none';
    }

    async verifyPhone(userId: string, phone: string, code: string): Promise<boolean> {
        // In production, verify against stored code
        const { data } = await supabase
            .from('verification_codes')
            .select('code, expires_at')
            .eq('user_id', userId)
            .eq('type', 'phone')
            .single();

        if (!data || data.code !== code || new Date(data.expires_at) < new Date()) {
            return false;
        }

        await supabase
            .from('user_verifications')
            .upsert({
                user_id: userId,
                phone_verified: true,
                phone_verified_at: new Date().toISOString(),
            });

        // Award badge
        await this.awardBadge(userId, 'verified_phone');

        return true;
    }

    async sendPhoneVerificationCode(userId: string, phone: string): Promise<void> {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        await supabase.from('verification_codes').upsert({
            user_id: userId,
            type: 'phone',
            code,
            expires_at: expiresAt,
        });

        // In production, send SMS via Twilio
        console.log(`[Verification] SMS code ${code} sent to ${phone}`);
    }

    async submitIdVerification(
        userId: string,
        documentType: string,
        documentUrl: string
    ): Promise<{ status: string; message: string }> {
        await supabase.from('id_verifications').insert({
            user_id: userId,
            document_type: documentType,
            document_url: documentUrl,
            status: 'pending',
        });

        return {
            status: 'pending',
            message: 'Your ID verification is being reviewed. This usually takes 1-2 business days.',
        };
    }

    // ==================== BADGES ====================

    async getUserBadges(userId: string): Promise<SafetyBadge[]> {
        const { data } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_id', userId);

        return data?.map((d) => ({
            id: d.id,
            type: d.badge_type as BadgeType,
            name: d.name,
            description: d.description,
            icon: d.icon,
            earnedAt: d.earned_at,
        })) || [];
    }

    async awardBadge(userId: string, badgeType: BadgeType): Promise<SafetyBadge | null> {
        // Check if already has badge
        const { data: existing } = await supabase
            .from('user_badges')
            .select('id')
            .eq('user_id', userId)
            .eq('badge_type', badgeType)
            .single();

        if (existing) return null;

        const badgeInfo = this.getBadgeInfo(badgeType);

        const { data } = await supabase
            .from('user_badges')
            .insert({
                user_id: userId,
                badge_type: badgeType,
                name: badgeInfo.name,
                description: badgeInfo.description,
                icon: badgeInfo.icon,
                earned_at: new Date().toISOString(),
            })
            .select()
            .single();

        // Notify user
        await supabase.from('notifications').insert({
            user_id: userId,
            type: 'badge_earned',
            title: '🏆 New Badge Earned!',
            message: `You've earned the "${badgeInfo.name}" badge!`,
            data: { badge_type: badgeType },
        });

        return data
            ? {
                id: data.id,
                type: badgeType,
                name: badgeInfo.name,
                description: badgeInfo.description,
                icon: badgeInfo.icon,
                earnedAt: data.earned_at,
            }
            : null;
    }

    private getBadgeInfo(type: BadgeType): { name: string; description: string; icon: string } {
        const badges: Record<BadgeType, { name: string; description: string; icon: string }> = {
            verified_id: {
                name: 'Verified Identity',
                description: 'ID has been verified',
                icon: '🪪',
            },
            verified_phone: {
                name: 'Verified Phone',
                description: 'Phone number verified',
                icon: '📱',
            },
            verified_email: {
                name: 'Verified Email',
                description: 'Email address verified',
                icon: '✉️',
            },
            verified_driver: {
                name: 'Verified Driver',
                description: 'Driver license and vehicle verified',
                icon: '🚗',
            },
            safe_driver: {
                name: 'Safe Driver',
                description: 'Maintained 5-star rating for 50+ rides',
                icon: '⭐',
            },
            trusted_user: {
                name: 'Trusted User',
                description: 'Part of the community for 6+ months with great standing',
                icon: '🤝',
            },
            elite_member: {
                name: 'Elite Member',
                description: 'Top-tier community member',
                icon: '👑',
            },
            '100_rides': {
                name: 'Century Rider',
                description: 'Completed 100+ rides',
                icon: '💯',
            },
            '500_rides': {
                name: 'Road Warrior',
                description: 'Completed 500+ rides',
                icon: '🏆',
            },
            perfect_rating: {
                name: 'Perfect Score',
                description: 'Maintained 5.0 rating for 30 days',
                icon: '✨',
            },
            community_helper: {
                name: 'Community Helper',
                description: 'Helped 10+ users with their first ride',
                icon: '💪',
            },
        };

        return badges[type];
    }

    // ==================== BLOCKING ====================

    async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<void> {
        await supabase.from('blocked_users').insert({
            blocker_id: blockerId,
            blocked_id: blockedId,
            reason,
        });
    }

    async unblockUser(blockerId: string, blockedId: string): Promise<void> {
        await supabase
            .from('blocked_users')
            .delete()
            .eq('blocker_id', blockerId)
            .eq('blocked_id', blockedId);
    }

    async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
        const { data } = await supabase
            .from('blocked_users')
            .select('*, blocked:profiles!blocked_id(full_name, avatar_url)')
            .eq('blocker_id', userId);

        return data?.map((d) => ({
            id: d.id,
            blockerId: d.blocker_id,
            blockedId: d.blocked_id,
            reason: d.reason,
            createdAt: d.created_at,
        })) || [];
    }

    async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
        const { data } = await supabase
            .from('blocked_users')
            .select('id')
            .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
            .or(`blocker_id.eq.${otherUserId},blocked_id.eq.${otherUserId}`)
            .single();

        return !!data;
    }

    // Filter rides excluding blocked users
    async filterBlockedFromRides(userId: string, rideIds: string[]): Promise<string[]> {
        const { data: blockedRelations } = await supabase
            .from('blocked_users')
            .select('blocked_id, blocker_id')
            .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

        if (!blockedRelations || blockedRelations.length === 0) return rideIds;

        const blockedUserIds = new Set(
            blockedRelations.flatMap((r) => [r.blocked_id, r.blocker_id])
        );
        blockedUserIds.delete(userId);

        const { data: rides } = await supabase
            .from('rides')
            .select('id, driver_id')
            .in('id', rideIds);

        return rides
            ?.filter((r) => !blockedUserIds.has(r.driver_id))
            .map((r) => r.id) || [];
    }
}

export const trustVerificationService = new TrustVerificationService();
