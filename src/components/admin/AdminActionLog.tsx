import { useState, useEffect } from 'react';
import {
    History,
    User,
    Edit,
    XCircle,
    CheckCircle,
    Trash2,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminActionLogProps {
    resourceType: 'ride' | 'booking' | 'user';
    resourceId: string;
    maxItems?: number;
    showExpanded?: boolean;
}

interface ActionLogEntry {
    id: string;
    admin_id: string;
    admin_email: string;
    action_type: string;
    resource_type: string;
    resource_id: string;
    previous_state: any;
    new_state: any;
    reason: string | null;
    metadata: any;
    created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    ride_edit: <Edit className="w-4 h-4 text-blue-500" />,
    ride_cancel: <XCircle className="w-4 h-4 text-orange-500" />,
    ride_delete: <Trash2 className="w-4 h-4 text-red-500" />,
    ride_complete: <CheckCircle className="w-4 h-4 text-green-500" />,
    booking_approve: <CheckCircle className="w-4 h-4 text-green-500" />,
    booking_cancel: <XCircle className="w-4 h-4 text-orange-500" />,
    booking_decline: <XCircle className="w-4 h-4 text-red-500" />,
    booking_complete: <CheckCircle className="w-4 h-4 text-green-500" />,
    user_edit: <Edit className="w-4 h-4 text-blue-500" />,
    user_suspend: <XCircle className="w-4 h-4 text-orange-500" />,
    user_ban: <XCircle className="w-4 h-4 text-red-500" />,
    user_verify: <CheckCircle className="w-4 h-4 text-green-500" />,
};

const ACTION_LABELS: Record<string, string> = {
    ride_edit: 'Ride Edited',
    ride_cancel: 'Ride Cancelled',
    ride_delete: 'Ride Deleted',
    ride_complete: 'Ride Completed',
    booking_approve: 'Booking Approved',
    booking_cancel: 'Booking Cancelled',
    booking_decline: 'Booking Declined',
    booking_complete: 'Booking Completed',
    user_edit: 'User Edited',
    user_suspend: 'User Suspended',
    user_ban: 'User Banned',
    user_verify: 'User Verified',
};

export default function AdminActionLog({
    resourceType,
    resourceId,
    maxItems = 10,
    showExpanded = false,
}: AdminActionLogProps) {
    const [logs, setLogs] = useState<ActionLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(showExpanded);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, [resourceType, resourceId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_action_logs')
                .select('*')
                .eq('resource_type', resourceType)
                .eq('resource_id', resourceId)
                .order('created_at', { ascending: false })
                .limit(maxItems);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching admin logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getAdminName = (email: string) => {
        const name = email.split('@')[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    const renderChangeDetails = (log: ActionLogEntry) => {
        if (!log.previous_state || !log.new_state) return null;

        const changes: { field: string; from: any; to: any }[] = [];

        // Compare states to find changes
        Object.keys(log.new_state).forEach((key) => {
            if (
                log.previous_state[key] !== log.new_state[key] &&
                key !== 'updated_at' &&
                key !== 'created_at'
            ) {
                changes.push({
                    field: key.replace(/_/g, ' '),
                    from: log.previous_state[key],
                    to: log.new_state[key],
                });
            }
        });

        if (changes.length === 0) return null;

        return (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs space-y-1">
                {changes.slice(0, 5).map((change, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span className="text-gray-500 capitalize font-medium">{change.field}:</span>
                        <span className="text-red-600 line-through">
                            {typeof change.from === 'object' ? JSON.stringify(change.from) : String(change.from || 'empty')}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600">
                            {typeof change.to === 'object' ? JSON.stringify(change.to) : String(change.to || 'empty')}
                        </span>
                    </div>
                ))}
                {changes.length > 5 && (
                    <p className="text-gray-400">+{changes.length - 5} more changes</p>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Admin Action Log</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Admin Action Log</h3>
                    {logs.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            {logs.length}
                        </span>
                    )}
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {expanded && (
                <div className="border-t border-gray-100">
                    {logs.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p>No admin actions recorded</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {logs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            {ACTION_ICONS[log.action_type] || (
                                                <User className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-900">
                                                    {ACTION_LABELS[log.action_type] || log.action_type}
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">
                                                    {formatTimeAgo(log.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                by <span className="font-medium">{getAdminName(log.admin_email)}</span>
                                            </p>
                                            {log.reason && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    <span className="font-medium">Reason:</span> {log.reason}
                                                </p>
                                            )}

                                            {/* Expandable details */}
                                            {(log.previous_state || log.new_state) && (
                                                <button
                                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                                                >
                                                    {expandedLog === log.id ? 'Hide details' : 'Show details'}
                                                </button>
                                            )}

                                            {expandedLog === log.id && renderChangeDetails(log)}
                                        </div>
                                        <div className="text-xs text-gray-400 whitespace-nowrap">
                                            {formatDateTime(log.created_at)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
