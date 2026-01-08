import { useState, useEffect } from 'react';
import {
    Bell,
    Send,
    Users,
    Eye,
    Trash2,
    RefreshCw,
    Filter,
    CheckCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Mail,
    BarChart3,
} from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import NotificationFilters, {
    NotificationFiltersType,
    DEFAULT_NOTIFICATION_FILTERS,
} from '../../components/admin/NotificationFilters';
import NotificationCard from '../../components/admin/NotificationCard';
import SendNotificationModal, {
    BulkNotificationModal,
} from '../../components/admin/SendNotificationModal';

interface NotificationStats {
    total: number;
    sent_today: number;
    read_count: number;
    unread_count: number;
    by_type: Record<string, number>;
}

interface Notification {
    id: string;
    user_id: string;
    title: string;
    body: string;
    type: string;
    priority: string;
    is_read: boolean;
    read_at?: string;
    link?: string;
    expires_at?: string;
    is_system: boolean;
    created_at: string;
    profiles?: {
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

export default function NotificationsManagement() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<NotificationFiltersType>(DEFAULT_NOTIFICATION_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showSendModal, setShowSendModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'bulk'>('all');

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([loadStats(), loadNotifications()]);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const { data, error } = await supabase.rpc('admin_get_notification_stats');
            if (error) throw error;
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const loadNotifications = async () => {
        try {
            let query = supabase
                .from('notifications')
                .select(
                    `
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `
                )
                .order('created_at', { ascending: false })
                .limit(100);

            // Apply filters
            if (filters.search) {
                query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%`);
            }
            if (filters.type !== 'all') {
                query = query.eq('type', filters.type);
            }
            if (filters.status === 'read') {
                query = query.eq('is_read', true);
            } else if (filters.status === 'unread') {
                query = query.eq('is_read', false);
            }
            if (filters.priority !== 'all') {
                query = query.eq('priority', filters.priority);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo + 'T23:59:59');
            }

            const { data, error } = await query;
            if (error) throw error;
            setNotifications(data || []);
        } catch (err) {
            console.error('Failed to load notifications:', err);
            toast.error('Failed to load notifications');
        }
    };

    const handleSendNotification = async (data: any) => {
        try {
            const { error } = await supabase.rpc('admin_send_notification', {
                p_user_id: data.user_id,
                p_title: data.title,
                p_body: data.body,
                p_type: data.type,
                p_priority: data.priority,
                p_link: data.link,
                p_expires_at: data.expires_at,
            });

            if (error) throw error;
            toast.success('Notification sent successfully');
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to send notification');
        }
    };

    const handleBulkSend = async (data: any) => {
        try {
            const { data: result, error } = await supabase.rpc('admin_send_bulk_notification', {
                p_title: data.title,
                p_body: data.body,
                p_type: data.type,
                p_priority: data.priority,
                p_target_audience: data.target_audience,
                p_link: data.link,
            });

            if (error) throw error;
            toast.success(`Sent notifications to ${result?.sent_count || 0} users`);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to send bulk notification');
        }
    };

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteNotification = async (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDeleteNotification = async () => {
        if (!deleteConfirmId) return;
        setDeleting(true);
        try {
            const { error } = await supabase.rpc('admin_delete_notification', {
                p_notification_id: deleteConfirmId,
            });

            if (error) throw error;
            toast.success('Notification deleted');
            setNotifications(notifications.filter((n) => n.id !== deleteConfirmId));
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete notification');
        } finally {
            setDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setBulkDeleteConfirm(true);
    };

    const confirmBulkDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase.rpc('admin_bulk_delete_notifications', {
                p_notification_ids: Array.from(selectedIds),
            });

            if (error) throw error;
            toast.success(`Deleted ${selectedIds.size} notifications`);
            setSelectedIds(new Set());
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete notifications');
        } finally {
            setDeleting(false);
            setBulkDeleteConfirm(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === notifications.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(notifications.map((n) => n.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const readRate =
        stats && stats.total > 0
            ? Math.round((stats.read_count / stats.total) * 100)
            : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-600 mt-1">Manage and send notifications to users</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <Users className="w-4 h-4" />
                        Bulk Send
                    </button>
                    <button
                        onClick={() => setShowSendModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        Send Notification
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Sent</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {stats?.total?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Sent Today</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {stats?.sent_today?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Read Rate</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{readRate}%</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Unread</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {stats?.unread_count?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Type Distribution */}
            {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-medium text-gray-900 mb-3">By Type</h3>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(stats.by_type).map(([type, count]) => (
                            <div
                                key={type}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg"
                            >
                                <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                    {count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        All Notifications
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bulk'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Bulk History
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${showFilters
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            {showFilters && (
                <NotificationFilters
                    filters={filters}
                    onChange={setFilters}
                    onClear={() => setFilters(DEFAULT_NOTIFICATION_FILTERS)}
                    isExpanded={showFilters}
                    onToggle={() => setShowFilters(!showFilters)}
                />
            )}

            {/* Notifications List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* List Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
                    <input
                        type="checkbox"
                        checked={selectedIds.size === notifications.length && notifications.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-600">
                        {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* List Content */}
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-gray-500 mt-3">Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No notifications found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <div key={notification.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(notification.id)}
                                    onChange={() => toggleSelect(notification.id)}
                                    className="w-4 h-4 text-blue-600 rounded mt-1"
                                />
                                <div className="flex-1">
                                    <NotificationCard
                                        notification={{
                                            ...notification,
                                            recipient: notification.profiles ? {
                                                id: notification.user_id,
                                                full_name: notification.profiles.full_name,
                                                email: notification.profiles.email,
                                                avatar_url: notification.profiles.avatar_url,
                                            } : {
                                                id: notification.user_id,
                                                full_name: 'Unknown User',
                                                email: '',
                                            }
                                        }}
                                        onView={() => {
                                            /* View details */
                                        }}
                                        onDelete={() => handleDeleteNotification(notification.id)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <SendNotificationModal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                onSend={handleSendNotification}
            />
            <BulkNotificationModal
                isOpen={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                onSend={handleBulkSend}
            />

            {/* Delete Notification Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={confirmDeleteNotification}
                title="Delete Notification"
                message="Are you sure you want to delete this notification?"
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                loading={deleting}
            />

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={bulkDeleteConfirm}
                onClose={() => setBulkDeleteConfirm(false)}
                onConfirm={confirmBulkDelete}
                title="Delete Selected Notifications"
                message={`Are you sure you want to delete ${selectedIds.size} selected notifications?`}
                confirmText="Delete All"
                cancelText="Cancel"
                variant="danger"
                loading={deleting}
            />
        </div>
    );
}
