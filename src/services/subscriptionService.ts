import { supabase } from '../lib/supabase';

export interface Subscription {
  id: string;
  user_id: string;
  status: 'trial' | 'active' | 'cancelled' | 'expired' | 'past_due';
  plan: string;
  trial_start?: string;
  trial_end?: string;
  current_period_start?: string;
  current_period_end?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  isTrialing: boolean;
  daysRemaining?: number;
  status?: string;
  subscription?: Subscription;
}

// Pricing
export const PREMIUM_PRICE = 500; // £5.00 in pence
export const PREMIUM_PRICE_DISPLAY = '£5';
export const TRIAL_DAYS = 90; // 3 months

// Premium feature list
export const PREMIUM_FEATURES = [
  {
    title: 'Priority Ride Matching',
    description: 'Get matched with drivers faster and more accurately',
    icon: 'zap',
  },
  {
    title: 'Advanced Route Optimization',
    description: 'Smart routing that saves time and money',
    icon: 'map',
  },
  {
    title: 'Detailed Analytics',
    description: 'Track your savings, CO2 impact, and ride history',
    icon: 'bar-chart',
  },
  {
    title: 'Ad-Free Experience',
    description: 'Enjoy the app without any interruptions',
    icon: 'eye-off',
  },
  {
    title: 'Premium Support',
    description: 'Priority customer support when you need it',
    icon: 'headphones',
  },
  {
    title: 'Exclusive Features',
    description: 'Early access to new features before everyone else',
    icon: 'star',
  },
];

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('name', featureName)
      .single();

    if (error) {
      // If table doesn't exist or feature not found, default to false
      console.log('Feature flag check:', featureName, '- defaulting to false');
      return false;
    }

    return data?.enabled ?? false;
  } catch (error) {
    console.error('Error checking feature flag:', error);
    return false;
  }
}

/**
 * Get user's subscription
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as Subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

/**
 * Start a free trial for a user
 */
export async function startTrial(userId: string): Promise<Subscription | null> {
  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        status: 'trial',
        plan: 'premium',
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
        cancel_at_period_end: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting trial:', error);
      return null;
    }

    // Update profile to premium
    await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', userId);

    return data as Subscription;
  } catch (error) {
    console.error('Error starting trial:', error);
    return null;
  }
}

/**
 * Check subscription status and update if needed
 */
export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return { isPremium: false, isTrialing: false };
  }

  const now = new Date();

  // Check trial status
  if (subscription.status === 'trial' && subscription.trial_end) {
    const trialEnd = new Date(subscription.trial_end);

    if (now < trialEnd) {
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isPremium: true,
        isTrialing: true,
        daysRemaining,
        status: 'trial',
        subscription,
      };
    } else {
      // Trial expired - update status
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);

      await supabase
        .from('profiles')
        .update({ is_premium: false })
        .eq('id', userId);

      return { isPremium: false, isTrialing: false, status: 'expired', subscription };
    }
  }

  // Check active subscription
  if (subscription.status === 'active' && subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);

    if (now < periodEnd) {
      const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isPremium: true,
        isTrialing: false,
        daysRemaining,
        status: 'active',
        subscription,
      };
    }
  }

  return { isPremium: false, isTrialing: false, status: subscription.status, subscription };
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
      })
      .eq('id', subscription.id);

    return !error;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return false;
  }
}

/**
 * Reactivate a cancelled subscription
 */
export async function reactivateSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
      })
      .eq('id', subscription.id);

    return !error;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return false;
  }
}

/**
 * Create Stripe checkout session (placeholder - implement with your backend)
 */
export async function createCheckoutSession(userId: string): Promise<string | null> {
  // This would call your backend to create a Stripe checkout session
  // For now, return null to indicate subscriptions aren't active
  console.log('Stripe checkout not implemented yet for user:', userId);
  return null;
}

/**
 * Handle Stripe webhook events (placeholder)
 */
export async function handleStripeWebhook(event: unknown): Promise<boolean> {
  // This would be called from your backend when Stripe sends webhook events
  console.log('Stripe webhook handler not implemented:', event);
  return false;
}

/**
 * Get subscription plans (for future multi-plan support)
 */
export function getSubscriptionPlans() {
  return [
    {
      id: 'premium_monthly',
      name: 'Premium Monthly',
      price: PREMIUM_PRICE,
      interval: 'month',
      features: PREMIUM_FEATURES,
      popular: true,
    },
    // Could add yearly plan here
  ];
}
