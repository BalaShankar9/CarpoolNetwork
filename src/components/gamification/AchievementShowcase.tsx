import { useState, useEffect } from 'react';
import { Award, Trophy, Star, Zap, Crown, Leaf, Lock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ACHIEVEMENTS, Achievement } from '../../services/achievementService';

// Extended achievement with progress info
interface UserAchievement extends Achievement {
    progress: number;
    unlocked: boolean;
    unlockedAt?: string;
}

interface AchievementShowcaseProps {
    userId: string;
    isOwnProfile?: boolean;
    maxDisplay?: number;
}

export default function AchievementShowcase({
    userId,
    isOwnProfile = false,
    maxDisplay = 6,
}: AchievementShowcaseProps) {
    const navigate = useNavigate();
    const [achievements, setAchievements] = useState<UserAchievement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAchievements();
    }, [userId]);

    const loadAchievements = async () => {
        try {
            // Get user achievements from database
            const { data, error } = await supabase
                .from('user_achievements')
                .select('*')
                .eq('user_id', userId)
                .order('unlocked_at', { ascending: false });

            if (error) throw error;

            // Transform to our achievement format
            const userAchievements: UserAchievement[] = (data || []).map((ua: any) => {
                const definition = ACHIEVEMENTS.find(a => a.id === ua.achievement_id);
                return {
                    id: ua.achievement_id,
                    name: definition?.name || ua.achievement_id,
                    description: definition?.description || '',
                    icon: definition?.icon || 'award',
                    category: definition?.category || 'rides',
                    tier: definition?.tier || 'bronze',
                    requirement: definition?.requirement || 0,
                    progress: definition?.requirement || 0, // Already unlocked
                    unlocked: true,
                    unlockedAt: ua.unlocked_at,
                };
            });

            setAchievements(userAchievements);
        } catch (error) {
            console.error('Error loading achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTierConfig = (tier: string) => {
        const configs = {
            bronze: { gradient: 'from-orange-400 to-orange-600', ring: 'ring-orange-200', bg: 'bg-orange-50' },
            silver: { gradient: 'from-gray-300 to-gray-500', ring: 'ring-gray-200', bg: 'bg-gray-50' },
            gold: { gradient: 'from-yellow-400 to-yellow-600', ring: 'ring-yellow-200', bg: 'bg-yellow-50' },
            platinum: { gradient: 'from-purple-400 to-purple-600', ring: 'ring-purple-200', bg: 'bg-purple-50' },
        };
        return configs[tier as keyof typeof configs] || configs.bronze;
    };

    const getIcon = (iconName: string, className: string) => {
        const icons: Record<string, React.ElementType> = {
            award: Award,
            trophy: Trophy,
            star: Star,
            zap: Zap,
            crown: Crown,
            leaf: Leaf,
        };
        const Icon = icons[iconName] || Award;
        return <Icon className={className} />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const displayAchievements = achievements.slice(0, maxDisplay);
    const remainingCount = Math.max(0, achievements.length - maxDisplay);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-gray-900">Achievements</h3>
                    <span className="text-sm text-gray-500">({achievements.length} unlocked)</span>
                </div>
                {isOwnProfile && (
                    <button
                        onClick={() => navigate('/profile?tab=achievements')}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        View all
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Achievement Grid */}
            {achievements.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                        {isOwnProfile
                            ? "No achievements unlocked yet. Complete rides to earn badges!"
                            : "This user hasn't unlocked any achievements yet."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {displayAchievements.map((achievement) => {
                        const tierConfig = getTierConfig(achievement.tier);
                        return (
                            <div
                                key={achievement.id}
                                className="group relative"
                                title={`${achievement.name}: ${achievement.description}`}
                            >
                                <div
                                    className={`w-full aspect-square rounded-xl bg-gradient-to-br ${tierConfig.gradient} 
                    flex items-center justify-center shadow-lg transform transition-transform 
                    group-hover:scale-110 cursor-pointer ring-2 ${tierConfig.ring}`}
                                >
                                    {getIcon(achievement.icon, 'w-8 h-8 text-white drop-shadow')}
                                </div>
                                <p className="text-xs text-center mt-1 text-gray-700 font-medium truncate">
                                    {achievement.name}
                                </p>
                            </div>
                        );
                    })}
                    {remainingCount > 0 && (
                        <div
                            onClick={() => isOwnProfile && navigate('/profile?tab=achievements')}
                            className={`w-full aspect-square rounded-xl bg-gray-100 flex flex-col items-center 
                justify-center text-gray-500 ${isOwnProfile ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                        >
                            <span className="text-lg font-bold">+{remainingCount}</span>
                            <span className="text-xs">more</span>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Achievement Highlight */}
            {achievements.length > 0 && achievements[0].unlockedAt && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${getTierConfig(achievements[0].tier).gradient}`}>
                            {getIcon(achievements[0].icon, 'w-5 h-5 text-white')}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                🎉 Latest: {achievements[0].name}
                            </p>
                            <p className="text-xs text-gray-500">
                                Unlocked {new Date(achievements[0].unlockedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Compact achievement badge for inline display
 */
export function AchievementBadge({
    achievement,
    size = 'sm',
}: {
    achievement: UserAchievement;
    size?: 'xs' | 'sm' | 'md';
}) {
    const tierColors: Record<string, string> = {
        bronze: 'from-orange-400 to-orange-600',
        silver: 'from-gray-300 to-gray-500',
        gold: 'from-yellow-400 to-yellow-600',
        platinum: 'from-purple-400 to-purple-600',
    };

    const sizes = {
        xs: 'w-6 h-6',
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
    };

    const iconSizes = {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
    };

    const getIcon = (iconName: string) => {
        const icons: Record<string, React.ElementType> = {
            award: Award,
            trophy: Trophy,
            star: Star,
            zap: Zap,
            crown: Crown,
            leaf: Leaf,
        };
        return icons[iconName] || Award;
    };

    const Icon = getIcon(achievement.icon);

    return (
        <div
            className={`${sizes[size]} rounded-full bg-gradient-to-br ${tierColors[achievement.tier]} 
        flex items-center justify-center shadow-sm`}
            title={achievement.name}
        >
            <Icon className={`${iconSizes[size]} text-white`} />
        </div>
    );
}

/**
 * Progress indicator for locked achievements
 */
export function AchievementProgress({
    name,
    progress,
    requirement,
    icon,
}: {
    name: string;
    progress: number;
    requirement: number;
    icon: string;
}) {
    const percentage = Math.min(100, (progress / requirement) * 100);

    const getIcon = (iconName: string) => {
        const icons: Record<string, React.ElementType> = {
            award: Award,
            trophy: Trophy,
            star: Star,
            zap: Zap,
            crown: Crown,
            leaf: Leaf,
        };
        return icons[iconName] || Award;
    };

    const Icon = getIcon(icon);

    return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-gray-200 rounded-lg">
                <Icon className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                    <span className="text-xs text-gray-500">{progress}/{requirement}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
