import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MessageSquare,
    ThumbsUp,
    ThumbsDown,
    Flag,
    Pin,
    PinOff,
    Lock,
    Unlock,
    Trash2,
    EyeOff,
    Eye,
    AlertTriangle,
    User,
    Clock,
    RefreshCw,
    Send,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CommentCard from '../../components/admin/CommentCard';
import HideContentModal from '../../components/admin/HideContentModal';
import ConfirmModal from '../../components/admin/ConfirmModal';
import ContentWarningModal from '../../components/admin/ContentWarningModal';
import { toast } from '../../lib/toast';

interface PostDetail {
    id: string;
    title: string;
    body: string;
    category?: string;
    is_pinned: boolean;
    is_locked: boolean;
    hidden_at?: string | null;
    hidden_by?: string | null;
    hide_reason?: string | null;
    created_at: string;
    updated_at: string;
    author: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string | null;
    };
    stats: {
        likes: number;
        dislikes: number;
        comments: number;
    };
    comments: Array<{
        id: string;
        body: string;
        hidden_at?: string | null;
        hide_reason?: string | null;
        created_at: string;
        author: {
            id: string;
            full_name: string;
            avatar_url?: string | null;
        };
        flag_count?: number;
    }>;
    flags: Array<{
        id: string;
        flag_type: string;
        reason?: string | null;
        status: string;
        created_at: string;
        flagged_by: { id: string; full_name: string };
    }>;
}

