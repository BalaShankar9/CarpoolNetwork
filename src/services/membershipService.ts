import { supabase } from '../lib/supabase';
import { paymentService } from './paymentService';

// Types
export type MembershipTier = 'free' | 'plus' | 'pro';

export interface MembershipPlan {
    id: string;
    tier: MembershipTier;
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    currency: string;
    features: MembershipFeature[];
    popular?: boolean;
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
}

export interface MembershipFeature {
    name: string;
    description: string;
    included: boolean;
    limit?: number | 'unlimited';
}

export interface UserMembership {
    id: string;
    userId: string;
    tier: MembershipTier;
    status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
    billingCycle: 'monthly' | 'yearly';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    trialEnd?: Date;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MembershipBenefit {
    key: string;
    name: string;
    freeTier: boolean | number | string;
    plusTier: boolean | number | string;
    proTier: boolean | number | string;
}

// Membership Plans Configuration
export const MEMBERSHIP_PLANS: MembershipPlan[] = [
    {
        id: 'free',
        tier: 'free',
        name: 'Free',
        description: 'Essential carpooling features for everyone',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'GBP',
        features: [
            { name: 'Find & offer rides', description: 'Unlimited ride search and posting', included: true },
            { name: 'In-app messaging', description: 'Chat with drivers and passengers', included: true },
            { name: 'Basic matching', description: 'Find rides along your route', included: true },
            { name: 'Safety features', description: 'SOS, emergency contacts', included: true },
            { name: 'Community features', description: 'Join carpooling groups', included: true },
            { name: 'Priority matching', description: 'Get matched first', included: false },
            { name: 'Advanced analytics', description: 'Detailed ride insights', included: false },
            { name: 'Ad-free experience', description: 'No advertisements', included: false },
        ],
    },
    {
        id: 'plus',
        tier: 'plus',
        name: 'Plus',
        description: 'Enhanced features for regular carpoolers',
        priceMonthly: 4.99,
        priceYearly: 49.99,
        currency: 'GBP',
        popular: true,
        features: [
            { name: 'Find & offer rides', description: 'Unlimited ride search and posting', included: true },
            { name: 'In-app messaging', description: 'Chat with drivers and passengers', included: true },
            { name: 'Priority matching', description: 'Get matched before free users', included: true },
            { name: 'Advanced analytics', description: 'CO2 savings, cost insights', included: true },
            { name: 'Ad-free experience', description: 'No advertisements', included: true },
            { name: 'Extended booking', description: 'Book rides 2 weeks ahead', included: true },
            { name: 'Premium badges', description: 'Show your commitment', included: true },
            { name: 'Route preferences', description: 'Save multiple routes', included: true, limit: 5 },
        ],
    },
    {
        id: 'pro',
        tier: 'pro',
        name: 'Pro',
        description: 'Maximum features for power users',
        priceMonthly: 9.99,
        priceYearly: 99.99,
        currency: 'GBP',
        features: [
            { name: 'Everything in Plus', description: 'All Plus features included', included: true },
            { name: 'Top priority matching', description: 'First in queue always', included: true },
            { name: 'Unlimited routes', description: 'Save unlimited routes', included: true, limit: 'unlimited' },
            { name: 'Advanced filters', description: 'Filter by vehicle, music, etc.', included: true },
            { name: 'Calendar sync', description: 'Google/Outlook integration', included: true },
            { name: 'API access', description: 'Integrate with other apps', included: true },
            { name: 'Priority support', description: '24/7 dedicated support', included: true },
            { name: 'Corporate features', description: 'Team management tools', included: true },
        ],
    },
];

// Benefits comparison table
export const MEMBERSHIP_BENEFITS: MembershipBenefit[] = [
    { key: 'rides', name: 'Monthly rides', freeTier: 'Unlimited', plusTier: 'Unlimited', proTier: 'Unlimited' },
    { key: 'matching_priority', name: 'Matching priority', freeTier: 'Standard', plusTier: 'High', proTier: 'Highest' },
    { key: 'booking_window', name: 'Advance booking', freeTier: '7 days', plusTier: '14 days', proTier: '30 days' },
    { key: 'saved_routes', name: 'Saved routes', freeTier: 2, plusTier: 5, proTier: 'Unlimited' },
    { key: 'analytics', name: 'Analytics', freeTier: 'Basic', plusTier: 'Advanced', proTier: 'Full' },
    { key: 'ads', name: 'Ad-free', freeTier: false, plusTier: true, proTier: true },
    { key: 'badges', name: 'Premium badges', freeTier: false, plusTier: true, proTier: true },
    { key: 'support', name: 'Support', freeTier: 'Community', plusTier: 'Email', proTier: 'Priority 24/7' },
    { key: 'calendar_sync', name: 'Calendar sync', freeTier: false, plusTier: false, proTier: true },
    { key: 'api_access', name: 'API access', freeTier: false, plusTier: false, proTier: true },
];

// Membership Service
export const membershipService = {
    // Get user's current membership
    async getUserMembership(userId: string): Promise<UserMembership | null> {
        try {
            const { data, error } = await supabase
                .from('user_memberships')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No membership found - return free tier
                    return null;
                }
                throw error;
            }

            return this.mapMembershipFromDb(data);
        } catch (error) {
            console.error('Failed to get user membership:', error);
            return null;
        }
    },

    // Get effective tier (considering active status)
    async getEffectiveTier(userId: string): Promise<MembershipTier> {
        const membership = await this.getUserMembership(userId);

        if (!membership) return 'free';

        // Check if membership is active or in trial
        const isActive = membership.status === 'active' || membership.status === 'trialing';
        const notExpired = new Date(membership.currentPeriodEnd) > new Date();

        if (isActive && notExpired) {
            return membership.tier;
        }

        return 'free';
    },

    // Check if user has a specific feature
    async hasFeature(userId: string, featureKey: string): Promise<boolean> {
        const tier = await this.getEffectiveTier(userId);
        const benefit = MEMBERSHIP_BENEFITS.find((b) => b.key === featureKey);

        if (!benefit) return false;

        const tierValue = tier === 'free'
            ? benefit.freeTier
            : tier === 'plus'
                ? benefit.plusTier
                : benefit.proTier;

        return tierValue === true || tierValue === 'Unlimited' || (typeof tierValue === 'number' && tierValue > 0);
    },

    // Get feature limit for user
    async getFeatureLimit(userId: string, featureKey: string): Promise<number | 'unlimited'> {
        const tier = await this.getEffectiveTier(userId);
        const benefit = MEMBERSHIP_BENEFITS.find((b) => b.key === featureKey);

        if (!benefit) return 0;

        const tierValue = tier === 'free'
            ? benefit.freeTier
            : tier === 'plus'
                ? benefit.plusTier
                : benefit.proTier;

        if (tierValue === 'Unlimited') return 'unlimited';
        if (typeof tierValue === 'number') return tierValue;
        return 0;
    },

    // Subscribe to a plan
    async subscribe(
        userId: string,
        planId: string,
        billingCycle: 'monthly' | 'yearly'
    ): Promise<{ success: boolean; clientSecret?: string; subscriptionId?: string }> {
        const plan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
        if (!plan || plan.tier === 'free') {
            return { success: false };
        }

        try {
            // In production, this would create a Stripe subscription
            const response = await fetch('/.netlify/functions/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    priceId: billingCycle === 'monthly' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly,
                    planId,
                    billingCycle,
                }),
            });

            if (!response.ok) {
                throw new Error('Subscription creation failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Subscription failed:', error);

            // Demo mode - create local subscription
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

            const membership: UserMembership = {
                id: crypto.randomUUID(),
                userId,
                tier: plan.tier,
                status: 'active',
                billingCycle,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd: false,
                createdAt: now,
                updatedAt: now,
            };

            await this.saveMembership(membership);

            return {
                success: true,
                subscriptionId: `demo_sub_${Date.now()}`,
            };
        }
    },

    // Save membership to database
    async saveMembership(membership: UserMembership): Promise<void> {
        const { error } = await supabase.from('user_memberships').upsert({
            id: membership.id,
            user_id: membership.userId,
            tier: membership.tier,
            status: membership.status,
            billing_cycle: membership.billingCycle,
            current_period_start: membership.currentPeriodStart.toISOString(),
            current_period_end: membership.currentPeriodEnd.toISOString(),
            cancel_at_period_end: membership.cancelAtPeriodEnd,
            trial_end: membership.trialEnd?.toISOString(),
            stripe_subscription_id: membership.stripeSubscriptionId,
            stripe_customer_id: membership.stripeCustomerId,
            created_at: membership.createdAt.toISOString(),
            updated_at: new Date().toISOString(),
        });

        if (error) {
            console.error('Failed to save membership:', error);
        }
    },

    // Cancel subscription
    async cancelSubscription(userId: string, atPeriodEnd: boolean = true): Promise<boolean> {
        try {
            const membership = await this.getUserMembership(userId);
            if (!membership) return false;

            // In production, this would cancel via Stripe
            if (membership.stripeSubscriptionId) {
                await fetch('/.netlify/functions/cancel-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subscriptionId: membership.stripeSubscriptionId,
                        atPeriodEnd,
                    }),
                });
            }

            // Update local record
            const { error } = await supabase
                .from('user_memberships')
                .update({
                    cancel_at_period_end: atPeriodEnd,
                    status: atPeriodEnd ? 'active' : 'cancelled',
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

            return !error;
        } catch (error) {
            console.error('Cancel subscription failed:', error);
            return false;
        }
    },

    // Reactivate cancelled subscription
    async reactivateSubscription(userId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('user_memberships')
                .update({
                    cancel_at_period_end: false,
                    status: 'active',
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

            return !error;
        } catch (error) {
            console.error('Reactivate subscription failed:', error);
            return false;
        }
    },

    // Start free trial
    async startFreeTrial(userId: string, planId: string, trialDays: number = 7): Promise<boolean> {
        const plan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
        if (!plan || plan.tier === 'free') return false;

        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + trialDays);

        const membership: UserMembership = {
            id: crypto.randomUUID(),
            userId,
            tier: plan.tier,
            status: 'trialing',
            billingCycle: 'monthly',
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            cancelAtPeriodEnd: false,
            trialEnd,
            createdAt: now,
            updatedAt: now,
        };

        await this.saveMembership(membership);
        return true;
    },

    // Check if user has used free trial
    async hasUsedFreeTrial(userId: string): Promise<boolean> {
        const { data } = await supabase
            .from('user_memberships')
            .select('trial_end')
            .eq('user_id', userId)
            .not('trial_end', 'is', null)
            .limit(1);

        return (data?.length || 0) > 0;
    },

    // Get plan by ID
    getPlan(planId: string): MembershipPlan | undefined {
        return MEMBERSHIP_PLANS.find((p) => p.id === planId);
    },

    // Get all plans
    getAllPlans(): MembershipPlan[] {
        return MEMBERSHIP_PLANS;
    },

    // Calculate savings for yearly billing
    calculateYearlySavings(plan: MembershipPlan): { amount: number; percentage: number } {
        const monthlyTotal = plan.priceMonthly * 12;
        const savings = monthlyTotal - plan.priceYearly;
        const percentage = (savings / monthlyTotal) * 100;

        return {
            amount: Math.round(savings * 100) / 100,
            percentage: Math.round(percentage),
        };
    },

    // Helper to map database record
    mapMembershipFromDb(data: any): UserMembership {
        return {
            id: data.id,
            userId: data.user_id,
            tier: data.tier,
            status: data.status,
            billingCycle: data.billing_cycle,
            currentPeriodStart: new Date(data.current_period_start),
            currentPeriodEnd: new Date(data.current_period_end),
            cancelAtPeriodEnd: data.cancel_at_period_end,
            trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
            stripeSubscriptionId: data.stripe_subscription_id,
            stripeCustomerId: data.stripe_customer_id,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        };
    },
};
