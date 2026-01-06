import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  checkSubscriptionStatus,
  isFeatureEnabled,
  getUserSubscription,
  Subscription,
  SubscriptionStatus,
} from '../services/subscriptionService';

interface PremiumContextType {
  isPremium: boolean;
  isTrialing: boolean;
  daysRemaining?: number;
  subscription: Subscription | null;
  subscriptionsEnabled: boolean;
  loading: boolean;
  status?: string;
  refreshSubscription: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isTrialing, setIsTrialing] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | undefined>();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | undefined>();

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setIsTrialing(false);
      setSubscription(null);
      setDaysRemaining(undefined);
      setStatus(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Check if subscriptions feature is enabled
      const enabled = await isFeatureEnabled('subscriptions');
      setSubscriptionsEnabled(enabled);

      if (!enabled) {
        // If subscriptions are disabled, everyone gets premium features
        setIsPremium(true);
        setIsTrialing(false);
        setDaysRemaining(undefined);
        setSubscription(null);
        setStatus(undefined);
        setLoading(false);
        return;
      }

      // Check user's subscription status
      const subscriptionStatus = await checkSubscriptionStatus(user.id);
      setIsPremium(subscriptionStatus.isPremium);
      setIsTrialing(subscriptionStatus.isTrialing);
      setDaysRemaining(subscriptionStatus.daysRemaining);
      setStatus(subscriptionStatus.status);

      // Get full subscription details
      const sub = await getUserSubscription(user.id);
      setSubscription(sub);
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Default to premium if there's an error (fail open for better UX)
      setIsPremium(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const value = {
    isPremium,
    isTrialing,
    daysRemaining,
    subscription,
    subscriptionsEnabled,
    loading,
    status,
    refreshSubscription,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
}

// Convenience hook for checking if user can access a premium feature
export function useCanAccessPremium() {
  const { isPremium, subscriptionsEnabled, loading } = usePremium();

  // If subscriptions aren't enabled, everyone has access
  if (!subscriptionsEnabled) return { canAccess: true, loading };

  return { canAccess: isPremium, loading };
}
