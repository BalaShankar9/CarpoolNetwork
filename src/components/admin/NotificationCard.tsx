import { useState } from 'react';
import {
    Bell,
    Trash2,
    Eye,
    MoreVertical,
    User,
    Clock,
    CheckCircle,
    AlertTriangle,
    Info,
    XCircle,
    Zap,
} from 'lucide-react';

interface NotificationRecipient {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
}

interface NotificationCardProps {
    notification: {
        id: string;
        title: string;
        body?: string | null;
        type: string;
        is_read: boolean;
        priority?: string;
        is_system?: boolean;
        created_at: string;
        expires_at?: string | null;
        recipient: NotificationRecipient;
        sent_by?: { id: string; full_name: string } | null;
    };
    onView?: (id: string) => void;
    onDelete?: (id: string) => void;
}

export default function NotificationCard({
    notification,
    onView,
    onDelete,
}: NotificationCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days < 7) {
            return `${days}d ago`;
        }
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const typeConfig: Record<string, { icon: any; bgColor: string; textColor: string }> = {
        info: { icon: Info, bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
        success: { icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-600' },
        warning: { icon: AlertTriangle, bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
        error: { icon: XCircle, bgColor: 'bg-red-100', textColor: 'text-red-600' },
        booking: { icon: Bell, bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
        ride: { icon: Bell, bgColor: 'bg-indigo-100', textColor: 'text-indigo-600' },
        message: { icon: Bell, bgColor: 'bg-cyan-100', textColor: 'text-cyan-600' },
        safety: { icon: AlertTriangle, bgColor: 'bg-red-100', textColor: 'text-red-600' },
    };

    const priorityColors: Record<string, string> = {
        low: 'bg-gray-100 text-gray-600',
        normal: 'bg-blue-100 text-blue-600',
        high: 'bg-orange-100 text-orange-600',
        urgent: 'bg-red-100 text-red-600',
    };

    const config = typeConfig[notification.type] || typeConfig.info;
    const Icon = config.icon;

    return (
        <div
            className={`relative bg-white rounded-lg border p-4 transition-all hover:border-gray-300 ${notification.is_read ? 'border-gray-200' : 'border-blue-200 bg-blue-50/30'
                }`}
        >
            <div className="flex items-start gap-3">
                {/* Type Icon */}
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`w-5 h-5 ${config.textColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                            className={`font-medium text-gray-900 ${onView ? 'cursor-pointer hover:text-blue-600' : ''}`}
                            onClick={() => onView?.(notification.id)}
                        >
                            {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                            {notification.priority && notification.priority !== 'normal' && (
                                <span
                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[notification.priority]}`}
                                >
                                    {notification.priority === 'urgent' && <Zap className="w-3 h-3 inline mr-1" />}
                                    {notification.priority}
                                </span>
                            )}
                            {!notification.is_read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                        </div>
                    </div>

                    {notification.body && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{notification.body}</p>
                    )}

                    {/* Recipient & Meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            {notification.recipient.avatar_url ? (
                                <img
                                    src={notification.recipient.avatar_url}
                                    alt={notification.recipient.full_name}
                                    className="w-4 h-4 rounded-full"
                                />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                            <span>{notification.recipient.full_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(notification.created_at)}</span>
                        </div>
                        {notification.is_system && (
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">System</span>
                        )}
                        {notification.sent_by && (
                            <span className="text-gray-400">
                                Sent by {notification.sent_by.full_name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                {onView && (
                                    <button
                                        onClick={() => {
                                            onView(notification.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View Details
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onDelete(notification.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
