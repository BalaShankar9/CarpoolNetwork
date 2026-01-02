import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { checkRateLimit, recordRateLimitAction } from '../../lib/rateLimiting';
import { Send, Search, MoreVertical, Check, CheckCheck, Phone, MessageSquare, ArrowLeft, AlertTriangle } from 'lucide-react';
import { getUserProfilePath } from '../../utils/profileNavigation';
import { NotificationsService } from '../../services/notificationsService';

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  whatsapp_number?: string;
  preferred_contact_method?: string;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender?: Profile;
  recipient?: Profile;
}

interface MessageListProps {
  initialUserId?: string;
}

export default function MessageList({ initialUserId }: MessageListProps) {
  const { user, profile, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Map<string, Message[]>>(new Map());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    loadMessages();

    if (initialUserId) {
      setSelectedUserId(initialUserId);
    }

    const channelRecipient = supabase
      .channel('messages-recipient')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          loadMessages();
          scrollToBottom();
        }
      )
      .subscribe();

    const channelSender = supabase
      .channel('messages-sender')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          loadMessages();
          scrollToBottom();
        }
      )
      .subscribe();

    const channelUpdate = supabase
      .channel('messages-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelRecipient);
      supabase.removeChannel(channelSender);
      supabase.removeChannel(channelUpdate);
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedUserId, conversations]);

  useEffect(() => {
    if (selectedUserId) {
      markMessagesAsRead(selectedUserId);
    }
  }, [selectedUserId, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*),
          recipient:profiles!messages_recipient_id_fkey(*)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const convMap = new Map<string, Message[]>();
      (data as Message[]).forEach((msg) => {
        const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (!convMap.has(otherId)) {
          convMap.set(otherId, []);
        }
        convMap.get(otherId)!.push(msg);
      });

      convMap.forEach((messages) => {
        messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      setConversations(convMap);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (otherUserId: string) => {
    if (!user) return;

    const messages = conversations.get(otherUserId) || [];
    const unreadMessages = messages.filter(
      (msg) => msg.recipient_id === user.id && !msg.read
    );

    if (unreadMessages.length === 0) return;

    const messageIds = unreadMessages.map((msg) => msg.id);

    await supabase
      .from('messages')
      .update({ read: true })
      .in('id', messageIds);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUserId || !newMessage.trim()) return;

    if (!isEmailVerified) {
      return;
    }

    const rateLimitCheck = await checkRateLimit(user.id, 'message');
    if (!rateLimitCheck.allowed) {
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert([{
        sender_id: user.id,
        recipient_id: selectedUserId,
        content: newMessage.trim(),
        read: false,
      }]);

      if (error) throw error;

      // Create notification for recipient
      try {
        await NotificationsService.createNotification(
          selectedUserId,
          'NEW_MESSAGE',
          {
            sender_name: profile?.full_name || 'Someone',
            conversation_id: user.id,
            preview: newMessage.trim().substring(0, 50) + (newMessage.length > 50 ? '...' : '')
          }
        );
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the message send if notification fails
      }

      await recordRateLimitAction(user.id, user.id, 'message');
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const openWhatsApp = (whatsappNumber: string) => {
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  const getOtherUser = (userId: string): Profile | undefined => {
    const messages = conversations.get(userId);
    if (!messages || messages.length === 0) return undefined;

    const firstMessage = messages[0];
    return firstMessage.sender_id === userId ? firstMessage.sender : firstMessage.recipient;
  };

  const getLastMessage = (userId: string): Message | undefined => {
    const messages = conversations.get(userId);
    return messages?.[messages.length - 1];
  };

  const getUnreadCount = (userId: string): number => {
    const messages = conversations.get(userId) || [];
    return messages.filter((msg) => msg.recipient_id === user?.id && !msg.read).length;
  };

  const formatMessageTime = (dateString: string) => {
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
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  const getDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg: Message | undefined) => {
    if (!prevMsg) return true;

    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();

    return currentDate !== prevDate;
  };

  const selectedMessages = selectedUserId ? conversations.get(selectedUserId) || [] : [];
  const selectedUser = selectedUserId ? getOtherUser(selectedUserId) : null;

  const filteredConversations = Array.from(conversations.keys()).filter((userId) => {
    const otherUser = getOtherUser(userId);
    return otherUser?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      <div className={`w-full md:w-96 bg-white border-r border-gray-200 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
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
              <p className="text-sm text-center mt-2">Start chatting from a ride listing</p>
            </div>
          ) : (
            filteredConversations.map((userId) => {
              const otherUser = getOtherUser(userId);
              const lastMessage = getLastMessage(userId);
              const unreadCount = getUnreadCount(userId);

              return (
                <button
                  key={userId}
                  onClick={() => setSelectedUserId(userId)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${selectedUserId === userId ? 'bg-green-50' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(getUserProfilePath(userId, user?.id));
                        }}
                        className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-lg flex-shrink-0 hover:bg-green-200 transition-colors"
                        title="View profile"
                      >
                        {otherUser?.full_name.charAt(0).toUpperCase()}
                      </button>
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold pointer-events-none">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {otherUser?.full_name}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {lastMessage && formatMessageTime(lastMessage.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {lastMessage?.sender_id === user?.id && (
                          <span className="flex-shrink-0">
                            {lastMessage?.read ? (
                              <CheckCheck className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Check className="w-4 h-4 text-gray-400" />
                            )}
                          </span>
                        )}
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {lastMessage?.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-gray-50 ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => selectedUserId && navigate(getUserProfilePath(selectedUserId, user?.id))}
                  className="flex items-center gap-3 hover:opacity-75 transition-opacity flex-1 min-w-0"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold flex-shrink-0">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{selectedUser.full_name}</h3>
                    <p className="text-xs text-blue-600 underline">Click to view profile</p>
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {selectedUser.whatsapp_number && (
                  <button
                    onClick={() => openWhatsApp(selectedUser.whatsapp_number!)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Contact on WhatsApp"
                  >
                    <Phone className="w-5 h-5 text-green-600" />
                  </button>
                )}
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedMessages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const showDateSeparator = shouldShowDateSeparator(
                  message,
                  index > 0 ? selectedMessages[index - 1] : undefined
                );

                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-4">
                        <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-600 shadow-sm">
                          {getDateSeparator(message.created_at)}
                        </div>
                      </div>
                    )}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${isOwnMessage
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-900 shadow-sm'
                          }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwnMessage ? 'text-white' : 'text-gray-500'}`}>
                          <span className="text-xs opacity-70">
                            {new Date(message.created_at).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOwnMessage && (
                            <span className="flex-shrink-0">
                              {message.read ? (
                                <CheckCheck className="w-4 h-4" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 p-4">
              {!isEmailVerified && (
                <div className="flex items-center gap-2 text-amber-600 text-sm mb-3 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Verify your email to send messages</span>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={isEmailVerified ? "Type a message..." : "Verify email to send messages"}
                  disabled={!isEmailVerified}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !isEmailVerified}
                  className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
