import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Flame,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../lib/toast';
import WidgetCard from '../shared/WidgetCard';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface CommunityPostPreview {
  id: string;
  title: string;
  body: string;
  category: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  score: number;
  comment_count: number;
  created_at: string;
  is_pinned: boolean;
}

/* ------------------------------------------------------------------ */
/*  Category styling                                                    */
/* ------------------------------------------------------------------ */

const CATEGORIES = ['All', 'General', 'Rides', 'Safety', 'Support', 'Ideas', 'Events'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; activeBg: string; icon: string }> = {
  All:     { bg: 'bg-gray-100',    text: 'text-gray-600',    activeBg: 'bg-gray-800 text-white',     icon: '' },
  General: { bg: 'bg-slate-100',   text: 'text-slate-700',   activeBg: 'bg-slate-700 text-white',    icon: '' },
  Rides:   { bg: 'bg-blue-100',    text: 'text-blue-700',    activeBg: 'bg-blue-600 text-white',     icon: '' },
  Safety:  { bg: 'bg-amber-100',   text: 'text-amber-700',   activeBg: 'bg-amber-600 text-white',    icon: '' },
  Support: { bg: 'bg-emerald-100', text: 'text-emerald-700', activeBg: 'bg-emerald-600 text-white',  icon: '' },
  Ideas:   { bg: 'bg-purple-100',  text: 'text-purple-700',  activeBg: 'bg-purple-600 text-white',   icon: '' },
  Events:  { bg: 'bg-rose-100',    text: 'text-rose-700',    activeBg: 'bg-rose-600 text-white',     icon: '' },
};

const getCategoryStyle = (cat: string) =>
  CATEGORY_STYLES[cat] || CATEGORY_STYLES.General;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const MAX_VISIBLE_POSTS = 3;

function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function truncateBody(body: string, max = 80): string {
  if (!body) return '';
  const cleaned = body.replace(/\n+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).trimEnd() + '...';
}

function getInitials(name: string): string {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

/**
 * Deterministic color from a string (for avatar fallback).
 */
function stringToAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500',
    'bg-purple-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
  ];
  return colors[Math.abs(hash) % colors.length];
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

