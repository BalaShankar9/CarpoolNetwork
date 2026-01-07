import React from 'react';

// Skip to main content link for keyboard navigation
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link fixed -top-10 left-0 bg-emerald-500 text-white px-4 py-2 z-[100] focus:top-0 transition-all"
    >
      Skip to main content
    </a>
  );
}

// Accessible button with proper ARIA attributes
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export function AccessibleButton({
  children,
  loading,
  loadingText = 'Loading...',
  disabled,
  ...props
}: AccessibleButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="sr-only">{loadingText}</span>
          <span aria-hidden="true">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Accessible icon that includes screen reader text
interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
  className?: string;
}

export function AccessibleIcon({ icon, label, className }: AccessibleIconProps) {
  return (
    <span className={className} role="img" aria-label={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

// Live region for screen reader announcements
interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export function LiveRegion({ message, priority = 'polite' }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Accessible form field wrapper
interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ id, label, error, required, hint, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
        {required && (
          <span className="text-red-400 ml-1" aria-hidden="true">*</span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>
      
      {hint && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      
      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': [
          error ? errorId : null,
          hint ? hintId : null
        ].filter(Boolean).join(' ') || undefined,
        'aria-required': required
      })}
      
      {error && (
        <p id={errorId} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Accessible dialog/modal
interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AccessibleDialog({ isOpen, onClose, title, children }: AccessibleDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Focus the dialog when it opens
      dialogRef.current?.focus();
      
      // Trap focus within dialog
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
        
        if (e.key === 'Tab') {
          const focusableElements = dialogRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements && focusableElements.length > 0) {
            const first = focusableElements[0] as HTMLElement;
            const last = focusableElements[focusableElements.length - 1] as HTMLElement;
            
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog content */}
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
        <h2 id="dialog-title" className="text-xl font-bold text-white mb-4">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

// Accessible tabs
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface AccessibleTabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function AccessibleTabs({ tabs, defaultTab }: AccessibleTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const tabCount = tabs.length;
    
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabCount;
      setActiveTab(tabs[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabCount) % tabCount;
      setActiveTab(tabs[prevIndex].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab(tabs[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab(tabs[tabCount - 1].id);
    }
  };

  return (
    <div>
      <div role="tablist" className="flex gap-2 border-b border-slate-700 pb-2">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="pt-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

export default {
  SkipLink,
  AccessibleButton,
  AccessibleIcon,
  LiveRegion,
  FormField,
  AccessibleDialog,
  AccessibleTabs
};
