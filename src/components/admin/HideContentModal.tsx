import { useState } from 'react';
import { EyeOff, X } from 'lucide-react';

interface HideContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    contentType: 'post' | 'comment' | 'ride' | 'message';
    contentTitle?: string;
}

const COMMON_REASONS = [
    'Inappropriate content',
    'Spam or advertising',
    'Harassment',
    'Misinformation',
    'Off-topic',
    'Violates community guidelines',
    'Reported by multiple users',
];

export default function HideContentModal({
    isOpen,
    onClose,
    onConfirm,
    contentType,
    contentTitle,
}: HideContentModalProps) {
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        const finalReason = reason === 'custom' ? customReason : reason;
        if (!finalReason.trim()) return;
        onConfirm(finalReason);
        // Reset form
        setReason('');
        setCustomReason('');
    };

    const typeLabel = {
        post: 'Post',
        comment: 'Comment',
        ride: 'Ride',
        message: 'Message',
    }[contentType];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <EyeOff className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Hide {typeLabel}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {contentTitle && (
                        <div>
                            <p className="text-sm text-gray-500">Content:</p>
                            <p className="text-sm text-gray-900 font-medium line-clamp-2">{contentTitle}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for hiding
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select a reason...</option>
                            {COMMON_REASONS.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                            <option value="custom">Other (custom reason)</option>
                        </select>
                    </div>

                    {reason === 'custom' && (
                        <textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="Enter reason for hiding..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    )}

                    <p className="text-sm text-gray-500">
                        Hiding this {typeLabel.toLowerCase()} will make it invisible to users but keep it in the
                        system for review.
                    </p>
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
                        onClick={handleConfirm}
                        disabled={!reason && !customReason}
                        className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <EyeOff className="w-4 h-4" />
                        Hide {typeLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
