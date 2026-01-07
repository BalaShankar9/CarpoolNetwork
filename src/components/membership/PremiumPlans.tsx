import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Check,
  X,
  Sparkles,
  Star,
  Zap,
  Calendar,
  Shield,
  Headphones,
  TrendingUp,
  Gift,
} from 'lucide-react';
import {
  membershipService,
  MEMBERSHIP_PLANS,
  MEMBERSHIP_BENEFITS,
  MembershipPlan,
  MembershipTier,
} from '../../services/membershipService';

interface PremiumPlansProps {
  currentTier?: MembershipTier;
  onSubscribe?: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
  onStartTrial?: (planId: string) => void;
}

export function PremiumPlans({ currentTier = 'free', onSubscribe, onStartTrial }: PremiumPlansProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (plan: MembershipPlan) => {
    if (plan.tier === currentTier || plan.tier === 'free') return;

    setSelectedPlan(plan.id);
    setIsProcessing(true);

    try {
      if (onSubscribe) {
        await onSubscribe(plan.id, billingCycle);
      }
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handleStartTrial = async (planId: string) => {
    setSelectedPlan(planId);
    setIsProcessing(true);

    try {
      if (onStartTrial) {
        await onStartTrial(planId);
      }
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const getTierIcon = (tier: MembershipTier) => {
    switch (tier) {
      case 'free':
        return <Star className="w-6 h-6" />;
      case 'plus':
        return <Zap className="w-6 h-6" />;
      case 'pro':
        return <Crown className="w-6 h-6" />;
    }
  };

  const getTierColor = (tier: MembershipTier) => {
    switch (tier) {
      case 'free':
        return 'from-gray-400 to-gray-600';
      case 'plus':
        return 'from-blue-500 to-indigo-600';
      case 'pro':
        return 'from-amber-500 to-orange-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium mb-4"
        >
          <Sparkles className="w-4 h-4" />
          Premium Membership
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Choose Your Plan
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Unlock premium features to enhance your carpooling experience.
          Save money, reduce emissions, and connect with your community.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-xl inline-flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {MEMBERSHIP_PLANS.map((plan, index) => {
          const isCurrentPlan = plan.tier === currentTier;
          const isUpgrade = 
            (currentTier === 'free' && plan.tier !== 'free') ||
            (currentTier === 'plus' && plan.tier === 'pro');
          const savings = membershipService.calculateYearlySavings(plan);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl border-2 overflow-hidden ${
                plan.popular
                  ? 'border-blue-500 shadow-xl shadow-blue-500/10'
                  : isCurrentPlan
                    ? 'border-green-500'
                    : 'border-gray-200'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  CURRENT PLAN
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${getTierColor(plan.tier)} text-white`}>
                    {getTierIcon(plan.tier)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      £{billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}
                    </span>
                    <span className="text-gray-500">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.priceYearly > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      Save £{savings.amount}/year ({savings.percentage}% off)
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                        {feature.name}
                        {feature.limit && feature.limit !== 'unlimited' && (
                          <span className="text-sm text-gray-500 ml-1">
                            ({feature.limit})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <div className="space-y-3">
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isProcessing && selectedPlan === plan.id}
                      className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25'
                          : plan.tier === 'pro'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isProcessing && selectedPlan === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                    >
                      {plan.tier === 'free' ? 'Free Forever' : 'Downgrade N/A'}
                    </button>
                  )}

                  {/* Free Trial */}
                  {isUpgrade && onStartTrial && (
                    <button
                      onClick={() => handleStartTrial(plan.id)}
                      className="w-full py-2 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Gift className="w-4 h-4" />
                      Start 7-day free trial
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Compare All Features</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-4 px-6 font-medium text-gray-900">Feature</th>
                <th className="text-center py-4 px-6 font-medium text-gray-900">Free</th>
                <th className="text-center py-4 px-6 font-medium text-gray-900 bg-blue-50">Plus</th>
                <th className="text-center py-4 px-6 font-medium text-gray-900">Pro</th>
              </tr>
            </thead>
            <tbody>
              {MEMBERSHIP_BENEFITS.map((benefit, index) => (
                <tr key={benefit.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-4 px-6 text-gray-700">{benefit.name}</td>
                  <td className="py-4 px-6 text-center">
                    <BenefitValue value={benefit.freeTier} />
                  </td>
                  <td className="py-4 px-6 text-center bg-blue-50/50">
                    <BenefitValue value={benefit.plusTier} />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <BenefitValue value={benefit.proTier} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Trust Badges */}
      <div className="flex flex-wrap justify-center gap-8 py-8">
        <div className="flex items-center gap-2 text-gray-500">
          <Shield className="w-5 h-5" />
          <span className="text-sm">Secure payments</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar className="w-5 h-5" />
          <span className="text-sm">Cancel anytime</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Headphones className="w-5 h-5" />
          <span className="text-sm">24/7 support</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm">30-day money back</span>
        </div>
      </div>
    </div>
  );
}

// Helper component for benefit values
function BenefitValue({ value }: { value: boolean | number | string }) {
  if (value === true) {
    return <Check className="w-5 h-5 text-green-500 mx-auto" />;
  }
  if (value === false) {
    return <X className="w-5 h-5 text-gray-300 mx-auto" />;
  }
  return <span className="text-gray-700 font-medium">{value}</span>;
}
