import { MessageCircle, Clock, MapPin, Car, Smile, ThumbsUp, Calendar } from 'lucide-react';

interface QuickRepliesProps {
    onSelect: (message: string) => void;
    context?: 'booking' | 'ride' | 'general';
    disabled?: boolean;
}

const QUICK_REPLIES = {
    booking: [
        { text: 'I\'m on my way!', icon: Car },
        { text: 'Running a few minutes late', icon: Clock },
        { text: 'I\'m at the pickup point', icon: MapPin },
        { text: 'Thank you!', icon: ThumbsUp },
    ],
    ride: [
        { text: 'Is this ride still available?', icon: MessageCircle },
        { text: 'Can you pick me up at a different location?', icon: MapPin },
        { text: 'What time will you arrive?', icon: Clock },
        { text: 'I\'d like to book this ride', icon: Calendar },
    ],
    general: [
        { text: 'Hi! 👋', icon: Smile },
        { text: 'Thanks!', icon: ThumbsUp },
        { text: 'Sounds good!', icon: ThumbsUp },
        { text: 'Let me check and get back to you', icon: MessageCircle },
    ],
};

export function QuickReplies({ onSelect, context = 'general', disabled = false }: QuickRepliesProps) {
    const replies = QUICK_REPLIES[context];

    return (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border-t">
            {replies.map((reply, index) => {
                const Icon = reply.icon;
                return (
                    <button
                        key={index}
                        onClick={() => onSelect(reply.text)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-full
                     text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {reply.text}
                    </button>
                );
            })}
        </div>
    );
}

// Inline quick reply suggestions that appear based on context
interface SmartSuggestionsProps {
    lastMessage?: string;
    onSelect: (message: string) => void;
}

export function SmartSuggestions({ lastMessage, onSelect }: SmartSuggestionsProps) {
    // Determine suggestions based on last message
    const getSuggestions = (): string[] => {
        if (!lastMessage) return [];

        const lower = lastMessage.toLowerCase();

        if (lower.includes('available') || lower.includes('still free')) {
            return ['Yes, still available!', 'Sorry, it\'s been booked'];
        }

        if (lower.includes('where') && (lower.includes('meet') || lower.includes('pickup'))) {
            return ['I\'ll send you my location', 'Let\'s meet at the main entrance'];
        }

        if (lower.includes('what time') || lower.includes('when')) {
            return ['I\'ll be there in 5 minutes', 'Around 10 minutes'];
        }

        if (lower.includes('thank') || lower.includes('thanks')) {
            return ['You\'re welcome!', 'No problem!', 'Happy to help!'];
        }

        if (lower.includes('running late') || lower.includes('delayed')) {
            return ['No worries, take your time', 'How long will you be?'];
        }

        if (lower.includes('can i') || lower.includes('is it ok')) {
            return ['Sure, no problem!', 'Let me check...'];
        }

        return [];
    };

    const suggestions = getSuggestions();

    if (suggestions.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 p-2">
            {suggestions.map((suggestion, index) => (
                <button
                    key={index}
                    onClick={() => onSelect(suggestion)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm
                   hover:bg-blue-100 transition-colors"
                >
                    {suggestion}
                </button>
            ))}
        </div>
    );
}
