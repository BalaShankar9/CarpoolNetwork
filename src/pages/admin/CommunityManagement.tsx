import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare,
    Flag,
    Pin,
    Lock,
    TrendingUp,
    AlertTriangle,
    Users,
    RefreshCw,
    Search,
    Filter,
    ChevronDown,
    FileText,
    Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PostCard, { FlaggedPostCard } from '../../components/admin/PostCard';
import CommentCard, { FlaggedCommentCard } from '../../components/admin/CommentCard';
import PostFilters, { PostFiltersType, DEFAULT_POST_FILTERS } from '../../components/admin/PostFilters';
import HideContentModal from '../../components/admin/HideContentModal';
import ContentWarningModal from '../../components/admin/ContentWarningModal';
import ConfirmModal from '../../components/admin/ConfirmModal';
import { toast } from '../../lib/toast';

interface CommunityStats {
    total_posts: number;
    total_comments: number;
    pending_post_flags: number;
    pending_comment_flags: number;
    active_warnings: number;
    posts_this_week: number;
    hidden_posts: number;
    pinned_posts: number;
    locked_posts: number;
}

interface Post {
    id: string;
    title: string;
    body: string;
    category?: string;
    is_pinned: boolean;
    is_locked: boolean;
    hidden_at?: string | null;
    hide_reason?: string | null;
    created_at: string;
    author: { id: string; full_name: string; avatar_url?: string | null };
    stats: { likes: number; dislikes: number; comments: number };
    flag_count: number;
}

type TabType = 'all' | 'flagged-posts' | 'flagged-comments' | 'pinned' | 'hidden';

