import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    Shield,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    Flag,
    UserCheck,
    AlertTriangle,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { UserFilters, UserFilterValues, defaultUserFilters } from '../../components/admin/UserFilters';
import { UserCard, AdminUser } from '../../components/admin/UserCard';
import { AccountActionModal, AccountActionType, AccountActionData } from '../../components/admin/AccountActionModal';

interface UserStats {
    total_users: number;
    active_users: number;
    suspended_users: number;
    banned_users: number;
    verified_users: number;
    pending_verification: number;
    new_users_today: number;
    new_users_week: number;
    active_today: number;
    flagged_users: number;
    avg_trust_score: number;
    warnings_this_week: number;
}

export default function UserManagement() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [filters, setFilters] = useState<UserFilterValues>(defaultUserFilters);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [totalUsers, setTotalUsers] = useState(0);
    const [page, setPage] = useState(0);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [actionModal, setActionModal] = useState<{ open: boolean; type: AccountActionType; userId: string; userName: string } | null>(null);
    const pageSize = 25;

    const loadStats = async () => {
        try {
            const { data, error } = await supabase.rpc('admin_get_user_stats');
            if (error) throw error;
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_search_users', {
                p_search: filters.search || null,
                p_status: filters.status || null,
                p_verified_only: filters.verifiedOnly,
                p_flagged_only: filters.flaggedOnly,
                p_min_trust_score: filters.minTrustScore,
                p_max_trust_score: filters.maxTrustScore,
                p_joined_from: filters.joinedFrom || null,
                p_joined_to: filters.joinedTo || null,
                p_last_active_from: filters.lastActiveFrom || null,
                p_last_active_to: filters.lastActiveTo || null,
                p_has_warnings: filters.hasWarnings,
                p_sort_by: filters.sortBy,
                p_sort_order: filters.sortOrder,
                p_limit: pageSize,
                p_offset: page * pageSize,
            });

            if (error) throw error;

            setUsers(data?.users || []);
            setTotalUsers(data?.total || 0);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        setPage(0);
    }, [filters]);

    const handleClearFilters = () => {
        setFilters(defaultUserFilters);
    };

    const handleUserAction = (action: string, userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setActionModal({
            open: true,
            type: action as AccountActionType,
            userId,
            userName: user.full_name,
        });
    };

    const handleActionSubmit = async (data: AccountActionData) => {
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
            }

            if (result?.error) throw result.error;

            toast.success('Action completed successfully');
            loadUsers();
            loadStats();
        } catch (error) {
            console.error('Action failed:', error);
            toast.error('Action failed');
            throw error;
        }
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)));
        }
    };

    const toggleSelectUser = (userId: string, selected: boolean) => {
        const newSelected = new Set(selectedUsers);
        if (selected) {
            newSelected.add(userId);
        } else {
            newSelected.delete(userId);
        }
        setSelectedUsers(newSelected);
    };

    const totalPages = Math.ceil(totalUsers / pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-500">Manage users, verify identities, and handle account actions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { loadUsers(); loadStats(); }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-500" />
                    </button>
                    <Link
                        to="/admin/verifications"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <UserCheck className="w-4 h-4" />
                        Verification Queue
                        {stats?.pending_verification ? (
                            <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
                                {stats.pending_verification}
                            </span>
                        ) : null}
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Users className="w-5 h-5" />
                            <span className="text-sm">Total Users</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.total_users?.toLocaleString() || 0}</div>
                        <div className="text-xs text-gray-500">{stats.new_users_week || 0} this week</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-sm">Active</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.active_users?.toLocaleString() || 0}</div>
                        <div className="text-xs text-gray-500">{stats.active_today || 0} today</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Shield className="w-5 h-5" />
                            <span className="text-sm">Verified</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.verified_users?.toLocaleString() || 0}</div>
                        <div className="text-xs text-gray-500">{stats.pending_verification || 0} pending</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-yellow-600 mb-1">
                            <ShieldAlert className="w-5 h-5" />
                            <span className="text-sm">Suspended</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.suspended_users || 0}</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                            <ShieldX className="w-5 h-5" />
                            <span className="text-sm">Banned</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.banned_users || 0}</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <Flag className="w-5 h-5" />
                            <span className="text-sm">Flagged</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.flagged_users || 0}</div>
                        <div className="text-xs text-gray-500">{stats.warnings_this_week || 0} warnings/wk</div>
                    </div>
                </div>
            )}

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setFilters({ ...defaultUserFilters })}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${!filters.status && !filters.flaggedOnly && filters.verifiedOnly === null
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    All Users
                </button>
                <button
                    onClick={() => setFilters({ ...defaultUserFilters, status: 'active' })}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${filters.status === 'active'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    Active
                </button>
                <button
                    onClick={() => setFilters({ ...defaultUserFilters, status: 'suspended' })}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${filters.status === 'suspended'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    Suspended
                </button>
                <button
                    onClick={() => setFilters({ ...defaultUserFilters, status: 'banned' })}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${filters.status === 'banned'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    Banned
                </button>
                <button
                    onClick={() => setFilters({ ...defaultUserFilters, flaggedOnly: true })}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${filters.flaggedOnly
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    <Flag className="w-4 h-4 inline mr-1" />
                    Flagged
                </button>
                <button
                    onClick={() => setFilters({ ...defaultUserFilters, hasWarnings: true })}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${filters.hasWarnings === true
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    With Warnings
                </button>
                <button
                    onClick={() => setFilters({ ...defaultUserFilters, verifiedOnly: false })}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${filters.verifiedOnly === false
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    Unverified
                </button>
            </div>

            {/* Filters */}
            <UserFilters
                filters={filters}
                onChange={setFilters}
                onClear={handleClearFilters}
                isExpanded={filtersExpanded}
                onToggle={() => setFiltersExpanded(!filtersExpanded)}
            />

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-blue-800 dark:text-blue-200">
                        {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedUsers(new Set())}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            {/* Users List */}
            <div className="space-y-4">
                {/* List Header */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedUsers.size === users.length && users.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span>Select All</span>
                        </label>
                        <span>
                            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalUsers)} of {totalUsers}
                        </span>
                    </div>
                </div>

                {/* Users */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No users found</h3>
                        <p className="text-gray-500 mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {users.map(user => (
                            <UserCard
                                key={user.id}
                                user={user}
                                onAction={handleUserAction}
                                selected={selectedUsers.has(user.id)}
                                onSelect={(selected) => toggleSelectUser(user.id, selected)}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i;
                                } else if (page < 3) {
                                    pageNum = i;
                                } else if (page > totalPages - 4) {
                                    pageNum = totalPages - 5 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-10 h-10 rounded-lg transition-colors ${page === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {pageNum + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {actionModal && (
                <AccountActionModal
                    isOpen={actionModal.open}
                    onClose={() => setActionModal(null)}
                    onSubmit={handleActionSubmit}
                    actionType={actionModal.type}
                    userName={actionModal.userName}
                    userId={actionModal.userId}
                />
            )}
        </div>
    );
}
