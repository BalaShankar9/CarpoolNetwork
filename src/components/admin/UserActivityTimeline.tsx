import {
    Clock,
    UserPlus,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    UserCheck,
    AlertTriangle,
    Edit,
    Key,
    Mail,
    Sliders,
    Award,
    UserCog,
    Download,
    Users,
    Lock,
    Unlock
} from 'lucide-react';

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

const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

export interface AccountAction {
    id: string;
    user_id: string;
    action_type: string;
    action_details: Record<string, any>;
    reason?: string;
    performed_by?: string;
    created_at: string;
}

interface UserActivityTimelineProps {
    actions: AccountAction[];
    loading?: boolean;
}

const actionConfig: Record<string, { icon: typeof Clock; color: string; bgColor: string; label: string }> = {
    created: { icon: UserPlus, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Account Created' },
    verified: { icon: ShieldCheck, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Identity Verified' },
    suspended: { icon: ShieldAlert, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Account Suspended' },
    unsuspended: { icon: UserCheck, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Account Unsuspended' },
    banned: { icon: ShieldX, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Account Banned' },
    unbanned: { icon: UserCheck, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Account Unbanned' },
    warned: { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Warning Issued' },
    profile_edited: { icon: Edit, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Profile Edited' },
    password_reset: { icon: Key, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Password Reset' },
    email_changed: { icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Email Changed' },
    trust_score_adjusted: { icon: Sliders, color: 'text-indigo-600', bgColor: 'bg-indigo-100', label: 'Trust Score Adjusted' },
    badge_added: { icon: Award, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Badge Added' },
    badge_removed: { icon: Award, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Badge Removed' },
    role_changed: { icon: UserCog, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Role Changed' },
    data_exported: { icon: Download, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Data Exported' },
    account_merged: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Account Merged' },
    restriction_added: { icon: Lock, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Restriction Added' },
    restriction_removed: { icon: Unlock, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Restriction Removed' },
};

export function UserActivityTimeline({ actions, loading }: UserActivityTimelineProps) {
    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500">
                Loading activity...
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
                <Clock className="w-5 h-5 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-white">Activity Timeline</h3>
                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                    {actions.length}
                </span>
            </div>

            {/* Timeline */}
            <div className="p-4">
                {actions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No activity recorded</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                        {/* Timeline Items */}
                        <div className="space-y-6">
                            {actions.map((action, index) => {
                                const config = actionConfig[action.action_type] || {
                                    icon: Clock,
                                    color: 'text-gray-600',
                                    bgColor: 'bg-gray-100',
                                    label: action.action_type.replace('_', ' '),
                                };
                                const Icon = config.icon;

                                return (
                                    <div key={action.id} className="relative pl-10">
                                        {/* Icon */}
                                        <div className={`absolute left-0 p-2 rounded-full ${config.bgColor} ${config.color}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        {/* Content */}
                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`font-medium ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatTimeAgo(action.created_at)}
                                                </span>
                                            </div>

                                            {action.reason && (
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                    {action.reason}
                                                </p>
                                            )}

                                            {/* Action Details */}
                                            {action.action_details && Object.keys(action.action_details).length > 0 && (
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    {action.action_type === 'trust_score_adjusted' && (
                                                        <p>
                                                            Score changed from <strong>{action.action_details.old_score}</strong> to <strong>{action.action_details.new_score}</strong>
                                                        </p>
                                                    )}
                                                    {action.action_type === 'suspended' && action.action_details.duration_days && (
                                                        <p>
                                                            Duration: <strong>{action.action_details.duration_days} days</strong>
                                                            {action.action_details.expires_at && (
                                                                <> (expires {formatDate(action.action_details.expires_at)})</>
                                                            )}
                                                        </p>
                                                    )}
                                                    {(action.action_type === 'badge_added' || action.action_type === 'badge_removed') && (
                                                        <p>Badge: <strong>{action.action_details.badge}</strong></p>
                                                    )}
                                                    {action.action_type === 'profile_edited' && action.action_details && (
                                                        <div className="space-y-1">
                                                            {Object.entries(action.action_details).map(([field, changes]: [string, any]) => (
                                                                <p key={field}>
                                                                    {field}: <span className="line-through text-gray-400">{changes.old}</span> → <strong>{changes.new}</strong>
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {action.action_type === 'warned' && action.action_details.severity && (
                                                        <p>Severity: <strong>{action.action_details.severity}</strong></p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Performed By */}
                                            {action.performed_by && (
                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                                                    By: {action.performed_by}
                                                </div>
                                            )}

                                            {/* Timestamp */}
                                            <div className="mt-1 text-xs text-gray-400">
                                                {formatDateTime(action.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
