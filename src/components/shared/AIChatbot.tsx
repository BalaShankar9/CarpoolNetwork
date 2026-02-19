import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Send, User as UserIcon, AlertCircle, Trash2,
  Sparkles, Car, MapPin, Calendar, Users, Shield, Settings,
  ChevronDown, Zap, HelpCircle, Navigation, TrendingUp
} from 'lucide-react';
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
  icon: React.ElementType;
  action: () => void;
  adminOnly?: boolean;
}

// Atlas - The intelligent assistant for Carpool Network
const ASSISTANT_NAME = 'Atlas';

const getGreeting = (displayName: string | null, isAdmin: boolean, hour: number): string => {
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = displayName?.split(' ')[0] || 'there';

  const greetings = isAdmin ? [
    `${timeGreeting}, ${name}. I'm ${ASSISTANT_NAME}, your intelligent assistant. As an administrator, I can help you manage users, review reports, monitor platform health, and handle any operational tasks. What would you like to tackle today?`,
    `Welcome back, ${name}. ${ASSISTANT_NAME} here, ready to assist. I see you're logged in as admin - I can help with user management, safety reports, analytics, or any platform operations. How can I help?`,
    `${timeGreeting}, ${name}. ${ASSISTANT_NAME} at your service. I'm fully equipped to assist with administrative tasks, user queries, ride management, and platform oversight. What's on your agenda?`,
  ] : [
    `${timeGreeting}, ${name}! I'm ${ASSISTANT_NAME}, your personal travel assistant. I can help you find rides, manage your bookings, track your trips, and answer any questions about Carpool Network. What would you like to do?`,
    `Hey ${name}! ${ASSISTANT_NAME} here. Whether you need to find a ride, check your bookings, or learn about the platform, I'm here to help. Just ask away!`,
    `${timeGreeting}, ${name}. I'm ${ASSISTANT_NAME}, ready to make your carpooling experience seamless. Need help finding a ride, posting one, or managing your profile? I've got you covered.`,
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
};

const CAPABILITIES_RESPONSE = `I'm ${ASSISTANT_NAME}, your intelligent assistant for Carpool Network. Here's what I can help you with:

🚗 **Ride Management**
• Find available rides matching your route
• Post new rides as a driver
• View and manage your bookings
• Check your upcoming trips

📊 **Your Dashboard**
• Show your ride history
• Display your vehicles
• Track your savings and impact
• Review your ratings

🔧 **Quick Actions**
• Navigate to any page instantly
• Update your profile settings
• Message other users
• Report issues or get support

💡 **Smart Assistance**
• Answer questions about how carpooling works
• Provide safety tips and guidelines
• Help troubleshoot any issues
• Offer personalized recommendations

Just type what you need, and I'll take care of the rest!`;

const ADMIN_CAPABILITIES_RESPONSE = `I'm ${ASSISTANT_NAME}, your administrative command center. As an admin, here's my full capability set:

👥 **User Management**
• View user summaries and statistics
• Access user profiles and activity
• Navigate to user management panels
• Monitor user verification status

🛡️ **Safety & Moderation**
• Review safety reports and incidents
• Access bug reports and diagnostics
• Monitor platform health metrics
• Check error logs and issues

📈 **Analytics & Insights**
• View platform analytics dashboard
• Check booking and ride statistics
• Monitor community growth
• Track environmental impact

⚙️ **Platform Operations**
• Access admin dashboard
• Configure platform settings
• Manage communities
• Review pending actions

Plus everything regular users can do! Just tell me what you need.`;

export default function AtlasAssistant() {
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(Date.now().toString());
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize greeting when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const hour = new Date().getHours();
      const greeting = getGreeting(profile?.full_name || null, isAdmin, hour);
      setMessages([{
        id: '1',
        author: 'assistant',
        content: greeting,
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, messages.length, profile?.full_name, isAdmin]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

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

  // Quick actions based on user role
  const quickActions: QuickAction[] = useMemo(() => {
    const baseActions: QuickAction[] = [
      {
        label: 'Find a ride',
        icon: MapPin,
        action: () => {
          navigate('/find-rides');
          setIsOpen(false);
        }
      },
      {
        label: 'My bookings',
        icon: Calendar,
        action: () => handleSend('Show me my bookings')
      },
      {
        label: 'Post a ride',
        icon: Car,
        action: () => {
          navigate('/post-ride');
          setIsOpen(false);
        }
      },
    ];

    const adminActions: QuickAction[] = [
      {
        label: 'Admin Dashboard',
        icon: TrendingUp,
        action: () => {
          navigate('/admin');
          setIsOpen(false);
        },
        adminOnly: true
      },
      {
        label: 'User Management',
        icon: Users,
        action: () => {
          navigate('/admin/users');
          setIsOpen(false);
        },
        adminOnly: true
      },
      {
        label: 'Safety Reports',
        icon: Shield,
        action: () => {
          navigate('/admin/safety-reports');
          setIsOpen(false);
        },
        adminOnly: true
      },
    ];

    return isAdmin ? [...adminActions, ...baseActions] : baseActions;
  }, [isAdmin, navigate]);

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

      const hour = new Date().getHours();
      setMessages([
        {
          id: '1',
          author: 'assistant',
          content: `Chat cleared. ${getGreeting(profile?.full_name || null, isAdmin, hour)}`,
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

  // Handle "what can you do" type questions locally for instant response
  const isCapabilityQuestion = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    const patterns = [
      'what can you do',
      'what do you do',
      'how can you help',
      'what are your capabilities',
      'what can you help with',
      'help me',
      'what are you capable of',
      'show me what you can do',
      'capabilities',
      '/help',
    ];
    return patterns.some(p => lower.includes(p) || lower === p);
  };

  const handleSend = async (text?: string) => {
    if (!user) {
      setError('Please sign in to use Atlas.');
      return;
    }
    const now = Date.now();
    if (now - lastSentAt < 1500) {
      return; // Silent rate limit
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
    setError(null);
    setLastSentAt(now);

    await saveChatMessage(userMessage);

    // Handle capability questions locally for instant response
    if (isCapabilityQuestion(messageText)) {
      const response = isAdmin ? ADMIN_CAPABILITIES_RESPONSE : CAPABILITIES_RESPONSE;
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        author: 'assistant',
        content: response,
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      await saveChatMessage(botMessage);
      return;
    }

    setIsTyping(true);

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
      setError("I'm having trouble connecting right now. Please try again in a moment.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 md:right-6 z-[90] group"
          aria-label={`Open ${ASSISTANT_NAME}`}
          style={{ pointerEvents: 'auto', bottom: bottomOffset }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />

            {/* Button */}
            <div className="relative p-3 md:p-4 bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white rounded-full shadow-2xl hover:shadow-red-500/30 hover:scale-110 transition-all duration-300">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
            </div>

            {/* Status indicator */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>

          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ask {ASSISTANT_NAME}
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={`fixed right-4 md:right-6 z-[90] w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 transition-all duration-300 ${
            isMinimized ? 'h-16' : 'h-[550px] max-h-[calc(100vh-8rem)] md:h-[620px]'
          }`}
          style={{ bottom: bottomOffset }}
        >
          {/* Header */}
          <div
            className="bg-gradient-to-r from-red-500 via-red-600 to-orange-500 text-white p-4 flex items-center justify-between cursor-pointer"
            onClick={() => isMinimized && setIsMinimized(false)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{ASSISTANT_NAME}</h3>
                <p className="text-xs text-red-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {isAdmin ? 'Admin Mode' : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCapabilities(!showCapabilities); }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="What can Atlas do?"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); clearChatHistory(); }}
                disabled={!user}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                title="Clear chat history"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Sign in prompt */}
              {!user && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Sign in required</p>
                    <p className="text-xs text-amber-600">Sign in to unlock all of {ASSISTANT_NAME}'s features.</p>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="p-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.author === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    {message.author === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-red-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.author === 'assistant'
                          ? 'bg-white text-gray-800 shadow-sm border border-gray-100'
                          : 'bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <span className={`text-xs mt-2 block ${
                        message.author === 'assistant' ? 'text-gray-400' : 'text-red-100'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {message.author === 'user' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              <div className="p-3 bg-gray-50 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {quickActions.slice(0, 4).map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      disabled={!user}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        action.adminOnly
                          ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      }`}
                    >
                      <action.icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${ASSISTANT_NAME} anything...`}
                    disabled={!user || isTyping}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white outline-none text-sm transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || !user || isTyping}
                    className="p-3 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                <p className="text-xs text-gray-400 text-center mt-2">
                  {ASSISTANT_NAME} • Powered by AI • <button onClick={() => handleSend('What can you do?')} className="text-red-500 hover:text-red-600">View capabilities</button>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
