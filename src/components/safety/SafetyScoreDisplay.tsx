import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Shield,
    Star,
    CheckCircle,
    AlertTriangle,
    Award,
    TrendingUp,
    Clock,
    Car,
    MessageSquare,
    Loader2,
} from 'lucide-react';
import {
    trustVerificationService,
    SafetyScore,
    SafetyBadge,
} from '@/services/trustVerificationService';

interface SafetyScoreDisplayProps {
    userId: string;
    compact?: boolean;
}

export function SafetyScoreDisplay({ userId, compact = false }: SafetyScoreDisplayProps) {
    const [score, setScore] = useState<SafetyScore | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadScore();
    }, [userId]);

    const loadScore = async () => {
        try {
            const data = await trustVerificationService.calculateSafetyScore(userId);
            setScore(data);
        } catch (error) {
            console.error('Failed to load safety score:', error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-400';
        if (score >= 70) return 'text-blue-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreGradient = (score: number) => {
        if (score >= 90) return 'from-emerald-500 to-teal-500';
        if (score >= 70) return 'from-blue-500 to-cyan-500';
        if (score >= 50) return 'from-yellow-500 to-orange-500';
        return 'from-red-500 to-pink-500';
    };

    const getTierInfo = (tier: SafetyScore['tier']) => {
        const tiers = {
            new: { label: 'New User', color: 'text-slate-400', icon: '🌱' },
            standard: { label: 'Standard', color: 'text-blue-400', icon: '👤' },
            trusted: { label: 'Trusted', color: 'text-purple-400', icon: '✓' },
            verified: { label: 'Verified', color: 'text-emerald-400', icon: '✓✓' },
            elite: { label: 'Elite', color: 'text-yellow-400', icon: '👑' },
        };
        return tiers[tier];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
        );
    }

    if (!score) return null;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${getScoreGradient(
                        score.overallScore
                    )} flex items-center justify-center text-white font-bold text-sm`}
                >
                    {Math.round(score.overallScore)}
                </div>
                <div>
                    <p className={`text-sm font-medium ${getScoreColor(score.overallScore)}`}>
                        Safety Score
                    </p>
                    <p className="text-xs text-slate-400">{getTierInfo(score.tier).label}</p>
                </div>
            </div>
        );
    }

    const tierInfo = getTierInfo(score.tier);

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Safety Score</h3>
                        <p className="text-sm text-slate-400">Your trust & safety rating</p>
                    </div>
                </div>
            </div>

            {/* Score Circle */}
            <div className="p-6 flex flex-col items-center">
                <div className="relative">
                    <svg className="w-32 h-32 -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="12"
                            className="text-slate-700"
                        />
                        <motion.circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={351.86}
                            initial={{ strokeDashoffset: 351.86 }}
                            animate={{
                                strokeDashoffset: 351.86 * (1 - score.overallScore / 100),
                            }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        />
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-bold ${getScoreColor(score.overallScore)}`}>
                            {Math.round(score.overallScore)}
                        </span>
                        <span className="text-xs text-slate-400">out of 100</span>
                    </div>
                </div>

                {/* Tier Badge */}
                <div
                    className={`mt-4 px-4 py-1.5 rounded-full bg-gradient-to-r ${getScoreGradient(
                        score.overallScore
                    )} bg-opacity-20 flex items-center gap-2`}
                >
                    <span>{tierInfo.icon}</span>
                    <span className={`font-medium ${tierInfo.color}`}>{tierInfo.label}</span>
                </div>
            </div>

            {/* Component Breakdown */}
            <div className="px-4 pb-4 space-y-3">
                <p className="text-sm font-medium text-slate-300">Score Breakdown</p>

                <ScoreBar
                    icon={<Star className="w-4 h-4" />}
                    label="Ratings"
                    value={score.components.ratingScore}
                />
                <ScoreBar
                    icon={<CheckCircle className="w-4 h-4" />}
                    label="Verification"
                    value={score.components.verificationScore}
                />
                <ScoreBar
                    icon={<Car className="w-4 h-4" />}
                    label="Ride History"
                    value={score.components.historyScore}
                />
                <ScoreBar
                    icon={<MessageSquare className="w-4 h-4" />}
                    label="Response Rate"
                    value={score.components.responseScore}
                />

                {score.components.safetyIncidents > 0 && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{score.components.safetyIncidents} safety incident(s) on record</span>
                    </div>
                )}
            </div>

            {/* Badges */}
            {score.badges.length > 0 && (
                <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                    <p className="text-sm font-medium text-slate-300 mb-3">Earned Badges</p>
                    <div className="flex flex-wrap gap-2">
                        {score.badges.map((badge) => (
                            <BadgeDisplay key={badge.id} badge={badge} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ScoreBar({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
}) {
    const getBarColor = (value: number) => {
        if (value >= 80) return 'bg-emerald-500';
        if (value >= 60) return 'bg-blue-500';
        if (value >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-3">
            <div className="text-slate-400">{icon}</div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{label}</span>
                    <span className="text-sm text-slate-400">{Math.round(value)}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${getBarColor(value)} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>
            </div>
        </div>
    );
}

function BadgeDisplay({ badge }: { badge: SafetyBadge }) {
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            className="px-3 py-1.5 bg-slate-700/50 rounded-lg flex items-center gap-2 cursor-pointer"
            title={badge.description}
        >
            <span className="text-lg">{badge.icon}</span>
            <span className="text-sm text-slate-300">{badge.name}</span>
        </motion.div>
    );
}

// Verification Status Card
interface VerificationStatusProps {
    userId: string;
}

export function VerificationStatusCard({ userId }: VerificationStatusProps) {
    const [status, setStatus] = useState<{
        emailVerified: boolean;
        phoneVerified: boolean;
        idVerified: boolean;
        driverLicenseVerified: boolean;
        vehicleVerified: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatus();
    }, [userId]);

    const loadStatus = async () => {
        try {
            const data = await trustVerificationService.getVerificationStatus(userId);
            setStatus(data);
        } catch (error) {
            console.error('Failed to load verification status:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
        );
    }

    if (!status) return null;

    const verifications = [
        { key: 'email', label: 'Email', verified: status.emailVerified },
        { key: 'phone', label: 'Phone', verified: status.phoneVerified },
        { key: 'id', label: 'ID Document', verified: status.idVerified },
        { key: 'license', label: 'Driver License', verified: status.driverLicenseVerified },
        { key: 'vehicle', label: 'Vehicle', verified: status.vehicleVerified },
    ];

    const verifiedCount = verifications.filter((v) => v.verified).length;

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">Verification Status</h3>
                        <p className="text-sm text-slate-400">
                            {verifiedCount}/{verifications.length} verified
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {verifications.map((v) => (
                    <div
                        key={v.key}
                        className={`flex items-center justify-between p-2 rounded-lg ${v.verified ? 'bg-emerald-500/10' : 'bg-slate-700/30'
                            }`}
                    >
                        <span className={`text-sm ${v.verified ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {v.label}
                        </span>
                        {v.verified ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <button className="text-xs text-purple-400 hover:text-purple-300">
                                Verify
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SafetyScoreDisplay;
