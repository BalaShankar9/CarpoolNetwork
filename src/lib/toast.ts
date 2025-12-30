export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastDetail = {
  message: string;
  kind?: ToastKind;
  duration?: number;
};

const TOAST_EVENT = 'app-toast';
const DEFAULT_DURATION = 4000;

const normalizeMessage = (message: unknown): string => {
  if (message === null || message === undefined) return '';
  if (typeof message === 'string') return message;
  if (message instanceof Error) return message.message || 'Unexpected error';
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
};

export const toast = {
  show(message: string, kind: ToastKind = 'info', duration = DEFAULT_DURATION) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<ToastDetail>(TOAST_EVENT, {
        detail: { message, kind, duration },
      })
    );
  },
  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  },
  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  },
  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  },
  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  },
};

export const notify = (message: unknown, kind?: ToastKind) => {
  const text = normalizeMessage(message);
  if (!text) return;

  if (kind) {
    toast.show(text, kind);
    return;
  }

  const lowered = text.toLowerCase();
  if (/(fail|error|unable|could not|not available|does not)/i.test(lowered)) {
    toast.error(text);
  } else if (/(success|sent|completed|approved|accepted|confirmed|saved|updated|posted|created)/i.test(lowered)) {
    toast.success(text);
  } else if (/(please|verify|select|enter|provide|already|missing)/i.test(lowered)) {
    toast.warning(text);
  } else {
    toast.info(text);
  }
};

let alertOverrideInstalled = false;

export const installAlertOverride = () => {
  if (alertOverrideInstalled || typeof window === 'undefined') return;
  alertOverrideInstalled = true;

  window.alert = (message?: any) => {
    notify(message);
  };
};
