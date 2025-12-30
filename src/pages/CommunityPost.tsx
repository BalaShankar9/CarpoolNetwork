import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageCircle, ThumbsUp, ThumbsDown, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/shared/UserAvatar';

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

  const canComment = useMemo(() => !!user && post && !post.is_locked, [user, post]);

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
        resolvedPost = {
          id: basePost.id,
          author_id: basePost.author_id,
          author_name: basePost.author?.full_name || 'Community Member',
          author_avatar_url: basePost.author?.avatar_url ?? null,
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
      setComments((commentData || []) as CommunityComment[]);
    }

    if (user) {
      const { data: voteData } = await supabase
        .from('community_post_votes')
        .select('vote')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (voteData?.vote) {
        setVote(voteData.vote);
      }
    }

    setLoading(false);
  };

  const handleVote = async (nextVote: number) => {
    if (!user || !postId || !post) return;

    const newVote = vote === nextVote ? 0 : nextVote;

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
      await loadPost();
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-600">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-gray-600">{error || 'Post not found.'}</p>
        <Link to="/community" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 mt-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/community" className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Community
      </Link>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleVote(1)}
              className={`p-1 rounded ${
                vote === 1 ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-blue-600'
              }`}
              aria-label="Upvote"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900">{post.score}</span>
            <button
              onClick={() => handleVote(-1)}
              className={`p-1 rounded ${
                vote === -1 ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-500'
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
              <span>-</span>
              <span className="text-blue-600 font-medium">{post.category || 'General'}</span>
              <span>-</span>
              <span>{formatRelativeTime(post.created_at)}</span>
              {post.is_locked && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Locked</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">{post.title}</h1>
            <p className="text-gray-700 mt-3 whitespace-pre-wrap">{post.body}</p>
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
              <MessageCircle className="w-4 h-4" />
              {post.comment_count} comments
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Comments</h2>

        {canComment ? (
          <div className="space-y-3">
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              rows={4}
              placeholder="Add your comment"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
            <button
              onClick={handleCommentSubmit}
              disabled={submitting || !commentText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            {post.is_locked ? 'Comments are locked for this post.' : 'Sign in to join the discussion.'}
          </p>
        )}

        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-600">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <UserAvatar user={comment.author} size="xs" />
                  <span className="font-medium text-gray-700">{comment.author.full_name}</span>
                  <span>-</span>
                  <span>{formatRelativeTime(comment.created_at)}</span>
                </div>
                <p className="text-gray-700 mt-2 whitespace-pre-wrap">{comment.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
