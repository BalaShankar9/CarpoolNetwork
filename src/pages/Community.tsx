import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MessageCircle, ThumbsUp, ThumbsDown, Plus, RefreshCw, Search, Tag, Users, XCircle } from 'lucide-react';
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

const sortPostsForView = (items: CommunityPost[], sort: SortOption) => {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return a.is_pinned ? -1 : 1;
    }

    if (sort === 'top') {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff != 0) return scoreDiff;
    }

    if (sort === 'active') {
      const commentDiff = (b.comment_count || 0) - (a.comment_count || 0);
      if (commentDiff != 0) return commentDiff;
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
  const loadRequestId = useRef(0);
  const loadingTimeoutRef = useRef<number | null>(null);

  const filteredPosts = useMemo(() => {
    if (!search.trim()) return posts;
    const needle = search.trim().toLowerCase();
    return posts.filter((post) =>
      post.title.toLowerCase().includes(needle) ||
      post.body.toLowerCase().includes(needle) ||
      (post.category || '').toLowerCase().includes(needle)
    );
  }, [posts, search]);

  useEffect(() => {
    if (view === 'forum') {
      loadPosts();
    }
  }, [sort, view]);

  useEffect(() => {
    if (view === 'chat') {
      setShowComposer(false);
    }
  }, [view]);

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

    if (requestId != loadRequestId.current) {
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

      // Set loading timeout (15 seconds)
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
      setRetryCount(prev => prev + 1);
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

    if (requestId != loadRequestId.current) {
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

    if (results.length == 0) {
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

      if (requestId != loadRequestId.current) {
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

    // Clear timeout and reset states on success
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    setLoading(false);
    setLoadingTimedOut(false);
    setRetryCount(0);
  };

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
          post.id === postId
            ? { ...post, score: (post.score || 0) + delta }
            : post
        )
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

      await loadPosts({ silent: true, ensurePost: newPost });
    }

    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-600" />
            Community Hub
          </h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Forum posts and live chat for everyone in the carpool community.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setView('forum')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'forum' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Forum
            </button>
            <button
              onClick={() => setView('chat')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'chat' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Live Chat
            </button>
          </div>
          {view === 'forum' && (
            <>
              <button
                onClick={() => setShowComposer((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Post
              </button>
              <button
                onClick={() => loadPosts()}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'forum' && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex flex-col items-center text-center">
            <XCircle className="w-12 h-12 text-red-400 mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Posts</h3>
            <p className="text-sm text-red-600 mb-4 max-w-md">{error}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {retryCount < 3 ? (
                <button
                  onClick={() => loadPosts({ isRetry: true })}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry {retryCount > 0 ? `(${3 - retryCount} left)` : ''}
                </button>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Refresh Page
                </button>
              )}
              <button
                onClick={() => setView('chat')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try Live Chat Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'chat' ? (
        <CommunityChat />
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {(['top', 'new', 'active'] as SortOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSort(option)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      sort === option
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option === 'top' ? 'Top' : option === 'new' ? 'New' : 'Active'}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search posts"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {showComposer && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Create a new post</h2>
                <div className="grid gap-4">
                  <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    placeholder="Share the details with the community"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !title.trim() || !body.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Posting...' : 'Post'}
                  </button>
                  <button
                    onClick={() => setShowComposer(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                {loadingTimedOut ? (
                  <>
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium mb-2">Taking longer than expected...</p>
                    <p className="text-sm text-gray-500 mb-4">The server might be busy. You can wait or try again.</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => {
                          setLoading(false);
                          setLoadingTimedOut(false);
                          loadPosts({ isRetry: true });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </button>
                      <button
                        onClick={() => setView('chat')}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Try Live Chat
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-gray-600">Loading posts...</p>
                  </>
                )}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <p className="text-gray-600">No posts yet. Start the first conversation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const userVote = voteMap[post.id] || 0;
                  return (
                    <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleVote(post.id, 1)}
                            className={`p-1 rounded ${
                              userVote === 1 ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-blue-600'
                            }`}
                            aria-label="Upvote"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-semibold text-gray-900">{post.score}</span>
                          <button
                            onClick={() => handleVote(post.id, -1)}
                            className={`p-1 rounded ${
                              userVote === -1 ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-500'
                            }`}
                            aria-label="Downvote"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <UserAvatar
                              user={{ id: post.author_id, full_name: post.author_name, avatar_url: post.author_avatar_url }}
                              size="xs"
                            />
                            <span className="font-medium text-gray-700">{post.author_name}</span>
                            <span>in</span>
                            <span className="text-blue-600 font-medium">{post.category || 'General'}</span>
                            <span>-</span>
                            <span>{formatRelativeTime(post.created_at)}</span>
                            {post.is_pinned && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Pinned</span>
                            )}
                            {post.is_locked && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Locked</span>
                            )}
                          </div>
                          <Link to={`/community/${post.id}`} className="block mt-2">
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-700 transition-colors">
                              {post.title}
                            </h3>
                            <p className="text-gray-600 mt-1 line-clamp-2">
                              {post.body}
                            </p>
                          </Link>
                          <div className="flex items-center gap-3 mt-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {post.comment_count} comments
                            </div>
                            <Link to={`/community/${post.id}`} className="text-blue-600 hover:text-blue-700">
                              Join discussion
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Guidelines</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Keep posts respectful and constructive.</li>
                <li>Share ride details only after matching.</li>
                <li>Use Safety for incident reports.</li>
                <li>Downvote spam, upvote helpful info.</li>
              </ul>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Why this space</h3>
              <p className="text-sm text-gray-600">
                This forum is for drivers and passengers to share tips, questions, and ideas that
                improve the carpool experience.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
