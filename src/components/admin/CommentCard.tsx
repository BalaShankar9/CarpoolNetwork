import { useState } from 'react';
import {
    Flag,
    Trash2,
    EyeOff,
    Eye,
    MoreVertical,
    User,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';

interface CommentAuthor {
    id: string;
    full_name: string;
    avatar_url?: string | null;
}

interface CommentCardProps {
    comment: {
        id: string;
        body: string;
        hidden_at?: string | null;
        hide_reason?: string | null;
        created_at: string;
        author: CommentAuthor;
        flag_count?: number;
        post_id: string;
        post_title?: string;
    };
    onHide?: (commentId: string) => void;
    onUnhide?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onViewPost?: (postId: string) => void;
    showPostInfo?: boolean;
}

export default function CommentCard({
    comment,
    onHide,
    onUnhide,
    onDelete,
    onViewPost,
    showPostInfo = false,
}: CommentCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isHidden = !!comment.hidden_at;

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days < 7) {
            return `${days}d ago`;
        }
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    return (
        <div
            className={`relative bg-white rounded-lg border p-4 transition-all ${isHidden
                    ? 'border-red-200 bg-red-50 opacity-75'
                    : comment.flag_count && comment.flag_count > 0
                        ? 'border-orange-200'
                        : 'border-gray-200 hover:border-gray-300'
                }`}
        >
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mb-2">
                {isHidden && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        <EyeOff className="w-3 h-3" />
                        Hidden
                    </span>
                )}
                {comment.flag_count && comment.flag_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        <Flag className="w-3 h-3" />
                        {comment.flag_count} flag{comment.flag_count > 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Post Info (if showing) */}
            {showPostInfo && comment.post_title && (
                <div className="mb-2">
                    <p className="text-xs text-gray-400">
                        On post:{' '}
                        <button
                            onClick={() => onViewPost?.(comment.post_id)}
                            className="font-medium text-blue-600 hover:underline"
                        >
                            {comment.post_title}
                        </button>
                    </p>
                </div>
            )}

            {/* Comment Body */}
            <p className="text-sm text-gray-800 mb-3">{comment.body}</p>

            {/* Hide Reason */}
            {isHidden && comment.hide_reason && (
                <div className="mb-3 p-2 bg-red-100 rounded-lg">
                    <p className="text-xs text-red-700">
                        <span className="font-medium">Reason:</span> {comment.hide_reason}
                    </p>
                </div>
            )}

            {/* Author & Time */}
            <div className="flex items-center gap-2">
                {comment.author.avatar_url ? (
                    <img
                        src={comment.author.avatar_url}
                        alt={comment.author.full_name}
                        className="w-5 h-5 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-500" />
                    </div>
                )}
                <span className="text-sm text-gray-600">{comment.author.full_name}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{formatTime(comment.created_at)}</span>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-3 right-3">
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                {showPostInfo && onViewPost && (
                                    <button
                                        onClick={() => {
                                            onViewPost(comment.post_id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View Post
                                    </button>
                                )}
                                {!isHidden && onHide && (
                                    <button
                                        onClick={() => {
                                            onHide(comment.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                    >
                                        <EyeOff className="w-4 h-4" />
                                        Hide Comment
                                    </button>
                                )}
                                {isHidden && onUnhide && (
                                    <button
                                        onClick={() => {
                                            onUnhide(comment.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Unhide Comment
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onDelete(comment.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Comment
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Flagged Comment Card for moderation queue
interface FlaggedCommentCardProps {
    flag: {
        id: string;
        comment_id: string;
        flag_type: string;
        reason?: string | null;
        status: string;
        created_at: string;
        flagged_by: { id: string; full_name: string };
        comment: {
            id: string;
            body: string;
            post_id: string;
            post_title: string;
            author: { id: string; full_name: string };
        };
        resolved_by?: { id: string; full_name: string } | null;
        resolved_at?: string | null;
        resolution_notes?: string | null;
    };
    onResolve: (flagId: string, status: string, notes: string) => void;
    onViewPost: (postId: string) => void;
    onHideComment: (commentId: string) => void;
    onDeleteComment: (commentId: string) => void;
}

export function FlaggedCommentCard({
    flag,
    onResolve,
    onViewPost,
    onHideComment,
    onDeleteComment,
}: FlaggedCommentCardProps) {
    const [showResolve, setShowResolve] = useState(false);
    const [resolveStatus, setResolveStatus] = useState('dismissed');
    const [resolveNotes, setResolveNotes] = useState('');

    const flagTypeColors: Record<string, string> = {
        spam: 'bg-gray-100 text-gray-700',
        harassment: 'bg-red-100 text-red-700',
        inappropriate: 'bg-orange-100 text-orange-700',
        misinformation: 'bg-yellow-100 text-yellow-700',
        off_topic: 'bg-blue-100 text-blue-700',
        other: 'bg-gray-100 text-gray-600',
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-orange-100 text-orange-700',
        reviewed: 'bg-blue-100 text-blue-700',
        dismissed: 'bg-gray-100 text-gray-700',
        actioned: 'bg-green-100 text-green-700',
    };

    const handleResolve = () => {
        onResolve(flag.id, resolveStatus, resolveNotes);
        setShowResolve(false);
        setResolveNotes('');
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-orange-500" />
                    <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${flagTypeColors[flag.flag_type] || flagTypeColors.other}`}
                    >
                        {flag.flag_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[flag.status]}`}>
                        {flag.status}
                    </span>
                </div>
                <span className="text-xs text-gray-500">{formatTime(flag.created_at)}</span>
            </div>

            {/* Comment Preview */}
            <div className="p-4">
                <p className="text-xs text-gray-400 mb-2">
                    On post:{' '}
                    <button
                        onClick={() => onViewPost(flag.comment.post_id)}
                        className="font-medium text-blue-600 hover:underline"
                    >
                        {flag.comment.post_title}
                    </button>
                </p>
                <p className="text-sm text-gray-800 mb-2">{flag.comment.body}</p>
                <p className="text-xs text-gray-400">
                    By <span className="font-medium">{flag.comment.author.full_name}</span>
                </p>
            </div>

            {/* Flag Details */}
            <div className="px-4 py-3 bg-orange-50 border-t border-orange-100">
                <p className="text-sm text-orange-800">
                    <span className="font-medium">Reported by:</span> {flag.flagged_by.full_name}
                </p>
                {flag.reason && (
                    <p className="text-sm text-orange-700 mt-1">
                        <span className="font-medium">Reason:</span> {flag.reason}
                    </p>
                )}
            </div>

            {/* Resolution Info (if resolved) */}
            {flag.resolved_at && (
                <div className="px-4 py-3 bg-green-50 border-t border-green-100">
                    <p className="text-sm text-green-800">
                        <span className="font-medium">Resolved by:</span> {flag.resolved_by?.full_name} on{' '}
                        {formatTime(flag.resolved_at)}
                    </p>
                    {flag.resolution_notes && (
                        <p className="text-sm text-green-700 mt-1">
                            <span className="font-medium">Notes:</span> {flag.resolution_notes}
                        </p>
                    )}
                </div>
            )}

            {/* Actions */}
            {flag.status === 'pending' && (
                <div className="px-4 py-3 border-t border-gray-200">
                    {!showResolve ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onViewPost(flag.comment.post_id)}
                                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                View Post
                            </button>
                            <button
                                onClick={() => setShowResolve(true)}
                                className="px-3 py-1.5 text-sm text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                Resolve Flag
                            </button>
                            <button
                                onClick={() => onHideComment(flag.comment_id)}
                                className="px-3 py-1.5 text-sm text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                            >
                                Hide Comment
                            </button>
                            <button
                                onClick={() => onDeleteComment(flag.comment_id)}
                                className="px-3 py-1.5 text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                            >
                                Delete Comment
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <select
                                    value={resolveStatus}
                                    onChange={(e) => setResolveStatus(e.target.value)}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="dismissed">Dismiss (no action)</option>
                                    <option value="reviewed">Mark as Reviewed</option>
                                    <option value="actioned">Actioned (took action)</option>
                                </select>
                            </div>
                            <textarea
                                value={resolveNotes}
                                onChange={(e) => setResolveNotes(e.target.value)}
                                placeholder="Resolution notes (optional)"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleResolve}
                                    className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => setShowResolve(false)}
                                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
