import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  ChevronRight,
  Pin,
  Lock,
  Share2,
  Bookmark,
  BookmarkCheck,
  ArrowUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/shared/UserAvatar';

/* ------------------------------------------------------------------ */
/*  Interfaces                                                         */
/* ------------------------------------------------------------------ */

interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  title: string;
  body: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  score: number;
  comment_count: number;
  is_pinned: boolean;
  is_locked: boolean;
}

interface CommunityComment {
  id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

/* ------------------------------------------------------------------ */
/*  Category color system                                              */
/* ------------------------------------------------------------------ */

type CategoryColorSet = {
  border: string;
  bg: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  voteBg: string;
  voteActive: string;
  accent: string;
  commentBorder: string;
  gradient: string;
};

const CATEGORY_COLORS: Record<string, CategoryColorSet> = {
  Rides: {
    border: 'border-t-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    voteBg: 'bg-emerald-50',
    voteActive: 'bg-emerald-100 text-emerald-700',
    accent: 'text-emerald-600',
    commentBorder: 'border-l-emerald-300',
    gradient: 'from-emerald-500 to-emerald-400',
  },
  Safety: {
    border: 'border-t-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    voteBg: 'bg-red-50',
    voteActive: 'bg-red-100 text-red-700',
    accent: 'text-red-600',
    commentBorder: 'border-l-red-300',
    gradient: 'from-red-500 to-red-400',
  },
  Ideas: {
    border: 'border-t-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    voteBg: 'bg-purple-50',
    voteActive: 'bg-purple-100 text-purple-700',
    accent: 'text-purple-600',
    commentBorder: 'border-l-purple-300',
    gradient: 'from-purple-500 to-purple-400',
  },
  Events: {
    border: 'border-t-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    voteBg: 'bg-orange-50',
    voteActive: 'bg-orange-100 text-orange-700',
    accent: 'text-orange-600',
    commentBorder: 'border-l-orange-300',
    gradient: 'from-orange-500 to-orange-400',
  },
  General: {
    border: 'border-t-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    voteBg: 'bg-blue-50',
    voteActive: 'bg-blue-100 text-blue-700',
    accent: 'text-blue-600',
    commentBorder: 'border-l-blue-300',
    gradient: 'from-blue-500 to-blue-400',
  },
  Support: {
    border: 'border-t-teal-500',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-700',
    voteBg: 'bg-teal-50',
    voteActive: 'bg-teal-100 text-teal-700',
    accent: 'text-teal-600',
    commentBorder: 'border-l-teal-300',
    gradient: 'from-teal-500 to-teal-400',
  },
};

const getCategoryColors = (category: string | null): CategoryColorSet =>
  CATEGORY_COLORS[category || 'General'] || CATEGORY_COLORS.General;

/* ------------------------------------------------------------------ */
/*  Comment sort                                                       */
/* ------------------------------------------------------------------ */

type CommentSort = 'newest' | 'oldest' | 'top';

const sortComments = (items: CommunityComment[], sort: CommentSort) => {
  const sorted = [...items];
  if (sort === 'newest') {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === 'oldest') {
    sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  // 'top' keeps original order (no like counts in schema)
  return sorted;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const COMMENT_MAX_LENGTH = 2000;

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const formatFullDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/* ------------------------------------------------------------------ */
/*  Skeleton loaders                                                   */
/* ------------------------------------------------------------------ */

function PostSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 animate-pulse space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-4 w-3 bg-gray-200 rounded" />
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-3 bg-gray-200 rounded" />
        <div className="h-4 w-40 bg-gray-200 rounded" />
      </div>

      {/* Post card skeleton */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="h-1 bg-gray-200" />
        <div className="p-6 sm:p-8">
          {/* Author row */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-full bg-gray-200" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-48 bg-gray-200 rounded" />
            </div>
          </div>
          {/* Title */}
          <div className="h-7 w-3/4 bg-gray-200 rounded mb-4" />
          {/* Body lines */}
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
          </div>
          {/* Stats bar */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center gap-4">
            <div className="h-8 w-24 bg-gray-200 rounded-full" />
            <div className="h-8 w-28 bg-gray-200 rounded-full" />
            <div className="ml-auto flex gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded-lg" />
              <div className="h-8 w-8 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Comments skeleton */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-l-2 border-gray-200 pl-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-4/5 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="animate-pulse border-l-2 border-gray-200 pl-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-3 w-16 bg-gray-200 rounded" />
      </div>
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-3/4 bg-gray-200 rounded" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [vote, setVote] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // New UI state
  const [commentSort, setCommentSort] = useState<CommentSort>('oldest');
  const [voteAnimating, setVoteAnimating] = useState<'up' | 'down' | null>(null);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const commentsRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const canComment = useMemo(() => !!user && post && !post.is_locked, [user, post]);

  const sortedComments = useMemo(
    () => sortComments(comments, commentSort),
    [comments, commentSort],
  );

  const colors = useMemo(() => getCategoryColors(post?.category ?? null), [post?.category]);

  const wasEdited = useMemo(() => {
    if (!post) return false;
    const created = new Date(post.created_at).getTime();
    const updated = new Date(post.updated_at).getTime();
    return Math.abs(updated - created) > 60_000; // more than 1 minute difference
  }, [post]);

  /* ---- Scroll-to-top listener ---- */
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ---- Load data ---- */
  useEffect(() => {
    if (!postId) return;
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);
    setError(null);

    let resolvedPost: CommunityPost | null = null;

    const { data: postData, error: postError } = await supabase
      .from('community_posts_with_stats')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (postError) {
      console.error('Failed to load post', postError);
    }

    if (postData) {
      resolvedPost = postData as CommunityPost;
    } else {
      const { data: basePost, error: baseError } = await supabase
        .from('community_posts')
        .select(`
          id,
          author_id,
          title,
          body,
          category,
          created_at,
          updated_at,
          is_pinned,
          is_locked,
          author:profiles!community_posts_author_id_fkey(full_name, avatar_url),
          votes:community_post_votes(vote),
          comments:community_comments(id)
        `)
        .eq('id', postId)
        .maybeSingle();

      if (baseError) {
        console.error('Failed to load post fallback', baseError);
      }

      if (basePost) {
        const score = (basePost.votes || []).reduce((sum: number, vote: any) => sum + (vote.vote || 0), 0);
        const author = Array.isArray(basePost.author) ? basePost.author[0] : basePost.author;
        resolvedPost = {
          id: basePost.id,
          author_id: basePost.author_id,
          author_name: author?.full_name || 'Community Member',
          author_avatar_url: author?.avatar_url ?? null,
          title: basePost.title,
          body: basePost.body,
          category: basePost.category,
          created_at: basePost.created_at,
          updated_at: basePost.updated_at,
          score,
          comment_count: (basePost.comments || []).length,
          is_pinned: basePost.is_pinned,
          is_locked: basePost.is_locked,
        } as CommunityPost;
      }
    }

    if (!resolvedPost) {
      setError('Post not found.');
      setLoading(false);
      return;
    }

    setPost(resolvedPost);

    const { data: commentData, error: commentError } = await supabase
      .from('community_comments')
      .select('id, body, created_at, author:profiles(id, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentError) {
      console.error('Failed to load comments', commentError);
      setError('Unable to load comments.');
    } else {
      setComments(((commentData || []) as any[]).map(comment => ({
        ...comment,
        author: Array.isArray(comment.author) ? comment.author[0] : comment.author
      })) as CommunityComment[]);
    }

    if (user) {
      const { data: voteData } = await supabase
        .from('community_post_votes')
        .select('vote')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (voteData != null) {
        setVote(voteData.vote ?? 0);
      }
    }

    setLoading(false);
  };

  /* ---- Voting ---- */
  const handleVote = async (nextVote: number) => {
    if (!user || !postId || !post) return;

    const newVote = vote === nextVote ? 0 : nextVote;

    // Trigger animation
    setVoteAnimating(nextVote === 1 ? 'up' : 'down');
    setTimeout(() => setVoteAnimating(null), 300);

    try {
      if (newVote === 0) {
        const { error: deleteError } = await supabase
          .from('community_post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: upsertError } = await supabase
          .from('community_post_votes')
          .upsert({ post_id: postId, user_id: user.id, vote: newVote });
        if (upsertError) throw upsertError;
      }

      const delta = newVote - vote;
      setVote(newVote);
      setPost({ ...post, score: (post.score || 0) + delta });
    } catch (err) {
      console.error('Failed to vote', err);
      setError('Unable to update vote right now.');
    }
  };

  /* ---- Comment submit ---- */
  const handleCommentSubmit = async () => {
    if (!user || !postId || !commentText.trim()) return;

    setSubmitting(true);
    const { error: insertError } = await supabase
      .from('community_comments')
      .insert({ post_id: postId, author_id: user.id, body: commentText.trim() });

    if (insertError) {
      console.error('Failed to add comment', insertError);
      setError('Unable to add comment.');
    } else {
      setCommentText('');
      setCommentSuccess(true);
      setTimeout(() => setCommentSuccess(false), 2500);
      await loadPost();
      // Scroll to latest comment
      setTimeout(() => {
        commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);
    }

    setSubmitting(false);
  };

  /* ---- Keyboard shortcut for comment ---- */
  const handleCommentKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && commentText.trim() && !submitting) {
        e.preventDefault();
        handleCommentSubmit();
      }
    },
    [commentText, submitting],
  );

  /* ---- Share / copy link ---- */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback - do nothing
    }
  };

  /* ---- Scroll helpers ---- */
  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ================================================================ */
  /*  Render: Loading                                                  */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="py-6">
        <PostSkeleton />
      </div>
    );
  }

