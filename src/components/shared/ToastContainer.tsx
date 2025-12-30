import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { installAlertOverride, ToastDetail, ToastKind } from '../../lib/toast';

type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
  duration: number;
};

const MAX_TOASTS = 4;

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styleMap = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    installAlertOverride();

    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastDetail>;
      const detail = customEvent.detail;
      if (!detail?.message) return;

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const kind = detail.kind || 'info';
      const duration = detail.duration || 4000;

      setToasts((prev) => {
        const next = [...prev, { id, message: detail.message, kind, duration }];
        if (next.length > MAX_TOASTS) {
          return next.slice(next.length - MAX_TOASTS);
        }
        return next;
      });

      timersRef.current[id] = window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        delete timersRef.current[id];
      }, duration);
    };

    window.addEventListener('app-toast', handleToast);

    return () => {
      window.removeEventListener('app-toast', handleToast);
      Object.values(timersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current = {};
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.kind];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${styleMap[toast.kind]}`}
          >
            <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm whitespace-pre-line">{toast.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              className="text-current/70 hover:text-current"
              aria-label="Dismiss notification"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
