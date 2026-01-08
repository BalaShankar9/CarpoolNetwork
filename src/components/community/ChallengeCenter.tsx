// Challenge Center Component
// Browse, join, and track community challenges
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Target,
    Users,
    Clock,
    Calendar,
    Flame,
    Leaf,
    Car,
    Heart,
    Star,
    ChevronRight,
    Check,
    X,
    Award,
    TrendingUp,
    Gift,
    Zap,
} from 'lucide-react';
import { challengeService, Challenge, ChallengeStatus } from '@/services/challengeService';
import { useAuth } from '@/contexts/AuthContext';

type ViewMode = 'browse' | 'my-challenges';

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
    rides: Car,
    co2: Leaf,
    social: Heart,
    streak: Flame,
    distance: TrendingUp,
    special: Star,
};

const CATEGORY_COLORS: Record<string, string> = {
    rides: 'from-blue-500 to-indigo-500',
    co2: 'from-emerald-500 to-green-500',
    social: 'from-pink-500 to-rose-500',
    streak: 'from-orange-500 to-amber-500',
    distance: 'from-purple-500 to-violet-500',
    special: 'from-yellow-500 to-orange-500',
};

export function ChallengeCenter() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>('browse');
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [myChallenges, setMyChallenges] = useState<(Challenge & { userProgress: any })[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
    const [filter, setFilter] = useState<ChallengeStatus | 'all'>('active');

    useEffect(() => {
        loadChallenges();
    }, [filter, viewMode, user]);

    const loadChallenges = async () => {
        setLoading(true);
        try {
            if (viewMode === 'my-challenges' && user) {
                const data = await challengeService.getUserChallenges(user.id);
                setMyChallenges(data);
            } else {
                const statuses = filter === 'all' ? undefined : [filter];
                const data = await challengeService.getChallenges(statuses);
                setChallenges(data);
            }
        } catch (error) {
            console.error('Failed to load challenges:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (challengeId: string) => {
        if (!user) return;
        try {
            await challengeService.joinChallenge(user.id, challengeId);
            loadChallenges();
        } catch (error) {
            console.error('Failed to join challenge:', error);
        }
    };

    const handleLeave = async (challengeId: string) => {
        if (!user || !confirm('Leave this challenge?')) return;
        try {
            await challengeService.leaveChallenge(user.id, challengeId);
            loadChallenges();
        } catch (error) {
            console.error('Failed to leave challenge:', error);
        }
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        Challenges
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Compete, earn rewards, and make an impact
                    </p>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setViewMode('browse')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'browse'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                >
                    Browse All
                </button>
                <button
                    onClick={() => setViewMode('my-challenges')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'my-challenges'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                >
                    My Challenges
                </button>
            </div>

            {/* Filters (for browse mode) */}
            {viewMode === 'browse' && (
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {(['all', 'active', 'upcoming', 'completed'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === status
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
                </div>
            ) : viewMode === 'my-challenges' ? (
                /* My Challenges */
                myChallenges.length === 0 ? (
                    <EmptyMyChallenges onBrowse={() => setViewMode('browse')} />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {myChallenges.map((challenge) => (
                            <MyChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                progress={challenge.userProgress}
                                onLeave={() => handleLeave(challenge.id)}
                                onClick={() => setSelectedChallenge(challenge)}
                            />
                        ))}
                    </div>
                )
            ) : (
                /* Browse Challenges */
                challenges.length === 0 ? (
                    <EmptyBrowse />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {challenges.map((challenge) => (
                            <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                isJoined={myChallenges.some((c) => c.id === challenge.id)}
                                onJoin={() => handleJoin(challenge.id)}
                                onClick={() => setSelectedChallenge(challenge)}
                            />
                        ))}
                    </div>
                )
            )}

            {/* Challenge Detail Modal */}
            <AnimatePresence>
                {selectedChallenge && (
                    <ChallengeDetail
                        challenge={selectedChallenge}
                        onClose={() => setSelectedChallenge(null)}
                        onJoin={() => handleJoin(selectedChallenge.id)}
                        isJoined={myChallenges.some((c) => c.id === selectedChallenge.id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function ChallengeCard({
    challenge,
    isJoined,
    onJoin,
    onClick,
}: {
    challenge: Challenge;
    isJoined: boolean;
    onJoin: () => void;
    onClick: () => void;
}) {
    const CategoryIcon = CATEGORY_ICONS[challenge.category] || Target;
    const gradientClass = CATEGORY_COLORS[challenge.category] || 'from-gray-500 to-gray-600';

    const daysLeft = Math.ceil(
        (challenge.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const progressPercent = Math.min(100, (challenge.currentProgress / challenge.goal) * 100);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 cursor-pointer"
            onClick={onClick}
        >
            {/* Header */}
            <div className={`bg-gradient-to-r ${gradientClass} p-4 text-white`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <CategoryIcon className="w-5 h-5" />
                        <span className="text-xs font-medium opacity-90 uppercase">
                            {challenge.category}
                        </span>
                    </div>
                    <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${challenge.status === 'active'
                                ? 'bg-white/20'
                                : challenge.status === 'upcoming'
                                    ? 'bg-blue-400/30'
                                    : 'bg-gray-400/30'
                            }`}
                    >
                        {challenge.status}
                    </span>
                </div>
                <h3 className="text-lg font-bold mt-2">{challenge.title}</h3>
            </div>

            {/* Content */}
            <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {challenge.description}
                </p>

                {/* Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Community Progress</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {challenge.currentProgress.toLocaleString()} / {challenge.goal.toLocaleString()} {challenge.unit}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            className={`h-full bg-gradient-to-r ${gradientClass}`}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {challenge.participants}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
                    </span>
                    {challenge.rewards.length > 0 && (
                        <span className="flex items-center gap-1">
                            <Gift className="w-4 h-4" />
                            {challenge.rewards.length} rewards
                        </span>
                    )}
                </div>

                {/* Action */}
                {isJoined ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Joined</span>
                    </div>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onJoin();
                        }}
                        className={`w-full py-2 bg-gradient-to-r ${gradientClass} text-white font-medium rounded-lg`}
                    >
                        Join Challenge
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}

function MyChallengeCard({
    challenge,
    progress,
    onLeave,
    onClick,
}: {
    challenge: Challenge;
    progress: any;
    onLeave: () => void;
    onClick: () => void;
}) {
    const CategoryIcon = CATEGORY_ICONS[challenge.category] || Target;
    const gradientClass = CATEGORY_COLORS[challenge.category] || 'from-gray-500 to-gray-600';

    const progressPercent = Math.min(100, (progress.progress / challenge.goal) * 100);
    const isComplete = progress.progress >= challenge.goal;

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer"
            onClick={onClick}
        >
            <div className="p-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientClass} text-white`}>
                        <CategoryIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">
                            {challenge.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {challenge.type === 'team' ? 'Team Challenge' : 'Individual'}
                        </p>
                    </div>
                    {isComplete && (
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                            <Trophy className="w-5 h-5" />
                        </div>
                    )}
                </div>

                {/* Progress */}
                <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Your Progress</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {progress.progress.toLocaleString()} / {challenge.goal.toLocaleString()}
                        </span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            className={`h-full bg-gradient-to-r ${gradientClass} ${isComplete ? 'animate-pulse' : ''
                                }`}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {Math.round(progressPercent)}% complete
                    </p>
                </div>

                {/* Milestones */}
                {challenge.milestones.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                        {challenge.milestones.slice(0, 4).map((milestone, i) => {
                            const reached = progress.milestonesReached?.includes(milestone.id);
                            return (
                                <div
                                    key={milestone.id}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${reached
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                        }`}
                                >
                                    {reached ? <Check className="w-4 h-4" /> : i + 1}
                                </div>
                            );
                        })}
                        {challenge.milestones.length > 4 && (
                            <span className="text-xs text-gray-500">+{challenge.milestones.length - 4}</span>
                        )}
                    </div>
                )}

                {/* Rank */}
                {progress.rank && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Current Rank</span>
                        <span className="font-bold text-gray-900 dark:text-white">#{progress.rank}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function ChallengeDetail({
    challenge,
    onClose,
    onJoin,
    isJoined,
}: {
    challenge: Challenge;
    onClose: () => void;
    onJoin: () => void;
    isJoined: boolean;
}) {
    const CategoryIcon = CATEGORY_ICONS[challenge.category] || Target;
    const gradientClass = CATEGORY_COLORS[challenge.category] || 'from-gray-500 to-gray-600';

    const daysLeft = Math.ceil(
        (challenge.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`bg-gradient-to-r ${gradientClass} p-6 text-white relative`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon className="w-5 h-5" />
                        <span className="text-sm font-medium opacity-90 uppercase">{challenge.category}</span>
                    </div>
                    <h2 className="text-2xl font-bold">{challenge.title}</h2>
                    <p className="mt-2 opacity-90">{challenge.description}</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <Target className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                            <p className="font-bold text-gray-900 dark:text-white">
                                {challenge.goal.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">{challenge.unit}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <Users className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                            <p className="font-bold text-gray-900 dark:text-white">{challenge.participants}</p>
                            <p className="text-xs text-gray-500">participants</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <Clock className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                            <p className="font-bold text-gray-900 dark:text-white">{daysLeft}</p>
                            <p className="text-xs text-gray-500">days left</p>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {challenge.startDate.toLocaleDateString()} - {challenge.endDate.toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Rewards */}
                    {challenge.rewards.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Gift className="w-4 h-4 text-amber-500" />
                                Rewards
                            </h3>
                            <div className="space-y-2">
                                {challenge.rewards.map((reward, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                                    >
                                        {reward.type === 'badge' && <Award className="w-5 h-5 text-amber-600" />}
                                        {reward.type === 'points' && <Zap className="w-5 h-5 text-amber-600" />}
                                        {reward.type === 'prize' && <Gift className="w-5 h-5 text-amber-600" />}
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {reward.description}
                                            </p>
                                            {reward.tier && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400 capitalize">
                                                    {reward.tier} tier
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rules */}
                    {challenge.rules.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Rules</h3>
                            <ul className="space-y-2">
                                {challenge.rules.map((rule, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <ChevronRight className="w-4 h-4 mt-0.5 text-gray-400" />
                                        {rule}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action Button */}
                    {isJoined ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-medium">
                            <Check className="w-5 h-5" />
                            You're participating!
                        </div>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onJoin}
                            className={`w-full py-3 bg-gradient-to-r ${gradientClass} text-white font-semibold rounded-xl`}
                        >
                            Join This Challenge
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

function EmptyMyChallenges({ onBrowse }: { onBrowse: () => void }) {
    return (
        <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Active Challenges
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Join a challenge to start competing and earning rewards!
            </p>
            <button
                onClick={onBrowse}
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium"
            >
                Browse Challenges
            </button>
        </div>
    );
}

function EmptyBrowse() {
    return (
        <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Challenges Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
                Check back soon for new challenges!
            </p>
        </div>
    );
}

export default ChallengeCenter;
