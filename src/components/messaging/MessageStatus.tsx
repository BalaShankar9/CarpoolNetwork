import React from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface ReadReceiptProps {
    status: MessageStatus;
    timestamp?: Date;
    className?: string;
}

export function ReadReceipt({ status, timestamp, className = '' }: ReadReceiptProps) {
    const getStatusIcon = () => {
        switch (status) {
            case 'sending':
                return (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                    </motion.div>
                );
            case 'sent':
                return <Check className="w-3.5 h-3.5 text-slate-400" />;
            case 'delivered':
                return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
            case 'read':
                return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
            case 'failed':
                return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
            default:
                return null;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'sending':
                return 'Sending...';
            case 'sent':
                return 'Sent';
            case 'delivered':
                return 'Delivered';
            case 'read':
                return 'Read';
            case 'failed':
                return 'Failed to send';
            default:
                return '';
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {timestamp && (
                <span className="text-xs text-slate-500">{formatTime(timestamp)}</span>
            )}
            <span title={getStatusText()}>{getStatusIcon()}</span>
        </div>
    );
}

// Typing indicator component
interface TypingIndicatorProps {
    userName?: string;
    userAvatar?: string;
}

export function TypingIndicator({ userName, userAvatar }: TypingIndicatorProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 py-2"
        >
            {userAvatar && (
                <img
                    src={userAvatar}
                    alt={userName || 'User'}
                    className="w-6 h-6 rounded-full object-cover"
                />
            )}
            <div className="flex items-center gap-1 px-3 py-2 bg-slate-700/50 rounded-full">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                        animate={{
                            y: [0, -4, 0],
                            opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15
                        }}
                    />
                ))}
            </div>
            {userName && (
                <span className="text-xs text-slate-400">{userName} is typing</span>
            )}
        </motion.div>
    );
}

// Online status indicator
interface OnlineStatusProps {
    isOnline: boolean;
    lastSeen?: Date;
    size?: 'sm' | 'md' | 'lg';
}

export function OnlineStatus({ isOnline, lastSeen, size = 'sm' }: OnlineStatusProps) {
    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3'
    };

    const formatLastSeen = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="flex items-center gap-1.5">
            <span
                className={`${sizeClasses[size]} rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
            />
            {!isOnline && lastSeen && (
                <span className="text-xs text-slate-400">
                    Last seen {formatLastSeen(lastSeen)}
                </span>
            )}
        </div>
    );
}

// Message reactions component
interface Reaction {
    emoji: string;
    users: string[];
    count: number;
}

interface MessageReactionsProps {
    reactions: Reaction[];
    currentUserId: string;
    onReact: (emoji: string) => void;
    onRemoveReaction: (emoji: string) => void;
}

export function MessageReactions({
    reactions,
    currentUserId,
    onReact,
    onRemoveReaction
}: MessageReactionsProps) {
    const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    const handleReactionClick = (emoji: string, users: string[]) => {
        if (users.includes(currentUserId)) {
            onRemoveReaction(emoji);
        } else {
            onReact(emoji);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1">
            {reactions.map((reaction) => (
                <motion.button
                    key={reaction.emoji}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleReactionClick(reaction.emoji, reaction.users)}
                    className={`px-2 py-0.5 rounded-full text-sm flex items-center gap-1 transition-colors ${reaction.users.includes(currentUserId)
                            ? 'bg-purple-500/30 border border-purple-500'
                            : 'bg-slate-700/50 hover:bg-slate-700'
                        }`}
                >
                    <span>{reaction.emoji}</span>
                    <span className="text-xs text-slate-300">{reaction.count}</span>
                </motion.button>
            ))}
        </div>
    );
}

// Reaction picker popup
interface ReactionPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
    const commonReactions = [
        '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉',
        '🙏', '👏', '🔥', '💯', '✅', '⭐', '🚗', '🛣️'
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-xl p-2 shadow-xl z-50"
            onMouseLeave={onClose}
        >
            <div className="grid grid-cols-8 gap-1">
                {commonReactions.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => {
                            onSelect(emoji);
                            onClose();
                        }}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

export default ReadReceipt;
