import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Edit,
  FileText,
  Flag,
  Loader,
  MapPin,
  Mic,
  MoreVertical,
  Paperclip,
  Pin,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  UserX,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { checkRateLimit, recordRateLimitAction } from '../../lib/rateLimiting';
import {
  applyIncomingMessageToConversations,
  dedupeMessages,
  extractUrls,
  formatMessagePreview,
  markConversationRead,
} from '../../lib/chatUtils';
import { NotificationsService } from '../../services/notificationsService';
import ClickableUserProfile from '../shared/ClickableUserProfile';
import ReportUserModal from '../shared/ReportUserModal';
import { analytics } from '../../lib/analytics';

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
}

type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'FILE'
  | 'VOICE'
  | 'SYSTEM'
  | 'RIDE_CARD'
  | 'BOOKING_CARD';

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled' | 'queued';

interface Attachment {
  url?: string | null;
  path: string;
  bucket: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string | null;
  filename?: string | null;
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

interface MessageMetadata {
  link_preview?: LinkPreview;
  ride_id?: string;
  booking_id?: string;
  location?: { lat: number; lng: number; label?: string };
  scheduled_for?: string;
}

interface Reaction {
  id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  message_id?: string;
}

interface ConversationMember {
  user_id: string;
  role: string;
  last_seen_at?: string | null;
  profile: Profile;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type: MessageType;
  created_at: string;
  reply_to_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  client_generated_id?: string | null;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
  sender?: Profile;
  reactions?: Reaction[];
  reply_to?: ChatMessage | null;
  status?: MessageStatus;
}

interface ConversationSummary {
  id: string;
  type: string;
  ride_id?: string | null;
  trip_request_id?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  last_sender_id?: string | null;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  unread_count: number;
  members: ConversationMember[];
}

interface NewChatSystemProps {
  initialConversationId?: string;
}

interface ComposerAttachment {
  file: File;
  previewUrl?: string;
  type: MessageType;
}

interface QueueItem {
  id: string;
  conversationId: string;
  body: string | null;
  messageType: MessageType;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
  replyToId?: string | null;
  clientGeneratedId: string;
  createdAt: string;
  sendAt: string;
  status: 'scheduled' | 'queued' | 'failed';
}

const MESSAGE_PAGE_SIZE = 40;
const EDIT_WINDOW_MINUTES = 15;
const QUEUE_STORAGE_KEY = 'chat_message_queue_v1';
const TYPING_DEBOUNCE_MS = 1500;

const emojiOptions = ['👍', '❤️', '😂', '🔥', '👏', '😮', '🙏'];

const generateClientId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isEditable = (message: ChatMessage) => {
  if (!message.created_at) return false;
  const created = new Date(message.created_at).getTime();
  return Date.now() - created <= EDIT_WINDOW_MINUTES * 60 * 1000;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const formatDay = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

const toLocalInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const serializeQueue = (items: QueueItem[]) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
};

const loadQueue = (): QueueItem[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as QueueItem[]) : [];
  } catch {
    return [];
  }
};

