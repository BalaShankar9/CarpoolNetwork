import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User as UserIcon, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GeminiService } from '../../services/geminiService';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  label: string;
  action: () => void;
}

export default function AIChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your AI assistant for Carpool Network. I can help you:\n\n📋 View your bookings and rides\n❌ Cancel bookings or rides\n👤 Update your profile\n⚙️ Change your preferences\n💬 Answer any questions\n\nJust tell me what you\'d like to do!',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(Date.now().toString());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user && isOpen) {
      loadChatHistory();
    }
  }, [user, isOpen]);

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.message,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatMessage = async (message: Message) => {
    if (!user) return;

    try {
      await supabase.from('ai_chat_history').insert({
        user_id: user.id,
        message: message.content,
        role: message.role,
        session_id: sessionId,
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
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
          role: 'assistant',
          content: 'Chat history cleared. How can I help you today?',
          timestamp: new Date(),
        },
      ]);
      setSessionId(Date.now().toString());
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const handleSend = async (text?: string) => {
    if (!user) {
      setError('Please sign in to use the AI assistant.');
      return;
    }

    const messageText = text || inputValue.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setError(null);

    await saveChatMessage(userMessage);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      let response = await GeminiService.chat(messageText, conversationHistory, user.id, sessionId);

      const { modifiedResponse, actionsExecuted } = await GeminiService.parseAndExecuteActions(response, user.id);

      if (actionsExecuted > 0) {
        response = modifiedResponse;
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      await saveChatMessage(botMessage);

      if (response.includes('Booking ID:')) {
        const bookingIdMatch = response.match(/Booking ID: ([a-f0-9-]+)/i);
        if (bookingIdMatch) {
          const bookingId = bookingIdMatch[1];
          if (messageText.toLowerCase().includes('cancel')) {
            setTimeout(() => {
              const confirmMessage = `Would you like me to cancel booking ${bookingId}? Reply "yes" to confirm.`;
              const confirmMsg: Message = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: confirmMessage,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, confirmMsg]);
            }, 500);
          }
        }
      }

      if (messageText.toLowerCase() === 'yes' && messages.length > 0) {
        const lastBotMessage = messages[messages.length - 1];
        if (lastBotMessage.role === 'assistant' && lastBotMessage.content.includes('cancel booking')) {
          const bookingIdMatch = lastBotMessage.content.match(/booking ([a-f0-9-]+)/i);
          if (bookingIdMatch) {
            await handleCancelBooking(bookingIdMatch[1]);
          }
        }
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!user) return;

    setIsTyping(true);
    try {
      const result = await GeminiService.cancelBooking(bookingId, user.id);

      const resultMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, resultMessage]);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error cancelling your booking. Please try again or visit the My Rides page.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      label: 'Show my bookings',
      action: () => handleSend('Show me all my current bookings'),
    },
    {
      label: 'View my rides',
      action: () => handleSend('Show me the rides I\'m offering'),
    },
    {
      label: 'Find a ride',
      action: () => {
        navigate('/find-rides');
        setIsOpen(false);
      },
    },
  ];

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[100px] md:bottom-6 right-4 md:right-6 z-[90] p-3 md:p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 group"
          aria-label="Open AI chat"
          style={{ pointerEvents: 'auto' }}
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-[100px] md:bottom-6 right-4 md:right-6 z-[90] w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-15rem)] md:h-[600px] md:max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs text-blue-100">Powered by Gemini</p>
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
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!user && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Please sign in to use the AI assistant with your booking data.
              </p>
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
                className={`flex gap-2 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    message.role === 'assistant'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-60 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {message.role === 'user' && (
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
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex flex-wrap gap-2 mb-3">
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
