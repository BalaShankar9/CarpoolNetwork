import { Link } from 'react-router-dom';
import {
    User,
    Shield,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    AlertTriangle,
    Ban,
    Flag,
    MessageSquare,
    Calendar,
    Clock,
    Star,
    Award,
    MoreVertical,
    Eye,
    UserX,
    UserCheck,
    Mail,
    Phone
} from 'lucide-react';
import { useState } from 'react';

// Helper functions for date formatting
const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export interface AdminUser {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    account_status: 'active' | 'suspended' | 'banned' | 'restricted' | 'pending_verification' | 'deactivated';
    trust_score: number;
    identity_verified_at?: string;
    badges?: string[];
    warning_count: number;
    admin_notes_count: number;
    is_admin: boolean;
    is_premium: boolean;
    created_at: string;
    last_active_at?: string;
    active_flags: number;
    flag_types?: string[];
}

interface UserCardProps {
    user: AdminUser;
    onAction: (action: string, userId: string) => void;
    selected?: boolean;
    onSelect?: (selected: boolean) => void;
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof Shield; label: string }> = {
    active: { color: 'text-green-700', bgColor: 'bg-green-100', icon: ShieldCheck, label: 'Active' },
    suspended: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: ShieldAlert, label: 'Suspended' },
    banned: { color: 'text-red-700', bgColor: 'bg-red-100', icon: ShieldX, label: 'Banned' },
    restricted: { color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Shield, label: 'Restricted' },
    pending_verification: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Shield, label: 'Pending' },
    deactivated: { color: 'text-gray-700', bgColor: 'bg-gray-100', icon: UserX, label: 'Deactivated' },
};

const flagTypeColors: Record<string, string> = {
    review_needed: 'bg-yellow-100 text-yellow-800',
    suspicious: 'bg-orange-100 text-orange-800',
    high_risk: 'bg-red-100 text-red-800',
    vip: 'bg-purple-100 text-purple-800',
    watch: 'bg-blue-100 text-blue-800',
    fraud_alert: 'bg-red-100 text-red-800',
};

export function UserCard({ user, onAction, selected, onSelect }: UserCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const status = statusConfig[user.account_status] || statusConfig.active;
    const StatusIcon = status.icon;

    const getTrustScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-blue-600 bg-blue-100';
        if (score >= 40) return 'text-yellow-600 bg-yellow-100';
        if (score >= 20) return 'text-orange-600 bg-orange-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 ${user.account_status === 'banned' ? 'border-red-500' :
                user.account_status === 'suspended' ? 'border-yellow-500' :
                    user.active_flags > 0 ? 'border-orange-500' :
                        user.identity_verified_at ? 'border-green-500' :
                            'border-gray-300'
            }`}>
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    {onSelect && (
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => onSelect(e.target.checked)}
                            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                    )}

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-500" />
                            </div>
                        )}
                        {user.identity_verified_at && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <ShieldCheck className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link
                                to={`/admin/users/${user.id}`}
                                className="font-medium text-gray-900 dark:text-white hover:text-blue-600 truncate"
                            >
                                {user.full_name}
                            </Link>

                            {user.is_admin && (
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Admin
                                </span>
                            )}

                            {user.is_premium && (
                                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                                    <Star className="w-3 h-3" /> Premium
                                </span>
                            )}

                            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${status.bgColor} ${status.color}`}>
                                <StatusIcon className="w-3 h-3" /> {status.label}
                            </span>
                        </div>

                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" />
                                {user.email}
                            </span>
                            {user.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" />
                                    {user.phone}
                                </span>
                            )}
                        </div>

                        {/* Badges */}
                        {user.badges && user.badges.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 flex-wrap">
                                {user.badges.slice(0, 4).map((badge, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full flex items-center gap-1"
                                    >
                                        <Award className="w-3 h-3" /> {badge}
                                    </span>
                                ))}
                                {user.badges.length > 4 && (
                                    <span className="text-xs text-gray-500">+{user.badges.length - 4} more</span>
                                )}
                            </div>
                        )}

                        {/* Flags */}
                        {user.active_flags > 0 && user.flag_types && (
                            <div className="mt-2 flex items-center gap-1 flex-wrap">
                                <Flag className="w-4 h-4 text-orange-500" />
                                {user.flag_types.slice(0, 3).map((flag, i) => (
                                    <span
                                        key={i}
                                        className={`px-2 py-0.5 text-xs rounded-full ${flagTypeColors[flag] || 'bg-gray-100 text-gray-800'}`}
                                    >
                                        {flag.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-start gap-4">
                        {/* Trust Score */}
                        <div className={`px-3 py-1 rounded-lg ${getTrustScoreColor(user.trust_score)} text-center`}>
                            <div className="text-lg font-bold">{user.trust_score}</div>
                            <div className="text-xs">Trust</div>
                        </div>

                        {/* Warning Count */}
                        {user.warning_count > 0 && (
                            <div className="px-3 py-1 rounded-lg bg-yellow-100 text-yellow-800 text-center">
                                <div className="text-lg font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" /> {user.warning_count}
                                </div>
                                <div className="text-xs">Warnings</div>
                            </div>
                        )}

                        {/* Notes Count */}
                        {user.admin_notes_count > 0 && (
                            <div className="px-3 py-1 rounded-lg bg-gray-100 text-gray-800 text-center">
                                <div className="text-lg font-bold flex items-center gap-1">
                                    <MessageSquare className="w-4 h-4" /> {user.admin_notes_count}
                                </div>
                                <div className="text-xs">Notes</div>
                            </div>
                        )}

                        {/* Actions Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <MoreVertical className="w-5 h-5 text-gray-500" />
                            </button>

                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                        <Link
                                            to={`/admin/users/${user.id}`}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <Eye className="w-4 h-4" /> View Details
                                        </Link>

                                        {user.account_status === 'active' && !user.is_admin && (
                                            <>
                                                <button
                                                    onClick={() => { onAction('warn', user.id); setShowMenu(false); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                                >
                                                    <AlertTriangle className="w-4 h-4" /> Issue Warning
                                                </button>
                                                <button
                                                    onClick={() => { onAction('suspend', user.id); setShowMenu(false); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                >
                                                    <ShieldAlert className="w-4 h-4" /> Suspend
                                                </button>
                                                <button
                                                    onClick={() => { onAction('ban', user.id); setShowMenu(false); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Ban className="w-4 h-4" /> Ban
                                                </button>
                                            </>
                                        )}

                                        {(user.account_status === 'suspended' || user.account_status === 'banned') && (
                                            <button
                                                onClick={() => { onAction('reinstate', user.id); setShowMenu(false); }}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                            >
                                                <UserCheck className="w-4 h-4" /> Reinstate
                                            </button>
                                        )}

                                        {!user.identity_verified_at && (
                                            <button
                                                onClick={() => { onAction('verify', user.id); setShowMenu(false); }}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                                <ShieldCheck className="w-4 h-4" /> Verify Identity
                                            </button>
                                        )}

                                        <button
                                            onClick={() => { onAction('flag', user.id); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <Flag className="w-4 h-4" /> Flag User
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer - Dates */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Joined {formatDate(user.created_at)}
                    </span>
                    {user.last_active_at && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Active {formatTimeAgo(user.last_active_at)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
