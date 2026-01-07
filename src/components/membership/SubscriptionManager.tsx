import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  CreditCard,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Shield,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  membershipService,
  UserMembership,
  MEMBERSHIP_PLANS,
  MembershipTier,
} from '../../services/membershipService';
import { useAuth } from '../../contexts/AuthContext';

interface SubscriptionManagerProps {
  onUpgrade?: () => void;
  onManagePayment?: () => void;
}

export function SubscriptionManager({ onUpgrade, onManagePayment }: SubscriptionManagerProps) {
  const { user } = useAuth();
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadMembership();
    }
  }, [user?.id]);

  const loadMembership = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await membershipService.getUserMembership(user.id);
      setMembership(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.id || !membership) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.'
    );
    
    if (!confirmed) return;

    setCancelling(true);
    try {
      const success = await membershipService.cancelSubscription(user.id, true);
      if (success) {
        await loadMembership();
      }
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    if (!user?.id) return;

    setReactivating(true);
    try {
      const success = await membershipService.reactivateSubscription(user.id);
      if (success) {
        await loadMembership();
      }
    } finally {
      setReactivating(false);
    }
  };

  const plan = membership ? MEMBERSHIP_PLANS.find((p) => p.tier === membership.tier) : null;
  const effectiveTier: MembershipTier = membership?.tier || 'free';

  const getStatusBadge = () => {
    if (!membership) {
      return { color: 'bg-gray-100 text-gray-700', label: 'Free Plan', icon: CheckCircle };
    }

    switch (membership.status) {
      case 'active':
        return { color: 'bg-green-100 text-green-700', label: 'Active', icon: CheckCircle };
      case 'trialing':
        return { color: 'bg-blue-100 text-blue-700', label: 'Trial', icon: Clock };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-700', label: 'Cancelled', icon: XCircle };
      case 'past_due':
        return { color: 'bg-amber-100 text-amber-700', label: 'Past Due', icon: AlertCircle };
      case 'expired':
        return { color: 'bg-gray-100 text-gray-700', label: 'Expired', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-700', label: membership.status, icon: AlertCircle };
    }
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const daysRemaining = membership
    ? Math.max(0, Math.ceil((new Date(membership.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${
          effectiveTier === 'pro'
            ? 'from-amber-500 to-orange-600'
            : effectiveTier === 'plus'
              ? 'from-blue-500 to-indigo-600'
              : 'from-gray-400 to-gray-600'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {plan?.name || 'Free'} Plan
                </h2>
                <p className="text-white/80 text-sm">
                  {plan?.description || 'Essential carpooling features'}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Billing Info */}
          {membership && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <CreditCard className="w-4 h-4" />
                  Billing Cycle
                </div>
                <p className="font-semibold text-gray-900 capitalize">
                  {membership.billingCycle}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  {membership.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing'}
                </div>
                <p className="font-semibold text-gray-900">
                  {formatDate(membership.currentPeriodEnd)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Days Remaining
                </div>
                <p className="font-semibold text-gray-900">
                  {daysRemaining} days
                </p>
              </div>
            </div>
          )}

          {/* Trial Warning */}
          {membership?.status === 'trialing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Trial Period</p>
                <p className="text-sm text-blue-700">
                  Your trial ends on {formatDate(membership.trialEnd || membership.currentPeriodEnd)}.
                  Add a payment method to continue after the trial.
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Warning */}
          {membership?.cancelAtPeriodEnd && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">Subscription Cancelling</p>
                <p className="text-sm text-amber-700 mb-3">
                  Your subscription will end on {formatDate(membership.currentPeriodEnd)}.
                  You'll lose access to premium features after this date.
                </p>
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                >
                  {reactivating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Reactivate Subscription
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Past Due Warning */}
          {membership?.status === 'past_due' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Payment Failed</p>
                <p className="text-sm text-red-700">
                  We couldn't process your last payment. Please update your payment method
                  to keep your subscription active.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            {effectiveTier !== 'pro' && (
              <button
                onClick={onUpgrade}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all font-medium"
              >
                <Crown className="w-4 h-4" />
                {effectiveTier === 'free' ? 'Upgrade Plan' : 'Upgrade to Pro'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {membership && !membership.cancelAtPeriodEnd && (
              <>
                <button
                  onClick={onManagePayment}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <CreditCard className="w-4 h-4" />
                  Manage Payment
                </button>

                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  {cancelling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Cancel Subscription
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-left"
        >
          <div className="p-2 bg-gray-100 rounded-lg">
            <Download className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Download Invoices</p>
            <p className="text-sm text-gray-500">Get PDF copies of your invoices</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-left"
        >
          <div className="p-2 bg-gray-100 rounded-lg">
            <Shield className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Billing History</p>
            <p className="text-sm text-gray-500">View all past transactions</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </motion.button>
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">Can I cancel anytime?</p>
            <p className="text-sm text-gray-600">
              Yes, you can cancel your subscription at any time. You'll continue to have
              access until the end of your billing period.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">What happens to my data if I downgrade?</p>
            <p className="text-sm text-gray-600">
              Your data is always safe. If you downgrade, you'll keep your ride history
              and basic features. Premium features will become unavailable.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Can I switch plans?</p>
            <p className="text-sm text-gray-600">
              Absolutely! You can upgrade or change your plan at any time.
              Upgrades take effect immediately with prorated billing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
