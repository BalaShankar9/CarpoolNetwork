import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    Clock,
    Shield,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    Star,
    Award,
    AlertTriangle,
    Car,
    Users,
    MessageSquare,
    Flag,
    Sliders,
    Ban,
    UserCheck,
    Edit,
    MoreVertical,
    MapPin,
    FileText,
    ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { UserNotesPanel, AdminNote } from '../../components/admin/UserNotesPanel';
import { UserActivityTimeline, AccountAction } from '../../components/admin/UserActivityTimeline';
import { AccountActionModal, AccountActionType, AccountActionData } from '../../components/admin/AccountActionModal';

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

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    bio?: string;
    account_status: string;
    trust_score: number;
    identity_verified_at?: string;
    identity_verified_by?: string;
    badges?: string[];
    warning_count: number;
    admin_notes_count: number;
    is_admin: boolean;
    is_premium: boolean;
    created_at: string;
    last_active_at?: string;
    suspension_reason?: string;
    suspension_expires_at?: string;
    suspended_by?: string;
    suspended_by_name?: string;
    verified_by_name?: string;
}

interface UserStats {
    total_rides_posted: number;
    total_rides_completed: number;
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    avg_rating_as_driver: number;
    avg_rating_as_passenger: number;
    total_reviews_received: number;
    total_reviews_given: number;
    messages_sent: number;
    reports_filed: number;
    reports_against: number;
    community_posts: number;
}

interface UserFlag {
    id: string;
    flag_type: string;
    reason?: string;
    priority: string;
    is_resolved: boolean;
    created_at: string;
    flagged_by: string;
}

interface UserWarning {
    id: string;
    warning_type: string;
    severity: string;
    title: string;
    description: string;
    is_acknowledged: boolean;
    created_at: string;
    issued_by: string;
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof Shield; label: string }> = {
    active: { color: 'text-green-700', bgColor: 'bg-green-100', icon: ShieldCheck, label: 'Active' },
    suspended: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: ShieldAlert, label: 'Suspended' },
    banned: { color: 'text-red-700', bgColor: 'bg-red-100', icon: ShieldX, label: 'Banned' },
    restricted: { color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Shield, label: 'Restricted' },
    pending_verification: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Shield, label: 'Pending' },
    deactivated: { color: 'text-gray-700', bgColor: 'bg-gray-100', icon: Shield, label: 'Deactivated' },
};

