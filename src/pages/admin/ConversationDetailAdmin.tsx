import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import MessageCard from '../../components/admin/MessageCard';
import UserMuteModal, { UnmuteModal } from '../../components/admin/UserMuteModal';
import {
    ArrowLeft,
    RefreshCw,
    Users,
    MessageSquare,
    Flag,
    Car,
    Calendar,
    VolumeX,
    Clock,
    Send,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

interface ConversationMember {
    user_id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    joined_at: string;
    is_muted: boolean;
    mute_expires_at: string | null;
}

interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    sender_avatar: string | null;
    body: string;
    is_system: boolean;
    deleted_at: string | null;
    created_at: string;
}

interface RideInfo {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    driver_name: string;
}

interface ConversationDetail {
    id: string;
    created_at: string;
    ride_id: string | null;
    members: ConversationMember[];
    messages: Message[];
    ride: RideInfo | null;
}

export default function ConversationDetailAdmin() {
    const { id } = useParams<{ id: string }>();
    const { isAdmin, user } = useAuth();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // State
    const [conversation, setConversation] = useState<ConversationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sending, setSending] = useState(false);

    // Modals
    const [muteModal, setMuteModal] = useState<{ user: ConversationMember } | null>(null);
    const [unmuteModal, setUnmuteModal] = useState<{ user: ConversationMember } | null>(null);

    // Admin message
    const [adminMessage, setAdminMessage] = useState('');

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        if (id) {
            fetchConversation();
        }
    }, [id, isAdmin]);

    useEffect(() => {
        // Scroll to bottom on new messages
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.messages]);

    const fetchConversation = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_view_conversation', {
                p_conversation_id: id,
            });

            if (error) throw error;
            setConversation(data);
        } catch (error) {
            console.error('Error fetching conversation:', error);
            toast.error('Failed to load conversation');
            navigate('/admin/messages');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchConversation();
    };

    const handleFlagMessage = async (messageId: string, flagType: string, reason: string) => {
        try {
            const { error } = await supabase.rpc('admin_flag_message', {
                p_message_id: messageId,
                p_flag_type: flagType,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('Message flagged');
            fetchConversation();
        } catch (error: any) {
            toast.error(error.message || 'Failed to flag message');
        }
    };

    const handleDeleteMessage = async (messageId: string, reason: string) => {
        try {
            const { error } = await supabase.rpc('admin_delete_message', {
                p_message_id: messageId,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('Message deleted');
            fetchConversation();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete message');
        }
    };

    const handleMuteUser = async (userId: string, duration: string | null, reason: string) => {
        try {
            const { error } = await supabase.rpc('admin_mute_user', {
                p_user_id: userId,
                p_duration: duration,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('User muted');
            setMuteModal(null);
            fetchConversation();
        } catch (error: any) {
            toast.error(error.message || 'Failed to mute user');
            throw error;
        }
    };

    const handleUnmuteUser = async (userId: string, reason: string) => {
        try {
            const { error } = await supabase.rpc('admin_unmute_user', {
                p_user_id: userId,
                p_reason: reason,
            });

            if (error) throw error;
            toast.success('User unmuted');
            setUnmuteModal(null);
            fetchConversation();
        } catch (error: any) {
            toast.error(error.message || 'Failed to unmute user');
            throw error;
        }
    };

    const handleSendAdminMessage = async () => {
        if (!adminMessage.trim() || !id) return;

        setSending(true);
        try {
            // Insert a system message as admin
            const { error } = await supabase.from('chat_messages').insert({
                conversation_id: id,
                sender_id: user?.id,
                body: `[Admin Notice] ${adminMessage.trim()}`,
                is_system: true,
            });

            if (error) throw error;
            toast.success('Admin message sent');
            setAdminMessage('');
            fetchConversation();
        } catch (error: any) {
            toast.error(error.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
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

    if (!isAdmin) return null;

    return (
        <AdminLayout
            title="Conversation Detail"
            subtitle={conversation ? `${conversation.members.length} participants` : 'Loading...'}
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
            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Loading conversation...</p>
                </div>
            ) : conversation ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Messages Column */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Ride Info Card */}
                        {conversation.ride && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Car className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium text-blue-900">Related Ride</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">From</p>
                                        <p className="font-medium text-gray-900">{conversation.ride.origin}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">To</p>
                                        <p className="font-medium text-gray-900">{conversation.ride.destination}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Departure</p>
                                        <p className="font-medium text-gray-900">{formatDate(conversation.ride.departure_time)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Driver</p>
                                        <p className="font-medium text-gray-900">{conversation.ride.driver_name}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-900">
                                        Messages ({conversation.messages.length})
                                    </span>
                                </div>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                                {conversation.messages.length === 0 ? (
                                    <div className="text-center py-8">
                                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500">No messages yet</p>
                                    </div>
                                ) : (
                                    conversation.messages.map((message) => (
                                        <MessageCard
                                            key={message.id}
                                            message={{
                                                id: message.id,
                                                body: message.body,
                                                sender_id: message.sender_id,
                                                sender_name: message.sender_name,
                                                sender_avatar: message.sender_avatar,
                                                type: message.is_system ? 'SYSTEM' : undefined,
                                                deleted_at: message.deleted_at,
                                                created_at: message.created_at,
                                            }}
                                            onFlag={(messageId) => {
                                                const reason = prompt('Enter reason for flagging this message:');
                                                if (reason) handleFlagMessage(messageId, 'inappropriate', reason);
                                            }}
                                            onDelete={(messageId) => {
                                                const reason = prompt('Enter reason for deleting this message:');
                                                if (reason) handleDeleteMessage(messageId, reason);
                                            }}
                                        />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Admin Message Input */}
                            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={adminMessage}
                                        onChange={(e) => setAdminMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendAdminMessage()}
                                        placeholder="Send admin notice to this conversation..."
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleSendAdminMessage}
                                        disabled={!adminMessage.trim() || sending}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    This will appear as a system message visible to all participants
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Conversation Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-gray-900">Conversation Info</span>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-gray-500">Created</p>
                                    <p className="font-medium">{formatDate(conversation.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">ID</p>
                                    <p className="font-mono text-xs text-gray-600 break-all">{conversation.id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                    Participants ({conversation.members.length})
                                </span>
                            </div>
                            <div className="space-y-3">
                                {conversation.members.map((member) => (
                                    <div
                                        key={member.user_id}
                                        className={`p-3 rounded-lg border ${member.is_muted ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {member.avatar_url ? (
                                                <img
                                                    src={member.avatar_url}
                                                    alt={member.full_name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <span className="text-gray-600 font-medium">
                                                        {member.full_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{member.full_name}</p>
                                                <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                            </div>
                                        </div>

                                        {/* Mute Status */}
                                        {member.is_muted && (
                                            <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                                                <VolumeX className="w-3 h-3" />
                                                <span>
                                                    Muted
                                                    {member.mute_expires_at && (
                                                        <> until {formatDate(member.mute_expires_at)}</>
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/users/${member.user_id}`)}
                                                className="text-xs text-blue-600 hover:text-blue-700"
                                            >
                                                View Profile
                                            </button>
                                            {member.is_muted ? (
                                                <button
                                                    onClick={() => setUnmuteModal({ user: member })}
                                                    className="text-xs text-green-600 hover:text-green-700"
                                                >
                                                    Unmute
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setMuteModal({ user: member })}
                                                    className="text-xs text-red-600 hover:text-red-700"
                                                >
                                                    Mute User
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Flag className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-gray-900">Quick Stats</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <p className="text-xl font-bold text-gray-900">{conversation.messages.length}</p>
                                    <p className="text-xs text-gray-500">Messages</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <p className="text-xl font-bold text-gray-900">{conversation.members.length}</p>
                                    <p className="text-xs text-gray-500">Participants</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Conversation not found</p>
                    <p className="text-gray-400 text-sm mb-4">This conversation may have been deleted</p>
                    <button
                        onClick={() => navigate('/admin/messages')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Back to Messages
                    </button>
                </div>
            )}

            {/* Modals */}
            {muteModal && (
                <UserMuteModal
                    user={{
                        id: muteModal.user.user_id,
                        full_name: muteModal.user.full_name,
                        email: muteModal.user.email,
                        avatar_url: muteModal.user.avatar_url,
                    }}
                    onMute={handleMuteUser}
                    onClose={() => setMuteModal(null)}
                />
            )}

            {unmuteModal && (
                <UnmuteModal
                    user={{
                        id: unmuteModal.user.user_id,
                        full_name: unmuteModal.user.full_name,
                        email: unmuteModal.user.email,
                        avatar_url: unmuteModal.user.avatar_url,
                        mute_reason: null,
                        muted_at: null,
                        mute_expires_at: unmuteModal.user.mute_expires_at,
                    }}
                    onUnmute={handleUnmuteUser}
                    onClose={() => setUnmuteModal(null)}
                />
            )}
        </AdminLayout>
    );
}
