import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import MessageFilters, {
    MessageFiltersType,
    DEFAULT_MESSAGE_FILTERS,
} from '../../components/admin/MessageFilters';
import { FlaggedMessageCard } from '../../components/admin/MessageCard';
import {
    MessageSquare,
    RefreshCw,
    Search,
    Flag,
    VolumeX,
    Bell,
    Users,
    Eye,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Clock,
    TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

interface ConversationSummary {
    id: string;
    ride_id: string | null;
    created_at: string;
    updated_at: string;
    members: Array<{
        user_id: string;
        full_name: string;
        avatar_url: string | null;
    }>;
    last_message: {
        body: string;
        sender_name: string;
        created_at: string;
    } | null;
    last_message_at: string | null;
    message_count: number;
    flag_count: number;
}

interface MessagingStats {
    total_conversations: number;
    total_messages: number;
    messages_today: number;
    active_conversations_today: number;
    pending_flags: number;
    flags_resolved_today: number;
    currently_muted: number;
    messages_deleted_today: number;
}

interface FlaggedMessage {
    id: string;
    message_id: string;
    flag_type: string;
    reason: string | null;
    status: string;
    created_at: string;
    flagged_by: { id: string; full_name: string };
    message: {
        body: string;
        sender_id: string;
        sender_name: string;
        conversation_id: string;
        created_at: string;
    };
    resolved_by?: { id: string; full_name: string } | null;
    resolved_at?: string | null;
    resolution_notes?: string | null;
}

type TabType = 'conversations' | 'flagged' | 'muted' | 'system';

export default function MessagesManagement() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    // State
    const [activeTab, setActiveTab] = useState<TabType>('conversations');
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
    const [stats, setStats] = useState<MessagingStats | null>(null);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(25);

    // Filters
    const [filters, setFilters] = useState<MessageFiltersType>(DEFAULT_MESSAGE_FILTERS);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        fetchData();
    }, [isAdmin, activeTab, currentPage, filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch stats
            const { data: statsData, error: statsError } = await supabase.rpc('admin_get_messaging_stats');
            if (statsError) throw statsError;
            setStats(statsData);

            if (activeTab === 'conversations') {
                await fetchConversations();
            } else if (activeTab === 'flagged') {
                await fetchFlaggedMessages();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load messaging data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchConversations = async () => {
        try {
            const { data, error } = await supabase.rpc('admin_get_conversations', {
                p_limit: pageSize,
                p_offset: (currentPage - 1) * pageSize,
                p_search: searchQuery || null,
                p_has_flags: filters.hasFlags === 'all' ? null : filters.hasFlags === 'yes',
            });

            if (error) throw error;
            setConversations(data || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            toast.error('Failed to load conversations');
        }
    };

    const fetchFlaggedMessages = async () => {
        try {
            const { data, error } = await supabase.rpc('admin_get_flagged_messages', {
                p_status: filters.flagStatus || 'pending',
                p_limit: pageSize,
                p_offset: (currentPage - 1) * pageSize,
            });

            if (error) throw error;
            setFlaggedMessages(data || []);
        } catch (error) {
            console.error('Error fetching flagged messages:', error);
            toast.error('Failed to load flagged messages');
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleResolveFlag = async (flagId: string, status: string, notes: string) => {
        try {
            const { error } = await supabase.rpc('admin_resolve_flag', {
                p_flag_id: flagId,
                p_status: status,
                p_resolution_notes: notes,
            });

            if (error) throw error;
            toast.success('Flag resolved');
            fetchData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to resolve flag');
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        const reason = prompt('Please provide a reason for deleting this message:');
        if (!reason) return;

        try {
            const { error } = await supabase.rpc('admin_delete_message', {
                p_message_id: messageId,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('Message deleted');
            fetchData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete message');
        }
    };

    const formatTime = (dateString: string | null) => {
        if (!dateString) return 'No messages';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const tabs = [
        { id: 'conversations' as TabType, label: 'All Conversations', icon: MessageSquare, count: stats?.total_conversations },
        { id: 'flagged' as TabType, label: 'Flagged Messages', icon: Flag, count: stats?.pending_flags, highlight: (stats?.pending_flags || 0) > 0 },
        { id: 'muted' as TabType, label: 'Muted Users', icon: VolumeX, count: stats?.currently_muted },
        { id: 'system' as TabType, label: 'System Messages', icon: Bell },
    ];

    if (!isAdmin) return null;

    return (
        <AdminLayout
            title="Messages Management"
            subtitle="Monitor and moderate platform communications"
            actions={
                <div className="flex items-center gap-2">
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
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Messages Today"
                    value={stats?.messages_today || 0}
                    icon={<MessageSquare className="w-5 h-5" />}
                    color="blue"
                />
                <StatCard
                    label="Active Conversations"
                    value={stats?.active_conversations_today || 0}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="green"
                />
                <StatCard
                    label="Pending Flags"
                    value={stats?.pending_flags || 0}
                    icon={<Flag className="w-5 h-5" />}
                    color="orange"
                    highlight={(stats?.pending_flags || 0) > 0}
                />
                <StatCard
                    label="Muted Users"
                    value={stats?.currently_muted || 0}
                    icon={<VolumeX className="w-5 h-5" />}
                    color="red"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setCurrentPage(1);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={`px-1.5 py-0.5 text-xs rounded-full ${tab.highlight
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            {activeTab === 'conversations' && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                            placeholder="Search by user name or email..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            )}

            {/* Filters */}
            {(activeTab === 'conversations' || activeTab === 'flagged') && (
                <MessageFilters
                    filters={filters}
                    onChange={(newFilters) => {
                        setFilters(newFilters);
                        setCurrentPage(1);
                    }}
                    onClear={() => {
                        setFilters(DEFAULT_MESSAGE_FILTERS);
                        setCurrentPage(1);
                    }}
                    isExpanded={filtersExpanded}
                    onToggle={() => setFiltersExpanded(!filtersExpanded)}
                    showFlagFilters={activeTab === 'flagged'}
                />
            )}

            {/* Content */}
            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Loading...</p>
                </div>
            ) : activeTab === 'conversations' ? (
                <ConversationsTable
                    conversations={conversations}
                    onViewConversation={(id) => navigate(`/admin/messages/${id}`)}
                    formatTime={formatTime}
                />
            ) : activeTab === 'flagged' ? (
                <FlaggedMessagesList
                    flags={flaggedMessages}
                    onResolve={handleResolveFlag}
                    onViewConversation={(id) => navigate(`/admin/messages/${id}`)}
                    onDeleteMessage={handleDeleteMessage}
                />
            ) : activeTab === 'muted' ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <VolumeX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Muted Users Management</p>
                    <p className="text-gray-400 text-sm mb-4">View and manage muted users</p>
                    <button
                        onClick={() => navigate('/admin/messages/muted')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        View Muted Users
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">System Messages</p>
                    <p className="text-gray-400 text-sm mb-4">Send announcements to users</p>
                    <button
                        onClick={() => navigate('/admin/messages/system')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Compose Message
                    </button>
                </div>
            )}

            {/* Pagination */}
            {(activeTab === 'conversations' || activeTab === 'flagged') && !loading && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                        Page {currentPage}
                    </p>
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
                            disabled={
                                activeTab === 'conversations'
                                    ? conversations.length < pageSize
                                    : flaggedMessages.length < pageSize
                            }
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
    highlight,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    highlight?: boolean;
}) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        orange: highlight ? 'bg-orange-200 text-orange-700' : 'bg-orange-100 text-orange-600',
        red: 'bg-red-100 text-red-600',
    };

    return (
        <div className={`rounded-xl border p-4 bg-white ${highlight ? 'ring-2 ring-orange-400' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </div>
    );
}

function ConversationsTable({
    conversations,
    onViewConversation,
    formatTime,
}: {
    conversations: ConversationSummary[];
    onViewConversation: (id: string) => void;
    formatTime: (date: string | null) => string;
}) {
    if (conversations.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No conversations found</p>
                <p className="text-gray-400 text-sm">Try adjusting your filters</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Participants
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Last Message
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Messages
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Flags
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Activity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {conversations.map((conv) => (
                        <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                            {/* Participants */}
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {conv.members.slice(0, 2).map((member, idx) => (
                                            <div key={member.user_id} className="relative" style={{ zIndex: 2 - idx }}>
                                                {member.avatar_url ? (
                                                    <img
                                                        src={member.avatar_url}
                                                        alt={member.full_name}
                                                        className="w-8 h-8 rounded-full border-2 border-white object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                                        <span className="text-xs font-medium text-gray-600">
                                                            {member.full_name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {conv.members.map((m) => m.full_name).join(' & ')}
                                        </p>
                                    </div>
                                </div>
                            </td>

                            {/* Last Message */}
                            <td className="px-4 py-4">
                                {conv.last_message ? (
                                    <div className="max-w-[200px]">
                                        <p className="text-sm text-gray-900 truncate">{conv.last_message.body}</p>
                                        <p className="text-xs text-gray-500">{conv.last_message.sender_name}</p>
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400">No messages</span>
                                )}
                            </td>

                            {/* Messages */}
                            <td className="px-4 py-4">
                                <span className="text-sm font-medium text-gray-900">{conv.message_count}</span>
                            </td>

                            {/* Flags */}
                            <td className="px-4 py-4">
                                {conv.flag_count > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                        <Flag className="w-3 h-3" />
                                        {conv.flag_count}
                                    </span>
                                ) : (
                                    <span className="text-sm text-gray-400">—</span>
                                )}
                            </td>

                            {/* Activity */}
                            <td className="px-4 py-4">
                                <span className="text-sm text-gray-500">{formatTime(conv.last_message_at)}</span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-4 text-right">
                                <button
                                    onClick={() => onViewConversation(conv.id)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Conversation"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function FlaggedMessagesList({
    flags,
    onResolve,
    onViewConversation,
    onDeleteMessage,
}: {
    flags: FlaggedMessage[];
    onResolve: (flagId: string, status: string, notes: string) => void;
    onViewConversation: (id: string) => void;
    onDeleteMessage: (messageId: string) => void;
}) {
    if (flags.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No flagged messages</p>
                <p className="text-gray-400 text-sm">All clear for now!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {flags.map((flag) => (
                <FlaggedMessageCard
                    key={flag.id}
                    flag={flag}
                    onResolve={onResolve}
                    onViewConversation={onViewConversation}
                    onDeleteMessage={onDeleteMessage}
                />
            ))}
        </div>
    );
}