function PostSkeleton() {
  return (
    <div className="p-3 space-y-2.5 animate-pulse-soft">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
        <div className="h-3 bg-gray-200 rounded-full w-24" />
        <div className="h-2.5 bg-gray-100 rounded-full w-12 ml-auto" />
      </div>
      <div className="h-4 bg-gray-200 rounded-full w-4/5" />
      <div className="h-3 bg-gray-100 rounded-full w-full" />
      <div className="flex items-center gap-4 pt-1">
        <div className="h-3 bg-gray-100 rounded-full w-12" />
        <div className="h-3 bg-gray-100 rounded-full w-14" />
        <div className="h-5 bg-gray-100 rounded-full w-16 ml-auto" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline avatar (compact for widget)                                  */
/* ------------------------------------------------------------------ */

function MiniAvatar({ name, url }: { name: string; url: string | null }) {
  const [imgErr, setImgErr] = useState(false);

  if (url && !imgErr) {
    return (
      <img
        src={url}
        alt={name}
        className="w-6 h-6 rounded-full object-cover shrink-0"
        onError={() => setImgErr(true)}
      />
    );
  }

  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0 ${stringToAvatarColor(name)}`}
    >
      {getInitials(name)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Post card                                                           */
/* ------------------------------------------------------------------ */

function PostCard({
  post,
  userVote,
  onVote,
  index,
}: {
  post: CommunityPostPreview;
  userVote: number;
  onVote: (postId: string, vote: number) => void;
  index: number;
}) {
  const catStyle = getCategoryStyle(post.category || 'General');
  const isUpvoted = userVote === 1;
  const isDownvoted = userVote === -1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="group"
    >
      <div className="p-3 rounded-xl hover:bg-gray-50 transition-colors duration-150">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1.5">
          <MiniAvatar name={post.author_name} url={post.author_avatar_url} />
          <span className="text-xs font-medium text-gray-700 truncate">
            {post.author_name}
          </span>
          <span className="text-[11px] text-gray-400 ml-auto whitespace-nowrap">
            {formatRelativeTime(post.created_at)}
          </span>
        </div>

        {/* Title */}
        <Link
          to={`/social/community/${post.id}`}
          className="block mb-1"
        >
          <h4 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-social-community-600 transition-colors">
            {post.is_pinned && (
              <Flame className="w-3.5 h-3.5 inline-block mr-1 text-amber-500 -mt-0.5" />
            )}
            {post.title}
          </h4>
        </Link>

        {/* Body preview */}
        {post.body && (
          <Link to={`/social/community/${post.id}`}>
            <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-1">
              {truncateBody(post.body)}
            </p>
          </Link>
        )}

        {/* Footer: votes, comments, category */}
        <div className="flex items-center gap-1">
          {/* Vote controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onVote(post.id, 1)}
              className={`p-1 rounded-md transition-colors ${
                isUpvoted
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
              aria-label="Upvote"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <span
              className={`text-xs font-semibold tabular-nums min-w-[1.25rem] text-center ${
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
              type="button"
              onClick={() => onVote(post.id, -1)}
              className={`p-1 rounded-md transition-colors ${
                isDownvoted
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
              aria-label="Downvote"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Comment count */}
          <Link
            to={`/social/community/${post.id}`}
            className="flex items-center gap-1 text-gray-400 hover:text-social-community-500 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium tabular-nums">{post.comment_count}</span>
          </Link>

          {/* Category pill */}
          <span
            className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${catStyle.bg} ${catStyle.text}`}
          >
            {post.category || 'General'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Main widget                                                         */
/* ================================================================== */

export default function CommunityWidget() {
  const { user } = useAuth();

  const [posts, setPosts] = useState<CommunityPostPreview[]>([]);
  const [voteMap, setVoteMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);

  const loadRequestId = useRef(0);
  const isMounted = useRef(true);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                     */
  /* ---------------------------------------------------------------- */

  const loadPosts = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    try {
      // Fetch top posts sorted by score (trending) then recency
      const { data, error: fetchError } = await supabase
        .from('community_posts_with_stats')
        .select('*')
        .order('score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (requestId !== loadRequestId.current || !isMounted.current) return;

      if (fetchError) {
        console.error('[CommunityWidget] Failed to load posts:', fetchError);
        setLoading(false);
        return;
      }

      const normalized: CommunityPostPreview[] = (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        body: p.body || '',
        category: p.category || 'General',
        author_id: p.author_id,
        author_name: p.author_name || 'Community Member',
        author_avatar_url: p.author_avatar_url ?? null,
        score: Number(p.score) || 0,
        comment_count: Number(p.comment_count) || 0,
        created_at: p.created_at,
        is_pinned: Boolean(p.is_pinned),
      }));

      setPosts(normalized);

      // Load user's votes in parallel
      if (user?.id && normalized.length > 0) {
        const postIds = normalized.map((p) => p.id);
        const { data: votes } = await supabase
          .from('community_post_votes')
          .select('post_id, vote')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        if (requestId !== loadRequestId.current || !isMounted.current) return;

        const nextMap: Record<string, number> = {};
        (votes || []).forEach((v: any) => {
          nextMap[v.post_id] = v.vote;
        });
        setVoteMap(nextMap);
      } else {
        setVoteMap({});
      }
    } catch (err) {
      console.error('[CommunityWidget] Unexpected error:', err);
    } finally {
      if (requestId === loadRequestId.current && isMounted.current) {
        setLoading(false);
      }
    }
  }, [user?.id]);

  /* ---------------------------------------------------------------- */
  /*  Realtime subscriptions                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    isMounted.current = true;
    loadPosts();

    // Subscribe to new community posts
    const channel = supabase
      .channel('community-widget-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_posts',
        },
        () => {
          if (isMounted.current) {
            setNewPostsAvailable(true);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_post_votes',
        },
        () => {
          // Silently refresh vote counts in the background
          if (isMounted.current) {
            loadPosts();
          }
        },
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  /* ---------------------------------------------------------------- */
  /*  Vote handler                                                      */
  /* ---------------------------------------------------------------- */

  const handleVote = useCallback(
    async (postId: string, vote: number) => {
      if (!user?.id) {
        toast.warning('Sign in to vote on posts');
        return;
      }

      const currentVote = voteMap[postId] || 0;
      const nextVote = currentVote === vote ? 0 : vote;
      const delta = nextVote - currentVote;

      // Optimistic update
      setVoteMap((prev) => ({ ...prev, [postId]: nextVote }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, score: p.score + delta } : p,
        ),
      );

      try {
        if (nextVote === 0) {
          const { error: deleteError } = await supabase
            .from('community_post_votes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);
          if (deleteError) throw deleteError;
        } else {
          const { error: upsertError } = await supabase
            .from('community_post_votes')
            .upsert(
              { post_id: postId, user_id: user.id, vote: nextVote },
              { onConflict: 'post_id,user_id' },
            );
          if (upsertError) throw upsertError;
        }
      } catch (err) {
        // Revert optimistic update
        console.error('[CommunityWidget] Vote failed:', err);
        setVoteMap((prev) => ({
          ...prev,
          [postId]: currentVote || undefined!,
        }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, score: p.score - delta } : p,
          ),
        );
        toast.error('Unable to update vote right now');
      }
    },
    [user?.id, voteMap],
  );

  /* ---------------------------------------------------------------- */
  /*  Refresh handler for new-posts banner                              */
  /* ---------------------------------------------------------------- */

  const handleRefresh = useCallback(() => {
    setNewPostsAvailable(false);
    setLoading(true);
    loadPosts();
  }, [loadPosts]);

  /* ---------------------------------------------------------------- */
  /*  Filtered + sorted posts                                           */
  /* ---------------------------------------------------------------- */

  const filteredPosts =
    activeCategory === 'All'
      ? posts
      : posts.filter((p) => (p.category || 'General') === activeCategory);

  const visiblePosts = filteredPosts.slice(0, MAX_VISIBLE_POSTS);

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <WidgetCard
      title="Community"
      icon={<MessageCircle className="w-4 h-4 text-white" />}
      gradient="from-social-community-400 to-social-community-600"
      seeAllLink="/social/community"
      seeAllLabel="View community"
      badge={newPostsAvailable ? 'New' : undefined}
      loading={loading}
    >
      {/* Category filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 scrollbar-none -mx-1 px-1">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const style = getCategoryStyle(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 shrink-0 ${
                isActive
                  ? style.activeBg
                  : `${style.bg} ${style.text} hover:opacity-80`
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* New posts banner */}
      <AnimatePresence>
        {newPostsAvailable && (
          <motion.button
            type="button"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 mb-1 text-[11px] font-medium text-social-community-600 bg-social-community-50 rounded-lg hover:bg-social-community-100 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            New posts available - tap to refresh
          </motion.button>
        )}
      </AnimatePresence>

      {/* Posts list */}
      {visiblePosts.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {visiblePosts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              userVote={voteMap[post.id] || 0}
              onVote={handleVote}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="py-6 text-center">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">
            {activeCategory !== 'All'
              ? `No ${activeCategory} posts yet`
              : 'No posts yet. Start the conversation!'}
          </p>
        </div>
      )}

      {/* New post button */}
      <div className="pt-2">
        <Link
          to="/social/community?compose=true"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-medium text-social-community-600 bg-social-community-50 hover:bg-social-community-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Post
        </Link>
      </div>
    </WidgetCard>
  );
}