export default function PostDetailAdmin() {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<PostDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [hideModal, setHideModal] = useState<{
        isOpen: boolean;
        type: 'post' | 'comment';
        id: string;
        title: string;
    }>({ isOpen: false, type: 'post', id: '', title: '' });

    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'post' | 'comment';
        id: string;
        title: string;
    }>({ isOpen: false, type: 'post', id: '', title: '' });

    const [warningModal, setWarningModal] = useState<{
        isOpen: boolean;
        user: any;
        contentType: 'post' | 'comment';
        contentId: string;
        contentPreview: string;
    }>({
        isOpen: false,
        user: null,
        contentType: 'post',
        contentId: '',
        contentPreview: '',
    });

    // Fetch post details
    const fetchPost = useCallback(async () => {
        if (!postId) return;
        try {
            const { data, error } = await supabase.rpc('admin_view_post', { p_post_id: postId });
            if (error) throw error;
            setPost(data);
        } catch (err) {
            console.error('Failed to fetch post:', err);
            toast.error('Failed to load post');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchPost();
        setRefreshing(false);
    };

    // Post actions
    const handleHidePost = async (reason: string) => {
        if (!postId) return;
        try {
            const { error } = await supabase.rpc('admin_hide_post', {
                p_post_id: postId,
                p_reason: reason,
            });
            if (error) throw error;
            toast.success('Post hidden');
            handleRefresh();
        } catch (err) {
            console.error('Failed to hide post:', err);
            toast.error('Failed to hide post');
        }
    };

    const handleUnhidePost = async () => {
        if (!postId) return;
        try {
            const { error } = await supabase.rpc('admin_unhide_post', { p_post_id: postId });
            if (error) throw error;
            toast.success('Post unhidden');
            handleRefresh();
        } catch (err) {
            console.error('Failed to unhide post:', err);
            toast.error('Failed to unhide post');
        }
    };

    const handleDeletePost = async () => {
        if (!postId) return;
        try {
            const { error } = await supabase.rpc('admin_delete_post', { p_post_id: postId });
            if (error) throw error;
            toast.success('Post deleted');
            navigate('/admin/community');
        } catch (err) {
            console.error('Failed to delete post:', err);
            toast.error('Failed to delete post');
        }
    };

    const handleTogglePin = async () => {
        if (!post || !postId) return;
        try {
            const { error } = await supabase.rpc('admin_toggle_post_pin', {
                p_post_id: postId,
                p_pinned: !post.is_pinned,
            });
            if (error) throw error;
            toast.success(post.is_pinned ? 'Post unpinned' : 'Post pinned');
            handleRefresh();
        } catch (err) {
            console.error('Failed to toggle pin:', err);
            toast.error('Failed to update post');
        }
    };

    const handleToggleLock = async () => {
        if (!post || !postId) return;
        try {
            const { error } = await supabase.rpc('admin_toggle_post_lock', {
                p_post_id: postId,
                p_locked: !post.is_locked,
            });
            if (error) throw error;
            toast.success(post.is_locked ? 'Post unlocked' : 'Post locked');
            handleRefresh();
        } catch (err) {
            console.error('Failed to toggle lock:', err);
            toast.error('Failed to update post');
        }
    };

    // Comment actions
    const handleHideComment = async (commentId: string, reason: string) => {
        try {
            const { error } = await supabase.rpc('admin_hide_comment', {
                p_comment_id: commentId,
                p_reason: reason,
            });
            if (error) throw error;
            toast.success('Comment hidden');
            handleRefresh();
        } catch (err) {
            console.error('Failed to hide comment:', err);
            toast.error('Failed to hide comment');
        }
    };

    const handleUnhideComment = async (commentId: string) => {
        try {
            const { error } = await supabase.rpc('admin_unhide_comment', { p_comment_id: commentId });
            if (error) throw error;
            toast.success('Comment unhidden');
            handleRefresh();
        } catch (err) {
            console.error('Failed to unhide comment:', err);
            toast.error('Failed to unhide comment');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            const { error } = await supabase.rpc('admin_delete_comment', { p_comment_id: commentId });
            if (error) throw error;
            toast.success('Comment deleted');
            handleRefresh();
        } catch (err) {
            console.error('Failed to delete comment:', err);
            toast.error('Failed to delete comment');
        }
    };

    // Flag actions
    const handleResolveFlag = async (flagId: string, status: string, notes: string) => {
        try {
            const { error } = await supabase.rpc('admin_resolve_post_flag', {
                p_flag_id: flagId,
                p_status: status,
                p_notes: notes || null,
            });
            if (error) throw error;
            toast.success('Flag resolved');
            handleRefresh();
        } catch (err) {
            console.error('Failed to resolve flag:', err);
            toast.error('Failed to resolve flag');
        }
    };

    // Warning action
    const handleIssueWarning = async (data: any) => {
        try {
            const { error } = await supabase.rpc('admin_issue_warning', {
                p_user_id: data.user_id,
                p_warning_type: data.warning_type,
                p_reason: data.reason,
                p_related_content_type: data.related_content_type,
                p_related_content_id: data.related_content_id,
            });
            if (error) throw error;
            toast.success('Warning issued');
            setWarningModal({
                isOpen: false,
                user: null,
                contentType: 'post',
                contentId: '',
                contentPreview: '',
            });
        } catch (err) {
            console.error('Failed to issue warning:', err);
            toast.error('Failed to issue warning');
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

    const categoryColors: Record<string, string> = {
        general: 'bg-gray-100 text-gray-700',
        tips: 'bg-blue-100 text-blue-700',
        routes: 'bg-green-100 text-green-700',
        events: 'bg-purple-100 text-purple-700',
        feedback: 'bg-orange-100 text-orange-700',
        other: 'bg-gray-100 text-gray-600',
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Post not found</p>
                    <button
                        onClick={() => navigate('/admin/community')}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Back to Community
                    </button>
                </div>
            </div>
        );
    }

    const isHidden = !!post.hidden_at;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={() => navigate('/admin/community')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Community
                        </button>
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

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Post Content */}
                <div
                    className={`bg-white rounded-xl border shadow-sm mb-6 ${isHidden ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}
                >
                    {/* Status Bar */}
                    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
                        {post.is_pinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                <Pin className="w-3 h-3" />
                                Pinned
                            </span>
                        )}
                        {post.is_locked && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                                <Lock className="w-3 h-3" />
                                Locked
                            </span>
                        )}
                        {isHidden && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                <EyeOff className="w-3 h-3" />
                                Hidden
                            </span>
                        )}
                        {post.category && (
                            <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColors[post.category] || categoryColors.other
                                    }`}
                            >
                                {post.category}
                            </span>
                        )}
                        <div className="flex-grow" />
                        <span className="text-xs text-gray-500">ID: {post.id.slice(0, 8)}...</span>
                    </div>

                    {/* Post Body */}
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
                        <p className="text-gray-700 whitespace-pre-wrap mb-6">{post.body}</p>

                        {/* Hide Reason */}
                        {isHidden && post.hide_reason && (
                            <div className="p-4 bg-red-100 rounded-lg border border-red-200 mb-6">
                                <p className="text-sm text-red-800">
                                    <span className="font-medium">Hidden reason:</span> {post.hide_reason}
                                </p>
                            </div>
                        )}

                        {/* Author Info */}
                        <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                            {post.author.avatar_url ? (
                                <img
                                    src={post.author.avatar_url}
                                    alt={post.author.full_name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                    <User className="w-6 h-6 text-gray-500" />
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-gray-900">{post.author.full_name}</p>
                                <p className="text-sm text-gray-500">{post.author.email}</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-sm text-gray-500">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    {formatDate(post.created_at)}
                                </p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 py-4">
                            <span className="flex items-center gap-2 text-gray-600">
                                <ThumbsUp className="w-5 h-5" />
                                {post.stats.likes} likes
                            </span>
                            <span className="flex items-center gap-2 text-gray-600">
                                <ThumbsDown className="w-5 h-5" />
                                {post.stats.dislikes} dislikes
                            </span>
                            <span className="flex items-center gap-2 text-gray-600">
                                <MessageSquare className="w-5 h-5" />
                                {post.stats.comments} comments
                            </span>
                        </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-2">
                        <button
                            onClick={handleTogglePin}
                            className="px-3 py-2 text-sm text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                        >
                            {post.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                            {post.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                            onClick={handleToggleLock}
                            className="px-3 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                        >
                            {post.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            {post.is_locked ? 'Unlock' : 'Lock'}
                        </button>
                        {!isHidden ? (
                            <button
                                onClick={() =>
                                    setHideModal({ isOpen: true, type: 'post', id: post.id, title: post.title })
                                }
                                className="px-3 py-2 text-sm text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-2"
                            >
                                <EyeOff className="w-4 h-4" />
                                Hide
                            </button>
                        ) : (
                            <button
                                onClick={handleUnhidePost}
                                className="px-3 py-2 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                Unhide
                            </button>
                        )}
                        <button
                            onClick={() =>
                                setWarningModal({
                                    isOpen: true,
                                    user: post.author,
                                    contentType: 'post',
                                    contentId: post.id,
                                    contentPreview: post.title,
                                })
                            }
                            className="px-3 py-2 text-sm text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors flex items-center gap-2"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Warn Author
                        </button>
                        <button
                            onClick={() =>
                                setDeleteModal({ isOpen: true, type: 'post', id: post.id, title: post.title })
                            }
                            className="px-3 py-2 text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 ml-auto"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>

                {/* Flags Section */}
                {post.flags && post.flags.length > 0 && (
                    <div className="bg-white rounded-xl border border-orange-200 shadow-sm mb-6">
                        <div className="px-6 py-4 border-b border-orange-200 bg-orange-50">
                            <h2 className="font-semibold text-orange-800 flex items-center gap-2">
                                <Flag className="w-5 h-5" />
                                Flags ({post.flags.length})
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {post.flags.map((flag) => (
                                <div key={flag.id} className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full mb-1">
                                                {flag.flag_type.replace('_', ' ')}
                                            </span>
                                            <p className="text-sm text-gray-600">
                                                Reported by {flag.flagged_by.full_name}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${flag.status === 'pending'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : flag.status === 'actioned'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}
                                        >
                                            {flag.status}
                                        </span>
                                    </div>
                                    {flag.reason && <p className="text-sm text-gray-500 mb-2">{flag.reason}</p>}
                                    {flag.status === 'pending' && (
                                        <div className="flex items-center gap-2 mt-3">
                                            <button
                                                onClick={() => handleResolveFlag(flag.id, 'dismissed', '')}
                                                className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                            >
                                                Dismiss
                                            </button>
                                            <button
                                                onClick={() => handleResolveFlag(flag.id, 'actioned', '')}
                                                className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded hover:bg-green-200"
                                            >
                                                Mark Actioned
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comments Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-gray-500" />
                            Comments ({post.comments?.length || 0})
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {post.comments?.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No comments yet</div>
                        ) : (
                            post.comments?.map((comment) => (
                                <div key={comment.id} className="p-4">
                                    <CommentCard
                                        comment={{
                                            ...comment,
                                            post_id: post.id,
                                        }}
                                        onHide={(id) =>
                                            setHideModal({
                                                isOpen: true,
                                                type: 'comment',
                                                id,
                                                title: comment.body.slice(0, 50),
                                            })
                                        }
                                        onUnhide={handleUnhideComment}
                                        onDelete={(id) =>
                                            setDeleteModal({
                                                isOpen: true,
                                                type: 'comment',
                                                id,
                                                title: comment.body.slice(0, 50),
                                            })
                                        }
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <HideContentModal
                isOpen={hideModal.isOpen}
                onClose={() => setHideModal({ ...hideModal, isOpen: false })}
                onConfirm={(reason) => {
                    if (hideModal.type === 'post') {
                        handleHidePost(reason);
                    } else {
                        handleHideComment(hideModal.id, reason);
                    }
                    setHideModal({ ...hideModal, isOpen: false });
                }}
                contentType={hideModal.type}
                contentTitle={hideModal.title}
            />

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={() => {
                    if (deleteModal.type === 'post') {
                        handleDeletePost();
                    } else {
                        handleDeleteComment(deleteModal.id);
                    }
                    setDeleteModal({ ...deleteModal, isOpen: false });
                }}
                title={`Delete ${deleteModal.type === 'post' ? 'Post' : 'Comment'}?`}
                message={`Are you sure you want to permanently delete this ${deleteModal.type}? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />

            {warningModal.isOpen && warningModal.user && (
                <ContentWarningModal
                    isOpen={warningModal.isOpen}
                    onClose={() =>
                        setWarningModal({
                            isOpen: false,
                            user: null,
                            contentType: 'post',
                            contentId: '',
                            contentPreview: '',
                        })
                    }
                    onSubmit={handleIssueWarning}
                    targetUser={warningModal.user}
                    contentType={warningModal.contentType}
                    contentId={warningModal.contentId}
                    contentPreview={warningModal.contentPreview}
                />
            )}
        </div>
    );
}
