import { useState, useEffect } from 'react';
import { X, Megaphone, Save, Calendar, Users, Clock } from 'lucide-react';

interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AnnouncementData) => void;
    announcement?: Announcement | null;
}

interface Announcement {
    id: string;
    title: string;
    body: string;
    type: string;
    priority: string;
    target_audience: string;
    display_type: string;
    starts_at?: string;
    ends_at?: string;
    is_active: boolean;
}

interface AnnouncementData {
    title: string;
    body: string;
    type: string;
    priority: string;
    target_audience: string;
    display_type: string;
    starts_at?: string;
    ends_at?: string;
}

const ANNOUNCEMENT_TYPES = [
    { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-700' },
    { value: 'warning', label: 'Warning', color: 'bg-orange-100 text-orange-700' },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-purple-100 text-purple-700' },
    { value: 'feature', label: 'New Feature', color: 'bg-green-100 text-green-700' },
    { value: 'promotion', label: 'Promotion', color: 'bg-pink-100 text-pink-700' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
];

const TARGET_AUDIENCES = [
    { value: 'all', label: 'All Users' },
    { value: 'active', label: 'Active Users' },
    { value: 'premium', label: 'Premium Users' },
    { value: 'new_users', label: 'New Users' },
    { value: 'drivers', label: 'Drivers Only' },
    { value: 'passengers', label: 'Passengers Only' },
];

const DISPLAY_TYPES = [
    { value: 'banner', label: 'Top Banner', description: 'Shown at top of all pages' },
    { value: 'modal', label: 'Modal Popup', description: 'Shown once until dismissed' },
    { value: 'toast', label: 'Toast Notification', description: 'Brief popup that auto-hides' },
    { value: 'inline', label: 'Inline Notice', description: 'Shown in notifications panel' },
];

export default function AnnouncementModal({
    isOpen,
    onClose,
    onSave,
    announcement,
}: AnnouncementModalProps) {
    const [formData, setFormData] = useState<AnnouncementData>({
        title: '',
        body: '',
        type: 'info',
        priority: 'normal',
        target_audience: 'all',
        display_type: 'banner',
        starts_at: '',
        ends_at: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);

    useEffect(() => {
        if (announcement) {
            setFormData({
                title: announcement.title,
                body: announcement.body,
                type: announcement.type,
                priority: announcement.priority,
                target_audience: announcement.target_audience,
                display_type: announcement.display_type,
                starts_at: announcement.starts_at
                    ? new Date(announcement.starts_at).toISOString().slice(0, 16)
                    : '',
                ends_at: announcement.ends_at
                    ? new Date(announcement.ends_at).toISOString().slice(0, 16)
                    : '',
            });
            setShowSchedule(!!announcement.starts_at || !!announcement.ends_at);
        } else {
            setFormData({
                title: '',
                body: '',
                type: 'info',
                priority: 'normal',
                target_audience: 'all',
                display_type: 'banner',
                starts_at: '',
                ends_at: '',
            });
            setShowSchedule(false);
        }
    }, [announcement, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!formData.title || !formData.body) return;

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                starts_at: formData.starts_at || undefined,
                ends_at: formData.ends_at || undefined,
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditing = !!announcement;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isEditing ? 'Edit Announcement' : 'Create Announcement'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Announcement Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ANNOUNCEMENT_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setFormData({ ...formData, type: type.value })}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${formData.type === type.value
                                            ? type.color + ' ring-2 ring-offset-1 ring-current'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Announcement title"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                        <textarea
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            placeholder="Announcement message (supports markdown)"
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Tip: Use **bold**, *italic*, or [links](url) for formatting
                        </p>
                    </div>

                    {/* Priority & Target */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <span className="flex items-center gap-1">
                                    Priority
                                </span>
                            </label>
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    Target Audience
                                </span>
                            </label>
                            <select
                                value={formData.target_audience}
                                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {TARGET_AUDIENCES.map((a) => (
                                    <option key={a.value} value={a.value}>
                                        {a.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Display Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Display Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {DISPLAY_TYPES.map((dt) => (
                                <button
                                    key={dt.value}
                                    onClick={() => setFormData({ ...formData, display_type: dt.value })}
                                    className={`p-3 rounded-lg border-2 text-left transition-all ${formData.display_type === dt.value
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <p className="font-medium text-sm text-gray-900">{dt.label}</p>
                                    <p className="text-xs text-gray-500">{dt.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Schedule Toggle */}
                    <div className="border-t border-gray-200 pt-4">
                        <button
                            onClick={() => setShowSchedule(!showSchedule)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            <Calendar className="w-4 h-4" />
                            {showSchedule ? 'Hide Schedule Options' : 'Add Schedule (Optional)'}
                        </button>

                        {showSchedule && (
                            <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                Start Date/Time
                                            </span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.starts_at}
                                            onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                End Date/Time
                                            </span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.ends_at}
                                            onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Leave empty for immediate start. If end date is set, announcement will
                                    automatically expire.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                        <div
                            className={`p-4 rounded-lg ${ANNOUNCEMENT_TYPES.find((t) => t.value === formData.type)?.color ||
                                'bg-gray-100 text-gray-700'
                                }`}
                        >
                            <p className="font-semibold">{formData.title || 'Announcement Title'}</p>
                            <p className="text-sm mt-1 opacity-90">{formData.body || 'Announcement message...'}</p>
                        </div>
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
                        disabled={isSubmitting || !formData.title || !formData.body}
                        className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Update Announcement' : 'Create Announcement'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
