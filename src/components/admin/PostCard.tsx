import { useState } from 'react';
import {
    Flag,
    Trash2,
    Eye,
    EyeOff,
    Pin,
    PinOff,
    Lock,
    Unlock,
    MoreVertical,
    MessageSquare,
    ThumbsUp,
    ThumbsDown,
    User,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
} from 'lucide-react';

interface PostStats {
    likes: number;
    dislikes: number;
    comments: number;
}

interface PostAuthor {
    id: string;
    full_name: string;
    avatar_url?: string | null;
}

interface PostCardProps {
    post: {
        id: string;
        title: string;
        body: string;
        category?: string;
        is_pinned: boolean;
        is_locked: boolean;
        hidden_at?: string | null;
        hide_reason?: string | null;
        created_at: string;
        author: PostAuthor;
        stats: PostStats;
        flag_count: number;
    };
    onView?: (postId: string) => void;
    onHide?: (postId: string) => void;
    onUnhide?: (postId: string) => void;
    onDelete?: (postId: string) => void;
    onTogglePin?: (postId: string, pinned: boolean) => void;
    onToggleLock?: (postId: string, locked: boolean) => void;
}

export default function PostCard({
    post,
    onView,
    onHide,
    onUnhide,
    onDelete,
    onTogglePin,
    onToggleLock,
}: PostCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isHidden = !!post.hidden_at;

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return 'Today';
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        }
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const categoryColors: Record<string, string> = {
        general: 'bg-gray-100 text-gray-700',
        tips: 'bg-blue-100 text-blue-700',
        routes: 'bg-green-100 text-green-700',
        events: 'bg-purple-100 text-purple-700',
        feedback: 'bg-orange-100 text-orange-700',
        other: 'bg-gray-100 text-gray-600',
    };

    return (
        <div
            className={`relative bg-white rounded-lg border p-4 transition-all ${isHidden
                    ? 'border-red-200 bg-red-50 opacity-75'
                    : post.flag_count > 0
                        ? 'border-orange-200'
                        : 'border-gray-200 hover:border-gray-300'
                }`}
        >
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
                {post.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        <Pin className="w-3 h-3" />
                        Pinned
                    </span>
                )}
                {post.is_locked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        <Lock className="w-3 h-3" />
                        Locked
                    </span>
                )}
                {isHidden && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        <EyeOff className="w-3 h-3" />
                        Hidden
                    </span>
                )}
                {post.flag_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        <Flag className="w-3 h-3" />
                        {post.flag_count} flag{post.flag_count > 1 ? 's' : ''}
                    </span>
                )}
                {post.category && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[post.category] || categoryColors.other}`}>
                        {post.category}
                    </span>
                )}
            </div>

            {/* Title & Body */}
            <h3
                className={`font-semibold text-gray-900 mb-1 ${onView ? 'cursor-pointer hover:text-blue-600' : ''}`}
                onClick={() => onView?.(post.id)}
            >
                {post.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.body}</p>

            {/* Author & Stats */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {post.author.avatar_url ? (
                        <img
                            src={post.author.avatar_url}
                            alt={post.author.full_name}
                            className="w-6 h-6 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-500" />
                        </div>
                    )}
                    <span className="text-sm text-gray-600">{post.author.full_name}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-400">{formatTime(post.created_at)}</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {post.stats.likes}
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.stats.comments}
                    </span>
                </div>
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
                            <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                {onView && (
                                    <button
                                        onClick={() => {
                                            onView(post.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View Details
                                    </button>
                                )}
                                {onTogglePin && (
                                    <button
                                        onClick={() => {
                                            onTogglePin(post.id, !post.is_pinned);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        {post.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                        {post.is_pinned ? 'Unpin' : 'Pin'} Post
                                    </button>
                                )}
                                {onToggleLock && (
                                    <button
                                        onClick={() => {
                                            onToggleLock(post.id, !post.is_locked);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        {post.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                        {post.is_locked ? 'Unlock' : 'Lock'} Post
                                    </button>
                                )}
                                {!isHidden && onHide && (
                                    <button
                                        onClick={() => {
                                            onHide(post.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                    >
                                        <EyeOff className="w-4 h-4" />
                                        Hide Post
                                    </button>
                                )}
                                {isHidden && onUnhide && (
                                    <button
                                        onClick={() => {
                                            onUnhide(post.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Unhide Post
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onDelete(post.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Post
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

// Flagged Post Card for moderation queue
interface FlaggedPostCardProps {
    flag: {
        id: string;
        post_id: string;
        flag_type: string;
        reason?: string | null;
        status: string;
        created_at: string;
        flagged_by: { id: string; full_name: string };
        post: {
            id: string;
            title: string;
            body: string;
            author: { id: string; full_name: string };
        };
        resolved_by?: { id: string; full_name: string } | null;
        resolved_at?: string | null;
        resolution_notes?: string | null;
    };
    onResolve: (flagId: string, status: string, notes: string) => void;
    onViewPost: (postId: string) => void;
    onHidePost: (postId: string) => void;
    onDeletePost: (postId: string) => void;
}

export function FlaggedPostCard({ flag, onResolve, onViewPost, onHidePost, onDeletePost }: FlaggedPostCardProps) {
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
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${flagTypeColors[flag.flag_type] || flagTypeColors.other}`}>
                        {flag.flag_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[flag.status]}`}>
                        {flag.status}
                    </span>
                </div>
                <span className="text-xs text-gray-500">{formatTime(flag.created_at)}</span>
            </div>

            {/* Post Preview */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{flag.post.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{flag.post.body}</p>
                <p className="text-xs text-gray-400">
                    By <span className="font-medium">{flag.post.author.full_name}</span>
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
                                onClick={() => onViewPost(flag.post_id)}
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
                                onClick={() => onHidePost(flag.post_id)}
                                className="px-3 py-1.5 text-sm text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                            >
                                Hide Post
                            </button>
                            <button
                                onClick={() => onDeletePost(flag.post_id)}
                                className="px-3 py-1.5 text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                            >
                                Delete Post
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
