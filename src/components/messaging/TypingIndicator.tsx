import { useEffect, useState } from 'react';

interface TypingIndicatorProps {
    userName?: string;
    dotColor?: string;
}

export function TypingIndicator({ userName, dotColor = 'bg-gray-400' }: TypingIndicatorProps) {
    return (
        <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-2xl">
                <span className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
                <span className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
                <span className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
            </div>
            {userName && (
                <span className="text-xs text-gray-500">{userName} is typing...</span>
            )}
        </div>
    );
}

// Hook to detect when user is typing and broadcast it
interface UseTypingIndicatorOptions {
    channelId: string;
    userId: string;
    userName?: string;
    debounceMs?: number;
}

interface TypingUser {
    userId: string;
    userName?: string;
    timestamp: number;
}

export function useTypingIndicator({
    channelId,
    userId,
    userName,
    debounceMs = 3000,
}: UseTypingIndicatorOptions) {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [lastTypingSent, setLastTypingSent] = useState(0);

    // Clean up stale typing indicators
    useEffect(() => {
        const cleanup = setInterval(() => {
            const now = Date.now();
            setTypingUsers(prev => prev.filter(u => now - u.timestamp < debounceMs + 1000));
        }, 1000);

        return () => clearInterval(cleanup);
    }, [debounceMs]);

    // Broadcast typing status
    const sendTyping = async () => {
        const now = Date.now();
        if (now - lastTypingSent < debounceMs) return;

        setLastTypingSent(now);

        // In a real implementation, this would broadcast via Supabase realtime
        // For now, we'll just log it
        console.log(`User ${userId} is typing in channel ${channelId}`);
    };

    // Handle incoming typing events
    const handleTypingEvent = (event: { userId: string; userName?: string }) => {
        if (event.userId === userId) return; // Ignore own typing events

        setTypingUsers(prev => {
            const existing = prev.findIndex(u => u.userId === event.userId);
            const newUser: TypingUser = {
                userId: event.userId,
                userName: event.userName,
                timestamp: Date.now(),
            };

            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newUser;
                return updated;
            }
            return [...prev, newUser];
        });
    };

    // Clear typing for a user (when they send a message)
    const clearTyping = (clearUserId: string) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== clearUserId));
    };

    return {
        typingUsers: typingUsers.filter(u => u.userId !== userId),
        sendTyping,
        handleTypingEvent,
        clearTyping,
    };
}

// Typing indicator with multiple users
interface MultiUserTypingIndicatorProps {
    typingUsers: Array<{ userName?: string }>;
}

export function MultiUserTypingIndicator({ typingUsers }: MultiUserTypingIndicatorProps) {
    if (typingUsers.length === 0) return null;

    const getTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].userName || 'Someone'} is typing...`;
        }
        if (typingUsers.length === 2) {
            const names = typingUsers.map(u => u.userName || 'Someone');
            return `${names[0]} and ${names[1]} are typing...`;
        }
        return `${typingUsers.length} people are typing...`;
    };

    return (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500">
            <div className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{getTypingText()}</span>
        </div>
    );
}