export default function CommunityManagement() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<CommunityStats | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [posts, setPosts] = useState<Post[]>([]);
    const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
    const [flaggedComments, setFlaggedComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState<PostFiltersType>(DEFAULT_POST_FILTERS);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const pageSize = 20;

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

    // Fetch community stats
    const fetchStats = useCallback(async () => {
        try {
            const { data, error } = await supabase.rpc('admin_get_community_stats');
            if (error) throw error;
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            toast.error('Failed to load community stats');
        }
    }, []);

    // Fetch posts based on active tab
    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            // Build filter object for RPC
            const rpcFilters: any = {
                search_term: filters.search || null,
                category_filter: filters.category || null,
                is_pinned: filters.isPinned || null,
                is_locked: filters.isLocked || null,
                is_hidden: activeTab === 'hidden' ? true : filters.isHidden || null,
                has_flags: activeTab === 'flagged-posts' ? true : filters.hasFlags || null,
                p_limit: pageSize,
                p_offset: (page - 1) * pageSize,
            };

            if (activeTab === 'pinned') {
                rpcFilters.is_pinned = true;
            }

            const { data, error } = await supabase.rpc('admin_get_posts', rpcFilters);
            if (error) throw error;

            const postsData = data || [];
            setPosts(postsData);
            setHasMore(postsData.length === pageSize);
        } catch (err) {
            console.error('Failed to fetch posts:', err);
            toast.error('Failed to load posts');
        } finally {
            setLoading(false);
        }
    }, [filters, activeTab, page]);

    // Fetch flagged posts
    const fetchFlaggedPosts = useCallback(async () => {
        if (activeTab !== 'flagged-posts') return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_flagged_posts', {
                status_filter: filters.flagStatus || 'pending',
                p_limit: pageSize,
                p_offset: (page - 1) * pageSize,
            });
            if (error) throw error;
            setFlaggedPosts(data || []);
            setHasMore((data || []).length === pageSize);
        } catch (err) {
            console.error('Failed to fetch flagged posts:', err);
            toast.error('Failed to load flagged posts');
        } finally {
            setLoading(false);
        }
    }, [activeTab, filters.flagStatus, page]);

    // Fetch flagged comments
    const fetchFlaggedComments = useCallback(async () => {
        if (activeTab !== 'flagged-comments') return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_flagged_comments', {
                status_filter: filters.flagStatus || 'pending',
                p_limit: pageSize,
                p_offset: (page - 1) * pageSize,
            });
            if (error) throw error;
            setFlaggedComments(data || []);
            setHasMore((data || []).length === pageSize);
        } catch (err) {
            console.error('Failed to fetch flagged comments:', err);
            toast.error('Failed to load flagged comments');
        } finally {
            setLoading(false);
        }
    }, [activeTab, filters.flagStatus, page]);

    // Initial load
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Load data based on tab
    useEffect(() => {
        setPage(1); // Reset page when tab changes
        if (activeTab === 'flagged-posts') {
            fetchFlaggedPosts();
        } else if (activeTab === 'flagged-comments') {
            fetchFlaggedComments();
        } else {
            fetchPosts();
        }
    }, [activeTab, fetchPosts, fetchFlaggedPosts, fetchFlaggedComments]);

    // Refresh handler
    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchStats(),
            activeTab === 'flagged-posts'
                ? fetchFlaggedPosts()
                : activeTab === 'flagged-comments'
                    ? fetchFlaggedComments()
                    : fetchPosts(),
        ]);
        setRefreshing(false);
    };

    // Post actions
    const handleViewPost = (postId: string) => {
        navigate(`/admin/community/${postId}`);
    };

    const handleHidePost = async (postId: string, reason: string) => {
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

    const handleUnhidePost = async (postId: string) => {
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

    const handleDeletePost = async (postId: string) => {
        try {
            const { error } = await supabase.rpc('admin_delete_post', { p_post_id: postId });
            if (error) throw error;
            toast.success('Post deleted');
            handleRefresh();
        } catch (err) {
            console.error('Failed to delete post:', err);
            toast.error('Failed to delete post');
        }
    };

    const handleTogglePin = async (postId: string, pinned: boolean) => {
        try {
            const { error } = await supabase.rpc('admin_toggle_post_pin', {
                p_post_id: postId,
                p_pinned: pinned,
            });
            if (error) throw error;
            toast.success(pinned ? 'Post pinned' : 'Post unpinned');
            handleRefresh();
        } catch (err) {
            console.error('Failed to toggle pin:', err);
            toast.error('Failed to update post');
        }
    };

    const handleToggleLock = async (postId: string, locked: boolean) => {
        try {
            const { error } = await supabase.rpc('admin_toggle_post_lock', {
                p_post_id: postId,
                p_locked: locked,
            });
            if (error) throw error;
            toast.success(locked ? 'Post locked' : 'Post unlocked');
            handleRefresh();
        } catch (err) {
            console.error('Failed to toggle lock:', err);
            toast.error('Failed to update post');
        }
    };

    // Flag actions
    const handleResolvePostFlag = async (flagId: string, status: string, notes: string) => {
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

    const handleResolveCommentFlag = async (flagId: string, status: string, notes: string) => {
        try {
            const { error } = await supabase.rpc('admin_resolve_comment_flag', {
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

    // Tab badges
    const tabs: { id: TabType; label: string; icon: any; count?: number }[] = [
        { id: 'all', label: 'All Posts', icon: FileText, count: stats?.total_posts },
        {
            id: 'flagged-posts',
            label: 'Flagged Posts',
            icon: Flag,
            count: stats?.pending_post_flags,
        },
        {
            id: 'flagged-comments',
            label: 'Flagged Comments',
            icon: Flag,
            count: stats?.pending_comment_flags,
        },
        { id: 'pinned', label: 'Pinned', icon: Pin, count: stats?.pinned_posts },
        { id: 'hidden', label: 'Hidden', icon: Eye, count: stats?.hidden_posts },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-green-600" />
                            <h1 className="text-xl font-bold text-gray-900">Community Management</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/admin/community/warnings')}
                                className="px-3 py-2 text-sm text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-2"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Warnings ({stats?.active_warnings || 0})
                            </button>
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Posts</p>
                                <p className="text-xl font-bold text-gray-900">{stats?.total_posts || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Flag className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pending Flags</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {(stats?.pending_post_flags || 0) + (stats?.pending_comment_flags || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">This Week</p>
                                <p className="text-xl font-bold text-gray-900">{stats?.posts_this_week || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Active Warnings</p>
                                <p className="text-xl font-bold text-gray-900">{stats?.active_warnings || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                    <div className="flex flex-wrap border-b border-gray-200">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span
                                        className={`px-1.5 py-0.5 text-xs rounded-full ${tab.id === 'flagged-posts' || tab.id === 'flagged-comments'
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Filters (for non-flagged tabs) */}
                    {(activeTab === 'all' || activeTab === 'pinned' || activeTab === 'hidden') && (
                        <PostFilters
                            filters={filters}
                            onChange={setFilters}
                            onClear={() => setFilters(DEFAULT_POST_FILTERS)}
                            isExpanded={filtersExpanded}
                            onToggle={() => setFiltersExpanded(!filtersExpanded)}
                            showFlagFilters={false}
                            categories={['general', 'tips', 'routes', 'events', 'feedback']}
                        />
                    )}

                    {/* Flag Status Filter (for flagged tabs) */}
                    {(activeTab === 'flagged-posts' || activeTab === 'flagged-comments') && (
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
                            <label className="text-sm font-medium text-gray-700">Status:</label>
                            <select
                                value={filters.flagStatus || 'pending'}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, flagStatus: e.target.value }))
                                }
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="pending">Pending</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="dismissed">Dismissed</option>
                                <option value="actioned">Actioned</option>
                                <option value="">All</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Posts Grid */}
                        {(activeTab === 'all' || activeTab === 'pinned' || activeTab === 'hidden') && (
                            <div className="grid gap-4">
                                {posts.length === 0 ? (
                                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No posts found</p>
                                    </div>
                                ) : (
                                    posts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            onView={handleViewPost}
                                            onHide={(id) =>
                                                setHideModal({
                                                    isOpen: true,
                                                    type: 'post',
                                                    id,
                                                    title: post.title,
                                                })
                                            }
                                            onUnhide={handleUnhidePost}
                                            onDelete={(id) =>
                                                setDeleteModal({
                                                    isOpen: true,
                                                    type: 'post',
                                                    id,
                                                    title: post.title,
                                                })
                                            }
                                            onTogglePin={handleTogglePin}
                                            onToggleLock={handleToggleLock}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Flagged Posts */}
                        {activeTab === 'flagged-posts' && (
                            <div className="grid gap-4">
                                {flaggedPosts.length === 0 ? (
                                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                        <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No flagged posts</p>
                                    </div>
                                ) : (
                                    flaggedPosts.map((flag) => (
                                        <FlaggedPostCard
                                            key={flag.id}
                                            flag={flag}
                                            onResolve={handleResolvePostFlag}
                                            onViewPost={handleViewPost}
                                            onHidePost={(id) =>
                                                setHideModal({
                                                    isOpen: true,
                                                    type: 'post',
                                                    id,
                                                    title: flag.post.title,
                                                })
                                            }
                                            onDeletePost={(id) =>
                                                setDeleteModal({
                                                    isOpen: true,
                                                    type: 'post',
                                                    id,
                                                    title: flag.post.title,
                                                })
                                            }
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Flagged Comments */}
                        {activeTab === 'flagged-comments' && (
                            <div className="grid gap-4">
                                {flaggedComments.length === 0 ? (
                                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                        <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No flagged comments</p>
                                    </div>
                                ) : (
                                    flaggedComments.map((flag) => (
                                        <FlaggedCommentCard
                                            key={flag.id}
                                            flag={flag}
                                            onResolve={handleResolveCommentFlag}
                                            onViewPost={handleViewPost}
                                            onHideComment={(id) =>
                                                setHideModal({
                                                    isOpen: true,
                                                    type: 'comment',
                                                    id,
                                                    title: 'Comment',
                                                })
                                            }
                                            onDeleteComment={(id) =>
                                                setDeleteModal({
                                                    isOpen: true,
                                                    type: 'comment',
                                                    id,
                                                    title: 'Comment',
                                                })
                                            }
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {(posts.length > 0 || flaggedPosts.length > 0 || flaggedComments.length > 0) && (
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
                    </>
                )}
            </div>

            {/* Hide Content Modal */}
            <HideContentModal
                isOpen={hideModal.isOpen}
                onClose={() => setHideModal({ ...hideModal, isOpen: false })}
                onConfirm={(reason) => {
                    if (hideModal.type === 'post') {
                        handleHidePost(hideModal.id, reason);
                    } else {
                        handleHideComment(hideModal.id, reason);
                    }
                    setHideModal({ ...hideModal, isOpen: false });
                }}
                contentType={hideModal.type}
                contentTitle={hideModal.title}
            />

            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={() => {
                    if (deleteModal.type === 'post') {
                        handleDeletePost(deleteModal.id);
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

            {/* Content Warning Modal */}
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