  /* ================================================================ */
  /*  Render: Error / Not Found                                        */
  /* ================================================================ */

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Post Not Found</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {error || 'The post you are looking for may have been removed or does not exist.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/community"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Community
            </Link>
            <button
              onClick={() => loadPost()}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Render: Post Detail                                              */
  /* ================================================================ */

  const category = post.category || 'General';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-32 lg:pb-6">
      {/* ---- Breadcrumb ---- */}
      <nav className="flex items-center gap-1.5 text-sm flex-wrap" aria-label="Breadcrumb">
        <Link
          to="/community"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
        <Link
          to="/community"
          className={`font-medium transition-colors hover:underline ${colors.accent}`}
        >
          {category}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
        <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-xs" title={post.title}>
          {post.title}
        </span>
      </nav>

      {/* ---- Error banner ---- */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ---- Post Card ---- */}
      <article className={`bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border-t-[3px] ${colors.border}`}>
        <div className="p-6 sm:p-8">
          {/* Badges row */}
          {(post.is_pinned || post.is_locked) && (
            <div className="flex items-center gap-2 mb-4">
              {post.is_pinned && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                  <Pin className="w-3 h-3" />
                  Pinned
                </span>
              )}
              {post.is_locked && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold border border-gray-200">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              )}
            </div>
          )}

          {/* Author + meta row */}
          <div className="flex items-center gap-3 mb-5">
            <Link to={`/user/${post.author_id}`} className="flex-shrink-0 group">
              <UserAvatar
                user={{ id: post.author_id, full_name: post.author_name, avatar_url: post.author_avatar_url }}
                size="sm"
                className="ring-2 ring-white shadow-sm group-hover:ring-gray-200 transition-all"
              />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/user/${post.author_id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-sm"
                >
                  {post.author_name}
                </Link>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.badgeBg} ${colors.badgeText}`}>
                  {category}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <Clock className="w-3 h-3" />
                <span title={formatFullDate(post.created_at)}>
                  Posted {formatRelativeTime(post.created_at)}
                </span>
                {wasEdited && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="italic" title={formatFullDate(post.updated_at)}>
                      edited {formatRelativeTime(post.updated_at)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Vote column + content */}
          <div className="flex gap-5">
            {/* Vertical vote column */}
            <div className="hidden sm:flex flex-col items-center gap-1 pt-1">
              <button
                onClick={() => handleVote(1)}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  vote === 1
                    ? colors.voteActive
                    : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-50'
                } ${voteAnimating === 'up' ? 'scale-125' : ''}`}
                aria-label="Upvote"
              >
                <ThumbsUp className="w-5 h-5" />
              </button>
              <span
                className={`text-lg font-bold tabular-nums transition-all duration-300 ${
                  post.score > 0
                    ? 'text-emerald-600'
                    : post.score < 0
                    ? 'text-red-500'
                    : 'text-gray-500'
                } ${voteAnimating ? 'scale-110' : ''}`}
              >
                {post.score}
              </span>
              <button
                onClick={() => handleVote(-1)}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  vote === -1
                    ? 'bg-red-100 text-red-600'
                    : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
                } ${voteAnimating === 'down' ? 'scale-125' : ''}`}
                aria-label="Downvote"
              >
                <ThumbsDown className="w-5 h-5" />
              </button>
            </div>

            {/* Post content */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-4">
                {post.title}
              </h1>
              <div className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {post.body}
              </div>
            </div>
          </div>

          {/* ---- Engagement stats bar ---- */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            {/* Mobile vote buttons */}
            <div className="flex sm:hidden items-center gap-1 mr-2">
              <button
                onClick={() => handleVote(1)}
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  vote === 1
                    ? colors.voteActive
                    : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-50'
                } ${voteAnimating === 'up' ? 'scale-125' : ''}`}
                aria-label="Upvote"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <span
                className={`text-sm font-bold tabular-nums px-1 ${
                  post.score > 0
                    ? 'text-emerald-600'
                    : post.score < 0
                    ? 'text-red-500'
                    : 'text-gray-500'
                }`}
              >
                {post.score}
              </span>
              <button
                onClick={() => handleVote(-1)}
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  vote === -1
                    ? 'bg-red-100 text-red-600'
                    : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
                } ${voteAnimating === 'down' ? 'scale-125' : ''}`}
                aria-label="Downvote"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>

            {/* Upvote count */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-sm text-gray-600 font-medium">
              <ThumbsUp className="w-3.5 h-3.5" />
              {post.score} {post.score === 1 ? 'upvote' : 'upvotes'}
            </span>

            {/* Comment count (clickable) */}
            <button
              onClick={scrollToComments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-sm text-gray-600 font-medium hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
            </button>

            <div className="flex-1" />

            {/* Share */}
            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 p-2 rounded-lg transition-all text-sm font-medium ${
                copied
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title={copied ? 'Link copied!' : 'Copy link'}
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-xs">
                {copied ? 'Copied!' : 'Share'}
              </span>
            </button>

            {/* Bookmark */}
            <button
              onClick={() => setBookmarked(!bookmarked)}
              className={`p-2 rounded-lg transition-all ${
                bookmarked
                  ? 'bg-amber-50 text-amber-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title={bookmarked ? 'Bookmarked' : 'Bookmark'}
            >
              {bookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </article>

      {/* ---- Comments Section ---- */}
      <section ref={commentsRef} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Comments header */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 flex items-center justify-between flex-wrap gap-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </h2>
          {comments.length > 1 && (
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
              {(['oldest', 'newest'] as CommentSort[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setCommentSort(option)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors capitalize ${
                    commentSort === option
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 py-5 space-y-1">
          {/* Comment list */}
          {comments.length === 0 ? (
            /* Empty state */
            <div className="py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No comments yet</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                {canComment
                  ? 'Be the first to share your thoughts on this post.'
                  : post.is_locked
                  ? 'Comments are locked for this post.'
                  : 'Sign in to start the conversation.'}
              </p>
              {canComment && (
                <button
                  onClick={() => commentInputRef.current?.focus()}
                  className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-colors bg-gradient-to-r ${colors.gradient} hover:opacity-90`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Write a Comment
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50">
              {sortedComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`group py-4 first:pt-2 last:pb-2`}
                >
                  <div className={`border-l-2 ${colors.commentBorder} pl-4 transition-colors`}>
                    {/* Comment header */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <Link to={`/user/${comment.author.id}`} className="flex-shrink-0">
                        <UserAvatar
                          user={comment.author}
                          size="xs"
                          className="ring-1 ring-gray-100 group-hover:ring-gray-200 transition-all"
                        />
                      </Link>
                      <Link
                        to={`/user/${comment.author.id}`}
                        className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors"
                      >
                        {comment.author.full_name}
                      </Link>
                      <span
                        className="text-xs text-gray-400"
                        title={formatFullDate(comment.created_at)}
                      >
                        {formatRelativeTime(comment.created_at)}
                      </span>
                      {comment.author.id === post.author_id && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badgeBg} ${colors.badgeText}`}>
                          OP
                        </span>
                      )}
                    </div>
                    {/* Comment body */}
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words pl-[calc(2rem+0.625rem)]">
                      {comment.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- Comment Input (desktop: inside card, mobile: floating) ---- */}
        {canComment && (
          <div className="hidden lg:block px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <div className="flex items-start gap-3 p-4">
                <UserAvatar
                  user={{ id: user!.id, full_name: user!.email?.split('@')[0] || 'You', avatar_url: null }}
                  size="xs"
                  className="mt-0.5 flex-shrink-0"
                />
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value.slice(0, COMMENT_MAX_LENGTH))}
                  onKeyDown={handleCommentKeyDown}
                  rows={3}
                  placeholder="Write your comment..."
                  className="flex-1 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`text-xs tabular-nums ${commentText.length > COMMENT_MAX_LENGTH * 0.9 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                    {commentText.length}/{COMMENT_MAX_LENGTH}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    Ctrl+Enter to submit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {commentSuccess && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Posted!
                    </span>
                  )}
                  <button
                    onClick={handleCommentSubmit}
                    disabled={submitting || !commentText.trim()}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white bg-gradient-to-r ${colors.gradient} hover:opacity-90 active:scale-95`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Post Comment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!canComment && !post.is_locked && comments.length > 0 && (
          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>{' '}
                to join the discussion.
              </p>
            </div>
          </div>
        )}

        {post.is_locked && comments.length > 0 && (
          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Lock className="w-4 h-4" />
              Comments are locked for this post.
            </div>
          </div>
        )}
      </section>

      {/* ---- Mobile floating comment input ---- */}
      {canComment && (
        <div className="fixed bottom-0 inset-x-0 lg:hidden z-30 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {commentSuccess && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium mb-2 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Comment posted successfully!
              </div>
            )}
            <div className="flex items-end gap-3">
              <UserAvatar
                user={{ id: user!.id, full_name: user!.email?.split('@')[0] || 'You', avatar_url: null }}
                size="xs"
                className="flex-shrink-0 mb-1"
              />
              <div className="flex-1 relative">
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value.slice(0, COMMENT_MAX_LENGTH))}
                  onKeyDown={handleCommentKeyDown}
                  rows={1}
                  placeholder="Write a comment..."
                  className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none border border-gray-200 rounded-xl px-4 py-2.5 pr-12 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all leading-relaxed"
                  style={{ minHeight: '42px', maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={submitting || !commentText.trim()}
                  className={`absolute right-2 bottom-1.5 p-1.5 rounded-lg transition-all disabled:opacity-30 ${colors.accent}`}
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-11">
              <span className={`text-[10px] tabular-nums ${commentText.length > COMMENT_MAX_LENGTH * 0.9 ? 'text-amber-600' : 'text-gray-400'}`}>
                {commentText.length > 0 && `${commentText.length}/${COMMENT_MAX_LENGTH}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---- Scroll-to-top button ---- */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-20 lg:bottom-8 right-6 z-20 p-3 rounded-full bg-white border border-gray-200 shadow-lg text-gray-600 hover:text-gray-900 hover:shadow-xl transition-all duration-300 ${
          showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
}
