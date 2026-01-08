import { useState } from 'react';
import {
    Flag,
    Trash2,
    MoreVertical,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    User,
} from 'lucide-react';

interface MessageCardProps {
    message: {
        id: string;
        body: string;
        sender_id: string;
        sender_name: string;
        sender_avatar?: string | null;
        created_at: string;
        deleted_at?: string | null;
        is_flagged?: boolean;
        type?: string;
    };
    onFlag?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
    onViewSender?: (userId: string) => void;
    showActions?: boolean;
    isHighlighted?: boolean;
}

export default function MessageCard({
    message,
    onFlag,
    onDelete,
    onViewSender,
    showActions = true,
    isHighlighted = false,
}: MessageCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isDeleted = !!message.deleted_at;
    const isSystem = message.type === 'SYSTEM';

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } else if (days < 7) {
            return date.toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' +
                date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
            date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            className={`group relative p-3 rounded-lg transition-colors ${isHighlighted
                    ? 'bg-yellow-50 border border-yellow-200'
                    : isDeleted
                        ? 'bg-gray-50 opacity-60'
                        : 'hover:bg-gray-50'
                } ${isSystem ? 'bg-blue-50 border border-blue-100' : ''}`}
        >
            <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {isSystem ? (
                        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                    ) : message.sender_avatar ? (
                        <img
                            src={message.sender_avatar}
                            alt={message.sender_name}
                            className="w-9 h-9 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className={`font-medium text-sm ${isSystem ? 'text-blue-700' : 'text-gray-900'
                                } ${onViewSender && !isSystem ? 'hover:underline cursor-pointer' : ''}`}
                            onClick={() => !isSystem && onViewSender?.(message.sender_id)}
                        >
                            {isSystem ? 'System' : message.sender_name}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(message.created_at)}
                        </span>
                        {message.is_flagged && (
                            <span className="text-xs text-orange-600 flex items-center gap-0.5">
                                <Flag className="w-3 h-3" />
                                Flagged
                            </span>
                        )}
                        {isDeleted && (
                            <span className="text-xs text-red-500 flex items-center gap-0.5">
                                <Trash2 className="w-3 h-3" />
                                Deleted
                            </span>
                        )}
                    </div>
                    <p
                        className={`text-sm ${isDeleted
                                ? 'text-gray-400 italic'
                                : isSystem
                                    ? 'text-blue-800'
                                    : 'text-gray-700'
                            }`}
                    >
                        {message.body}
                    </p>
                </div>

                {/* Actions */}
                {showActions && !isDeleted && !isSystem && (
                    <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setMenuOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                    {onFlag && !message.is_flagged && (
                                        <button
                                            onClick={() => {
                                                onFlag(message.id);
                                                setMenuOpen(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                        >
                                            <Flag className="w-4 h-4" />
                                            Flag Message
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => {
                                                onDelete(message.id);
                                                setMenuOpen(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Message
                                        </button>
                                    )}
                                    {onViewSender && (
                                        <button
                                            onClick={() => {
                                                onViewSender(message.sender_id);
                                                setMenuOpen(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <User className="w-4 h-4" />
                                            View Sender
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Flagged message card with resolution options
interface FlaggedMessageCardProps {
    flag: {
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
    };
    onResolve: (flagId: string, status: string, notes: string) => void;
    onViewConversation: (conversationId: string) => void;
    onDeleteMessage: (messageId: string) => void;
}

export function FlaggedMessageCard({
    flag,
    onResolve,
    onViewConversation,
    onDeleteMessage,
}: FlaggedMessageCardProps) {
    const [showResolveForm, setShowResolveForm] = useState(false);
    const [resolution, setResolution] = useState<'dismissed' | 'actioned'>('dismissed');
    const [notes, setNotes] = useState('');

    const getFlagTypeBadge = (type: string) => {
        const badges: Record<string, { bg: string; text: string }> = {
            spam: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
            harassment: { bg: 'bg-red-100', text: 'text-red-800' },
            inappropriate: { bg: 'bg-orange-100', text: 'text-orange-800' },
            scam: { bg: 'bg-purple-100', text: 'text-purple-800' },
            other: { bg: 'bg-gray-100', text: 'text-gray-800' },
        };
        const badge = badges[type] || badges.other;
        return (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                {type}
            </span>
        );
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            pending: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <Clock className="w-3 h-3" /> },
            reviewed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <CheckCircle className="w-3 h-3" /> },
            dismissed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="w-3 h-3" /> },
            actioned: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {status}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleResolve = () => {
        onResolve(flag.id, resolution, notes);
        setShowResolveForm(false);
        setNotes('');
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {getFlagTypeBadge(flag.flag_type)}
                    {getStatusBadge(flag.status)}
                </div>
                <span className="text-xs text-gray-500">{formatDate(flag.created_at)}</span>
            </div>

            {/* Message Content */}
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{flag.message.sender_name}</span>
                    <span className="text-xs text-gray-400">{formatDate(flag.message.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700">{flag.message.body}</p>
            </div>

            {/* Flag Details */}
            <div className="text-sm text-gray-600 mb-3">
                <p>
                    <span className="text-gray-500">Flagged by:</span>{' '}
                    <span className="font-medium">{flag.flagged_by.full_name}</span>
                </p>
                {flag.reason && (
                    <p className="mt-1">
                        <span className="text-gray-500">Reason:</span> {flag.reason}
                    </p>
                )}
            </div>

            {/* Resolution Info (if resolved) */}
            {flag.status !== 'pending' && flag.resolved_by && (
                <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded-lg mb-3">
                    <p>
                        <span className="text-gray-500">Resolved by:</span>{' '}
                        <span className="font-medium">{flag.resolved_by.full_name}</span>
                        {flag.resolved_at && (
                            <span className="text-gray-400 ml-2">on {formatDate(flag.resolved_at)}</span>
                        )}
                    </p>
                    {flag.resolution_notes && (
                        <p className="mt-1">
                            <span className="text-gray-500">Notes:</span> {flag.resolution_notes}
                        </p>
                    )}
                </div>
            )}

            {/* Actions */}
            {flag.status === 'pending' && (
                <>
                    {showResolveForm ? (
                        <div className="border-t border-gray-200 pt-3 mt-3">
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setResolution('dismissed')}
                                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${resolution === 'dismissed'
                                                ? 'bg-gray-100 border-gray-300 text-gray-800'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        Dismiss Flag
                                    </button>
                                    <button
                                        onClick={() => setResolution('actioned')}
                                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${resolution === 'actioned'
                                                ? 'bg-green-100 border-green-300 text-green-800'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        Take Action
                                    </button>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Resolution notes..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowResolveForm(false)}
                                    className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResolve}
                                    className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Resolve
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 border-t border-gray-200 pt-3 mt-3">
                            <button
                                onClick={() => onViewConversation(flag.message.conversation_id)}
                                className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                View Conversation
                            </button>
                            <button
                                onClick={() => onDeleteMessage(flag.message_id)}
                                className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                Delete Message
                            </button>
                            <button
                                onClick={() => setShowResolveForm(true)}
                                className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Resolve
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
