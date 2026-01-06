import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send,
    MoreVertical,
    Phone,
    MapPin,
    Image as ImageIcon,
    Smile,
    X,
    Check,
    CheckCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ChatMessage {
    id: string;
    pool_id: string;
    user_id: string;
    content: string;
    message_type: 'text' | 'image' | 'location' | 'system';
    created_at: string;
    user?: {
        id: string;
        full_name: string;
        avatar_url?: string;
        profile_photo_url?: string;
    };
}

interface PoolChatProps {
    poolId: string;
    poolName: string;
}

// Quick emoji reactions
const QUICK_EMOJIS = ['👍', '👋', '😊', '🚗', '🕐', '📍'];

export const PoolChat: React.FC<PoolChatProps> = ({ poolId, poolName }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Load messages
    useEffect(() => {
        const loadMessages = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('pool_messages')
                    .select(`
            *,
            user:profiles!pool_messages_user_id_fkey(
              id,
              full_name,
              avatar_url,
              profile_photo_url
            )
          `)
                    .eq('pool_id', poolId)
                    .order('created_at', { ascending: true })
                    .limit(100);

                if (error) throw error;
                setMessages(data || []);
            } catch (err) {
                console.error('Failed to load messages:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
    }, [poolId]);

    // Subscribe to new messages
    useEffect(() => {
        const channel = supabase
            .channel(`pool-chat-${poolId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pool_messages',
                    filter: `pool_id=eq.${poolId}`,
                },
                async (payload) => {
                    // Fetch user data for the new message
                    const { data: userData } = await supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, profile_photo_url')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMsg = payload.new as ChatMessage;
                    setMessages(prev => [...prev, { ...newMsg, user: userData || undefined }]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [poolId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSend = async () => {
        if (!newMessage.trim() || !user || isSending) return;

        const messageContent = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            const { error } = await supabase
                .from('pool_messages')
                .insert({
                    pool_id: poolId,
                    user_id: user.id,
                    content: messageContent,
                    message_type: 'text',
                });

            if (error) throw error;
        } catch (err) {
            console.error('Failed to send message:', err);
            setNewMessage(messageContent); // Restore message on error
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojis(false);
        inputRef.current?.focus();
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString();
    };

    // Group messages by date
    const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
        const msgDate = formatDate(msg.created_at);
        if (msgDate !== currentDate) {
            currentDate = msgDate;
            groupedMessages.push({ date: msgDate, messages: [msg] });
        } else {
            groupedMessages[groupedMessages.length - 1].messages.push(msg);
        }
    });

    return (
        <div className="flex flex-col h-[500px] bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        Pool Chat
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {poolName}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <p className="text-center">No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                    </div>
                ) : (
                    groupedMessages.map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-3">
                            {/* Date separator */}
                            <div className="flex items-center justify-center">
                                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                                    {group.date}
                                </span>
                            </div>

                            {/* Messages */}
                            {group.messages.map((message, msgIndex) => {
                                const isOwn = message.user_id === user?.id;
                                const showAvatar = msgIndex === 0 ||
                                    group.messages[msgIndex - 1]?.user_id !== message.user_id;

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {!isOwn && showAvatar && (
                                            <img
                                                src={message.user?.profile_photo_url || message.user?.avatar_url || '/default-avatar.png'}
                                                alt={message.user?.full_name || 'User'}
                                                className="w-8 h-8 rounded-full object-cover mr-2 flex-shrink-0"
                                            />
                                        )}
                                        {!isOwn && !showAvatar && (
                                            <div className="w-8 mr-2 flex-shrink-0" />
                                        )}

                                        <div className={`max-w-[70%] ${!isOwn && showAvatar ? '' : ''}`}>
                                            {!isOwn && showAvatar && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                                                    {message.user?.full_name || 'Unknown'}
                                                </p>
                                            )}
                                            <div
                                                className={`px-3 py-2 rounded-2xl ${isOwn
                                                        ? 'bg-blue-600 text-white rounded-br-md'
                                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700'
                                                    }`}
                                            >
                                                {message.message_type === 'location' ? (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4" />
                                                        <span className="text-sm">{message.content}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm whitespace-pre-wrap break-words">
                                                        {message.content}
                                                    </p>
                                                )}
                                            </div>
                                            <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                                                {formatTime(message.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                {/* Quick emojis */}
                {showEmojis && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {QUICK_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => addEmoji(emoji)}
                                className="text-xl hover:scale-125 transition-transform"
                            >
                                {emoji}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowEmojis(false)}
                            className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowEmojis(!showEmojis)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <Smile className="w-5 h-5 text-gray-500" />
                    </button>

                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isSending}
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PoolChat;