export default function NewChatSystem({ initialConversationId }: NewChatSystemProps) {
  const { user, isEmailVerified, profile, session } = useAuth();
  const { refreshUnreadMessages } = useRealtime();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [schemaCacheError, setSchemaCacheError] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [messageQuery, setMessageQuery] = useState('');
  const [messageResults, setMessageResults] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [queueItems, setQueueItems] = useState<QueueItem[]>(() => loadQueue());
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [readStates, setReadStates] = useState<Record<string, string>>({});
  const [reactionsOpenFor, setReactionsOpenFor] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [blockedState, setBlockedState] = useState<{ blocked: boolean; blockedBy: boolean }>({
    blocked: false,
    blockedBy: false,
  });
  const [reportingUser, setReportingUser] = useState<Profile | null>(null);
  const [reportContext, setReportContext] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const conversationChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const overviewChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    serializeQueue(queueItems);
  }, [queueItems]);

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const visible = showArchived ? conversations : conversations.filter((conv) => !conv.archived);
    if (!query) return visible;
    return visible.filter((conv) => {
      const names = conv.members.map((m) => m.profile.full_name.toLowerCase()).join(' ');
      return (
        names.includes(query) ||
        (conv.last_message_preview || '').toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery, showArchived]);

  const otherMembers = useMemo(() => {
    if (!selectedConversation || !user) return [];
    return selectedConversation.members.filter((m) => m.user_id !== user.id);
  }, [selectedConversation, user]);

  const conversationTitle = useMemo(() => {
    if (!selectedConversation) return '';
    const others = selectedConversation.members.filter((m) => m.user_id !== user?.id);
    if (!others.length) return 'You';
    if (others.length === 1) return others[0].profile.full_name;
    return others.map((m) => m.profile.full_name).join(', ');
  }, [selectedConversation, user]);

  const conversationFilter = useMemo(() => {
    if (!conversations.length) return null;
    const ids = conversations.map((conv) => conv.id).join(',');
    return ids ? `conversation_id=in.(${ids})` : null;
  }, [conversations]);

  const combinedMessages = useMemo(() => {
    const queueForConversation = queueItems.filter(
      (item) => item.conversationId === selectedConversationId
    );
    const base = [...messages];
    const ids = new Set(messages.map((msg) => msg.id));
    const clientIds = new Set(messages.map((msg) => msg.client_generated_id).filter(Boolean) as string[]);

    queueForConversation.forEach((item) => {
      if (ids.has(item.id)) return;
      if (item.clientGeneratedId && clientIds.has(item.clientGeneratedId)) return;
      base.push({
        id: item.id,
        conversation_id: item.conversationId,
        sender_id: user?.id || '',
        body: item.body,
        message_type: item.messageType,
        created_at: item.createdAt,
        metadata: item.metadata,
        attachments: item.attachments,
        client_generated_id: item.clientGeneratedId,
        status: item.status === 'scheduled' ? 'scheduled' : 'queued',
      } as ChatMessage);
    });

    const merged = dedupeMessages(base);
    return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, queueItems, selectedConversationId, user]);

  const queueMap = useMemo(() => {
    const map = new Map<string, QueueItem>();
    queueItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [queueItems]);

  const renderedItems = useMemo(() => {
    const items: Array<{ type: 'date' | 'message'; id: string; date?: string; message?: ChatMessage }> = [];
    let lastDate = '';
    for (const message of combinedMessages) {
      const day = new Date(message.created_at).toDateString();
      if (day !== lastDate) {
        items.push({ type: 'date', id: `date-${day}`, date: formatDay(message.created_at) });
        lastDate = day;
      }
      items.push({ type: 'message', id: message.id || message.client_generated_id || `temp-${Date.now()}`, message });
    }
    return items;
  }, [combinedMessages]);

  const rowVirtualizer = useVirtualizer({
    count: renderedItems.length,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 88,
    overscan: 6,
  });

  const isAtBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!messagesContainerRef.current) return;
    if (renderedItems.length === 0) return;
    rowVirtualizer.scrollToIndex(renderedItems.length - 1, { align: 'end', behavior: behavior as 'smooth' | 'auto' });
  };

  const loadConversations = async (isRetry = false) => {
    if (!user) return;
    setConversationsError(null);
    setSchemaCacheError(false);
    setFallbackFailed(false);
    
    // Track retry count to prevent infinite retry loops
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }
    
    try {
      if (import.meta.env.DEV) {
        console.log('[DEV] loadConversations - Calling RPC: get_conversations_overview');
      }
      const result = await supabase.rpc('get_conversations_overview');
      if (!result) {
        throw new Error('Conversation overview RPC unavailable');
      }
      const { data, error } = result;
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[DEV] loadConversations - RPC Error:', {
            rpc: 'get_conversations_overview',
            code: (error as any)?.code,
            message: error.message,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            fullError: error,
          });
        }
        throw error;
      }
      if (import.meta.env.DEV) {
        console.log('[DEV] loadConversations - Success, conversations:', data?.length || 0);
      }
      const normalized = (data || []).map((conv: any) => ({
        ...conv,
        pinned: Boolean(conv.pinned),
        muted: Boolean(conv.muted),
        archived: Boolean(conv.archived),
        unread_count: Number(conv.unread_count || 0),
        members: conv.members || [],
      }));
      setConversations(normalized);
      setConversationsError(null);
      setSchemaCacheError(false);
      setFallbackFailed(false);
      setRetryCount(0); // Reset retry count on success
    } catch (error: any) {
      console.error('Error loading conversations via RPC:', error);
      const errorCode = error?.code || 'UNKNOWN';
      
      // FALLBACK: If RPC fails with PGRST202 or schema errors, use direct queries
      if (errorCode === 'PGRST202' || errorCode === '42883' || error?.message?.includes('schema') || error?.message?.includes('function')) {
        console.warn('[Messaging] RPC unavailable, attempting fallback query...');
        setSchemaCacheError(true);
        await loadConversationsFallback();
        return;
      }
      
      const errorMsg = error?.message || 'Failed to load conversations';
      setConversationsError(`${errorMsg} (${errorCode})`);
      setSchemaCacheError(false);

      if (import.meta.env.DEV) {
        toast.error(`Unable to load conversations. Error: ${errorCode}`);
      } else {
        toast.error('Unable to load conversations. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fallback function when RPC is unavailable - direct RLS-safe queries
  const loadConversationsFallback = async () => {
    if (!user) return;
    try {
      if (import.meta.env.DEV) {
        console.log('[DEV] loadConversationsFallback - Using direct queries');
      }

      // Step 1: Get conversations where user is a member
      const { data: memberRows, error: memberError } = await supabase
        .from('conversation_members')
        .select('conversation_id, role, last_seen_at')
        .eq('user_id', user.id);

      if (memberError) throw memberError;
      if (!memberRows || memberRows.length === 0) {
        setConversations([]);
        setConversationsError(null);
        setLoading(false);
        return;
      }

      const conversationIds = memberRows.map(m => m.conversation_id);

      // Step 2: Get conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('id, type, ride_id, trip_request_id, created_at, updated_at')
        .in('id', conversationIds);

      if (convError) throw convError;

      // Step 3: Get all members for these conversations (for names/avatars)
      const { data: allMembers, error: allMembersError } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          user_id,
          role,
          last_seen_at,
          profile:profiles(id, full_name, avatar_url, profile_photo_url)
        `)
        .in('conversation_id', conversationIds);

      if (allMembersError) throw allMembersError;

      // Step 4: Get last message per conversation
      const { data: lastMessages, error: lastMsgError } = await supabase
        .from('chat_messages')
        .select('conversation_id, body, sender_id, created_at, message_type')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      // Don't throw on last message error - just continue without previews
      const lastMessageMap = new Map<string, any>();
      if (!lastMsgError && lastMessages) {
        // Get first (most recent) message per conversation
        lastMessages.forEach(msg => {
          if (!lastMessageMap.has(msg.conversation_id)) {
            lastMessageMap.set(msg.conversation_id, msg);
          }
        });
      }

      // Step 5: Compute unread counts (messages after last_seen_at)
      const userMemberMap = new Map(memberRows.map(m => [m.conversation_id, m]));

      // Build conversation summaries
      const summaries: ConversationSummary[] = (convData || []).map(conv => {
        const userMember = userMemberMap.get(conv.id);
        const lastSeenAt = userMember?.last_seen_at;
        const members = (allMembers || [])
          .filter(m => m.conversation_id === conv.id)
          .map(m => ({
            user_id: m.user_id,
            role: m.role,
            last_seen_at: m.last_seen_at,
            profile: m.profile as Profile || { id: m.user_id, full_name: 'Unknown' },
          }));

        const lastMsg = lastMessageMap.get(conv.id);
        
        // Estimate unread count (0 if no last message or if last seen is after last message)
        let unreadCount = 0;
        if (lastMsg && lastSeenAt) {
          const lastMsgTime = new Date(lastMsg.created_at).getTime();
          const lastSeenTime = new Date(lastSeenAt).getTime();
          if (lastMsgTime > lastSeenTime && lastMsg.sender_id !== user.id) {
            unreadCount = 1; // Simplified - just indicate there are unreads
          }
        } else if (lastMsg && !lastSeenAt && lastMsg.sender_id !== user.id) {
          unreadCount = 1;
        }

        return {
          id: conv.id,
          type: conv.type || 'DM',
          ride_id: conv.ride_id,
          trip_request_id: conv.trip_request_id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message_at: lastMsg?.created_at || null,
          last_message_preview: lastMsg?.body ? formatMessagePreview(lastMsg.body, lastMsg.message_type as MessageType) : null,
          last_sender_id: lastMsg?.sender_id || null,
          pinned: false,
          muted: false,
          archived: false,
          unread_count: unreadCount,
          members,
        };
      });

      // Sort by last message time
      summaries.sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });

      setConversations(summaries);
      setConversationsError(null);
      setFallbackFailed(false);
      // Keep schema error flag true to show the "updating" banner but fallback worked
      if (import.meta.env.DEV) {
        console.log('[DEV] loadConversationsFallback - Success, conversations:', summaries.length);
      }
    } catch (fallbackError: any) {
      console.error('Fallback query also failed:', fallbackError);
      const errorMsg = fallbackError?.message || 'Unable to load messages';
      setConversationsError(`${errorMsg}. The messaging system may be temporarily unavailable.`);
      setSchemaCacheError(true);
      setFallbackFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const loadReadState = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('message_reads')
        .select('user_id,last_read_at')
        .eq('conversation_id', conversationId);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((row: any) => {
        if (row.user_id) {
          map[row.user_id] = row.last_read_at || '';
        }
      });
      setReadStates(map);
    } catch (error) {
      console.error('Failed to load read state:', error);
    }
  };

  const loadMessages = async (conversationId: string, reset = true) => {
    if (messagesLoading) return;
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      if (import.meta.env.DEV) {
        console.log('[DEV] loadMessages - Query:', {
          table: 'chat_messages',
          select: '*, sender:profiles(...), reply_to:chat_messages(...), reactions:message_reactions(...)',
          filters: {
            conversation_id: conversationId,
            order: 'created_at DESC',
            limit: MESSAGE_PAGE_SIZE,
            reset,
          },
        });
      }
      let query = supabase
        .from('chat_messages')
        .select(
          '*, sender:profiles(id, full_name, avatar_url, profile_photo_url), reply_to:chat_messages(id, body, sender_id, message_type, attachments, metadata, deleted_at), reactions:message_reactions(id, user_id, emoji, created_at)'
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (!reset && messages.length > 0) {
        const oldest = messages[0];
        query = query.lt('created_at', oldest.created_at);
      }

      const { data, error } = await query;
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[DEV] loadMessages - Query Error:', {
            table: 'chat_messages',
            code: (error as any)?.code,
            message: error.message,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            fullError: error,
          });
        }
        throw error;
      }

      if (import.meta.env.DEV) {
        console.log('[DEV] loadMessages - Success, messages:', data?.length || 0);
      }

      let next = (data || []).reverse() as ChatMessage[];
      if (user && next.length) {
        const ids = next.map((msg) => msg.id);
        const { data: deletions } = await supabase
          .from('message_deletions')
          .select('message_id')
          .eq('user_id', user.id)
          .in('message_id', ids);
        const hidden = new Set((deletions || []).map((row: any) => row.message_id));
        next = next.filter((msg) => !hidden.has(msg.id));
      }
      setHasMore(next.length === MESSAGE_PAGE_SIZE);

      if (reset) {
        setMessages(next);
      } else {
        setMessages((prev) => dedupeMessages([...next, ...prev]));
      }
      setMessagesError(null);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      const errorMsg = error?.message || 'Failed to load messages';
      const errorCode = error?.code || 'UNKNOWN';
      setMessagesError(`${errorMsg} (${errorCode})`);

      if (import.meta.env.DEV) {
        toast.error(`Unable to load messages. Error: ${errorCode}`);
      } else {
        toast.error('Unable to load messages. Please try again.');
      }
    } finally {
      setMessagesLoading(false);
    }
  };

  const updateReadReceipt = async (conversationId: string, latestMessage: ChatMessage | undefined) => {
    if (!user || !latestMessage) return;
    try {
      await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_last_read_message_id: latestMessage.id,
        p_last_read_at: latestMessage.created_at,
      });
      setReadStates((prev) => ({ ...prev, [user.id]: latestMessage.created_at }));
      setConversations((prev) => markConversationRead(prev, conversationId));
      refreshUnreadMessages();
    } catch (error) {
      console.error('Failed to update read receipt:', error);
    }
  };

  const updatePresence = async (conversationId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('conversation_members')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Failed to update presence timestamp:', error);
    }
  };

  const updateConversationPreview = (conversationId: string, message: ChatMessage, incrementUnread: boolean) => {
    const normalized = { ...message, conversation_id: conversationId };
    setConversations((prev) =>
      applyIncomingMessageToConversations(prev, normalized, { incrementUnread })
    );
  };

  // Helper function to sort messages by created_at
  const sortMessages = (messages: ChatMessage[]) => {
    return [...messages].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  const upsertMessage = (incoming: ChatMessage) => {
    setMessages((prev) => {
      const byId = prev.findIndex((msg) => msg.id === incoming.id);
      if (byId !== -1) {
        const next = [...prev];
        next[byId] = { ...prev[byId], ...incoming };
        return sortMessages(next); // Sort after update
      }
      if (incoming.client_generated_id) {
        const byClient = prev.findIndex(
          (msg) => msg.client_generated_id === incoming.client_generated_id
        );
        if (byClient !== -1) {
          const next = [...prev];
          next[byClient] = { ...prev[byClient], ...incoming };
          return sortMessages(next); // Sort after update
        }
      }
      // Sort after appending new message
      return sortMessages([...prev, incoming]);
    });
  };

  const resolveAttachmentUrls = async (items: ChatMessage[]) => {
    const updated: ChatMessage[] = [];
    for (const message of items) {
      if (!message.attachments || message.attachments.length === 0) continue;
      if (!message.attachments.some((attachment) => !attachment.url)) continue;
      const attachments = await Promise.all(
        message.attachments.map(async (attachment) => {
          if (attachment.url) return attachment;
          const { data } = await supabase.storage
            .from(attachment.bucket)
            .createSignedUrl(attachment.path, 3600);
          return { ...attachment, url: data?.signedUrl || attachment.url };
        })
      );
      updated.push({ ...message, attachments });
    }

    if (updated.length) {
      setMessages((prev) =>
        prev.map((msg) => {
          const found = updated.find((u) => u.id === msg.id);
          return found ? found : msg;
        })
      );
    }
  };

  const hydrateReplyTo = async (message: ChatMessage) => {
    if (!message.reply_to_id || message.reply_to) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, body, sender_id, message_type, attachments, metadata, deleted_at')
        .eq('id', message.reply_to_id)
        .maybeSingle();
      if (error || !data) return;
      upsertMessage({ ...message, reply_to: data as ChatMessage });
    } catch (error) {
      console.error('Failed to load reply preview:', error);
    }
  };

  const handleTyping = (channel: ReturnType<typeof supabase.channel> | null) => {
    if (!channel || !user) return;
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, name: profile?.full_name || 'Someone', isTyping: true },
    });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, name: profile?.full_name || 'Someone', isTyping: false },
      });
    }, TYPING_DEBOUNCE_MS);
  };

  const setupConversationChannel = (conversationId: string) => {
    if (!user || !session?.access_token) return;

    if (conversationChannelRef.current) {
      supabase.removeChannel(conversationChannelRef.current);
    }

    const channel = supabase.channel(`chat:${conversationId}`, {
      config: { presence: { key: user.id } },
    });
    if (!channel) {
      console.error('[Realtime] Unable to create conversation channel.');
      return;
    }

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online: Record<string, boolean> = {};
        Object.keys(state).forEach((key) => {
          online[key] = true;
        });
        setPresenceMap(online);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as { userId: string; name: string; isTyping: boolean };
        if (!data?.userId || data.userId === user.id) return;
        setTypingUsers((prev) => {
          if (data.isTyping) {
            return { ...prev, [data.userId]: data.name };
          }
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          upsertMessage(newMsg);
          void hydrateReplyTo(newMsg);
          updateConversationPreview(conversationId, newMsg, newMsg.sender_id !== user.id);

          if (isAtBottom()) {
            updateReadReceipt(conversationId, newMsg);
            setTimeout(() => scrollToBottom('auto'), 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          upsertMessage(updated);
          updateConversationPreview(conversationId, updated, false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          const reaction = (payload.new || payload.old) as Reaction & { message_id?: string };
          if (!reaction?.message_id) return;
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== reaction.message_id) return msg;
              const reactions = msg.reactions ? [...msg.reactions] : [];
              if (payload.eventType === 'DELETE') {
                return { ...msg, reactions: reactions.filter((r) => r.id !== reaction.id) };
              }
              if (payload.eventType === 'INSERT') {
                return { ...msg, reactions: [...reactions, reaction] };
              }
              return msg;
            })
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reads',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadReadState(conversationId);
        }
      )
      .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, last_active: new Date().toISOString() });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error:', err);
          toast.error('Connection lost. Retrying...');
          // Retry after 3 seconds
          setTimeout(() => setupConversationChannel(conversationId), 3000);
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] Subscription timeout');
          toast.warning('Slow connection detected');
        }
      });

    conversationChannelRef.current = channel;
  };

  const setupOverviewChannel = () => {
    if (!user) return;
    if (overviewChannelRef.current) {
      supabase.removeChannel(overviewChannelRef.current);
    }

    const channel = supabase.channel(`chat-overview:${user.id}`);
    if (!channel) {
      console.error('[Realtime] Unable to create overview channel.');
      return;
    }

    if (conversationFilter) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: conversationFilter,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          updateConversationPreview(newMsg.conversation_id, newMsg, newMsg.sender_id !== user.id);
          refreshUnreadMessages();
        }
      );
    }

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_settings',
        },
        () => {
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadConversations();
          refreshUnreadMessages();
        }
      )
      .subscribe();

    overviewChannelRef.current = channel;
  };

  const fetchLinkPreview = async (url: string) => {
    try {
      const response = await fetch(`/.netlify/functions/link-preview?url=${encodeURIComponent(url)}`);
      if (!response.ok) return null;
      return (await response.json()) as LinkPreview;
    } catch (error) {
      console.error('Link preview failed:', error);
      return null;
    }
  };

  const uploadAttachment = async (file: File, conversationId: string): Promise<Attachment> => {
    if (!user) throw new Error('Not authenticated');
    const extension = file.name.split('.').pop();
    const fileName = `${generateClientId()}.${extension || 'bin'}`;
    const path = `users/${user.id}/messages/${conversationId}/${fileName}`;
    const bucket = 'user-media';

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    return {
      path,
      bucket,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      filename: file.name,
    };
  };

  const queueMessage = (item: QueueItem) => {
    setQueueItems((prev) => [...prev, item]);
  };

  const updateQueueItem = (id: string, updates: Partial<QueueItem>) => {
    setQueueItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeQueueItem = (id: string) => {
    setQueueItems((prev) => prev.filter((item) => item.id !== id));
  };

  const sendNotifications = async (conversation: ConversationSummary, message: ChatMessage) => {
    if (!user) return;
    const recipients = conversation.members.filter((member) => member.user_id !== user.id);
    for (const recipient of recipients) {
      if (presenceMap[recipient.user_id]) continue;
      try {
        await NotificationsService.createNotification(recipient.user_id, 'NEW_MESSAGE', {
          sender_name: profile?.full_name || 'Someone',
          conversation_id: conversation.id,
          preview: formatMessagePreview(message),
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  };

  const sendMessageNow = async (
    conversationId: string,
    body: string | null,
    attachments: Attachment[] | undefined,
    messageType: MessageType,
    metadata: MessageMetadata | undefined,
    clientGeneratedId: string,
    replyToId?: string | null
  ) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body,
        message_type: messageType,
        attachments: attachments || [],
        metadata: metadata || {},
        client_generated_id: clientGeneratedId,
        reply_to_id: replyToId || null,
      })
      .select(
        '*, sender:profiles(id, full_name, avatar_url, profile_photo_url), reply_to:chat_messages(id, body, sender_id, message_type, attachments, metadata, deleted_at), reactions:message_reactions(id, user_id, emoji, created_at)'
      )
      .single();

    if (error) {
      if ((error as any)?.code === '23505') {
        const { data: existing } = await supabase
          .from('chat_messages')
          .select(
            '*, sender:profiles(id, full_name, avatar_url, profile_photo_url), reply_to:chat_messages(id, body, sender_id, message_type, attachments, metadata, deleted_at), reactions:message_reactions(id, user_id, emoji, created_at)'
          )
          .eq('client_generated_id', clientGeneratedId)
          .maybeSingle();
        if (existing) {
          return existing as ChatMessage;
        }
      }
      throw error;
    }
    return data as ChatMessage;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || (!newMessage.trim() && composerAttachments.length === 0) || !isEmailVerified) {
      return;
    }

    if (blockedState.blocked || blockedState.blockedBy) {
      toast.error('Messaging is blocked for this conversation.');
      return;
    }

    const rateLimitCheck = await checkRateLimit(user.id, 'message');
    if (!rateLimitCheck.allowed) {
      toast.error(rateLimitCheck.error || 'Slow down before sending more messages.');
      return;
    }

    setSendError(null);
    const clientGeneratedId = generateClientId();
    const scheduledFor = scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const messageType: MessageType = composerAttachments.length ? composerAttachments[0].type : 'TEXT';
    const optimistic: ChatMessage = {
      id: `temp-${clientGeneratedId}`,
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      body: newMessage.trim() || null,
      message_type: messageType,
      created_at: new Date().toISOString(),
      client_generated_id: clientGeneratedId,
      attachments: [],
      metadata: scheduledFor ? { scheduled_for: scheduledFor } : {},
      sender: {
        id: user.id,
        full_name: profile?.full_name || 'You',
        avatar_url: profile?.avatar_url || null,
        profile_photo_url: profile?.profile_photo_url || null,
      },
      reply_to: replyTo,
      status: scheduledFor ? 'scheduled' : 'sending',
    };

    upsertMessage(optimistic);
    setNewMessage('');
    setReplyTo(null);
    setScheduledAt('');

    let uploadedAttachments: Attachment[] = [];
    try {
      if (composerAttachments.length) {
        uploadedAttachments = await Promise.all(
          composerAttachments.map((item) => uploadAttachment(item.file, selectedConversation.id))
        );
      }

      setComposerAttachments([]);
      if (uploadedAttachments.length) {
        upsertMessage({ ...optimistic, attachments: uploadedAttachments });
      }
    } catch (error) {
      console.error('Attachment upload failed:', error);
      setSendError('Attachment upload failed. Please try again.');
      toast.error('Attachment upload failed.');
      setMessages((prev) => prev.filter((msg) => msg.id !== optimistic.id));
      return;
    }

    if (scheduledFor) {
      const queueItem: QueueItem = {
        id: optimistic.id,
        conversationId: selectedConversation.id,
        body: optimistic.body,
        messageType: optimistic.message_type,
        attachments: uploadedAttachments,
        metadata: { ...optimistic.metadata, scheduled_for: scheduledFor },
        replyToId: replyTo?.id || null,
        clientGeneratedId,
        createdAt: optimistic.created_at,
        sendAt: scheduledFor,
        status: 'scheduled',
      };
      queueMessage(queueItem);
      return;
    }

    if (!navigator.onLine) {
      const queueItem: QueueItem = {
        id: optimistic.id,
        conversationId: selectedConversation.id,
        body: optimistic.body,
        messageType: optimistic.message_type,
        attachments: uploadedAttachments,
        metadata: optimistic.metadata,
        replyToId: replyTo?.id || null,
        clientGeneratedId,
        createdAt: optimistic.created_at,
        sendAt: optimistic.created_at,
        status: 'queued',
      };
      queueMessage(queueItem);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimistic.id ? { ...msg, status: 'queued' } : msg))
      );
      toast.info('Offline. Message queued.');
      return;
    }

    try {
      const message = await sendMessageNow(
        selectedConversation.id,
        optimistic.body,
        uploadedAttachments,
        optimistic.message_type,
        optimistic.metadata,
        clientGeneratedId,
        replyTo?.id || null
      );

      upsertMessage({ ...message, status: 'sent' });
      updateConversationPreview(selectedConversation.id, message, false);
      await sendNotifications(selectedConversation, message);
      await recordRateLimitAction(user.id, user.id, 'message');
      refreshUnreadMessages();
      
      // Track message sent - determine if first message by checking message count
      const isFirstMessage = messages.filter(m => 
        m.sender_id === user.id && !m.id.startsWith('temp-')
      ).length === 0;
      
      analytics.track.messageSent({
        message_context: selectedConversation.type === 'RIDE_MATCH' ? 'ride_inquiry' : 
                        selectedConversation.type === 'TRIP_MATCH' ? 'booking_chat' : 'general',
        is_first_message: isFirstMessage,
      });
      
      resolveAttachmentUrls([message]);
      const urls = extractUrls(message.body || '');
      if (urls.length) {
        void (async () => {
          const preview = await fetchLinkPreview(urls[0]);
          if (!preview) return;
          const nextMetadata = { ...(message.metadata || {}), link_preview: preview };
          await supabase
            .from('chat_messages')
            .update({ metadata: nextMetadata })
            .eq('id', message.id);
          upsertMessage({ ...message, metadata: nextMetadata });
        })();
      }
      if (isAtBottom()) {
        scrollToBottom('auto');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError('Failed to send message. Please try again.');
      toast.error('Failed to send message.');
      updateQueueItem(optimistic.id, { status: 'failed' });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.client_generated_id === clientGeneratedId ? { ...msg, status: 'failed' } : msg
        )
      );
      queueMessage({
        id: optimistic.id,
        conversationId: selectedConversation.id,
        body: optimistic.body,
        messageType: optimistic.message_type,
        attachments: uploadedAttachments,
        metadata: optimistic.metadata,
        replyToId: replyTo?.id || null,
        clientGeneratedId,
        createdAt: optimistic.created_at,
        sendAt: optimistic.created_at,
        status: 'failed',
      });
    }
  };

  const retryQueueItem = async (item: QueueItem) => {
    if (!navigator.onLine) {
      toast.warning('You are offline.');
      return;
    }

    updateQueueItem(item.id, { status: 'queued' });
    try {
      const message = await sendMessageNow(
        item.conversationId,
        item.body,
        item.attachments,
        item.messageType,
        item.metadata,
        item.clientGeneratedId,
        item.replyToId || null
      );
      upsertMessage({ ...message, status: 'sent' });
      removeQueueItem(item.id);
      refreshUnreadMessages();
      resolveAttachmentUrls([message]);
    } catch (error) {
      console.error('Retry failed:', error);
      updateQueueItem(item.id, { status: 'failed' });
      toast.error('Retry failed.');
    }
  };

  const processQueue = async () => {
    const now = Date.now();
    for (const item of queueItems) {
      if (item.status === 'failed') continue;
      const sendAt = new Date(item.sendAt).getTime();
      if (sendAt > now) continue;
      if (!navigator.onLine) return;

      try {
        const message = await sendMessageNow(
          item.conversationId,
          item.body,
          item.attachments,
          item.messageType,
          item.metadata,
          item.clientGeneratedId,
          item.replyToId || null
        );
        upsertMessage({ ...message, status: 'sent' });
        removeQueueItem(item.id);
        refreshUnreadMessages();
        resolveAttachmentUrls([message]);
      } catch (error) {
        console.error('Queue send failed:', error);
        updateQueueItem(item.id, { status: 'failed' });
      }
    }
  };

  const handleReaction = async (message: ChatMessage, emoji: string) => {
    if (!user) return;
    try {
      const existing = message.reactions?.find(
        (reaction) => reaction.user_id === user.id && reaction.emoji === emoji
      );
      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').insert({
          message_id: message.id,
          user_id: user.id,
          emoji,
        });
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
      toast.error('Unable to add reaction.');
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !editDraft.trim()) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .update({ body: editDraft.trim(), edited_at: new Date().toISOString() })
        .eq('id', editingMessageId)
        .select('*, sender:profiles(id, full_name, avatar_url, profile_photo_url), reactions:message_reactions(id, user_id, emoji, created_at)')
        .single();
      if (error) throw error;
      upsertMessage({ ...(data as ChatMessage) });
      setEditingMessageId(null);
      setEditDraft('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Unable to edit message.');
    }
  };

  const handleDeleteForEveryone = async (message: ChatMessage) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', message.id)
        .select('*, sender:profiles(id, full_name, avatar_url, profile_photo_url), reactions:message_reactions(id, user_id, emoji, created_at)')
        .single();
      if (error) throw error;
      upsertMessage(data as ChatMessage);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Unable to delete message.');
    }
  };

  const handleDeleteForMe = async (message: ChatMessage) => {
    if (!user) return;
    try {
      await supabase.from('message_deletions').insert({
        message_id: message.id,
        user_id: user.id,
      });
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    } catch (error) {
      console.error('Failed to hide message:', error);
      toast.error('Unable to hide message.');
    }
  };

  const toggleConversationSetting = async (setting: 'pinned' | 'muted' | 'archived', value: boolean) => {
    if (!selectedConversation) return;
    try {
      await supabase
        .from('conversation_settings')
        .upsert({
          conversation_id: selectedConversation.id,
          user_id: user?.id,
          [setting]: value,
          updated_at: new Date().toISOString(),
        });
      loadConversations();
    } catch (error) {
      console.error('Failed to update conversation setting:', error);
      toast.error('Unable to update conversation settings.');
    }
  };

  const toggleBlock = async () => {
    if (!selectedConversation || !user) return;
    const other = otherMembers[0]?.user_id;
    if (!other) return;

    try {
      if (blockedState.blocked) {
        await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', other);
        setBlockedState({ blocked: false, blockedBy: false });
      } else {
        await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: other });
        setBlockedState({ blocked: true, blockedBy: false });
      }
    } catch (error) {
      console.error('Block update failed:', error);
      toast.error('Unable to update block status.');
    }
  };

  const checkBlocked = async (otherUserId?: string) => {
    if (!user) return;
    const other = otherUserId;
    if (!other) {
      setBlockedState({ blocked: false, blockedBy: false });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
        .in('blocker_id', [user.id, other])
        .in('blocked_id', [user.id, other]);
      if (error) throw error;
      const blocked = data?.some((row) => row.blocker_id === user.id && row.blocked_id === other) || false;
      const blockedBy = data?.some((row) => row.blocker_id === other && row.blocked_id === user.id) || false;
      setBlockedState({ blocked, blockedBy });
    } catch (error) {
      console.error('Block check failed:', error);
    }
  };

  const handleUploadAttachment = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: ComposerAttachment[] = Array.from(files).map((file) => {
      const type: MessageType = file.type.startsWith('image')
        ? 'IMAGE'
        : file.type.startsWith('video')
        ? 'VIDEO'
        : file.type.startsWith('audio')
        ? 'VOICE'
        : 'FILE';
      return {
        file,
        previewUrl: file.type.startsWith('image') ? URL.createObjectURL(file) : undefined,
        type,
      };
    });
    setComposerAttachments((prev) => [...prev, ...next]);
  };

  const sendQuickMessage = async (payload: { body: string; messageType: MessageType; metadata?: MessageMetadata }) => {
    if (!user || !selectedConversation || !isEmailVerified) return;
    if (blockedState.blocked || blockedState.blockedBy) {
      toast.error('Messaging is blocked for this conversation.');
      return;
    }
    const clientGeneratedId = generateClientId();
    const optimistic: ChatMessage = {
      id: `temp-${clientGeneratedId}`,
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      body: payload.body,
      message_type: payload.messageType,
      created_at: new Date().toISOString(),
      client_generated_id: clientGeneratedId,
      metadata: payload.metadata || {},
      status: 'sending',
    };
    upsertMessage(optimistic);

    if (!navigator.onLine) {
      queueMessage({
        id: optimistic.id,
        conversationId: selectedConversation.id,
        body: optimistic.body,
        messageType: optimistic.message_type,
        metadata: optimistic.metadata,
        clientGeneratedId,
        createdAt: optimistic.created_at,
        sendAt: optimistic.created_at,
        status: 'queued',
      });
      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimistic.id ? { ...msg, status: 'queued' } : msg))
      );
      toast.info('Offline. Message queued.');
      return;
    }

    try {
      const message = await sendMessageNow(
        selectedConversation.id,
        optimistic.body,
        [],
        optimistic.message_type,
        optimistic.metadata,
        clientGeneratedId,
        null
      );
      upsertMessage({ ...message, status: 'sent' });
      updateConversationPreview(selectedConversation.id, message, false);
      await sendNotifications(selectedConversation, message);
      await recordRateLimitAction(user.id, user.id, 'message');
      refreshUnreadMessages();
    } catch (error) {
      console.error('Quick message failed:', error);
      toast.error('Unable to send message.');
    }
  };

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Location not available.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await sendQuickMessage({
          body: 'Shared location',
          messageType: 'SYSTEM',
          metadata: { location: { lat: latitude, lng: longitude } },
        });
      },
      () => {
        toast.error('Unable to read location.');
      }
    );
  };

  const handleShareRide = async () => {
    const rideId = window.prompt('Enter ride ID to share');
    if (!rideId) return;
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('origin,destination,departure_time')
        .eq('id', rideId)
        .maybeSingle();
      if (error || !data) throw error;
      await sendQuickMessage({
        body: `Ride: ${data.origin} -> ${data.destination} (${new Date(data.departure_time).toLocaleString('en-GB')})`,
        messageType: 'RIDE_CARD',
        metadata: { ride_id: rideId },
      });
    } catch (error) {
      console.error('Failed to share ride:', error);
      toast.error('Unable to share ride.');
    }
  };

  const handleShareBooking = async () => {
    const bookingId = window.prompt('Enter booking ID to share');
    if (!bookingId) return;
    try {
      const { data, error } = await supabase
        .from('ride_bookings')
        .select('id, ride:rides(origin,destination,departure_time)')
        .eq('id', bookingId)
        .maybeSingle();
      if (error || !data) throw error;
      const ride = (data as any).ride;
      await sendQuickMessage({
        body: ride
          ? `Booking: ${ride.origin} -> ${ride.destination} (${new Date(ride.departure_time).toLocaleString('en-GB')})`
          : 'Booking shared',
        messageType: 'BOOKING_CARD',
        metadata: { booking_id: bookingId },
      });
    } catch (error) {
      console.error('Failed to share booking:', error);
      toast.error('Unable to share booking.');
    }
  };

  const startRecording = async () => {
    if (recording) return;
    if (typeof MediaRecorder === 'undefined') {
      voiceInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg'];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = mimeType || 'audio/webm';
        const extension = type.includes('mp4') ? 'mp4' : type.includes('mpeg') ? 'mp3' : 'webm';
        const blob = new Blob(chunks, { type });
        const file = new File([blob], `voice-${Date.now()}.${extension}`, { type });
        setComposerAttachments((prev) => [...prev, { file, type: 'VOICE' }]);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Recording failed:', error);
      toast.error('Unable to access microphone.');
    }
  };

  const stopRecording = () => {
    if (!recording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setRecording(false);
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
    }
  };

  const handleSearchMessages = async () => {
    if (!messageQuery.trim()) {
      setMessageResults([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, body, sender_id, created_at')
        .ilike('body', `%${messageQuery.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setMessageResults(data as ChatMessage[]);
    } catch (error) {
      console.error('Message search failed:', error);
      toast.error('Unable to search messages.');
    }
  };

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (!user) return;
    setupOverviewChannel();
    return () => {
      if (overviewChannelRef.current) {
        supabase.removeChannel(overviewChannelRef.current);
      }
    };
  }, [conversationFilter, user]);

  useEffect(() => {
    if (!selectedConversationId || !user) return;
    setMessages([]);
    setTypingUsers({});
    setPresenceMap({});
    setHasMore(true);
    loadMessages(selectedConversationId, true).then(() => {
      setTimeout(() => scrollToBottom('auto'), 120);
    });
    loadReadState(selectedConversationId);
    updatePresence(selectedConversationId);
    const otherUserId = selectedConversation?.members.find((m) => m.user_id !== user.id)?.user_id;
    checkBlocked(otherUserId);
    setupConversationChannel(selectedConversationId);
    return () => {
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
      }
    };
  }, [selectedConversationId, user, selectedConversation, session?.access_token]);

  useEffect(() => {
    if (!messages.length || !selectedConversationId) return;
    resolveAttachmentUrls(messages);
  }, [messages, selectedConversationId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || !selectedConversationId) return;

    const handleScroll = () => {
      if (el.scrollTop < 120 && hasMore && !messagesLoading) {
        loadMessages(selectedConversationId, false);
      }
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [selectedConversationId, hasMore, messagesLoading]);

  useEffect(() => {
    if (!messages.length || !selectedConversationId) return;
    if (isAtBottom()) {
      updateReadReceipt(selectedConversationId, messages[messages.length - 1]);
    }
  }, [messages, selectedConversationId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      processQueue();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [queueItems]);

  useEffect(() => {
    const handleOnline = () => processQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queueItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      <div className={`w-full md:w-96 bg-white border-r border-gray-200 flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 bg-green-600 text-white">
          <h2 className="text-xl font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className="mt-3 text-xs font-semibold bg-white/20 px-3 py-1 rounded-full"
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <input
              value={messageQuery}
              onChange={(e) => setMessageQuery(e.target.value)}
              placeholder="Search all messages"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="button"
              onClick={handleSearchMessages}
              className="px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg"
            >
              Search
            </button>
          </div>
          {messageResults.length > 0 && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {messageResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    setSelectedConversationId(result.conversation_id);
                    setMessageResults([]);
                  }}
                  className="w-full text-left text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded"
                >
                  {result.body}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto" data-testid="conversationList">
          {/* Schema cache updating banner */}
          {schemaCacheError && conversations.length > 0 && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span>System updating... Some features may be limited</span>
            </div>
          )}

          {conversationsError && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-700 p-6">
              <XCircle className="w-16 h-16 mb-4 text-red-400" />
              <p className="text-center font-semibold mb-2">
                {fallbackFailed 
                  ? 'Messaging Unavailable' 
                  : schemaCacheError 
                    ? 'System Updating' 
                    : 'Failed to Load Messages'}
              </p>
              <p className="text-sm text-gray-500 text-center mb-4 max-w-xs">
                {fallbackFailed 
                  ? 'The messaging system is currently experiencing issues. This may be due to a database update in progress. Please try again in a few minutes.'
                  : schemaCacheError 
                    ? 'Messages are temporarily unavailable while the system updates. This usually takes less than a minute.' 
                    : 'We couldn\'t load your conversations. Please check your connection and try again.'}
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {retryCount < 3 ? (
                  <button
                    onClick={() => {
                      setLoading(true);
                      loadConversations(true);
                    }}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    Retry {retryCount > 0 ? `(${3 - retryCount} attempts left)` : ''}
                  </button>
                ) : (
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Refresh Page
                  </button>
                )}
                <button
                  onClick={() => window.location.href = '/find-rides'}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Browse Rides Instead
                </button>
              </div>
              {(import.meta.env.DEV || fallbackFailed) && (
                <details className="mt-4 text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600">Debug Info</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto max-w-xs">
                    Error: {conversationsError}
                    {'\n'}Retry count: {retryCount}
                    {'\n'}Schema cache error: {schemaCacheError ? 'yes' : 'no'}
                    {'\n'}Fallback failed: {fallbackFailed ? 'yes' : 'no'}
                  </pre>
                </details>
              )}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-center font-medium text-gray-700 mb-1">No conversations yet</p>
              <p className="text-sm text-gray-400 text-center mb-6 max-w-xs">
                Start chatting with drivers or passengers by requesting or offering a ride
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                <button
                  onClick={() => window.location.href = '/find-rides'}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  Find a Ride
                </button>
                <button
                  onClick={() => window.location.href = '/post-ride'}
                  className="flex-1 px-4 py-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  Offer a Ride
                </button>
              </div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = conv.members.find((m) => m.user_id !== user?.id);
              const title = other?.profile.full_name || 'Conversation';
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversationId === conv.id ? 'bg-green-50' : ''
                  }`}
                  data-testid="conversationRow"
                  data-conversation-id={conv.id}
                >
                  <div className="flex items-center gap-3">
                    {other ? (
                      <ClickableUserProfile user={other.profile} size="sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-lg">
                        {title.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
                        {conv.last_message_at && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm truncate ${
                          conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        {conv.last_message_preview || 'Start the conversation'}
                      </p>
                    </div>
                    {conv.unread_count > 0 && (
                      <div
                        className="ml-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full"
                        data-testid="unreadBadge"
                      >
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-gray-50 ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversationId(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-600" />
                </button>
                {otherMembers[0] ? (
                  <ClickableUserProfile
                    user={otherMembers[0].profile}
                    size="sm"
                    showNameRight
                    additionalInfo={
                      presenceMap[otherMembers[0].user_id]
                        ? 'Online'
                        : otherMembers[0].last_seen_at
                        ? `Last active ${new Date(otherMembers[0].last_seen_at).toLocaleString('en-GB')}`
                        : 'Offline'
                    }
                  />
                ) : (
                  <div>
                    <h3 className="font-semibold text-gray-900">{conversationTitle}</h3>
                    <p className="text-xs text-gray-500">Conversation</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleConversationSetting('pinned', !selectedConversation.pinned)}
                  className={`p-2 rounded-full ${selectedConversation.pinned ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Pin"
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleConversationSetting('muted', !selectedConversation.muted)}
                  className={`p-2 rounded-full ${selectedConversation.muted ? 'bg-amber-100 text-amber-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Mute"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleConversationSetting('archived', !selectedConversation.archived)}
                  className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleBlock}
                  className={`p-2 rounded-full ${blockedState.blocked ? 'bg-red-100 text-red-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title={blockedState.blocked ? 'Unblock' : 'Block'}
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" ref={messagesContainerRef} data-testid="messageList">
              {messagesError ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-700 p-6">
                  <XCircle className="w-16 h-16 mb-4 text-red-400" />
                  <p className="text-center font-semibold mb-2">Failed to Load Messages</p>
                  <p className="text-sm text-gray-500 text-center mb-4 max-w-md">{messagesError}</p>
                  <button
                    onClick={() => {
                      if (selectedConversationId) {
                        loadMessages(selectedConversationId, true);
                      }
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Retry
                  </button>
                  {import.meta.env.DEV && (
                    <p className="text-xs text-gray-400 mt-4 font-mono">
                      Check console for detailed error logs
                    </p>
                  )}
                </div>
              ) : messagesLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
                  const item = renderedItems[virtualRow.index];
                  if (!item) return null;
                  return (
                    <div
                      key={item.id}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {item.type === 'date' ? (
                        <div className="flex justify-center py-4 text-xs text-gray-500">
                          <span className="px-3 py-1 bg-gray-100 rounded-full">{item.date}</span>
                        </div>
                      ) : item.message ? (
                        <MessageBubble
                          key={item.message.id}
                          message={item.message}
                          isOwn={item.message.sender_id === user?.id}
                          isEditable={isEditable(item.message)}
                          status={item.message.status}
                          queueItem={queueMap.get(item.message.id)}
                          onRetry={retryQueueItem}
                          onReact={handleReaction}
                          onEdit={(msg) => {
                            setEditingMessageId(msg.id);
                            setEditDraft(msg.body || '');
                          }}
                          onDeleteForEveryone={handleDeleteForEveryone}
                          onDeleteForMe={handleDeleteForMe}
                          onReply={(msg) => {
                            setReplyTo(msg);
                          }}
                          onReport={(msg) => {
                            const member = selectedConversation?.members.find(
                              (m) => m.user_id === msg.sender_id
                            );
                            if (!member) {
                              toast.error('Unable to report this message.');
                              return;
                            }
                            setReportingUser(member.profile);
                            const summary = msg.body ? msg.body.slice(0, 200) : msg.message_type;
                            setReportContext(
                              `Message ID: ${msg.id}\nConversation ID: ${msg.conversation_id}\nMessage: ${summary}`
                            );
                            setReportOpen(true);
                            setMenuOpenFor(null);
                          }}
                          reactionsOpenFor={reactionsOpenFor}
                          setReactionsOpenFor={setReactionsOpenFor}
                          menuOpenFor={menuOpenFor}
                          setMenuOpenFor={setMenuOpenFor}
                          readStates={readStates}
                          presenceMap={presenceMap}
                          otherMembers={otherMembers}
                        />
                      ) : null}
                    </div>
                  );
                })}
                </div>
              )}
            </div>

            {Object.keys(typingUsers).length > 0 && (
              <div className="px-4 py-2 text-sm text-gray-500" data-testid="typingIndicator">
                {Object.values(typingUsers).join(', ')} typing...
              </div>
            )}

            {sendError && (
              <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {sendError}
              </div>
            )}

            {blockedState.blockedBy && (
              <div className="mx-4 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                You cannot message this user. They have blocked you.
              </div>
            )}

            <div className="bg-white border-t border-gray-200 p-4">
              {!isEmailVerified && (
                <div className="flex items-center gap-2 text-amber-600 text-sm mb-3 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Verify your email to send messages</span>
                </div>
              )}

              {editingMessageId && (
                <div className="mb-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <Edit className="w-4 h-4 text-gray-500" />
                  <input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleEditMessage}
                    className="text-xs font-semibold text-green-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditDraft('');
                    }}
                    className="text-xs font-semibold text-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {replyTo && (
                <div className="mb-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
                  <span className="truncate">Replying to: {replyTo.body || replyTo.message_type}</span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {composerAttachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {composerAttachments.map((attachment, index) => (
                    <div key={`${attachment.file.name}-${index}`} className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1 text-xs">
                      {attachment.previewUrl ? (
                        <img src={attachment.previewUrl} alt="preview" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="max-w-[120px] truncate">{attachment.file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {recording && (
                <div className="mb-2 text-sm text-red-600">Recording... {recordingSeconds}s</div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2" data-testid="messageComposer">
                <input
                  ref={voiceInputRef}
                  type="file"
                  accept="audio/*"
                  capture="user"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setComposerAttachments((prev) => [...prev, { file, type: 'VOICE' }]);
                    }
                    if (e.target.value) {
                      e.target.value = '';
                    }
                  }}
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(conversationChannelRef.current);
                  }}
                  placeholder={blockedState.blocked || blockedState.blockedBy ? 'Messaging blocked' : 'Type a message...'}
                  disabled={!isEmailVerified || blockedState.blocked || blockedState.blockedBy}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  style={{ fontSize: '16px' }}
                  data-testid="messageInput"
                />
                <label className="p-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 cursor-pointer" data-testid="attachmentButton">
                  <Paperclip className="w-5 h-5" />
                  <input type="file" multiple hidden onChange={(e) => handleUploadAttachment(e.target.files)} />
                </label>
                <button
                  type="button"
                  onClick={handleShareLocation}
                  className="p-3 bg-gray-100 text-gray-700 rounded-full"
                  title="Share location"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleShareRide}
                  className="p-3 bg-gray-100 text-gray-700 rounded-full"
                  title="Share ride"
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleShareBooking}
                  className="p-3 bg-gray-100 text-gray-700 rounded-full"
                  title="Share booking"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`p-3 rounded-full ${recording ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setScheduledAt(toLocalInputValue(new Date(Date.now() + 10 * 60 * 1000)))}
                  className="p-3 bg-gray-100 text-gray-700 rounded-full"
                  title="Send later"
                >
                  <Clock className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && composerAttachments.length === 0) || !isEmailVerified || blockedState.blocked || blockedState.blockedBy}
                  className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  data-testid="sendButton"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>

              {scheduledAt && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>Send later:</span>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs"
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Search className="w-24 h-24 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-gray-400">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {reportingUser && (
        <ReportUserModal
          isOpen={reportOpen}
          onClose={() => {
            setReportOpen(false);
            setReportingUser(null);
            setReportContext('');
          }}
          reportedUser={{ id: reportingUser.id, full_name: reportingUser.full_name }}
          initialTitle="Message report"
          initialDescription={reportContext}
        />
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  isEditable: boolean;
  status?: MessageStatus;
  queueItem?: QueueItem;
  readStates: Record<string, string>;
  presenceMap: Record<string, boolean>;
  otherMembers: ConversationMember[];
  onReact: (message: ChatMessage, emoji: string) => void;
  onEdit: (message: ChatMessage) => void;
  onDeleteForEveryone: (message: ChatMessage) => void;
  onDeleteForMe: (message: ChatMessage) => void;
  onReply: (message: ChatMessage) => void;
  onRetry: (item: QueueItem) => void;
  onReport: (message: ChatMessage) => void;
  reactionsOpenFor: string | null;
  setReactionsOpenFor: (value: string | null) => void;
  menuOpenFor: string | null;
  setMenuOpenFor: (value: string | null) => void;
}

function MessageBubble({
  message,
  isOwn,
  isEditable,
  status,
  queueItem,
  readStates,
  presenceMap,
  otherMembers,
  onReact,
  onEdit,
  onDeleteForEveryone,
  onDeleteForMe,
  onReply,
  onRetry,
  onReport,
  reactionsOpenFor,
  setReactionsOpenFor,
  menuOpenFor,
  setMenuOpenFor,
}: MessageBubbleProps) {
  const readByOthers = otherMembers.some((member) => {
    const lastRead = readStates[member.user_id];
    if (!lastRead) return false;
    return new Date(lastRead).getTime() >= new Date(message.created_at).getTime();
  });

  const delivered = otherMembers.some((member) => presenceMap[member.user_id]);

  const effectiveStatus = status || (queueItem?.status === 'failed' ? 'failed' : queueItem?.status === 'scheduled' ? 'scheduled' : queueItem?.status === 'queued' ? 'queued' : undefined);

  // Enhanced visual state with opacity and loading animations
  const messageOpacity = effectiveStatus === 'sending' ? 0.6 : 1.0;

  const statusIcon = () => {
    if (effectiveStatus === 'failed') {
      return <XCircle className="w-4 h-4 text-red-500" data-testid="failed-icon" />;
    }
    if (effectiveStatus === 'scheduled') {
      return <Clock className="w-4 h-4 text-amber-500" data-testid="scheduled-icon" />;
    }
    if (effectiveStatus === 'queued') {
      return <Clock className="w-4 h-4 text-gray-500" data-testid="queued-icon" />;
    }
    if (effectiveStatus === 'sending') {
      return <Loader className="w-4 h-4 text-gray-400 animate-spin" data-testid="sending-icon" />;
    }
    // Read receipts - blue double check means read
    if (readByOthers) {
      return <span title="Read"><CheckCheck className="w-4 h-4 text-blue-500" data-testid="check-check-icon" /></span>;
    }
    // Delivered - gray double check means delivered (message exists in DB with real ID)
    const isDelivered = !message.id.startsWith('temp-');
    if (isDelivered && delivered) {
      return <span title="Delivered"><CheckCheck className="w-4 h-4 text-gray-400" data-testid="check-check-icon" /></span>;
    }
    // Sent - single check means sent to server
    if (isDelivered) {
      return <span title="Sent"><Check className="w-4 h-4 text-gray-400" data-testid="check-icon" /></span>;
    }
    // Default for temp messages
    return <Clock className="w-4 h-4 text-gray-400" data-testid="sending-icon" />;
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4`} data-testid="messageItem">
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 relative ${
          isOwn ? 'bg-green-500 text-white' : 'bg-white text-gray-900 shadow-sm'
        } ${effectiveStatus === 'sending' ? 'opacity-60' : 'opacity-100'}`}
        data-testid="messageBubble"
        data-message-id={message.id}
      >
        {message.deleted_at ? (
          <p className="text-sm italic text-gray-200">Message removed</p>
        ) : (
          <>
            {message.reply_to && (
              <div className={`mb-2 text-xs ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>
                Replying to: {message.reply_to.body || message.reply_to.message_type}
              </div>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment, index) => (
                  <div key={`${attachment.path}-${index}`}>
                    {attachment.mime.startsWith('image') && attachment.url && (
                      <img src={attachment.url} className="rounded-lg max-h-48" />
                    )}
                    {attachment.mime.startsWith('video') && attachment.url && (
                      <video controls className="rounded-lg max-h-48">
                        <source src={attachment.url} type={attachment.mime} />
                      </video>
                    )}
                    {attachment.mime.startsWith('audio') && attachment.url && (
                      <audio controls className="w-full">
                        <source src={attachment.url} type={attachment.mime} />
                      </audio>
                    )}
                    {!attachment.mime.startsWith('image') &&
                      !attachment.mime.startsWith('video') &&
                      !attachment.mime.startsWith('audio') && (
                        <a
                          href={attachment.url || '#'}
                          className="flex items-center gap-2 text-xs underline"
                        >
                          <FileText className="w-4 h-4" />
                          {attachment.filename || 'Download file'}
                        </a>
                      )}
                  </div>
                ))}
              </div>
            )}
            {message.body && <p className="break-words text-sm">{message.body}</p>}
            {message.metadata?.link_preview && (
              <div className={`mt-2 p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-gray-50'}`}>
                <a href={message.metadata.link_preview.url} className="text-xs font-semibold" target="_blank" rel="noreferrer">
                  {message.metadata.link_preview.title || message.metadata.link_preview.url}
                </a>
                {message.metadata.link_preview.description && (
                  <p className="text-xs text-gray-500">{message.metadata.link_preview.description}</p>
                )}
              </div>
            )}
            {message.metadata?.location && (
              <div className={`mt-2 p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-gray-50'}`}>
                <a
                  href={`https://www.google.com/maps?q=${message.metadata.location.lat},${message.metadata.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold underline"
                >
                  View shared location
                </a>
              </div>
            )}
            {message.message_type === 'RIDE_CARD' && message.metadata?.ride_id && (
              <div className={`mt-2 p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-gray-50'}`}>
                <a href={`/rides/${message.metadata.ride_id}`} className="text-xs font-semibold underline">
                  View shared ride
                </a>
              </div>
            )}
            {message.message_type === 'BOOKING_CARD' && message.metadata?.booking_id && (
              <div className={`mt-2 p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-gray-50'}`}>
                <a href={`/bookings/${message.metadata.booking_id}`} className="text-xs font-semibold underline">
                  View shared booking
                </a>
              </div>
            )}
          </>
        )}
        <div className={`flex items-center gap-2 text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
          <span>{formatTime(message.created_at)}</span>
          {message.edited_at && <span>(edited)</span>}
          {isOwn && statusIcon()}
        </div>
        {queueItem && queueItem.status === 'failed' && (
          <button
            type="button"
            onClick={() => onRetry(queueItem)}
            className="mt-2 text-[10px] text-red-200 underline"
          >
            Retry send
          </button>
        )}

        <div className="absolute -top-2 right-2 flex gap-2">
          <button
            type="button"
            className="p-1 bg-white rounded-full shadow"
            onClick={() => setReactionsOpenFor(reactionsOpenFor === message.id ? null : message.id)}
            data-testid="reactionButton"
          >
            <Smile className="w-3 h-3 text-gray-600" />
          </button>
          <button
            type="button"
            className="p-1 bg-white rounded-full shadow"
            onClick={() => setMenuOpenFor(menuOpenFor === message.id ? null : message.id)}
          >
            <MoreVertical className="w-3 h-3 text-gray-600" />
          </button>
        </div>

        {reactionsOpenFor === message.id && (
          <div className="absolute -top-10 right-0 bg-white rounded-full shadow px-2 py-1 flex gap-2">
            {emojiOptions.map((emoji) => (
              <button key={emoji} onClick={() => onReact(message, emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        {menuOpenFor === message.id && (
          <div className="absolute -top-20 right-0 bg-white rounded-lg shadow text-xs text-gray-700">
            <button
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full"
              onClick={() => {
                onReply(message);
                setMenuOpenFor(null);
              }}
            >
              <Reply className="w-3 h-3" /> Reply
            </button>
            {!isOwn && (
              <button
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full"
                onClick={() => onReport(message)}
              >
                <Flag className="w-3 h-3" /> Report message
              </button>
            )}
            {isOwn && isEditable && (
              <button
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full"
                onClick={() => {
                  onEdit(message);
                  setMenuOpenFor(null);
                }}
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
            )}
            {isOwn && isEditable && (
              <button
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full"
                onClick={() => {
                  onDeleteForEveryone(message);
                  setMenuOpenFor(null);
                }}
              >
                <Trash2 className="w-3 h-3" /> Delete for everyone
              </button>
            )}
            <button
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full"
              onClick={() => {
                onDeleteForMe(message);
                setMenuOpenFor(null);
              }}
            >
              <Trash2 className="w-3 h-3" /> Delete for me
            </button>
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            {message.reactions.map((reaction) => (
              <span key={reaction.id} className="px-2 py-1 bg-gray-100 rounded-full">
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