export default function UserDetailAdmin() {
    const { userId } = useParams<{ userId: string }>();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [flags, setFlags] = useState<UserFlag[]>([]);
    const [warnings, setWarnings] = useState<UserWarning[]>([]);
    const [actions, setActions] = useState<AccountAction[]>([]);
    const [notes, setNotes] = useState<AdminNote[]>([]);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [actionModal, setActionModal] = useState<{ open: boolean; type: AccountActionType }>({ open: false, type: 'warn' });

    useEffect(() => {
        if (userId) {
            loadUserData();
        }
    }, [userId]);

    const loadUserData = async () => {
        setLoading(true);
        try {
            // Load full user data
            const { data, error } = await supabase.rpc('admin_get_user_full', { p_user_id: userId });

            if (error) throw error;

            if (data) {
                setProfile(data.profile);
                setStats(data.stats);
                setFlags(data.flags || []);
                setWarnings(data.warnings || []);
                setActions(data.recent_actions || []);
            }

            // Load notes separately
            const { data: notesData } = await supabase.rpc('admin_get_user_notes', { p_user_id: userId });
            if (notesData) {
                setNotes(notesData);
            }
        } catch (error) {
            console.error('Error loading user:', error);
            toast.error('Failed to load user data');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (data: AccountActionData) => {
        try {
            let result;

            switch (data.actionType) {
                case 'warn':
                    result = await supabase.rpc('admin_warn_user', {
                        p_user_id: data.userId,
                        p_warning_type: data.warningType,
                        p_severity: data.severity,
                        p_title: data.title,
                        p_description: data.description,
                        p_notify_user: data.notifyUser,
                    });
                    break;
                case 'suspend':
                    result = await supabase.rpc('admin_suspend_user', {
                        p_user_id: data.userId,
                        p_reason: data.reason,
                        p_duration_days: data.durationDays,
                        p_notify_user: data.notifyUser,
                    });
                    break;
                case 'ban':
                    result = await supabase.rpc('admin_ban_user', {
                        p_user_id: data.userId,
                        p_reason: data.reason,
                        p_notify_user: data.notifyUser,
                    });
                    break;
                case 'reinstate':
                    result = await supabase.rpc('admin_reinstate_user', {
                        p_user_id: data.userId,
                        p_reason: data.reason,
                        p_notify_user: data.notifyUser,
                    });
                    break;
                case 'verify':
                    result = await supabase.rpc('admin_verify_user', {
                        p_user_id: data.userId,
                        p_notify_user: data.notifyUser,
                    });
                    break;
                case 'flag':
                    result = await supabase.rpc('admin_flag_user', {
                        p_user_id: data.userId,
                        p_flag_type: data.flagType,
                        p_reason: data.reason,
                        p_priority: data.priority,
                    });
                    break;
                case 'badge':
                    result = await supabase.rpc('admin_manage_badge', {
                        p_user_id: data.userId,
                        p_badge: data.badge,
                        p_action: data.badgeAction,
                    });
                    break;
                case 'trust_score':
                    result = await supabase.rpc('admin_update_trust_score', {
                        p_user_id: data.userId,
                        p_new_score: data.newTrustScore,
                        p_reason: data.reason,
                    });
                    break;
            }

            if (result?.error) throw result.error;

            toast.success('Action completed successfully');
            loadUserData();
        } catch (error) {
            console.error('Action failed:', error);
            toast.error('Action failed');
            throw error;
        }
    };

    const handleAddNote = async (note: string, noteType: string, isPinned: boolean) => {
        try {
            const { error } = await supabase.rpc('admin_add_user_note', {
                p_user_id: userId,
                p_note: note,
                p_note_type: noteType,
                p_is_pinned: isPinned,
            });

            if (error) throw error;

            toast.success('Note added');
            loadUserData();
        } catch (error) {
            console.error('Error adding note:', error);
            toast.error('Failed to add note');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            const { error } = await supabase.rpc('admin_delete_user_note', { p_note_id: noteId });
            if (error) throw error;

            toast.success('Note deleted');
            setNotes(notes.filter(n => n.id !== noteId));
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error('Failed to delete note');
        }
    };

    const handleResolveFlag = async (flagId: string) => {
        try {
            const { error } = await supabase.rpc('admin_resolve_flag', { p_flag_id: flagId });
            if (error) throw error;

            toast.success('Flag resolved');
            loadUserData();
        } catch (error) {
            console.error('Error resolving flag:', error);
            toast.error('Failed to resolve flag');
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-500">User not found</p>
                <Link to="/admin/users" className="text-blue-600 hover:underline mt-2 inline-block">
                    ← Back to Users
                </Link>
            </div>
        );
    }

    const status = statusConfig[profile.account_status] || statusConfig.active;
    const StatusIcon = status.icon;

    const getTrustScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-blue-600';
        if (score >= 40) return 'text-yellow-600';
        if (score >= 20) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        to="/admin/users"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Details</h1>
                        <p className="text-gray-500">Manage user account and view activity</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="relative">
                    <button
                        onClick={() => setShowActionMenu(!showActionMenu)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Actions
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {showActionMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowActionMenu(false)} />
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                {profile.account_status === 'active' && !profile.is_admin && (
                                    <>
                                        <button
                                            onClick={() => { setActionModal({ open: true, type: 'warn' }); setShowActionMenu(false); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                                        >
                                            <AlertTriangle className="w-4 h-4" /> Issue Warning
                                        </button>
                                        <button
                                            onClick={() => { setActionModal({ open: true, type: 'suspend' }); setShowActionMenu(false); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                                        >
                                            <ShieldAlert className="w-4 h-4" /> Suspend User
                                        </button>
                                        <button
                                            onClick={() => { setActionModal({ open: true, type: 'ban' }); setShowActionMenu(false); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            <Ban className="w-4 h-4" /> Ban User
                                        </button>
                                    </>
                                )}
                                {(profile.account_status === 'suspended' || profile.account_status === 'banned') && (
                                    <button
                                        onClick={() => { setActionModal({ open: true, type: 'reinstate' }); setShowActionMenu(false); }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                    >
                                        <UserCheck className="w-4 h-4" /> Reinstate User
                                    </button>
                                )}
                                {!profile.identity_verified_at && (
                                    <button
                                        onClick={() => { setActionModal({ open: true, type: 'verify' }); setShowActionMenu(false); }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                    >
                                        <ShieldCheck className="w-4 h-4" /> Verify Identity
                                    </button>
                                )}
                                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                                <button
                                    onClick={() => { setActionModal({ open: true, type: 'flag' }); setShowActionMenu(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <Flag className="w-4 h-4" /> Flag User
                                </button>
                                <button
                                    onClick={() => { setActionModal({ open: true, type: 'badge' }); setShowActionMenu(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <Award className="w-4 h-4" /> Manage Badges
                                </button>
                                <button
                                    onClick={() => { setActionModal({ open: true, type: 'trust_score' }); setShowActionMenu(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <Sliders className="w-4 h-4" /> Adjust Trust Score
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* User Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.full_name}
                                className="w-24 h-24 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <User className="w-12 h-12 text-gray-500" />
                            </div>
                        )}
                        {profile.identity_verified_at && (
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.full_name}</h2>
                            {profile.is_admin && (
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Admin
                                </span>
                            )}
                            {profile.is_premium && (
                                <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                                    <Star className="w-3 h-3" /> Premium
                                </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${status.bgColor} ${status.color}`}>
                                <StatusIcon className="w-3 h-3" /> {status.label}
                            </span>
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" /> {profile.email}
                            </span>
                            {profile.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-4 h-4" /> {profile.phone}
                                </span>
                            )}
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> Joined {formatDate(profile.created_at)}
                            </span>
                            {profile.last_active_at && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> Active {formatTimeAgo(profile.last_active_at)}
                                </span>
                            )}
                        </div>

                        {profile.bio && (
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{profile.bio}</p>
                        )}

                        {/* Badges */}
                        {profile.badges && profile.badges.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                {profile.badges.map((badge, i) => (
                                    <span key={i} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full flex items-center gap-1">
                                        <Award className="w-3 h-3" /> {badge}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Trust Score & Warnings */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-center">
                            <div className={`text-4xl font-bold ${getTrustScoreColor(profile.trust_score)}`}>
                                {profile.trust_score}
                            </div>
                            <div className="text-xs text-gray-500">Trust Score</div>
                        </div>
                        {profile.warning_count > 0 && (
                            <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> {profile.warning_count} Warnings
                            </div>
                        )}
                    </div>
                </div>

                {/* Suspension Info */}
                {(profile.account_status === 'suspended' || profile.account_status === 'banned') && (
                    <div className={`mt-4 p-4 rounded-lg ${profile.account_status === 'banned' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        <h4 className={`font-medium ${profile.account_status === 'banned' ? 'text-red-800' : 'text-yellow-800'}`}>
                            {profile.account_status === 'banned' ? 'Account Banned' : 'Account Suspended'}
                        </h4>
                        {profile.suspension_reason && (
                            <p className="text-sm mt-1">{profile.suspension_reason}</p>
                        )}
                        {profile.suspension_expires_at && (
                            <p className="text-sm text-gray-600 mt-1">
                                Expires: {formatDateTime(profile.suspension_expires_at)}
                            </p>
                        )}
                        {profile.suspended_by_name && (
                            <p className="text-xs text-gray-500 mt-1">By: {profile.suspended_by_name}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Car className="w-5 h-5" />
                            <span className="text-sm">Rides Posted</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.total_rides_posted}</div>
                        <div className="text-xs text-gray-500">{stats.total_rides_completed} completed</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <Users className="w-5 h-5" />
                            <span className="text-sm">Bookings</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.total_bookings}</div>
                        <div className="text-xs text-gray-500">{stats.completed_bookings} completed</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-yellow-600 mb-1">
                            <Star className="w-5 h-5" />
                            <span className="text-sm">Driver Rating</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.avg_rating_as_driver || '-'}</div>
                        <div className="text-xs text-gray-500">{stats.total_reviews_received} reviews</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <Star className="w-5 h-5" />
                            <span className="text-sm">Passenger Rating</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.avg_rating_as_passenger || '-'}</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <MessageSquare className="w-5 h-5" />
                            <span className="text-sm">Messages</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.messages_sent}</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                            <Flag className="w-5 h-5" />
                            <span className="text-sm">Reports</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.reports_against}</div>
                        <div className="text-xs text-gray-500">{stats.reports_filed} filed</div>
                    </div>
                </div>
            )}

            {/* Active Flags */}
            {flags.filter(f => !f.is_resolved).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
                        <Flag className="w-5 h-5 text-orange-500" />
                        <h3 className="font-medium text-gray-900 dark:text-white">Active Flags</h3>
                    </div>
                    <div className="p-4 space-y-2">
                        {flags.filter(f => !f.is_resolved).map(flag => (
                            <div key={flag.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <div>
                                    <span className="font-medium text-orange-800">{flag.flag_type.replace('_', ' ')}</span>
                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${flag.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                            flag.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {flag.priority}
                                    </span>
                                    {flag.reason && <p className="text-sm text-gray-600 mt-1">{flag.reason}</p>}
                                    <p className="text-xs text-gray-500 mt-1">
                                        Flagged by {flag.flagged_by} • {formatTimeAgo(flag.created_at)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleResolveFlag(flag.id)}
                                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Resolve
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-medium text-gray-900 dark:text-white">Warnings</h3>
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            {warnings.length}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {warnings.map(warning => (
                            <div key={warning.id} className="p-4">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${warning.severity === 'final_warning' ? 'bg-red-100 text-red-800' :
                                            warning.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {warning.severity.replace('_', ' ')}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                                        {warning.warning_type}
                                    </span>
                                    {warning.is_acknowledged && (
                                        <span className="text-xs text-green-600">✓ Acknowledged</span>
                                    )}
                                </div>
                                <h4 className="font-medium mt-2">{warning.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{warning.description}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Issued by {warning.issued_by} • {formatTimeAgo(warning.created_at)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Two Column Layout: Notes & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UserNotesPanel
                    notes={notes}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                />
                <UserActivityTimeline actions={actions} />
            </div>

            {/* Action Modal */}
            <AccountActionModal
                isOpen={actionModal.open}
                onClose={() => setActionModal({ open: false, type: 'warn' })}
                onSubmit={handleAction}
                actionType={actionModal.type}
                userName={profile.full_name}
                userId={userId!}
                currentTrustScore={profile.trust_score}
            />
        </div>
    );
}
