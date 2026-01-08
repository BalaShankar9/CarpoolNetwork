import { useState } from 'react';
import {
    X,
    Clock,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

export interface UserMuteModalProps {
    user: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string | null;
    };
    onClose: () => void;
    onMuted?: () => void;
    onMute?: (userId: string, duration: string | null, reason: string) => Promise<void>;
}

export default function UserMuteModal({ user, onClose, onMuted, onMute }: UserMuteModalProps) {
    const [duration, setDuration] = useState<string>('24h');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const durations = [
        { value: '1h', label: '1 Hour', description: 'Brief cooldown period' },
        { value: '24h', label: '24 Hours', description: 'One day mute' },
        { value: '7d', label: '7 Days', description: 'One week suspension' },
        { value: '30d', label: '30 Days', description: 'Monthly suspension' },
        { value: 'permanent', label: 'Permanent', description: 'Indefinite mute' },
    ];

    const handleMute = async () => {
        if (!reason.trim()) {
            toast.warning('Please provide a reason for the mute');
            return;
        }

        setSaving(true);
        try {
            // Use custom onMute callback if provided, otherwise use default RPC call
            if (onMute) {
                await onMute(user.id, duration === 'permanent' ? null : duration, reason);
            } else {
                const { error } = await supabase.rpc('admin_mute_user', {
                    p_user_id: user.id,
                    p_reason: reason,
                    p_duration: duration,
                });
                if (error) throw error;
            }

            toast.success(`User muted for ${durations.find(d => d.value === duration)?.label}`);
            onMuted?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to mute user');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Mute User</h2>
                            <p className="text-sm text-gray-500">Prevent user from sending messages</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-lg font-medium text-gray-600">
                                    {user.full_name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                    </div>

                    {/* Duration Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Mute Duration
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {durations.map((d) => (
                                <button
                                    key={d.value}
                                    onClick={() => setDuration(d.value)}
                                    className={`p-3 text-left rounded-lg border transition-colors ${duration === d.value
                                            ? 'bg-orange-50 border-orange-300 text-orange-800'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        } ${d.value === 'permanent' ? 'col-span-2' : ''}`}
                                >
                                    <p className="font-medium text-sm">{d.label}</p>
                                    <p className="text-xs text-gray-500">{d.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this user is being muted..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Warning */}
                    {duration === 'permanent' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Permanent Mute</p>
                                <p className="text-xs text-red-600">
                                    This will permanently prevent the user from sending any messages until manually unmuted.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleMute}
                        disabled={saving || !reason.trim()}
                        className="flex-1 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Muting...
                            </>
                        ) : (
                            'Mute User'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Unmute confirmation modal
export interface UnmuteModalProps {
    mute?: {
        id: string;
        user: {
            id: string;
            full_name: string;
            email: string;
        };
        reason: string;
        duration: string;
        expires_at: string | null;
    };
    user?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string | null;
        mute_reason?: string | null;
        muted_at?: string | null;
        mute_expires_at?: string | null;
    };
    onClose: () => void;
    onUnmuted?: () => void;
    onUnmute?: (userId: string, reason: string) => Promise<void>;
}

export function UnmuteModal({ mute, user, onClose, onUnmuted, onUnmute }: UnmuteModalProps) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    // Support both mute and user prop patterns
    const targetUser = mute?.user || user;
    const muteReason = mute?.reason || user?.mute_reason;
    const expiresAt = mute?.expires_at || user?.mute_expires_at;

    const handleUnmute = async () => {
        if (!reason.trim()) {
            toast.warning('Please provide a reason for unmuting');
            return;
        }

        if (!targetUser?.id) {
            toast.error('User not found');
            return;
        }

        setSaving(true);
        try {
            if (onUnmute) {
                await onUnmute(targetUser.id, reason);
            } else {
                const { error } = await supabase.rpc('admin_unmute_user', {
                    p_user_id: targetUser.id,
                    p_reason: reason,
                });
                if (error) throw error;
            }

            toast.success('User unmuted successfully');
            onUnmuted?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to unmute user');
        } finally {
            setSaving(false);
        }
    };

    if (!targetUser) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Unmute User</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Remove the mute from <strong>{targetUser.full_name}</strong>
                </p>

                {/* Current Mute Info */}
                {muteReason && (
                    <div className="p-3 bg-gray-50 rounded-lg mb-4">
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Original reason:</span> {muteReason}
                        </p>
                        {expiresAt && (
                            <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Expires:</span>{' '}
                                {new Date(expiresAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                )}

                {/* Reason */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unmute Reason *
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why is this user being unmuted?"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUnmute}
                        disabled={saving || !reason.trim()}
                        className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Unmuting...
                            </>
                        ) : (
                            'Unmute User'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
