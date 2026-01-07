import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift,
    Star,
    Zap,
    Crown,
    Trophy,
    Coffee,
    TreePine,
    Ticket,
    Fuel,
    BadgeCheck,
    Sparkles,
    Check,
    Clock,
    AlertCircle,
    ChevronRight,
    Copy,
    ExternalLink,
} from 'lucide-react';
import {
    carbonRewardsService,
    RewardPoints,
    Reward,
    RedemptionRecord,
    TIER_THRESHOLDS,
    RewardTier,
} from '../../services/carbonRewardsService';
import { useAuth } from '../../contexts/AuthContext';

interface RewardsShopProps {
    onRedeemSuccess?: (reward: Reward) => void;
}

export function RewardsShop({ onRedeemSuccess }: RewardsShopProps) {
    const { user } = useAuth();
    const [userPoints, setUserPoints] = useState<RewardPoints | null>(null);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [showRedemptions, setShowRedemptions] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id]);

    const loadData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const [points, redemptionHistory] = await Promise.all([
                carbonRewardsService.getRewardPoints(user.id),
                carbonRewardsService.getRedemptionHistory(user.id),
            ]);
            setUserPoints(points);
            setRewards(carbonRewardsService.getAvailableRewards(points.currentPoints));
            setRedemptions(redemptionHistory);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async (reward: Reward) => {
        if (!user?.id || !userPoints || userPoints.currentPoints < reward.pointsCost) return;

        setRedeeming(reward.id);
        try {
            const result = await carbonRewardsService.redeemReward(user.id, reward.id);
            if (result) {
                await loadData();
                onRedeemSuccess?.(reward);
            }
        } finally {
            setRedeeming(null);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getTierIcon = (tier: RewardTier) => {
        switch (tier) {
            case 'bronze':
                return <Star className="w-5 h-5" />;
            case 'silver':
                return <Star className="w-5 h-5" />;
            case 'gold':
                return <Zap className="w-5 h-5" />;
            case 'platinum':
                return <Crown className="w-5 h-5" />;
            case 'diamond':
                return <Trophy className="w-5 h-5" />;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'voucher':
                return <Ticket className="w-4 h-4" />;
            case 'discount':
                return <Sparkles className="w-4 h-4" />;
            case 'donation':
                return <TreePine className="w-4 h-4" />;
            case 'badge':
                return <BadgeCheck className="w-4 h-4" />;
            case 'feature':
                return <Zap className="w-4 h-4" />;
            default:
                return <Gift className="w-4 h-4" />;
        }
    };

    const categories = ['all', 'voucher', 'discount', 'donation', 'badge', 'feature'];

    const filteredRewards = selectedCategory === 'all'
        ? rewards
        : rewards.filter((r) => r.category === selectedCategory);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-2xl mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-48 bg-gray-200 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Points & Tier Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 rounded-2xl p-6 text-white relative overflow-hidden"
            >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
                    <Gift className="w-full h-full" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Points */}
                    <div>
                        <p className="text-white/80 text-sm mb-1">Your Points</p>
                        <div className="text-4xl font-bold flex items-center gap-2">
                            <Sparkles className="w-8 h-8" />
                            {userPoints?.currentPoints.toLocaleString() || 0}
                        </div>
                        <p className="text-white/60 text-sm mt-1">
                            {userPoints?.lifetimePoints.toLocaleString() || 0} lifetime points
                        </p>
                    </div>

                    {/* Tier Progress */}
                    {userPoints && (
                        <div className="flex-1 max-w-xs">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="p-1.5 rounded-lg"
                                        style={{ backgroundColor: TIER_THRESHOLDS[userPoints.tier].color }}
                                    >
                                        {getTierIcon(userPoints.tier)}
                                    </div>
                                    <span className="font-semibold">
                                        {TIER_THRESHOLDS[userPoints.tier].name}
                                    </span>
                                </div>
                                {userPoints.tier !== 'diamond' && (
                                    <span className="text-sm text-white/70">
                                        {userPoints.nextTierPoints - userPoints.lifetimePoints} pts to next
                                    </span>
                                )}
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${userPoints.tierProgress}%` }}
                                    className="h-full bg-white rounded-full"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* History toggle */}
                <button
                    onClick={() => setShowRedemptions(!showRedemptions)}
                    className="absolute top-4 right-4 text-sm text-white/80 hover:text-white flex items-center gap-1"
                >
                    My Rewards
                    <ChevronRight className={`w-4 h-4 transition-transform ${showRedemptions ? 'rotate-90' : ''}`} />
                </button>
            </motion.div>

            {/* Redemption History (Expandable) */}
            <AnimatePresence>
                {showRedemptions && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">My Redeemed Rewards</h3>
                        </div>
                        {redemptions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Gift className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>No rewards redeemed yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {redemptions.map((redemption) => (
                                    <div key={redemption.id} className="p-4 flex items-center gap-4">
                                        <div className="p-2 bg-gray-100 rounded-lg">
                                            {getCategoryIcon(redemption.reward.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{redemption.reward.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(redemption.redeemedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {redemption.code && (
                                            <button
                                                onClick={() => copyCode(redemption.code!)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-mono hover:bg-gray-200 transition-colors"
                                            >
                                                {copiedCode === redemption.code ? (
                                                    <>
                                                        <Check className="w-3 h-3 text-green-600" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3" />
                                                        {redemption.code}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        {redemption.expiresAt && new Date(redemption.expiresAt) > new Date() && (
                                            <span className="text-xs text-amber-600 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Expires {new Date(redemption.expiresAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${selectedCategory === category
                                ? 'bg-violet-100 text-violet-700 font-medium'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {category !== 'all' && getCategoryIcon(category)}
                        <span className="capitalize">{category}</span>
                    </button>
                ))}
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRewards.map((reward, index) => {
                    const canAfford = (userPoints?.currentPoints || 0) >= reward.pointsCost;
                    const isRedeeming = redeeming === reward.id;

                    return (
                        <motion.div
                            key={reward.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`relative bg-white rounded-xl border-2 overflow-hidden transition-all ${reward.featured
                                    ? 'border-violet-300 shadow-lg shadow-violet-100'
                                    : 'border-gray-200'
                                } ${!canAfford ? 'opacity-60' : 'hover:shadow-md'}`}
                        >
                            {/* Featured badge */}
                            {reward.featured && (
                                <div className="absolute top-0 right-0 bg-violet-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                                    FEATURED
                                </div>
                            )}

                            <div className="p-4">
                                {/* Category & Partner */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${reward.category === 'voucher' ? 'bg-blue-100 text-blue-700' :
                                            reward.category === 'discount' ? 'bg-green-100 text-green-700' :
                                                reward.category === 'donation' ? 'bg-emerald-100 text-emerald-700' :
                                                    reward.category === 'badge' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-purple-100 text-purple-700'
                                        }`}>
                                        {getCategoryIcon(reward.category)}
                                        {reward.category}
                                    </span>
                                    {reward.partnerName && (
                                        <span className="text-xs text-gray-500">{reward.partnerName}</span>
                                    )}
                                </div>

                                {/* Reward Info */}
                                <h4 className="font-semibold text-gray-900 mb-1">{reward.name}</h4>
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{reward.description}</p>

                                {/* Value (if applicable) */}
                                {reward.value && (
                                    <p className="text-lg font-bold text-green-600 mb-3">
                                        {reward.currency === 'GBP' ? '£' : ''}{reward.value}
                                        {!reward.currency && '%'}
                                        {reward.category === 'discount' && ' off'}
                                    </p>
                                )}

                                {/* Points & Action */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Sparkles className="w-4 h-4 text-violet-500" />
                                        <span className="font-bold text-gray-900">{reward.pointsCost.toLocaleString()}</span>
                                        <span className="text-gray-500 text-sm">pts</span>
                                    </div>

                                    <button
                                        onClick={() => handleRedeem(reward)}
                                        disabled={!canAfford || isRedeeming}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${canAfford
                                                ? 'bg-violet-600 text-white hover:bg-violet-700'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {isRedeeming ? (
                                            <span className="flex items-center gap-1">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                                            </span>
                                        ) : canAfford ? (
                                            'Redeem'
                                        ) : (
                                            'Need more pts'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredRewards.length === 0 && (
                <div className="text-center py-12">
                    <Gift className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No rewards in this category</h3>
                    <p className="text-gray-500">Check back later for new rewards!</p>
                </div>
            )}

            {/* Info Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                    How Points Work
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <p>Earn 10 points for every 1kg of CO₂ you help save</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <p>Get 50 bonus points for each completed ride</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <p>Level up your tier for exclusive perks</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <p>Redeem for real rewards from our partners</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
