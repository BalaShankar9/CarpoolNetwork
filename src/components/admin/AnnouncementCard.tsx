import { useState } from 'react';
import {
    Megaphone,
    Trash2,
    Edit,
    MoreVertical,
    Send,
    Eye,
    EyeOff,
    Clock,
    Users,
    AlertTriangle,
    Info,
    Wrench,
    Sparkles,
    Gift,
} from 'lucide-react';

interface AnnouncementCardProps {
    announcement: {
        id: string;
        title: string;
        body: string;
        announcement_type: string;
        priority: string;
        target_audience: string;
        display_type: string;
        is_active: boolean;
        starts_at: string;
        expires_at?: string | null;
        created_at: string;
        view_count: number;
        dismiss_count: number;
        created_by_user?: { id: string; full_name: string } | null;
    };
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onToggleActive?: (id: string, active: boolean) => void;
    onBroadcast?: (id: string) => void;
}

export default function AnnouncementCard({
    announcement,
    onEdit,
    onDelete,
    onToggleActive,
    onBroadcast,
}: AnnouncementCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const typeConfig: Record<string, { icon: any; bgColor: string; textColor: string; label: string }> = {
        info: { icon: Info, bgColor: 'bg-blue-100', textColor: 'text-blue-600', label: 'Info' },
        warning: { icon: AlertTriangle, bgColor: 'bg-orange-100', textColor: 'text-orange-600', label: 'Warning' },
        maintenance: { icon: Wrench, bgColor: 'bg-gray-100', textColor: 'text-gray-600', label: 'Maintenance' },
        feature: { icon: Sparkles, bgColor: 'bg-purple-100', textColor: 'text-purple-600', label: 'Feature' },
        promotion: { icon: Gift, bgColor: 'bg-green-100', textColor: 'text-green-600', label: 'Promotion' },
    };

    const audienceLabels: Record<string, string> = {
        all: 'All Users',
        active: 'Active Users',
        premium: 'Premium Users',
        new_users: 'New Users',
        inactive: 'Inactive Users',
    };

    const displayLabels: Record<string, string> = {
        banner: 'Banner',
        modal: 'Modal',
        notification: 'Notification',
        push: 'Push',
    };

    const priorityColors: Record<string, string> = {
        low: 'bg-gray-100 text-gray-600',
        normal: 'bg-blue-100 text-blue-600',
        high: 'bg-orange-100 text-orange-600',
        urgent: 'bg-red-100 text-red-600',
    };

    const config = typeConfig[announcement.announcement_type] || typeConfig.info;
    const Icon = config.icon;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();
    const isScheduled = new Date(announcement.starts_at) > new Date();

    return (
        <div
            className={`relative bg-white rounded-xl border overflow-hidden ${!announcement.is_active || isExpired
                    ? 'border-gray-200 opacity-60'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
        >
            {/* Header */}
            <div className={`px-4 py-3 ${config.bgColor} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.textColor}`} />
                    <span className={`font-medium ${config.textColor}`}>{config.label}</span>
                    {announcement.priority !== 'normal' && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[announcement.priority]}`}>
                            {announcement.priority}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isScheduled && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Scheduled
                        </span>
                    )}
                    {isExpired && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                            Expired
                        </span>
                    )}
                    {!announcement.is_active && !isExpired && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full flex items-center gap-1">
                            <EyeOff className="w-3 h-3" />
                            Inactive
                        </span>
                    )}
                    {announcement.is_active && !isExpired && !isScheduled && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Active
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">{announcement.body}</p>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {audienceLabels[announcement.target_audience]}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                        {displayLabels[announcement.display_type]}
                    </span>
                    {announcement.view_count > 0 && (
                        <span>{announcement.view_count} views</span>
                    )}
                    {announcement.dismiss_count > 0 && (
                        <span>{announcement.dismiss_count} dismissed</span>
                    )}
                </div>

                {/* Dates */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span>
                        Created {formatDate(announcement.created_at)}
                        {announcement.created_by_user && ` by ${announcement.created_by_user.full_name}`}
                    </span>
                    {announcement.expires_at && (
                        <span>
                            {isExpired ? 'Expired' : 'Expires'}: {formatDate(announcement.expires_at)}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-3 right-3">
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`p-1.5 rounded-lg hover:bg-white/50 ${config.textColor}`}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                {onEdit && (
                                    <button
                                        onClick={() => {
                                            onEdit(announcement.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit
                                    </button>
                                )}
                                {onToggleActive && (
                                    <button
                                        onClick={() => {
                                            onToggleActive(announcement.id, !announcement.is_active);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        {announcement.is_active ? (
                                            <>
                                                <EyeOff className="w-4 h-4" />
                                                Deactivate
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="w-4 h-4" />
                                                Activate
                                            </>
                                        )}
                                    </button>
                                )}
                                {onBroadcast && announcement.is_active && !isExpired && (
                                    <button
                                        onClick={() => {
                                            onBroadcast(announcement.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        Broadcast Now
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onDelete(announcement.id);
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
