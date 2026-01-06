import { ReactNode } from 'react';
import { Crown, Lock, Sparkles, Check } from 'lucide-react';
import { usePremium } from '../../contexts/PremiumContext';
import { PREMIUM_FEATURES, PREMIUM_PRICE_DISPLAY, TRIAL_DAYS } from '../../services/subscriptionService';

interface PremiumGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  feature?: string;
  showUpgradePrompt?: boolean;
}

/**
 * PremiumGate Component
 *
 * Wraps premium content and shows it only to premium users.
 * When subscriptions are disabled, all content is shown.
 */
export default function PremiumGate({
  children,
  fallback,
  feature,
  showUpgradePrompt = true,
}: PremiumGateProps) {
  const { isPremium, subscriptionsEnabled, loading } = usePremium();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100px]">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // If subscriptions aren't enabled, show premium content to everyone
  if (!subscriptionsEnabled || isPremium) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt if enabled
  if (showUpgradePrompt) {
    return <PremiumUpgradePrompt feature={feature} />;
  }

  // Show blurred content with lock overlay
  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none blur-sm select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 text-center shadow-lg max-w-xs">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <p className="font-medium text-gray-900">Premium Feature</p>
          <p className="text-sm text-gray-500 mt-1">
            {feature || 'This feature'} requires premium
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Upgrade prompt component
 */
function PremiumUpgradePrompt({ feature }: { feature?: string }) {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shrink-0">
          <Crown className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Upgrade to Premium
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {feature
              ? `${feature} is a premium feature.`
              : 'Unlock this feature and more with premium.'}{' '}
            Start your {TRIAL_DAYS}-day free trial today!
          </p>
          <button className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-lg font-medium hover:from-yellow-500 hover:to-amber-600 transition-colors flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium badge component for showing premium status
 */
export function PremiumBadge({ className = '' }: { className?: string }) {
  const { isPremium, isTrialing, daysRemaining } = usePremium();

  if (!isPremium) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-sm font-medium rounded-full ${className}`}>
      <Crown className="w-4 h-4" />
      {isTrialing ? (
        <span>Trial ({daysRemaining} days left)</span>
      ) : (
        <span>Premium</span>
      )}
    </div>
  );
}

/**
 * Premium features list component
 */
export function PremiumFeaturesList({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <ul className="space-y-2">
        {PREMIUM_FEATURES.slice(0, 4).map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-500 shrink-0" />
            {feature.title}
          </li>
        ))}
        {PREMIUM_FEATURES.length > 4 && (
          <li className="text-sm text-gray-500">
            + {PREMIUM_FEATURES.length - 4} more features
          </li>
        )}
      </ul>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PREMIUM_FEATURES.map((feature, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{feature.title}</p>
            <p className="text-sm text-gray-500">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Premium CTA card for marketing
 */
export function PremiumCTACard() {
  const { isTrialing, daysRemaining } = usePremium();

  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-6 h-6" />
        <span className="font-semibold">Carpool Premium</span>
      </div>

      {isTrialing ? (
        <>
          <h3 className="text-xl font-bold mb-2">
            {daysRemaining} days left in your trial
          </h3>
          <p className="text-purple-200 mb-4">
            Upgrade now to keep your premium features after your trial ends.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-bold mb-2">
            Unlock Premium Features
          </h3>
          <p className="text-purple-200 mb-4">
            Get priority matching, advanced analytics, and more for just {PREMIUM_PRICE_DISPLAY}/month.
          </p>
        </>
      )}

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4" />
          <span>Priority ride matching</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4" />
          <span>Advanced analytics</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4" />
          <span>Ad-free experience</span>
        </div>
      </div>

      <button className="w-full py-3 bg-white text-purple-700 rounded-xl font-semibold hover:bg-purple-50 transition-colors">
        {isTrialing ? 'Upgrade Now' : `Start ${TRIAL_DAYS}-Day Free Trial`}
      </button>
    </div>
  );
}

/**
 * Simple inline premium lock icon
 */
export function PremiumLockIcon({ className = '' }: { className?: string }) {
  const { isPremium, subscriptionsEnabled } = usePremium();

  if (!subscriptionsEnabled || isPremium) return null;

  return (
    <Crown className={`w-4 h-4 text-amber-500 ${className}`} />
  );
}
