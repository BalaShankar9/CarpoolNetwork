import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { UnmuteModal } from '../../components/admin/UserMuteModal';
import {
    ArrowLeft,
    RefreshCw,
    VolumeX,
    Volume2,
    Search,
    Clock,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    User,
    Calendar,
    FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface MutedUser {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    muted_at: string;
    mute_expires_at: string | null;
    mute_reason: string | null;
    muted_by_name: string;
}

export default function MutedUsersManagement() {
    const navigate = useNavigate();

    // State
    const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(25);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [unmuteModal, setUnmuteModal] = useState<{ user: MutedUser } | null>(null);

    useEffect(() => {
        fetchMutedUsers();
    }, [currentPage]);

    const fetchMutedUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_muted_users', {
                p_limit: pageSize,
                p_offset: (currentPage - 1) * pageSize,
            });

            if (error) throw error;

            // Filter by search query if provided
            let filteredData = data || [];
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filteredData = filteredData.filter(
                    (user: MutedUser) =>
                        user.full_name.toLowerCase().includes(query) ||
                        user.email.toLowerCase().includes(query)
                );
            }

            setMutedUsers(filteredData);
        } catch (error) {
            console.error('Error fetching muted users:', error);
            toast.error('Failed to load muted users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMutedUsers();
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchMutedUsers();
    };

    const handleUnmuteUser = async (userId: string, reason: string) => {
        try {
            const { error } = await supabase.rpc('admin_unmute_user', {
                p_user_id: userId,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('User unmuted successfully');
            setUnmuteModal(null);
            fetchMutedUsers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to unmute user');
            throw error;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Permanent';
        return new Date(dateString).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimeRemaining = (expiresAt: string | null) => {
        if (!expiresAt) return { text: 'Permanent', color: 'red' };

        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) return { text: 'Expired', color: 'gray' };

        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(hours / 24);

        if (days > 0) return { text: `${days}d ${hours % 24}h remaining`, color: 'orange' };
        if (hours > 0) return { text: `${hours}h remaining`, color: 'yellow' };
        return { text: 'Less than 1 hour', color: 'green' };
    };

    return (
        <AdminLayout
            title="Muted Users"
            subtitle="Manage users who are restricted from messaging"
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/admin/messages')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            }
        >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <VolumeX className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{mutedUsers.length}</p>
                            <p className="text-sm text-gray-500">Currently Muted</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {mutedUsers.filter((u) => u.mute_expires_at !== null).length}
                            </p>
                            <p className="text-sm text-gray-500">Temporary Mutes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {mutedUsers.filter((u) => u.mute_expires_at === null).length}
                            </p>
                            <p className="text-sm text-gray-500">Permanent Mutes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search by user name or email..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Muted Users List */}
            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Loading...</p>
                </div>
            ) : mutedUsers.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Volume2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No muted users</p>
                    <p className="text-gray-400 text-sm">All users can currently send messages</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    User
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Reason
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Muted By
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Duration
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {mutedUsers.map((user) => {
                                const timeRemaining = getTimeRemaining(user.mute_expires_at);
                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        {/* User */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={user.full_name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <User className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">{user.full_name}</p>
                                                    <p className="text-sm text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Reason */}
                                        <td className="px-4 py-4">
                                            {user.mute_reason ? (
                                                <div className="max-w-[200px]">
                                                    <p className="text-sm text-gray-700 truncate" title={user.mute_reason}>
                                                        {user.mute_reason}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">No reason provided</span>
                                            )}
                                        </td>

                                        {/* Muted By */}
                                        <td className="px-4 py-4">
                                            <div>
                                                <p className="text-sm text-gray-900">{user.muted_by_name}</p>
                                                <p className="text-xs text-gray-500">{formatDate(user.muted_at)}</p>
                                            </div>
                                        </td>

                                        {/* Duration */}
                                        <td className="px-4 py-4">
                                            <div>
                                                {user.mute_expires_at ? (
                                                    <>
                                                        <p className="text-sm text-gray-900">
                                                            Until {formatDate(user.mute_expires_at)}
                                                        </p>
                                                        <span
                                                            className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${timeRemaining.color === 'red'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : timeRemaining.color === 'orange'
                                                                        ? 'bg-orange-100 text-orange-700'
                                                                        : timeRemaining.color === 'yellow'
                                                                            ? 'bg-yellow-100 text-yellow-700'
                                                                            : 'bg-green-100 text-green-700'
                                                                }`}
                                                        >
                                                            {timeRemaining.text}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Permanent
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/admin/users/${user.user_id}`)}
                                                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                >
                                                    View Profile
                                                </button>
                                                <button
                                                    onClick={() => setUnmuteModal({ user })}
                                                    className="px-3 py-1.5 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                                                >
                                                    Unmute
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && mutedUsers.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">Page {currentPage}</p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setCurrentPage((p) => p + 1)}
                            disabled={mutedUsers.length < pageSize}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Unmute Modal */}
            {unmuteModal && (
                <UnmuteModal
                    user={{
                        id: unmuteModal.user.user_id,
                        full_name: unmuteModal.user.full_name,
                        email: unmuteModal.user.email,
                        avatar_url: unmuteModal.user.avatar_url,
                        mute_reason: unmuteModal.user.mute_reason,
                        muted_at: unmuteModal.user.muted_at,
                        mute_expires_at: unmuteModal.user.mute_expires_at,
                    }}
                    onUnmute={handleUnmuteUser}
                    onClose={() => setUnmuteModal(null)}
                />
            )}
        </AdminLayout>
    );
}
