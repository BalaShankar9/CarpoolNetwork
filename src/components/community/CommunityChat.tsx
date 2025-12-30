import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Send, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../shared/UserAvatar';

interface CommunityChatMessage {
  id: string;
  sender_id: string;
  body: string;
  type: 'TEXT' | 'SYSTEM';
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

const MESSAGE_LIMIT = 120;

const formatTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (sameDay) return time;

  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${day} ${time}`;
};

export default function CommunityChat() {
  const { user, isEmailVerified } = useAuth();
  const [messages, setMessages] = useState<CommunityChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = !!user && isEmailVerified;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from('community_chat_messages')
      .select('id, sender_id, body, type, created_at, sender:profiles(id, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(MESSAGE_LIMIT);

    if (loadError) {
      console.error('Failed to load community chat messages', loadError);
      setError('Unable to load community chat messages.');
      setLoading(false);
      return;
    }

    const ordered = (data || []).slice().reverse() as CommunityChatMessage[];
    setMessages(ordered);
    setLoading(false);
    setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]);

  const fetchMessage = useCallback(async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from('community_chat_messages')
      .select('id, sender_id, body, type, created_at, sender:profiles(id, full_name, avatar_url)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Failed to fetch community chat message', fetchError);
      return null;
    }

    return data as CommunityChatMessage | null;
  }, []);

  const appendMessage = useCallback((message: CommunityChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      const next = [...prev, message];
      if (next.length > MESSAGE_LIMIT) {
        return next.slice(next.length - MESSAGE_LIMIT);
      }
      return next;
    });
    setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel('community-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_chat_messages',
        },
        async (payload) => {
          const incoming = payload.new as CommunityChatMessage;
          const hydrated = await fetchMessage(incoming.id);
          if (hydrated) {
            appendMessage(hydrated);
          } else {
            appendMessage(incoming);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_chat_messages',
        },
        (payload) => {
          const removed = payload.old as { id: string };
          setMessages((prev) => prev.filter((message) => message.id !== removed.id));
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appendMessage, fetchMessage]);

  const sendMessage = async () => {
    if (!user || !isEmailVerified || sending) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      setError('Message is too long. Please keep it under 2000 characters.');
      return;
    }

    setSending(true);
    setError(null);

    const { error: sendError } = await supabase
      .from('community_chat_messages')
      .insert({ sender_id: user.id, body: trimmed, type: 'TEXT' });

    if (sendError) {
      console.error('Failed to send community chat message', sendError);
      setError('Unable to send message. Please try again.');
    } else {
      setDraft('');
    }

    setSending(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const messageCountLabel = useMemo(() => {
    if (loading) return 'Loading messages';
    if (messages.length === 0) return 'No messages yet';
    return `${messages.length} recent messages`;
  }, [loading, messages.length]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="border-b border-gray-200 px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Community Live Chat</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {connected ? 'Live' : 'Connecting'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Open room for all members. Keep it respectful and ride-focused.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{messageCountLabel}</span>
          <button
            onClick={loadMessages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-4 max-h-[60vh] overflow-y-auto space-y-4">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="animate-spin w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Loading chat messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600">Start the conversation with the community.</p>
          </div>
        ) : (
          messages.map((message) => {
            if (message.type === 'SYSTEM') {
              return (
                <div key={message.id} className="text-center text-xs text-gray-500">
                  {message.body}
                </div>
              );
            }

            const isOwn = message.sender_id === user?.id;
            const displayName = message.sender?.full_name || (isOwn ? 'You' : 'Member');
            const avatarUser = message.sender
              ? {
                  id: message.sender.id,
                  full_name: message.sender.full_name,
                  avatar_url: message.sender.avatar_url ?? undefined,
                }
              : {
                  id: message.sender_id,
                  full_name: displayName,
                  avatar_url: undefined,
                };

            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                  <div className="mr-3 mt-1">
                    <UserAvatar user={avatarUser} size="xs" />
                  </div>
                )}
                <div className={`max-w-[75%] ${isOwn ? 'text-right' : 'text-left'}`}>
                  {!isOwn && <div className="text-xs text-gray-500 mb-1">{displayName}</div>}
                  <div
                    className={`rounded-lg px-4 py-2 shadow-sm ${
                      isOwn ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                    <div className={`text-[11px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        {!user && (
          <div className="text-sm text-gray-600 mb-3">
            Sign in to join the live chat.
          </div>
        )}
        {user && !isEmailVerified && (
          <div className="flex items-center gap-2 text-amber-600 text-sm mb-3 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>Verify your email to send messages</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={canSend ? 'Share an update with the community...' : 'Sign in and verify email to chat'}
            disabled={!canSend || sending}
            rows={2}
            maxLength={2000}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none disabled:bg-gray-100"
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Press Enter to send, Shift+Enter for a new line.</span>
            <span>{draft.length}/2000</span>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!draft.trim() || !canSend || sending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
