import { useState } from 'react';
import {
    AlertTriangle,
    X,
    User,
    AlertCircle,
    Info,
} from 'lucide-react';

interface ContentWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: WarningData) => void;
    targetUser: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        warning_count?: number;
    };
    contentType: 'post' | 'comment';
    contentId: string;
    contentPreview: string;
}

interface WarningData {
    user_id: string;
    warning_type: 'first_warning' | 'second_warning' | 'final_warning';
    reason: string;
    related_content_type: 'post' | 'comment';
    related_content_id: string;
}

const WARNING_TYPES = [
    {
        value: 'first_warning',
        label: 'First Warning',
        description: 'Initial warning for minor violations',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: Info,
    },
    {
        value: 'second_warning',
        label: 'Second Warning',
        description: 'Repeat offense, stronger warning',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: AlertCircle,
    },
    {
        value: 'final_warning',
        label: 'Final Warning',
        description: 'Last warning before suspension/ban',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: AlertTriangle,
    },
];

const COMMON_REASONS = [
    'Inappropriate content',
    'Harassment or bullying',
    'Spam or advertising',
    'Misinformation',
    'Off-topic content',
    'Violation of community guidelines',
    'Repeated rule violations',
];

export default function ContentWarningModal({
    isOpen,
    onClose,
    onSubmit,
    targetUser,
    contentType,
    contentId,
    contentPreview,
}: ContentWarningModalProps) {
    const [warningType, setWarningType] = useState<string>('first_warning');
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const finalReason = reason === 'custom' ? customReason : reason;
        if (!finalReason.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                user_id: targetUser.id,
                warning_type: warningType as WarningData['warning_type'],
                reason: finalReason,
                related_content_type: contentType,
                related_content_id: contentId,
            });
            onClose();
            // Reset form
            setWarningType('first_warning');
            setReason('');
            setCustomReason('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedType = WARNING_TYPES.find((t) => t.value === warningType);
    const IconComponent = selectedType?.icon || AlertTriangle;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Issue Content Warning</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-5">
                    {/* Target User */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Warning For</label>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            {targetUser.avatar_url ? (
                                <img
                                    src={targetUser.avatar_url}
                                    alt={targetUser.full_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-500" />
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-gray-900">{targetUser.full_name}</p>
                                {targetUser.warning_count !== undefined && (
                                    <p className="text-sm text-gray-500">
                                        Previous warnings: {targetUser.warning_count}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Preview */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Related {contentType === 'post' ? 'Post' : 'Comment'}
                        </label>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 line-clamp-3">{contentPreview}</p>
                        </div>
                    </div>

                    {/* Warning Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Warning Level</label>
                        <div className="space-y-2">
                            {WARNING_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setWarningType(type.value)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${warningType === type.value
                                            ? type.color + ' border-current'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <type.icon
                                        className={`w-5 h-5 ${warningType === type.value ? '' : 'text-gray-400'}`}
                                    />
                                    <div className="text-left">
                                        <p
                                            className={`font-medium ${warningType === type.value ? '' : 'text-gray-900'}`}
                                        >
                                            {type.label}
                                        </p>
                                        <p
                                            className={`text-xs ${warningType === type.value ? 'opacity-80' : 'text-gray-500'}`}
                                        >
                                            {type.description}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                        >
                            <option value="">Select a reason...</option>
                            {COMMON_REASONS.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                            <option value="custom">Other (custom reason)</option>
                        </select>

                        {reason === 'custom' && (
                            <textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Enter custom reason..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        )}
                    </div>

                    {/* Warning Preview */}
                    {(reason || customReason) && (
                        <div className={`p-4 rounded-lg ${selectedType?.color || 'bg-gray-50'}`}>
                            <div className="flex items-start gap-3">
                                <IconComponent className="w-5 h-5 mt-0.5" />
                                <div>
                                    <p className="font-medium mb-1">{selectedType?.label} Preview</p>
                                    <p className="text-sm opacity-90">
                                        {reason === 'custom' ? customReason : reason}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
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
                        disabled={isSubmitting || (!reason && !customReason)}
                        className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                Issuing Warning...
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-4 h-4" />
                                Issue Warning
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
