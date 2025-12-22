import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Send, Search, ArrowLeft, AlertTriangle, MessageSquare } from 'lucide-react';
import ClickableUserProfile from '../shared/ClickableUserProfile';

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  profile_photo_url?: string;
}

interface ConversationMember {
  user_id: string;
  role: string;
  profiles: Profile;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: Profile;
}

interface Conversation {
  id: string;
  type: string;
  ride_id?: string;
  trip_request_id?: string;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  latest_message?: ChatMessage;
  unread_count: number;
}

interface NewChatSystemProps {
  initialConversationId?: string;
}

export default function NewChatSystem({ initialConversationId }: NewChatSystemProps) {
  const { user, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Get conversations where user is a member
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          members:conversation_members(
            user_id,
            role,
            profiles(id, full_name, avatar_url, profile_photo_url)
          )
        `)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // For each conversation, get latest message and unread count
      const conversationsWithData = await Promise.all(
        (convData || []).map(async (conv) => {
          // Get latest message
          const { data: latestMsg } = await supabase
            .from('chat_messages')
            .select('*, sender:profiles(id, full_name, avatar_url, profile_photo_url)')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count - messages not read by current user
          const { data: allMessages } = await supabase
            .from('chat_messages')
            .select('id, sender_id')
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id);

          let unreadCount = 0;
          if (allMessages) {
            for (const msg of allMessages) {
              const { data: readRecord } = await supabase
                .from('message_reads')
                .select('id')
                .eq('message_id', msg.id)
                .eq('user_id', user.id)
                .maybeSingle();

              if (!readRecord) {
                unreadCount++;
              }
            }
          }

          return {
            ...conv,
            latest_message: latestMsg,
            unread_count: unreadCount,
          };
        })
      );

      setConversations(conversationsWithData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles(id, full_name, avatar_url, profile_photo_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Mark all messages as read when viewing conversation
  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      if (!user) return;

      try {
        // Get all messages in this conversation not sent by me
        const { data: messagesToMark } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id);

        if (!messagesToMark || messagesToMark.length === 0) return;

        // Mark each message as read (if not already)
        for (const msg of messagesToMark) {
          await supabase
            .from('message_reads')
            .insert({
              message_id: msg.id,
              user_id: user.id,
            })
            .onConflict('message_id,user_id')
            .ignore();
        }

        // Reload conversations to update unread counts
        await loadConversations();
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    },
    [user, loadConversations]
  );

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;

          // If message is in current conversation, add it
          if (selectedConversation === newMsg.conversation_id) {
            loadMessages(newMsg.conversation_id);

            // Auto-mark as read if conversation is open
            if (newMsg.sender_id !== user.id) {
              setTimeout(() => {
                supabase
                  .from('message_reads')
                  .insert({
                    message_id: newMsg.id,
                    user_id: user.id,
                  })
                  .onConflict('message_id,user_id')
                  .ignore();
              }, 500);
            }
          }

          // Reload conversations to update latest message and unread counts
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        () => {
          // Reload conversations when read state changes
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation, loadMessages, loadConversations]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      markConversationAsRead(selectedConversation);
    }
  }, [selectedConversation, loadMessages, markConversationAsRead]);

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim() || !isEmailVerified || sending) {
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        body: newMessage.trim(),
        type: 'TEXT',
      });

      if (error) throw error;

      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Get other members in conversation
  const getOtherMembers = (conv: Conversation) => {
    return conv.members.filter((m) => m.user_id !== user?.id);
  };

  // Format conversation title
  const getConversationTitle = (conv: Conversation) => {
    const others = getOtherMembers(conv);
    if (others.length === 0) return 'You';
    if (others.length === 1) return others[0].profiles.full_name;
    return others.map((m) => m.profiles.full_name).join(', ');
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-GB', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    const title = getConversationTitle(conv).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Conversations List */}
      <div
        className={`w-full md:w-96 bg-white border-r border-gray-200 flex flex-col ${
          selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
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
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
              <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-center">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherMembers = getOtherMembers(conv);
              const initial = getConversationTitle(conv).charAt(0).toUpperCase();
              const otherMember = otherMembers[0]?.profiles;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation === conv.id ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative" onClick={(e) => {
                      e.stopPropagation();
                      if (otherMember) navigate(`/user/${otherMember.id}`);
                    }}>
                      {otherMember ? (
                        <ClickableUserProfile
                          user={{
                            id: otherMember.id,
                            full_name: otherMember.full_name,
                            avatar_url: otherMember.avatar_url,
                            profile_photo_url: otherMember.profile_photo_url
                          }}
                          size="sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-lg">
                          {initial}
                        </div>
                      )}
                      {conv.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {getConversationTitle(conv)}
                        </h3>
                        {conv.latest_message && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTime(conv.latest_message.created_at)}
                          </span>
                        )}
                      </div>
                      {conv.latest_message && (
                        <p
                          className={`text-sm truncate ${
                            conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
                          }`}
                        >
                          {conv.latest_message.body}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Messages View */}
      <div
        className={`flex-1 flex flex-col bg-gray-50 ${
          !selectedConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedConv ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3 shadow-sm">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              {(() => {
                const otherMembers = getOtherMembers(selectedConv);
                const otherMember = otherMembers[0]?.profiles;
                return otherMember ? (
                  <ClickableUserProfile
                    user={{
                      id: otherMember.id,
                      full_name: otherMember.full_name,
                      avatar_url: otherMember.avatar_url,
                      profile_photo_url: otherMember.profile_photo_url
                    }}
                    size="sm"
                    showNameRight
                    additionalInfo={selectedConv.type === 'RIDE_MATCH' ? 'Ride Chat' : selectedConv.type === 'TRIP_MATCH' ? 'Trip Chat' : 'Direct Message'}
                  />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                      {getConversationTitle(selectedConv).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{getConversationTitle(selectedConv)}</h3>
                      <p className="text-xs text-gray-500">
                        {selectedConv.type === 'RIDE_MATCH' ? 'Ride Chat' : selectedConv.type === 'TRIP_MATCH' ? 'Trip Chat' : 'Direct Message'}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
            >
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwn ? 'bg-green-500 text-white' : 'bg-white text-gray-900 shadow-sm'
                      }`}
                    >
                      <p className="break-words">{message.body}</p>
                      <span
                        className={`text-xs mt-1 block ${isOwn ? 'text-white/70' : 'text-gray-500'}`}
                      >
                        {new Date(message.created_at).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 p-4 safe-area-bottom">
              {!isEmailVerified && (
                <div className="flex items-center gap-2 text-amber-600 text-sm mb-3 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Verify your email to send messages</span>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isEmailVerified ? 'Type a message...' : 'Verify email to send'}
                  disabled={!isEmailVerified || sending}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  style={{ fontSize: '16px' }} // Prevents zoom on iOS
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !isEmailVerified || sending}
                  className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-24 h-24 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-gray-400">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
