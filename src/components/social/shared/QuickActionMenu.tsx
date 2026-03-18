import { type ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface QuickAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

export interface QuickActionMenuProps {
  actions: QuickAction[];
  trigger: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
} as const;

const originMap = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
} as const;

export default function QuickActionMenu({
  actions,
  trigger,
  position = 'bottom',
}: QuickActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleActionClick = (action: QuickAction) => {
    action.onClick();
    setOpen(false);
  };

  return (
    <div className="relative inline-flex" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {/* Backdrop on mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{ transformOrigin: originMap[position] }}
            className={`
              absolute ${positionClasses[position]}
              z-50 min-w-[160px]
              bg-white rounded-xl shadow-lg border border-gray-100
              py-1
              sm:max-w-xs
              max-sm:fixed max-sm:bottom-4 max-sm:left-4 max-sm:right-4
              max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0
              max-sm:rounded-2xl max-sm:py-2
            `}
            role="menu"
          >
            {actions.map((action, i) => (
              <button
                key={action.label + i}
                onClick={() => handleActionClick(action)}
                className={`
                  flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700
                  hover:bg-gray-50 active:bg-gray-100 transition-colors
                  ${action.color || ''}
                  max-sm:px-4 max-sm:py-3 max-sm:text-base
                `}
                role="menuitem"
              >
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {action.icon}
                </span>
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
