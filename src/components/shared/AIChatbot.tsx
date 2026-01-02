import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot, User as UserIcon, AlertCircle, Trash2, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GeminiService } from '../../services/geminiService';
import {
  AiClientContext,
  AiMessage,
  AiRouterResponse,
  UserRole,
} from '../../lib/aiCapabilities';
import { executeAiActions } from '../../lib/aiDispatcher';
import { logApiError } from '../../services/errorTracking';
import { supabase } from '../../lib/supabase';

type ChatMessage = AiMessage & { timestamp: Date };

interface QuickAction {
  label: string;
  action: () => void;
}

const INITIAL_GREETING =
  "Hi! I'm your AI assistant for Carpool Network. I can help you:\n\n- View your bookings and rides\n- Add a vehicle or post a ride\n- Navigate to different pages\n- Answer questions about the app\n\nWhat would you like to do?";

export default function AiAssistantWidget() {
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      author: 'assistant',
      content: INITIAL_GREETING,
      createdAt: new Date().toISOString(),
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(Date.now().toString());
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (user && isOpen) {
      loadChatHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen]);

  const role: UserRole = useMemo(() => {
    if (isAdmin) return 'admin';
    if (user) return 'user';
    return 'guest';
  }, [isAdmin, user]);

  const context: AiClientContext = useMemo(
    () => ({
      userId: user?.id ?? null,
      displayName: profile?.full_name || user?.email || null,
      role,
      currentRoute: location.pathname,
      counters: {},
    }),
    [user?.id, profile?.full_name, user?.email, role, location.pathname]
  );

  const quickActions: QuickAction[] = [
    { label: 'Show my bookings', action: () => handleSend('Show me my bookings') },
    { label: 'View my rides', action: () => handleSend("Show me the rides I'm offering") },
    {
      label: 'Find a ride',
      action: () => {
        navigate('/find-rides');
        setIsOpen(false);
      },
    },
  ];
  const bottomOffset = 'calc(var(--app-bottom-nav-height) + 16px + var(--safe-area-inset-bottom))';

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      const { data, error: supaError } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (supaError) throw supaError;

      if (data && data.length > 0) {
        const loadedMessages: ChatMessage[] = data.map((msg) => ({
          id: msg.id,
          author: (msg.role as 'user' | 'assistant') || 'assistant',
          content: msg.message,
          createdAt: msg.created_at,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
      await logApiError('ai-chat-history-load', err, {
        route: location.pathname,
        userId: user?.id ?? null,
        role,
      });
    }
  };

  const saveChatMessage = async (message: ChatMessage) => {
    if (!user) return;

    try {
      await supabase.from('ai_chat_history').insert({
        user_id: user.id,
        message: message.content,
        role: message.author === 'assistant' ? 'assistant' : 'user',
        session_id: sessionId,
      });
    } catch (err) {
      console.error('Error saving chat message:', err);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;

    try {
      await supabase
        .from('ai_chat_history')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId);

      setMessages([
        {
          id: '1',
          author: 'assistant',
          content: 'Chat history cleared. How can I help you today?',
          createdAt: new Date().toISOString(),
          timestamp: new Date(),
        },
      ]);
      setSessionId(Date.now().toString());
    } catch (err) {
      console.error('Error clearing chat history:', err);
    }
  };

  const appendSystemMessage = (text: string) => {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author: 'assistant',
      content: text,
      createdAt: new Date().toISOString(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async (text?: string) => {
    if (!user) {
      setError('Please sign in to use the AI assistant.');
      return;
    }
    const now = Date.now();
    if (now - lastSentAt < 2000) {
      setError('Please wait a moment before sending another message.');
      return;
    }

    const messageText = text || inputValue.trim();
    if (!messageText) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      author: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setError(null);
    setLastSentAt(now);

    await saveChatMessage(userMessage);

    try {
      const history: AiMessage[] = [...messages, userMessage].slice(-15).map((msg) => ({
        id: msg.id,
        author: msg.author,
        content: msg.content,
        createdAt: msg.createdAt,
      }));

      const response: AiRouterResponse = await GeminiService.chat(messageText, history, sessionId, context);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        author: 'assistant',
        content: response.reply,
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      await saveChatMessage(botMessage);

      if (response.actions?.length) {
        await executeAiActions(response.actions, context, {
          navigate,
          appendSystemMessage,
        });
      }
    } catch (err) {
      console.error('Error getting AI response:', err);
      await logApiError('ai-router-client', err, {
        route: location.pathname,
        userId: user?.id ?? null,
        role,
      });
      setError("I couldn't reach my brain service just now. Please try again in a moment.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 md:right-6 z-[90] p-3 md:p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 group"
          aria-label="Open AI chat"
          style={{ pointerEvents: 'auto', bottom: bottomOffset }}
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed right-4 md:right-6 z-[90] w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-15rem)] md:h-[600px] md:max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          style={{ bottom: bottomOffset }}
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs text-blue-100">Powered by Gemini / OpenAI</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChatHistory}
                disabled={!user}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                title="Clear chat history"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!user && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">Please sign in to use the AI assistant with your booking data.</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.author === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {message.author === 'assistant' && (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    message.author === 'assistant' ? 'bg-white text-gray-900 shadow-sm' : 'bg-blue-600 text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-60 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {message.author === 'user' && (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    ></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-200 space-y-3">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  disabled={!user}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {action.label}
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <p className="leading-tight">
                Tip: Ask “What can you do?” or “Take me to my rides” — the assistant will navigate and summarize for you.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your bookings..."
                disabled={!user || isTyping}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || !user || isTyping}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
