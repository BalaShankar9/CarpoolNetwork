import React from 'react';
import { MessageSquare, Volume2, VolumeX, Mic } from 'lucide-react';

type ConversationPreference = 'chatty' | 'some' | 'quiet';

interface ChatPreferencesProps {
    value: ConversationPreference;
    onChange: (value: ConversationPreference) => void;
    disabled?: boolean;
}

export const ChatPreferences: React.FC<ChatPreferencesProps> = ({
    value,
    onChange,
    disabled = false,
}) => {
    const options: { value: ConversationPreference; label: string; emoji: string; description: string }[] = [
        {
            value: 'chatty',
            label: 'Chatty',
            emoji: '💬',
            description: 'Love a good conversation!'
        },
        {
            value: 'some',
            label: 'Balanced',
            emoji: '🙂',
            description: 'Some chat is nice'
        },
        {
            value: 'quiet',
            label: 'Quiet',
            emoji: '🤫',
            description: 'Prefer peaceful rides'
        },
    ];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Conversation Style</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">How chatty are you?</p>
                </div>
            </div>

            <div className="flex gap-2">
                {options.map(option => (
                    <button
                        key={option.value}
                        onClick={() => !disabled && onChange(option.value)}
                        disabled={disabled}
                        className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${value === option.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="text-3xl mb-2">{option.emoji}</div>
                        <div className={`font-medium ${value === option.value
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                            {option.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {option.description}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

interface ChatPreferenceBadgeProps {
    preference: ConversationPreference;
    size?: 'sm' | 'md';
}

export const ChatPreferenceBadge: React.FC<ChatPreferenceBadgeProps> = ({
    preference,
    size = 'md',
}) => {
    const configs: Record<ConversationPreference, { label: string; emoji: string; color: string }> = {
        chatty: { label: 'Chatty', emoji: '💬', color: 'blue' },
        some: { label: 'Moderate', emoji: '🙂', color: 'gray' },
        quiet: { label: 'Quiet', emoji: '🤫', color: 'slate' },
    };

    const config = configs[preference];
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
        slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    };

    return (
        <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
            } rounded-full ${colorClasses[config.color]}`}>
            <span>{config.emoji}</span>
            {config.label}
        </span>
    );
};

interface ConversationCompatibilityProps {
    userPreference: ConversationPreference;
    otherPreference: ConversationPreference;
}

export const ConversationCompatibility: React.FC<ConversationCompatibilityProps> = ({
    userPreference,
    otherPreference,
}) => {
    // Calculate compatibility
    const preferenceScore: Record<ConversationPreference, number> = {
        quiet: 0,
        some: 1,
        chatty: 2,
    };

    const diff = Math.abs(preferenceScore[userPreference] - preferenceScore[otherPreference]);

    let compatibility: 'great' | 'good' | 'ok';
    let message: string;

    if (diff === 0) {
        compatibility = 'great';
        message = 'Perfect match!';
    } else if (diff === 1) {
        compatibility = 'good';
        message = 'Compatible';
    } else {
        compatibility = 'ok';
        message = 'Different styles';
    }

    const colorClasses = {
        great: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
        good: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
        ok: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
    };

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[compatibility]}`}>
            <MessageSquare className="w-3 h-3" />
            {message}
        </div>
    );
};

export default ChatPreferences;
