import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const variants = {
        danger: {
            icon: AlertTriangle,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            buttonBg: 'bg-red-600 hover:bg-red-700',
        },
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            buttonBg: 'bg-orange-600 hover:bg-orange-700',
        },
        info: {
            icon: Info,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            buttonBg: 'bg-blue-600 hover:bg-blue-700',
        },
        success: {
            icon: CheckCircle,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            buttonBg: 'bg-green-600 hover:bg-green-700',
        },
    };

    const { icon: Icon, iconBg, iconColor, buttonBg } = variants[variant];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-start justify-between p-4">
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${iconBg}`}>
                            <Icon className={`w-6 h-6 ${iconColor}`} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                            <p className="mt-1 text-sm text-gray-500">{message}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${buttonBg}`}
                    >
                        {isLoading ? (
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
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
