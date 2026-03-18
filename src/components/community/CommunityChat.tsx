import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  ArrowDown,
  MessageSquare,
  RefreshCw,
  Send,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../shared/UserAvatar';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MESSAGE_LIMIT = 120;
const MAX_CHARS = 2000;
const SCROLL_THRESHOLD = 120; // px from bottom before we consider "scrolled up"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFullTimestamp = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDateLabel = (value: string): string => {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (msgDate.getTime() === today.getTime()) return 'Today';
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year:
      date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/** Two timestamps belong to the same calendar day */
const sameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

/** Character count colour */
const charCountColor = (len: number) => {
  if (len >= 1900) return 'text-red-500';
  if (len >= 1500) return 'text-amber-500';
  return 'text-gray-400';
};

/* ------------------------------------------------------------------ */
/*  Skeleton loader for initial load                                   */
/* ------------------------------------------------------------------ */

function MessageSkeleton({ align }: { align: 'left' | 'right' }) {
  return (
    <div
      className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'} animate-pulse`}
    >
      {align === 'left' && (
        <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 mt-1 shrink-0" />
      )}
      <div
        className={`space-y-2 ${align === 'right' ? 'items-end' : 'items-start'} flex flex-col`}
      >
        {align === 'left' && (
          <div className="h-3 w-20 bg-gray-200 rounded" />
        )}
        <div
          className={`h-10 rounded-2xl bg-gray-200 ${
            align === 'right' ? 'w-44' : 'w-56'
          }`}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CommunityChat() {
  const { user, isEmailVerified } = useAuth();
  const [messages, setMessages] = useState<CommunityChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = !!user && isEmailVerified;

  /* ---- Scroll helpers ---- */

  const checkIfNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      messagesEndRef.current?.scrollIntoView({ behavior });
      setUnreadCount(0);
    },
    []
  );

  const handleScroll = useCallback(() => {
    const near = checkIfNearBottom();
    setIsNearBottom(near);
    if (near) setUnreadCount(0);
  }, [checkIfNearBottom]);

  /* ---- Data loading ---- */

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from('community_chat_messages')
      .select(
        'id, sender_id, body, type, created_at, sender:profiles(id, full_name, avatar_url)'
      )
      .order('created_at', { ascending: false })
      .limit(MESSAGE_LIMIT);

    if (loadError) {
      console.error('Failed to load community chat messages', loadError);
      setError('Unable to load community chat messages.');
      setLoading(false);
      return;
    }

    const ordered = ((data || []) as any[])
      .map((msg) => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
      }))
      .slice()
      .reverse() as CommunityChatMessage[];
    setMessages(ordered);
    setLoading(false);
    setTimeout(() => scrollToBottom('instant'), 50);
  }, [scrollToBottom]);

  const fetchMessage = useCallback(async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from('community_chat_messages')
      .select(
        'id, sender_id, body, type, created_at, sender:profiles(id, full_name, avatar_url)'
      )
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Failed to fetch community chat message', fetchError);
      return null;
    }

    return data as CommunityChatMessage | null;
  }, []);

  const appendMessage = useCallback(
    (message: CommunityChatMessage) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        const next = [...prev, message];
        if (next.length > MESSAGE_LIMIT) {
          return next.slice(next.length - MESSAGE_LIMIT);
        }
        return next;
      });

      // If user is near the bottom, auto-scroll. Otherwise bump unread count.
      if (checkIfNearBottom()) {
        setTimeout(() => scrollToBottom('smooth'), 50);
      } else {
        setUnreadCount((c) => c + 1);
      }
    },
    [scrollToBottom, checkIfNearBottom]
  );

  /* ---- Lifecycle ---- */

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
          setMessages((prev) =>
            prev.filter((message) => message.id !== removed.id)
          );
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appendMessage, fetchMessage]);

  /* ---- Auto-resize textarea ---- */

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const maxRows = 4;
    const lineHeight = 24;
    const maxHeight = lineHeight * maxRows;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, [draft]);

  /* ---- Send ---- */

  const sendMessage = async () => {
    if (!user || !isEmailVerified || sending) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_CHARS) {
      setError('Message is too long. Please keep it under 2,000 characters.');
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
    textareaRef.current?.focus();
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setTimeout(() => setRefreshing(false), 600);
  };

  /* ---- Derived values ---- */

  const messageCountLabel = useMemo(() => {
    if (loading) return 'Loading messages';
    if (messages.length === 0) return 'No messages yet';
    return `${messages.length} messages`;
  }, [loading, messages.length]);

  /* ---- Message grouping logic ---- */

  const isGroupedWithPrevious = (
    msg: CommunityChatMessage | undefined,
    idx: number,
    arr: CommunityChatMessage[]
  ): boolean => {
    if (!msg || idx <= 0 || idx >= arr.length) return false;
    const prev = arr[idx - 1];
    if (!prev) return false;
    if (prev.type === 'SYSTEM' || msg.type === 'SYSTEM') return false;
    if (prev.sender_id !== msg.sender_id) return false;
    // Group if within 3 minutes
    const gap =
      new Date(msg.created_at).getTime() -
      new Date(prev.created_at).getTime();
    return gap < 3 * 60 * 1000;
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* ---------------------------------------------------------- */}
      {/*  HEADER                                                     */}
      {/* ---------------------------------------------------------- */}
      <div className="relative border-b border-gray-200/60 bg-white/80 backdrop-blur-lg px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between z-10">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-200/50">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Community Chat
              </h2>
              {/* Pulsing live dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    connected
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-gray-300'
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    connected ? 'bg-emerald-500' : 'bg-gray-400'
                  }`}
                />
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Open room &middot; Keep it respectful and ride-focused
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {/* Connection badge */}
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              connected
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {connected ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {connected ? 'Connected' : 'Reconnecting'}
          </span>

          {/* Message count pill */}
          <span className="hidden sm:inline-flex text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {messageCountLabel}
          </span>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Refresh messages"
            title="Refresh messages"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-500 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  ERROR BANNER                                                */}
      {/* ---------------------------------------------------------- */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700 text-xs font-medium"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/*  MESSAGE AREA                                                */}
      {/* ---------------------------------------------------------- */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Community chat messages"
        className="relative flex-1 p-4 max-h-[60vh] overflow-y-auto scroll-smooth"
        style={{
          backgroundImage:
            'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundColor: '#f9fafb',
        }}
      >
        {/* --- Loading skeleton --- */}
        {loading ? (
          <div className="space-y-5 py-2">
            <MessageSkeleton align="left" />
            <MessageSkeleton align="right" />
            <MessageSkeleton align="left" />
            <MessageSkeleton align="right" />
            <MessageSkeleton align="left" />
          </div>
        ) : messages.length === 0 ? (
          /* --- Empty state --- */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                <MessageSquare className="w-9 h-9 text-teal-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center rotate-12">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="absolute -bottom-1 -left-2 w-7 h-7 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center -rotate-12">
                <Send className="w-3.5 h-3.5 text-amber-600" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Start the conversation!
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Be the first to say hello. Share ride tips, coordinate
              carpools, or just chat with fellow commuters.
            </p>
          </div>
        ) : (
          /* --- Messages --- */
          messages.map((message, idx, arr) => {
            const showDateSep =
              idx === 0 ||
              !sameDay(arr[idx - 1].created_at, message.created_at);
            const grouped = isGroupedWithPrevious(message, idx, arr);

            return (
              <div key={message.id}>
                {/* Date separator */}
                {showDateSep && (
                  <div className="flex items-center justify-center my-5 first:mt-0">
                    <div className="h-px flex-1 bg-gray-200/70" />
                    <span className="mx-3 text-[11px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                      {getDateLabel(message.created_at)}
                    </span>
                    <div className="h-px flex-1 bg-gray-200/70" />
                  </div>
                )}

                {/* System message */}
                {message.type === 'SYSTEM' ? (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] text-gray-500 bg-gray-100/80 backdrop-blur-sm px-3 py-1 rounded-full max-w-[80%] text-center">
                      {message.body}
                    </span>
                  </div>
                ) : (
                  /* User message */
                  (() => {
                    const isOwn = message.sender_id === user?.id;
                    const displayName =
                      message.sender?.full_name ||
                      (isOwn ? 'You' : 'Member');
                    const avatarUser = message.sender
                      ? {
                          id: message.sender.id,
                          full_name: message.sender.full_name,
                          avatar_url:
                            message.sender.avatar_url ?? undefined,
                        }
                      : {
                          id: message.sender_id,
                          full_name: displayName,
                          avatar_url: undefined,
                        };

                    return (
                      <div
                        className={`flex ${
                          isOwn ? 'justify-end' : 'justify-start'
                        } ${grouped ? 'mt-0.5' : 'mt-3'} first:mt-0 group`}
                        style={{
                          animation: 'chatSlideUp 0.25s ease-out both',
                        }}
                      >
                        {/* Avatar for others (only first in group) */}
                        {!isOwn && (
                          <div className="mr-2.5 mt-auto w-8 shrink-0">
                            {!grouped ? (
                              <UserAvatar user={avatarUser} size="xs" />
                            ) : (
                              <div className="w-8" />
                            )}
                          </div>
                        )}

                        <div
                          className={`max-w-[75%] ${
                            isOwn ? 'items-end' : 'items-start'
                          } flex flex-col`}
                        >
                          {/* Sender name (first in group, other users only) */}
                          {!isOwn && !grouped && (
                            <span className="text-[11px] font-medium text-gray-500 mb-1 ml-1">
                              {displayName}
                            </span>
                          )}

                          {/* Bubble */}
                          <div className="relative" title={formatFullTimestamp(message.created_at)}>
                            <div
                              className={`rounded-2xl px-4 py-2.5 transition-shadow ${
                                isOwn
                                  ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-200/30'
                                  : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                              } ${
                                isOwn
                                  ? grouped
                                    ? 'rounded-tr-md'
                                    : ''
                                  : grouped
                                    ? 'rounded-tl-md'
                                    : ''
                              }`}
                            >
                              <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                {message.body}
                              </p>
                            </div>

                            {/* Timestamp: visible at end of group, hover-revealed otherwise */}
                            {(() => {
                              const isLastInGroup =
                                idx === arr.length - 1 ||
                                !isGroupedWithPrevious(arr[idx + 1], idx + 1, arr);
                              return (
                                <span
                                  className={`block text-[10px] mt-1 ${
                                    isOwn
                                      ? 'text-right text-gray-400'
                                      : 'text-left text-gray-400'
                                  } ${
                                    isLastInGroup
                                      ? 'opacity-60'
                                      : 'opacity-0 group-hover:opacity-100'
                                  } transition-opacity`}
                                >
                                  {formatTime(message.created_at)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* ---- Scroll-to-bottom FAB ---- */}
        {!isNearBottom && !loading && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="sticky bottom-3 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900/80 backdrop-blur-sm text-white text-xs font-medium shadow-lg hover:bg-gray-900 transition-all animate-bounce-gentle"
            aria-label={
              unreadCount > 0
                ? `${unreadCount} new messages, scroll to bottom`
                : 'Scroll to bottom'
            }
          >
            <ArrowDown className="w-3.5 h-3.5" />
            {unreadCount > 0
              ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}`
              : 'Scroll to bottom'}
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  INPUT AREA                                                  */}
      {/* ---------------------------------------------------------- */}
      <div className="border-t border-gray-200/60 bg-white px-4 py-3">
        {/* Auth prompts */}
        {!user && (
          <div className="text-sm text-gray-500 mb-3 flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl">
            <Users className="w-4 h-4 text-gray-400 shrink-0" />
            Sign in to join the live chat.
          </div>
        )}
        {user && !isEmailVerified && (
          <div className="flex items-center gap-2 text-amber-700 text-sm mb-3 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Verify your email to send messages.</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2"
        >
          {/* Expandable textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                canSend
                  ? 'Type a message...'
                  : 'Sign in and verify email to chat'
              }
              disabled={!canSend || sending}
              rows={1}
              maxLength={MAX_CHARS}
              aria-label="Chat message"
              className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:bg-white focus:outline-none resize-none disabled:bg-gray-100 disabled:text-gray-400 text-sm leading-6 transition-all placeholder:text-gray-400"
              style={{ maxHeight: '96px', minHeight: '44px' }}
            />
            {/* Character count */}
            {draft.length > 0 && (
              <span
                className={`absolute right-3 bottom-1.5 text-[10px] font-medium ${charCountColor(
                  draft.length
                )} transition-colors`}
              >
                {draft.length}/{MAX_CHARS}
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!draft.trim() || !canSend || sending}
            className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-200/40 hover:shadow-lg hover:shadow-teal-200/50 active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 -translate-x-[1px]" />
            )}
          </button>
        </form>

        {/* Input hint */}
        {canSend && (
          <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono border border-gray-200">Enter</kbd> to send,{' '}
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono border border-gray-200">Shift+Enter</kbd> for a new line
          </p>
        )}
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  Inline keyframes (scoped CSS)                               */}
      {/* ---------------------------------------------------------- */}
      <style>{`
        @keyframes chatSlideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
