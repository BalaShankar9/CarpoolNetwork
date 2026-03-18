import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Eye,
  Flame,
  Lock,
  MessageCircle,
  MessageSquare,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/shared/UserAvatar';
import CommunityChat from '../components/community/CommunityChat';

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

type SortOption = 'top' | 'new' | 'active';
type CommunityView = 'forum' | 'chat';

const CATEGORY_OPTIONS = ['General', 'Rides', 'Safety', 'Support', 'Ideas', 'Events'];

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string; border: string; ring: string }> = {
  General:  { icon: '💬', color: 'text-slate-700',   bg: 'bg-slate-100',   border: 'border-slate-200', ring: 'ring-slate-300' },
  Rides:    { icon: '🚗', color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',  ring: 'ring-blue-300' },
  Safety:   { icon: '🛡️', color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200', ring: 'ring-amber-300' },
  Support:  { icon: '🤝', color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', ring: 'ring-emerald-300' },
  Ideas:    { icon: '💡', color: 'text-purple-700',   bg: 'bg-purple-50',   border: 'border-purple-200', ring: 'ring-purple-300' },
  Events:   { icon: '📅', color: 'text-rose-700',     bg: 'bg-rose-50',     border: 'border-rose-200',  ring: 'ring-rose-300' },
};

const SORT_META: Record<SortOption, { label: string; icon: typeof TrendingUp }> = {
  top:    { label: 'Top',    icon: TrendingUp },
  new:    { label: 'New',    icon: Sparkles },
  active: { label: 'Active', icon: Zap },
};

const TITLE_MAX = 120;
const BODY_MAX = 2000;

const sortPostsForView = (items: CommunityPost[], sort: SortOption) => {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }

    if (sort === 'top') {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
    }

    if (sort === 'active') {
      const commentDiff = (b.comment_count || 0) - (a.comment_count || 0);
      if (commentDiff !== 0) return commentDiff;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return sorted;
};

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

/* ------------------------------------------------------------------ */
/*  Skeleton shimmer card                                              */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden">
      {/* shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded-full w-1/3" />
          <div className="h-5 bg-gray-200 rounded-full w-4/5" />
          <div className="h-3 bg-gray-100 rounded-full w-full" />
          <div className="h-3 bg-gray-100 rounded-full w-2/3" />
          <div className="flex gap-6 pt-2">
            <div className="h-4 bg-gray-100 rounded-full w-16" />
            <div className="h-4 bg-gray-100 rounded-full w-20" />
            <div className="h-4 bg-gray-100 rounded-full w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating particle dot                                              */
/* ------------------------------------------------------------------ */
function ParticleDots() {
  const dots = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 4,
      opacity: 0.15 + Math.random() * 0.25,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-white animate-[float_ease-in-out_infinite_alternate]"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */
export default function Community() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('top');
  const [view, setView] = useState<CommunityView>('forum');
  const [search, setSearch] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [voteMap, setVoteMap] = useState<Record<string, number>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const loadRequestId = useRef(0);
  const loadingTimeoutRef = useRef<number | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  /* ---------- Derived data ---------------------------------------- */

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (filterCategory) {
      result = result.filter((p) => (p.category || 'General') === filterCategory);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(needle) ||
          post.body.toLowerCase().includes(needle) ||
          (post.category || '').toLowerCase().includes(needle),
      );
    }
    return result;
  }, [posts, search, filterCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORY_OPTIONS.forEach((c) => (counts[c] = 0));
    posts.forEach((p) => {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [posts]);

  const mostActiveCategory = useMemo(() => {
    let max = 0;
    let best = 'General';
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (count > max) {
        max = count;
        best = cat;
      }
    });
    return best;
  }, [categoryCounts]);

  const totalMembers = useMemo(() => {
    const unique = new Set(posts.map((p) => p.author_id));
    return unique.size;
  }, [posts]);

  const trendingPosts = useMemo(() => {
    return [...posts]
      .filter((p) => !p.is_pinned)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
  }, [posts]);

  const topContributors = useMemo(() => {
    const map: Record<string, { name: string; avatar: string | null; id: string; count: number }> = {};
    posts.forEach((p) => {
      if (!map[p.author_id]) {
        map[p.author_id] = { name: p.author_name, avatar: p.author_avatar_url, id: p.author_id, count: 0 };
      }
      map[p.author_id].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [posts]);

  const postsToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return posts.filter((p) => new Date(p.created_at) >= todayStart).length;
  }, [posts]);

  const activeDiscussions = useMemo(() => {
    return posts.filter((p) => (p.comment_count || 0) > 0).length;
  }, [posts]);

  /* ---------- Effects --------------------------------------------- */

  useEffect(() => {
    if (view === 'forum') {
      loadPosts();
    }
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [sort, view]);

  useEffect(() => {
    if (view === 'chat') {
      setShowComposer(false);
    }
  }, [view]);

  useEffect(() => {
    if (showComposer && composerRef.current) {
      composerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showComposer]);

  /* ---------- Data loading (unchanged logic) ---------------------- */

  const loadPostsFromBase = async (requestId: number, ensurePost?: CommunityPost) => {
    const { data: basePosts, error: baseError } = await supabase
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
        votes:community_post_votes(vote, user_id),
        comments:community_comments(id)
      `)
      .order('created_at', { ascending: false });

    if (requestId !== loadRequestId.current) {
      return true;
    }

    if (baseError) {
      console.error('Failed to load community posts (fallback)', baseError);
      setError('Unable to load community posts.');
      setLoading(false);
      return true;
    }

    const normalized = (basePosts || []).map((post: any) => {
      const score = (post.votes || []).reduce((sum: number, vote: any) => sum + (vote.vote || 0), 0);
      return {
        id: post.id,
        author_id: post.author_id,
        author_name: post.author?.full_name || 'Community Member',
        author_avatar_url: post.author?.avatar_url ?? null,
        title: post.title,
        body: post.body,
        category: post.category,
        created_at: post.created_at,
        updated_at: post.updated_at,
        score,
        comment_count: (post.comments || []).length,
        is_pinned: post.is_pinned,
        is_locked: post.is_locked,
      } as CommunityPost;
    });

    let mergedPosts = normalized;
    if (ensurePost && !mergedPosts.some((post) => post.id === ensurePost.id)) {
      mergedPosts = [ensurePost, ...mergedPosts];
    }

    setPosts(sortPostsForView(mergedPosts, sort));

    if (user) {
      const nextMap: Record<string, number> = {};
      (basePosts || []).forEach((post: any) => {
        const userVote = (post.votes || []).find((vote: any) => vote.user_id === user.id);
        if (userVote) {
          nextMap[post.id] = userVote.vote;
        }
      });
      if (ensurePost) {
        nextMap[ensurePost.id] = nextMap[ensurePost.id] ?? 0;
      }
      setVoteMap(nextMap);
    } else {
      setVoteMap({});
    }

    setLoading(false);
    return true;
  };

  const loadPosts = async (options?: { silent?: boolean; ensurePost?: CommunityPost; isRetry?: boolean }) => {
    const requestId = ++loadRequestId.current;
    if (!options?.silent) {
      setLoading(true);
      setLoadingTimedOut(false);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = window.setTimeout(() => {
        if (loadRequestId.current === requestId) {
          setLoadingTimedOut(true);
        }
      }, 15000);
    }

    if (options?.isRetry) {
      setRetryCount((prev) => prev + 1);
    }

    setError(null);

    let query = supabase
      .from('community_posts_with_stats')
      .select('*')
      .order('is_pinned', { ascending: false });

    if (sort === 'top') {
      query = query.order('score', { ascending: false }).order('created_at', { ascending: false });
    } else if (sort === 'new') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('comment_count', { ascending: false }).order('created_at', { ascending: false });
    }

    const { data, error: loadError } = await query;

    if (requestId !== loadRequestId.current) {
      return;
    }

    if (loadError) {
      console.error('Failed to load community posts', loadError);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      const errorCode = (loadError as any)?.code || 'UNKNOWN';
      setError(`Unable to load community posts. (${errorCode})`);
      setLoading(false);
      setLoadingTimedOut(false);
      return;
    }

    let results = (data || []) as CommunityPost[];

    if (options?.ensurePost && !results.some((post) => post.id === options.ensurePost!.id)) {
      results = [options.ensurePost, ...results];
    }

    if (results.length === 0) {
      const handled = await loadPostsFromBase(requestId, options?.ensurePost);
      if (handled) {
        return;
      }
    }

    setPosts(sortPostsForView(results, sort));

    if (user && results.length > 0) {
      const ids = results.map((post) => post.id);
      const { data: votes } = await supabase
        .from('community_post_votes')
        .select('post_id, vote')
        .eq('user_id', user.id)
        .in('post_id', ids);

      if (requestId !== loadRequestId.current) {
        return;
      }

      const nextMap: Record<string, number> = {};
      (votes || []).forEach((vote) => {
        nextMap[vote.post_id] = vote.vote;
      });
      setVoteMap(nextMap);
    } else if (options?.ensurePost) {
      setVoteMap((prev) => ({ ...prev, [options.ensurePost!.id]: 0 }));
    } else {
      setVoteMap({});
    }

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    setLoading(false);
    setLoadingTimedOut(false);
    setRetryCount(0);
  };

  /* ---------- Actions --------------------------------------------- */

  const handleVote = async (postId: string, vote: number) => {
    if (!user) return;

    const currentVote = voteMap[postId] || 0;
    const nextVote = currentVote === vote ? 0 : vote;

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
          .upsert({ post_id: postId, user_id: user.id, vote: nextVote });
        if (upsertError) throw upsertError;
      }

      const delta = nextVote - currentVote;
      setVoteMap((prev) => ({ ...prev, [postId]: nextVote }));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, score: (post.score || 0) + delta } : post,
        ),
      );
    } catch (err) {
      console.error('Failed to vote', err);
      setError('Unable to update vote right now.');
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) return;

    setSubmitting(true);
    setError(null);

    const { data: insertedPost, error: insertError } = await supabase
      .from('community_posts')
      .insert({
        author_id: user.id,
        title: trimmedTitle,
        body: trimmedBody,
        category: category || null,
      })
      .select('id, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('Failed to create post', insertError);
      setError('Unable to create post.');
    } else {
      const createdAt = insertedPost?.created_at ?? new Date().toISOString();
      const displayName = profile?.full_name || user.email?.split('@')[0] || 'You';
      const newPost: CommunityPost = {
        id: insertedPost?.id ?? crypto.randomUUID(),
        author_id: user.id,
        author_name: displayName,
        author_avatar_url: profile?.avatar_url ?? null,
        title: trimmedTitle,
        body: trimmedBody,
        category: category || null,
        created_at: createdAt,
        updated_at: insertedPost?.updated_at ?? createdAt,
        score: 0,
        comment_count: 0,
        is_pinned: false,
        is_locked: false,
      };

      setPosts((prev) => [newPost, ...prev.filter((post) => post.id !== newPost.id)]);
      setVoteMap((prev) => ({ ...prev, [newPost.id]: 0 }));
      setTitle('');
      setBody('');
      setCategory(CATEGORY_OPTIONS[0]);
      setShowComposer(false);
      setPreviewMode(false);

      await loadPosts({ silent: true, ensurePost: newPost });
    }

    setSubmitting(false);
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="min-h-screen -mt-4 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* --- Inline keyframes for float + shimmer animations ------- */}
      <style>{`
        @keyframes float {
          0%   { transform: translateY(0px); }
          100% { transform: translateY(-18px); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; transform: translateY(-12px); }
          to   { opacity: 1; max-height: 800px; transform: translateY(0); }
        }
        @keyframes countPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown  { animation: slideDown 0.35s ease-out forwards; }
        .animate-countPop   { animation: countPop 0.25s ease-out; }
        .animate-fadeInUp   { animation: fadeInUp 0.4s ease-out both; }
      `}</style>

      {/* ============================================================ */}
      {/*  HERO HEADER                                                  */}
      {/* ============================================================ */}
      <div className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 overflow-hidden">
        <ParticleDots />
        {/* subtle radial glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Left: Title block */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Community Hub
                </h1>
              </div>
              <p className="text-blue-200 text-base sm:text-lg max-w-xl leading-relaxed">
                Connect with fellow carpoolers. Share tips, ask questions, and build a safer ride network together.
              </p>
            </div>

            {/* Right: Stats bubbles */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Posts', value: posts.length, icon: MessageSquare },
                { label: 'Members', value: totalMembers, icon: Users },
                { label: 'Trending', value: mostActiveCategory, icon: Flame },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                >
                  <stat.icon className="w-4 h-4 text-blue-300" />
                  <div>
                    <p className="text-[11px] font-medium text-blue-300 uppercase tracking-wider leading-none mb-0.5">
                      {stat.label}
                    </p>
                    <p className="text-base font-bold text-white leading-none">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View Toggle - segmented control */}
          <div className="mt-8 flex items-center gap-4 flex-wrap">
            <div className="relative inline-flex rounded-full bg-white/10 backdrop-blur-sm p-1 border border-white/10">
              {/* sliding indicator */}
              <div
                className="absolute top-1 bottom-1 rounded-full bg-white shadow-lg transition-all duration-300 ease-out"
                style={{
                  width: 'calc(50% - 4px)',
                  left: view === 'forum' ? '4px' : 'calc(50%)',
                }}
              />
              <button
                onClick={() => setView('forum')}
                className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  view === 'forum' ? 'text-blue-700' : 'text-white/80 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Forum
              </button>
              <button
                onClick={() => setView('chat')}
                className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  view === 'chat' ? 'text-blue-700' : 'text-white/80 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                Live Chat
              </button>
            </div>

            {view === 'forum' && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowComposer((prev) => !prev)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-full shadow-lg shadow-blue-900/20 hover:bg-blue-50 active:scale-[0.97] transition-all duration-150"
                >
                  <Plus className="w-4 h-4" />
                  New Post
                </button>
                <button
                  onClick={() => loadPosts()}
                  className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  CHAT VIEW                                                    */}
      {/* ============================================================ */}
      {view === 'chat' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <CommunityChat />
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/*  TRENDING TOPICS BAR                                      */}
          {/* ======================================================== */}
          <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Topics
                </span>
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                    filterCategory === null
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All
                  <span className="ml-1.5 text-[11px] opacity-70">{posts.length}</span>
                </button>
                {CATEGORY_OPTIONS.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const isActive = filterCategory === cat;
                  const isMostActive = cat === mostActiveCategory && !filterCategory;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(isActive ? null : cat)}
                      className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 flex items-center gap-1.5 ${
                        isActive
                          ? `${meta.bg} ${meta.color} ${meta.border} shadow-sm`
                          : isMostActive
                            ? `bg-white ${meta.color} border-gray-200 ring-2 ${meta.ring} ring-offset-1`
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm">{meta.icon}</span>
                      {cat}
                      <span className="text-[11px] opacity-60">{categoryCounts[cat]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/*  ERROR BANNER                                             */}
          {/* ======================================================== */}
          {error && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
              <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                    <XCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-800 mb-1">Unable to Load Posts</h3>
                  <p className="text-sm text-red-600 mb-5 max-w-md">{error}</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {retryCount < 3 ? (
                      <button
                        onClick={() => loadPosts({ isRetry: true })}
                        className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry {retryCount > 0 ? `(${3 - retryCount} left)` : ''}
                      </button>
                    ) : (
                      <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
                      >
                        Refresh Page
                      </button>
                    )}
                    <button
                      onClick={() => setView('chat')}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    >
                      Try Live Chat Instead
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/*  MAIN GRID                                                */}
          {/* ======================================================== */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
              {/* ---------------------------------------------------- */}
              {/*  LEFT COLUMN                                          */}
              {/* ---------------------------------------------------- */}
              <div className="space-y-5">
                {/* Sort + Search bar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Sort pills */}
                  <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
                    {(['top', 'new', 'active'] as SortOption[]).map((option) => {
                      const meta = SORT_META[option];
                      const SortIcon = meta.icon;
                      return (
                        <button
                          key={option}
                          onClick={() => setSort(option)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                            sort === option
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                          }`}
                        >
                          <SortIcon className="w-3.5 h-3.5" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search posts..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none focus:bg-white transition-all"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Result count when searching */}
                {(search.trim() || filterCategory) && !loading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
                    <Eye className="w-4 h-4" />
                    <span>
                      Showing <span className="font-semibold text-gray-700">{filteredPosts.length}</span>{' '}
                      {filteredPosts.length === 1 ? 'post' : 'posts'}
                      {search.trim() && (
                        <>
                          {' '}matching "<span className="font-medium text-blue-600">{search.trim()}</span>"
                        </>
                      )}
                      {filterCategory && (
                        <>
                          {' '}in <span className="font-medium text-blue-600">{filterCategory}</span>
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* ------------------------------------------------ */}
                {/*  POST COMPOSER                                    */}
                {/* ------------------------------------------------ */}
                {showComposer && (
                  <div
                    ref={composerRef}
                    className="animate-slideDown bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden"
                  >
                    {/* Composer header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-600" />
                        Create a New Post
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewMode(!previewMode)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            previewMode
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {previewMode ? 'Edit' : 'Preview'}
                        </button>
                        <button
                          onClick={() => {
                            setShowComposer(false);
                            setPreviewMode(false);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {previewMode ? (
                      /* Preview mode */
                      <div className="px-6 pb-6">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 min-h-[140px]">
                          {title.trim() ? (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                {category && (
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_META[category]?.bg || 'bg-gray-100'} ${CATEGORY_META[category]?.color || 'text-gray-600'}`}>
                                    {CATEGORY_META[category]?.icon} {category}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                              <p className="text-gray-600 whitespace-pre-wrap">{body || '(No body yet)'}</p>
                            </>
                          ) : (
                            <p className="text-gray-400 italic">Start typing to see your post preview...</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Edit mode */
                      <div className="px-6 pb-6 space-y-4">
                        {/* Title */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-gray-700">Title</label>
                            <span className={`text-xs ${title.length > TITLE_MAX ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              {title.length}/{TITLE_MAX}
                            </span>
                          </div>
                          <input
                            type="text"
                            placeholder="What's on your mind?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                            maxLength={TITLE_MAX}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none focus:bg-white transition-all placeholder:text-gray-400"
                          />
                        </div>

                        {/* Category pills */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                          <div className="flex flex-wrap gap-2">
                            {CATEGORY_OPTIONS.map((opt) => {
                              const meta = CATEGORY_META[opt];
                              const selected = category === opt;
                              return (
                                <button
                                  key={opt}
                                  onClick={() => setCategory(opt)}
                                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
                                    selected
                                      ? `${meta.bg} ${meta.color} ${meta.border} shadow-sm`
                                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <span>{meta.icon}</span>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Body */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-gray-700">Body</label>
                            <span className={`text-xs ${body.length > BODY_MAX ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              {body.length}/{BODY_MAX}
                            </span>
                          </div>
                          <textarea
                            placeholder="Share details, tips, or questions with the community..."
                            value={body}
                            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                            maxLength={BODY_MAX}
                            rows={5}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none focus:bg-white transition-all resize-none placeholder:text-gray-400"
                          />
                        </div>

                        {/* Post guidelines tooltip */}
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                          <button
                            onClick={() => setGuidelinesOpen(!guidelinesOpen)}
                            className="flex items-center justify-between w-full text-sm font-medium text-blue-700"
                          >
                            <span className="flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4" />
                              Post Guidelines
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${guidelinesOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {guidelinesOpen && (
                            <ul className="mt-2 space-y-1 text-xs text-blue-600 pl-6 list-disc">
                              <li>Keep it respectful and constructive</li>
                              <li>No personal info (phone, exact address) in public posts</li>
                              <li>Use Safety category for incident reports</li>
                              <li>Be specific -- details help others help you</li>
                            </ul>
                          )}
                        </div>

                        {/* Submit */}
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={handleSubmit}
                            disabled={submitting || !title.trim() || !body.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
                          >
                            {submitting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Posting...
                              </>
                            ) : (
                              'Publish Post'
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowComposer(false);
                              setPreviewMode(false);
                            }}
                            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------ */}
                {/*  LOADING STATE                                    */}
                {/* ------------------------------------------------ */}
                {loading ? (
                  loadingTimedOut ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-7 h-7 text-amber-500" />
                      </div>
                      <p className="text-gray-800 font-semibold mb-1">Taking longer than expected...</p>
                      <p className="text-sm text-gray-500 mb-5">The server might be busy. You can wait or try again.</p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <button
                          onClick={() => {
                            setLoading(false);
                            setLoadingTimedOut(false);
                            loadPosts({ isRetry: true });
                          }}
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retry
                        </button>
                        <button
                          onClick={() => setView('chat')}
                          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                        >
                          Try Live Chat
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[0, 1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  )
                ) : filteredPosts.length === 0 ? (
                  /* ------------------------------------------------ */
                  /*  EMPTY STATE                                      */
                  /* ------------------------------------------------ */
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center animate-fadeInUp">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-5">
                      <MessageSquare className="w-9 h-9 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {search.trim() || filterCategory ? 'No matching posts' : 'Start the Conversation'}
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">
                      {search.trim() || filterCategory
                        ? 'Try adjusting your search or filters to find what you\'re looking for.'
                        : 'Be the first to share a tip, ask a question, or spark a discussion in the community.'}
                    </p>
                    {search.trim() || filterCategory ? (
                      <button
                        onClick={() => {
                          setSearch('');
                          setFilterCategory(null);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Clear Filters
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowComposer(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-200"
                      >
                        <Plus className="w-5 h-5" />
                        Create First Post
                      </button>
                    )}
                  </div>
                ) : (
                  /* ------------------------------------------------ */
                  /*  POST CARDS                                       */
                  /* ------------------------------------------------ */
                  <div className="space-y-4">
                    {filteredPosts.map((post, index) => {
                      const userVote = voteMap[post.id] || 0;
                      const catMeta = CATEGORY_META[post.category || 'General'] || CATEGORY_META.General;

                      return (
                        <div
                          key={post.id}
                          className="animate-fadeInUp group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                          style={{ animationDelay: `${index * 0.04}s` }}
                        >
                          {/* Gradient accent on hover */}
                          <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-200/60 transition-colors duration-300 pointer-events-none" />

                          {/* Pinned ribbon */}
                          {post.is_pinned && (
                            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 text-amber-700 text-xs font-semibold">
                              <Pin className="w-3 h-3" />
                              Pinned Post
                            </div>
                          )}

                          {/* Locked overlay strip */}
                          {post.is_locked && !post.is_pinned && (
                            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-medium">
                              <Lock className="w-3 h-3" />
                              This discussion is locked
                            </div>
                          )}

                          <div className="p-5">
                            {/* Author row */}
                            <div className="flex items-center gap-3 mb-3">
                              <UserAvatar
                                user={{
                                  id: post.author_id,
                                  full_name: post.author_name,
                                  avatar_url: post.author_avatar_url,
                                }}
                                size="xs"
                              />
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-sm font-semibold text-gray-900 truncate">
                                  {post.author_name}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${catMeta.bg} ${catMeta.color}`}>
                                  {catMeta.icon} {post.category || 'General'}
                                </span>
                                <span className="text-xs text-gray-400">{formatRelativeTime(post.created_at)}</span>
                                {post.is_locked && (
                                  <Lock className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {/* Post content */}
                            <Link to={`/community/${post.id}`} className="block group/link">
                              <h3 className="text-base font-semibold text-gray-900 group-hover/link:text-blue-700 transition-colors leading-snug mb-1.5">
                                {post.title}
                              </h3>
                              <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                                {post.body}
                              </p>
                            </Link>

                            {/* Engagement bar */}
                            <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-50">
                              {/* Votes */}
                              <div className="flex items-center bg-gray-50 rounded-lg">
                                <button
                                  onClick={() => handleVote(post.id, 1)}
                                  className={`p-2 rounded-l-lg transition-colors ${
                                    userVote === 1
                                      ? 'bg-blue-100 text-blue-600'
                                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                  aria-label="Upvote"
                                >
                                  <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                                </button>
                                <span
                                  className={`min-w-[28px] text-center text-sm font-bold tabular-nums ${
                                    userVote === 1
                                      ? 'text-blue-600'
                                      : userVote === -1
                                        ? 'text-red-500'
                                        : 'text-gray-700'
                                  }`}
                                  key={post.score}
                                >
                                  {post.score}
                                </span>
                                <button
                                  onClick={() => handleVote(post.id, -1)}
                                  className={`p-2 rounded-r-lg transition-colors ${
                                    userVote === -1
                                      ? 'bg-red-100 text-red-500'
                                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                  }`}
                                  aria-label="Downvote"
                                >
                                  <ArrowDown className="w-4 h-4" strokeWidth={2.5} />
                                </button>
                              </div>

                              {/* Comments */}
                              <Link
                                to={`/community/${post.id}`}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span className="font-medium">{post.comment_count}</span>
                              </Link>

                              {/* Share */}
                              <button
                                onClick={() => {
                                  if (navigator.share) {
                                    navigator.share({
                                      title: post.title,
                                      url: `${window.location.origin}/community/${post.id}`,
                                    }).catch(() => {});
                                  } else {
                                    navigator.clipboard.writeText(
                                      `${window.location.origin}/community/${post.id}`,
                                    ).catch(() => {});
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                                title="Share"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>

                              {/* Bookmark (visual only) */}
                              <button
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors ml-auto"
                                title="Bookmark"
                              >
                                <Bookmark className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ---------------------------------------------------- */}
              {/*  RIGHT SIDEBAR                                        */}
              {/* ---------------------------------------------------- */}
              <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
                {/* Community Pulse */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/30">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Community Pulse
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                      <p className="text-2xl font-extrabold">{postsToday}</p>
                      <p className="text-[11px] text-blue-200 font-medium mt-0.5">Posts Today</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                      <p className="text-2xl font-extrabold">{activeDiscussions}</p>
                      <p className="text-[11px] text-blue-200 font-medium mt-0.5">Active Threads</p>
                    </div>
                  </div>
                </div>

                {/* Top Contributors */}
                {topContributors.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      Top Contributors
                    </h3>
                    <div className="space-y-3">
                      {topContributors.map((contributor, i) => {
                        const medals = ['bg-gradient-to-br from-amber-400 to-yellow-500', 'bg-gradient-to-br from-gray-300 to-gray-400', 'bg-gradient-to-br from-orange-400 to-amber-600'];
                        return (
                          <div key={contributor.id} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full ${medals[i] || 'bg-gray-200'} flex items-center justify-center text-[11px] font-bold text-white shadow-sm`}>
                              {i + 1}
                            </div>
                            <UserAvatar
                              user={{
                                id: contributor.id,
                                full_name: contributor.name,
                                avatar_url: contributor.avatar,
                              }}
                              size="xs"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{contributor.name}</p>
                              <p className="text-xs text-gray-400">{contributor.count} {contributor.count === 1 ? 'post' : 'posts'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Trending Posts */}
                {trendingPosts.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Trending Posts
                    </h3>
                    <div className="space-y-3">
                      {trendingPosts.map((tp, i) => (
                        <Link
                          key={tp.id}
                          to={`/community/${tp.id}`}
                          className="group/trending flex items-start gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-xs font-bold text-gray-300 mt-0.5 w-4 text-right shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 group-hover/trending:text-blue-700 transition-colors line-clamp-2 leading-snug">
                              {tp.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <ArrowUp className="w-3 h-3" />
                                {tp.score}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {tp.comment_count}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover/trending:text-blue-400 mt-0.5 shrink-0 transition-colors" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guidelines */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500" />
                    Guidelines
                  </h3>
                  <ul className="space-y-2.5">
                    {[
                      { rule: 'Keep posts respectful and constructive', icon: '1' },
                      { rule: 'Share ride details only after matching', icon: '2' },
                      { rule: 'Use Safety category for incident reports', icon: '3' },
                      { rule: 'Downvote spam, upvote helpful info', icon: '4' },
                    ].map((item) => (
                      <li key={item.icon} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold flex items-center justify-center mt-0.5">
                          {item.icon}
                        </span>
                        {item.rule}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* About */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">About This Space</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    A forum for drivers and passengers to share tips, questions, and ideas that improve the carpool experience for everyone.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
