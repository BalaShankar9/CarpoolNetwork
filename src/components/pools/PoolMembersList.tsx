import React, { useState } from 'react';
import {
    Users,
    Crown,
    Car,
    Star,
    MoreVertical,
    UserMinus,
    Shield,
    Check
} from 'lucide-react';
import type { PoolMember } from '../../services/poolService';

interface PoolMembersListProps {
    members: PoolMember[];
    currentUserId: string;
    isAdmin: boolean;
    onRemoveMember?: (userId: string) => Promise<void>;
    onPromoteToAdmin?: (userId: string) => Promise<void>;
    onUpdateDriverStatus?: (userId: string, isDriver: boolean) => Promise<void>;
}

export const PoolMembersList: React.FC<PoolMembersListProps> = ({
    members,
    currentUserId,
    isAdmin,
    onRemoveMember,
    onPromoteToAdmin,
    onUpdateDriverStatus,
}) => {
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [loading, setLoading] = useState<string | null>(null);

    const sortedMembers = [...members].sort((a, b) => {
        // Admins first
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        // Then by joined date
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });

    const handleAction = async (
        action: () => Promise<void>,
        userId: string
    ) => {
        setLoading(userId);
        try {
            await action();
        } finally {
            setLoading(null);
            setMenuOpen(null);
        }
    };

    const drivers = members.filter(m => m.is_driver);
    const passengers = members.filter(m => !m.is_driver);

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{members.length} members</span>
                </div>
                <div className="flex items-center gap-1">
                    <Car className="w-4 h-4 text-blue-500" />
                    <span>{drivers.length} drivers</span>
                </div>
                <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-green-500" />
                    <span>{passengers.length} passengers</span>
                </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
                {sortedMembers.map(member => {
                    const isCurrentUser = member.user_id === currentUserId;
                    const user = member.user;

                    return (
                        <div
                            key={member.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${isCurrentUser
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                    : 'bg-gray-50 dark:bg-gray-700/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative">
                                    <img
                                        src={user?.profile_photo_url || user?.avatar_url || '/default-avatar.png'}
                                        alt={user?.full_name || 'Member'}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    {member.role === 'admin' && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                                            <Crown className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {user?.full_name || 'Unknown'}
                                        </span>
                                        {isCurrentUser && (
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        {member.is_driver ? (
                                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                <Car className="w-3 h-3" />
                                                Driver
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                Passenger
                                            </span>
                                        )}
                                        {user?.average_rating && (
                                            <span className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                {user.average_rating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {isAdmin && !isCurrentUser && (
                                <div className="relative">
                                    <button
                                        onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                                        disabled={loading === member.user_id}
                                    >
                                        {loading === member.user_id ? (
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <MoreVertical className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>

                                    {/* Dropdown Menu */}
                                    {menuOpen === member.id && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setMenuOpen(null)}
                                            />
                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                                                {member.role !== 'admin' && onPromoteToAdmin && (
                                                    <button
                                                        onClick={() =>
                                                            handleAction(
                                                                () => onPromoteToAdmin(member.user_id),
                                                                member.user_id
                                                            )
                                                        }
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                        Make Admin
                                                    </button>
                                                )}

                                                {onUpdateDriverStatus && (
                                                    <button
                                                        onClick={() =>
                                                            handleAction(
                                                                () => onUpdateDriverStatus(member.user_id, !member.is_driver),
                                                                member.user_id
                                                            )
                                                        }
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                    >
                                                        <Car className="w-4 h-4" />
                                                        {member.is_driver ? 'Set as Passenger' : 'Set as Driver'}
                                                    </button>
                                                )}

                                                {onRemoveMember && (
                                                    <button
                                                        onClick={() =>
                                                            handleAction(
                                                                () => onRemoveMember(member.user_id),
                                                                member.user_id
                                                            )
                                                        }
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                                    >
                                                        <UserMinus className="w-4 h-4" />
                                                        Remove from Pool
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface PoolMemberAvatarsProps {
    members: PoolMember[];
    max?: number;
    size?: 'sm' | 'md' | 'lg';
}

export const PoolMemberAvatars: React.FC<PoolMemberAvatarsProps> = ({
    members,
    max = 5,
    size = 'md',
}) => {
    const displayed = members.slice(0, max);
    const remaining = members.length - max;

    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base',
    };

    const offsetClasses = {
        sm: '-ml-2',
        md: '-ml-2.5',
        lg: '-ml-3',
    };

    return (
        <div className="flex items-center">
            {displayed.map((member, index) => (
                <img
                    key={member.id}
                    src={
                        member.user?.profile_photo_url ||
                        member.user?.avatar_url ||
                        '/default-avatar.png'
                    }
                    alt={member.user?.full_name || 'Member'}
                    className={`${sizeClasses[size]} rounded-full border-2 border-white dark:border-gray-800 object-cover ${index > 0 ? offsetClasses[size] : ''
                        }`}
                    title={member.user?.full_name}
                />
            ))}
            {remaining > 0 && (
                <div
                    className={`${sizeClasses[size]} ${offsetClasses[size]} rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center font-medium text-gray-600 dark:text-gray-300`}
                >
                    +{remaining}
                </div>
            )}
        </div>
    );
};

export default PoolMembersList;
