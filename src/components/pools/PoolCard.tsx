import React from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    MapPin,
    Clock,
    Calendar,
    Lock,
    Globe,
    ChevronRight,
    Car
} from 'lucide-react';
import type { CarpoolPool } from '../../services/poolService';

interface PoolCardProps {
    pool: CarpoolPool;
    memberCount?: number;
    isJoined?: boolean;
    onJoin?: () => void;
    showDetails?: boolean;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const PoolCard: React.FC<PoolCardProps> = ({
    pool,
    memberCount,
    isJoined = false,
    onJoin,
    showDetails = true,
}) => {
    const getScheduleDisplay = () => {
        if (pool.schedule_type === 'daily') return 'Daily';
        if (pool.schedule_type === 'weekdays') return 'Mon - Fri';
        if (pool.preferred_days?.length) {
            return pool.preferred_days.map(d => DAYS_SHORT[parseInt(d)]).join(', ');
        }
        return 'Flexible';
    };

    const count = memberCount ?? pool.member_count ?? 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                {pool.name}
                            </h3>
                            {pool.is_private ? (
                                <Lock className="w-4 h-4 text-amber-500" />
                            ) : (
                                <Globe className="w-4 h-4 text-green-500" />
                            )}
                        </div>
                        {pool.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {pool.description}
                            </p>
                        )}
                    </div>

                    {/* Member count badge */}
                    <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full text-sm">
                        <Users className="w-4 h-4" />
                        <span>{count}/{pool.max_members}</span>
                    </div>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="truncate">{pool.origin_area}</span>
                    <span className="text-gray-400">→</span>
                    <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="truncate">{pool.destination_area}</span>
                </div>

                {/* Schedule */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{getScheduleDisplay()}</span>
                    </div>
                    {pool.preferred_time && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{pool.preferred_time}</span>
                        </div>
                    )}
                </div>

                {/* Creator */}
                {pool.creator && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <img
                            src={pool.creator.profile_photo_url || pool.creator.avatar_url || '/default-avatar.png'}
                            alt={pool.creator.full_name}
                            className="w-6 h-6 rounded-full object-cover"
                        />
                        <span>Created by {pool.creator.full_name}</span>
                    </div>
                )}

                {/* Actions */}
                {showDetails && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                        {isJoined ? (
                            <>
                                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <Car className="w-4 h-4" />
                                    You're a member
                                </span>
                                <Link
                                    to={`/pools/${pool.id}`}
                                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                                >
                                    View Pool
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onJoin}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    {pool.is_private ? 'Request to Join' : 'Join Pool'}
                                </button>
                                <Link
                                    to={`/pools/${pool.id}`}
                                    className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
                                >
                                    Details
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface PoolCardSkeletonProps {
    count?: number;
}

export const PoolCardSkeleton: React.FC<PoolCardSkeletonProps> = ({ count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-4" />
                </div>
            ))}
        </>
    );
};

export default PoolCard;
