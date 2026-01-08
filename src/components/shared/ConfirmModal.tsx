import { ReactNode } from 'react';
import { AlertTriangle, Trash2, AlertCircle, CheckCircle, Loader, X } from 'lucide-react';

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ConfirmVariant, { bg: string; iconBg: string; iconColor: string; buttonBg: string; buttonHover: string }> = {
  danger: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
  },
  warning: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
  },
  info: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
  },
  success: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    buttonBg: 'bg-green-600',
    buttonHover: 'hover:bg-green-700',
  },
};

const defaultIcons: Record<ConfirmVariant, ReactNode> = {
  danger: <Trash2 className="w-6 h-6" />,
  warning: <AlertTriangle className="w-6 h-6" />,
  info: <AlertCircle className="w-6 h-6" />,
  success: <CheckCircle className="w-6 h-6" />,
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const styles = variantStyles[variant];
  const displayIcon = icon || defaultIcons[variant];

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center flex-shrink-0 ${styles.iconColor}`}>
              {displayIcon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                disabled={loading}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`mx-6 p-4 rounded-xl ${styles.bg} mb-6`}>
          {typeof message === 'string' ? (
            <p className="text-gray-700">{message}</p>
          ) : (
            message
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-3 ${styles.buttonBg} text-white rounded-xl ${styles.buttonHover} transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Please wait...
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

// Hook for easier usage
import { useState, useCallback } from 'react';

interface UseConfirmOptions {
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm: () => Promise<void> | void;
}

export function useConfirm() {
  const [state, setState] = useState<{
    isOpen: boolean;
    loading: boolean;
    options: UseConfirmOptions | null;
  }>({
    isOpen: false,
    loading: false,
    options: null,
  });

  const confirm = useCallback((options: UseConfirmOptions) => {
    setState({ isOpen: true, loading: false, options });
  }, []);

  const handleClose = useCallback(() => {
    if (!state.loading) {
      setState({ isOpen: false, loading: false, options: null });
    }
  }, [state.loading]);

  const handleConfirm = useCallback(async () => {
    if (!state.options) return;
    
    setState(s => ({ ...s, loading: true }));
    try {
      await state.options.onConfirm();
    } finally {
      setState({ isOpen: false, loading: false, options: null });
    }
  }, [state.options]);

  const ConfirmDialog = state.options ? (
    <ConfirmModal
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.options.title}
      message={state.options.message}
      confirmText={state.options.confirmText}
      cancelText={state.options.cancelText}
      variant={state.options.variant}
      loading={state.loading}
    />
  ) : null;

  return { confirm, ConfirmDialog };
}
