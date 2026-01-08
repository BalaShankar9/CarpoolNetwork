import { useState, useEffect } from 'react';
import { X, Send, User, Search, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SendNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: NotificationData) => void;
    preselectedUser?: { id: string; full_name: string; email: string } | null;
}

interface NotificationData {
    user_id: string;
    title: string;
    body: string;
    type: string;
    priority: string;
    link?: string;
    expires_at?: string;
}

const NOTIFICATION_TYPES = [
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export default function SendNotificationModal({
    isOpen,
    onClose,
    onSend,
    preselectedUser,
}: SendNotificationModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(preselectedUser || null);
    const [searching, setSearching] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        type: 'info',
        priority: 'normal',
        link: '',
        expires_at: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (preselectedUser) {
            setSelectedUser(preselectedUser);
        }
    }, [preselectedUser]);

    useEffect(() => {
        if (!searchTerm || searchTerm.length < 2) {
            setUsers([]);
            return;
        }

        const searchUsers = async () => {
            setSearching(true);
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url')
                    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
                    .limit(10);
                setUsers(data || []);
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setSearching(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!selectedUser || !formData.title) return;

        setIsSubmitting(true);
        try {
            await onSend({
                user_id: selectedUser.id,
                title: formData.title,
                body: formData.body,
                type: formData.type,
                priority: formData.priority,
                link: formData.link || undefined,
                expires_at: formData.expires_at || undefined,
            });
            // Reset form
            setFormData({
                title: '',
                body: '',
                type: 'info',
                priority: 'normal',
                link: '',
                expires_at: '',
            });
            setSelectedUser(preselectedUser || null);
            setSearchTerm('');
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Send Notification</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* User Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
                        {selectedUser ? (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {selectedUser.avatar_url ? (
                                        <img
                                            src={selectedUser.avatar_url}
                                            alt={selectedUser.full_name}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="w-4 h-4 text-gray-500" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
                                        <p className="text-xs text-gray-500">{selectedUser.email}</p>
                                    </div>
                                </div>
                                {!preselectedUser && (
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                {users.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                                        {users.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setSearchTerm('');
                                                    setUsers([]);
                                                }}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                                            >
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={user.full_name}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <User className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Notification title"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            placeholder="Notification message (optional)"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Type & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {NOTIFICATION_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {PRIORITIES.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
                        <input
                            type="text"
                            value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                            placeholder="/rides/123 or https://..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Expires */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expires (optional)
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.expires_at}
                            onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedUser || !formData.title}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send Notification
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Bulk Notification Modal
interface BulkNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: BulkNotificationData) => void;
}

interface BulkNotificationData {
    title: string;
    body: string;
    type: string;
    priority: string;
    target_audience: string;
    link?: string;
    expires_at?: string;
}

export function BulkNotificationModal({ isOpen, onClose, onSend }: BulkNotificationModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        type: 'info',
        priority: 'normal',
        target_audience: 'all',
        link: '',
        expires_at: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!formData.title) return;

        setIsSubmitting(true);
        try {
            await onSend({
                title: formData.title,
                body: formData.body,
                type: formData.type,
                priority: formData.priority,
                target_audience: formData.target_audience,
                link: formData.link || undefined,
                expires_at: formData.expires_at || undefined,
            });
            setFormData({
                title: '',
                body: '',
                type: 'info',
                priority: 'normal',
                target_audience: 'all',
                link: '',
                expires_at: '',
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Bulk Notification</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Target Audience */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                        <select
                            value={formData.target_audience}
                            onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Users</option>
                            <option value="active">Active Users (last 7 days)</option>
                            <option value="premium">Premium Users</option>
                            <option value="new_users">New Users (last 30 days)</option>
                            <option value="inactive">Inactive Users (30+ days)</option>
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Notification title"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            placeholder="Notification message"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Type & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {NOTIFICATION_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {PRIORITIES.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
                        <input
                            type="text"
                            value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                            placeholder="/announcements or https://..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Warning */}
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-700">
                            ⚠️ This will send a notification to all users matching the selected audience. Use
                            carefully.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.title}
                        className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send to All
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
