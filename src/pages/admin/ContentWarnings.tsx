import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    Search,
    RefreshCw,
    User,
    Clock,
    Info,
    AlertCircle,
    FileText,
    MessageSquare,
    Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface Warning {
    id: string;
    user_id: string;
    warning_type: 'first_warning' | 'second_warning' | 'final_warning';
    reason: string;
    related_content_type?: 'post' | 'comment' | null;
    related_content_id?: string | null;
    created_at: string;
    expires_at?: string | null;
    is_active: boolean;
    user: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string | null;
    };
    issued_by: {
        id: string;
        full_name: string;
    };
}

type WarningType = 'all' | 'first_warning' | 'second_warning' | 'final_warning';

export default function ContentWarnings() {
    const navigate = useNavigate();
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<WarningType>('all');
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'expired'>('active');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const pageSize = 20;

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        first: 0,
        second: 0,
        final: 0,
    });

    const fetchWarnings = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_all_warnings', {
                p_search: searchTerm || null,
                p_warning_type: filterType === 'all' ? null : filterType,
                p_active_only: filterActive === 'active',
                p_limit: pageSize,
                p_offset: (page - 1) * pageSize,
            });
            if (error) throw error;
            setWarnings(data || []);
            setHasMore((data || []).length === pageSize);

            // Calculate stats from data
            if (data) {
                const active = data.filter((w: Warning) => w.is_active);
                setStats({
                    total: data.length,
                    active: active.length,
                    first: data.filter((w: Warning) => w.warning_type === 'first_warning').length,
                    second: data.filter((w: Warning) => w.warning_type === 'second_warning').length,
                    final: data.filter((w: Warning) => w.warning_type === 'final_warning').length,
                });
            }
        } catch (err) {
            console.error('Failed to fetch warnings:', err);
            toast.error('Failed to load warnings');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterType, filterActive, page]);

    useEffect(() => {
        fetchWarnings();
    }, [fetchWarnings]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchWarnings();
        setRefreshing(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const warningTypeConfig: Record<
        string,
        { label: string; icon: any; bgColor: string; textColor: string }
    > = {
        first_warning: {
            label: 'First Warning',
            icon: Info,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
        },
        second_warning: {
            label: 'Second Warning',
            icon: AlertCircle,
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-700',
        },
        final_warning: {
            label: 'Final Warning',
            icon: AlertTriangle,
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
        },
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/admin/community')}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-orange-500" />
                                <h1 className="text-xl font-bold text-gray-900">Content Warnings</h1>
                            </div>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Active</p>
                        <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-yellow-200 p-4 bg-yellow-50">
                        <p className="text-sm text-yellow-600">First</p>
                        <p className="text-2xl font-bold text-yellow-700">{stats.first}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-orange-200 p-4 bg-orange-50">
                        <p className="text-sm text-orange-600">Second</p>
                        <p className="text-2xl font-bold text-orange-700">{stats.second}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-red-200 p-4 bg-red-50">
                        <p className="text-sm text-red-600">Final</p>
                        <p className="text-2xl font-bold text-red-700">{stats.final}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by user name or email..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Type Filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as WarningType)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Types</option>
                            <option value="first_warning">First Warning</option>
                            <option value="second_warning">Second Warning</option>
                            <option value="final_warning">Final Warning</option>
                        </select>

                        {/* Active Filter */}
                        <select
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'expired')}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="expired">Expired Only</option>
                        </select>
                    </div>
                </div>

                {/* Warnings List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                ) : warnings.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No warnings found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {warnings.map((warning) => {
                            const config = warningTypeConfig[warning.warning_type];
                            const Icon = config.icon;

                            return (
                                <div
                                    key={warning.id}
                                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${warning.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                                        }`}
                                >
                                    {/* Header */}
                                    <div className={`px-4 py-3 ${config.bgColor} flex items-center justify-between`}>
                                        <div className="flex items-center gap-2">
                                            <Icon className={`w-5 h-5 ${config.textColor}`} />
                                            <span className={`font-medium ${config.textColor}`}>{config.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!warning.is_active && (
                                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                                                    Expired
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500">{formatDate(warning.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 mb-4">
                                            {warning.user.avatar_url ? (
                                                <img
                                                    src={warning.user.avatar_url}
                                                    alt={warning.user.full_name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-gray-500" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900">{warning.user.full_name}</p>
                                                <p className="text-sm text-gray-500">{warning.user.email}</p>
                                            </div>
                                        </div>

                                        {/* Reason */}
                                        <div className="mb-4">
                                            <p className="text-sm font-medium text-gray-700 mb-1">Reason</p>
                                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                                {warning.reason}
                                            </p>
                                        </div>

                                        {/* Related Content */}
                                        {warning.related_content_type && warning.related_content_id && (
                                            <div className="mb-4">
                                                <p className="text-sm text-gray-500">
                                                    Related {warning.related_content_type}:{' '}
                                                    <button
                                                        onClick={() => {
                                                            if (warning.related_content_type === 'post') {
                                                                navigate(`/admin/community/${warning.related_content_id}`);
                                                            }
                                                        }}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        View {warning.related_content_type === 'post' ? (
                                                            <FileText className="w-3 h-3 inline ml-1" />
                                                        ) : (
                                                            <MessageSquare className="w-3 h-3 inline ml-1" />
                                                        )}
                                                    </button>
                                                </p>
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                                            <span>Issued by: {warning.issued_by.full_name}</span>
                                            {warning.expires_at && (
                                                <span>
                                                    {warning.is_active ? 'Expires' : 'Expired'}:{' '}
                                                    {formatDate(warning.expires_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {warnings.length > 0 && (
                    <div className="mt-6 flex items-center justify-between">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">Page {page}</span>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!hasMore}
                            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
