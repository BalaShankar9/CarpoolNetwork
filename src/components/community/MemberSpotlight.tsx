import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Star,
    Award,
    TrendingUp,
    ChevronRight,
    Sparkles,
    Car,
    Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SpotlightMember {
    id: string;
    full_name: string;
    avatar_url?: string;
    profile_photo_url?: string;
    average_rating?: number;
    total_rides: number;
    achievement_count: number;
    spotlight_reason: 'top_rated' | 'most_rides' | 'most_achievements' | 'new_star';
}

interface MemberSpotlightProps {
    title?: string;
    limit?: number;
    className?: string;
}

export const MemberSpotlight: React.FC<MemberSpotlightProps> = ({
    title = 'Community Spotlight',
    limit = 3,
    className = '',
}) => {
    const [members, setMembers] = useState<SpotlightMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSpotlightMembers = async () => {
            try {
                // Get top rated members
                const { data: topRated } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, profile_photo_url, average_rating')
                    .gte('average_rating', 4.5)
                    .not('average_rating', 'is', null)
                    .order('average_rating', { ascending: false })
                    .limit(limit);

                // Get ride counts for these members
                const memberIds = topRated?.map(m => m.id) || [];

                if (memberIds.length > 0) {
                    const { data: rideCounts } = await supabase
                        .from('rides')
                        .select('driver_id')
                        .in('driver_id', memberIds)
                        .eq('status', 'completed');

                    // Count rides per driver
                    const rideCountMap: Record<string, number> = {};
                    rideCounts?.forEach(r => {
                        rideCountMap[r.driver_id] = (rideCountMap[r.driver_id] || 0) + 1;
                    });

                    // Get achievement counts
                    const { data: achievements } = await supabase
                        .from('user_achievements')
                        .select('user_id')
                        .in('user_id', memberIds);

                    const achievementCountMap: Record<string, number> = {};
                    achievements?.forEach(a => {
                        achievementCountMap[a.user_id] = (achievementCountMap[a.user_id] || 0) + 1;
                    });

                    const spotlightMembers: SpotlightMember[] = (topRated || []).map((m, index) => ({
                        id: m.id,
                        full_name: m.full_name,
                        avatar_url: m.avatar_url,
                        profile_photo_url: m.profile_photo_url,
                        average_rating: m.average_rating,
                        total_rides: rideCountMap[m.id] || 0,
                        achievement_count: achievementCountMap[m.id] || 0,
                        spotlight_reason: index === 0 ? 'top_rated' :
                            rideCountMap[m.id] > 20 ? 'most_rides' :
                                achievementCountMap[m.id] > 5 ? 'most_achievements' :
                                    'new_star',
                    }));

                    setMembers(spotlightMembers);
                }
            } catch (err) {
                console.error('Failed to load spotlight members:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadSpotlightMembers();
    }, [limit]);

    const getReasonBadge = (reason: SpotlightMember['spotlight_reason']) => {
        const configs = {
            top_rated: { label: 'Top Rated', icon: Star, color: 'amber' },
            most_rides: { label: 'Road Warrior', icon: Car, color: 'blue' },
            most_achievements: { label: 'Achiever', icon: Award, color: 'purple' },
            new_star: { label: 'Rising Star', icon: TrendingUp, color: 'green' },
        };

        const config = configs[reason];
        const Icon = config.icon;

        const colorClasses: Record<string, string> = {
            amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
            blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
            purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
            green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[config.color]}`}>
                <Icon className="w-3 h-3" />
                {config.label}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (members.length === 0) {
        return null;
    }

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    {title}
                </h3>
            </div>

            <div className="space-y-3">
                {members.map((member, index) => (
                    <Link
                        key={member.id}
                        to={`/profile/${member.id}`}
                        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        {/* Rank */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0
                                ? 'bg-amber-100 text-amber-600'
                                : index === 1
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-orange-100 text-orange-600'
                            }`}>
                            {index + 1}
                        </div>

                        {/* Avatar */}
                        <img
                            src={member.profile_photo_url || member.avatar_url || '/default-avatar.png'}
                            alt={member.full_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white truncate">
                                    {member.full_name}
                                </span>
                                {getReasonBadge(member.spotlight_reason)}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {member.average_rating && (
                                    <span className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        {member.average_rating.toFixed(1)}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Car className="w-3 h-3" />
                                    {member.total_rides} rides
                                </span>
                                {member.achievement_count > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Award className="w-3 h-3" />
                                        {member.achievement_count}
                                    </span>
                                )}
                            </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default MemberSpotlight;
