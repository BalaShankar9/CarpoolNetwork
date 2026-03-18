import { type ReactNode, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X } from 'lucide-react';

export interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: ReactNode;
  badgeColor?: string;
  onShare?: () => void;
}

/* ----- CSS Confetti Piece ----- */
interface ConfettiPieceStyle {
  left: string;
  bg: string;
  delay: string;
  duration: string;
  rotate: string;
  w: string;
  h: string;
}

function useConfettiPieces(count: number): ConfettiPieceStyle[] {
  return useMemo(() => {
    const colors = [
      'bg-social-warm-400',
      'bg-social-friends-400',
      'bg-social-groups-400',
      'bg-social-community-400',
      'bg-social-challenges-400',
      'bg-social-leaderboard-400',
      'bg-yellow-400',
      'bg-pink-400',
    ];

    return Array.from({ length: count }, (_, i) => ({
      left: `${(i / count) * 100}%`,
      bg: colors[i % colors.length],
      delay: `${Math.random() * 0.6}s`,
      duration: `${1.5 + Math.random() * 1.5}s`,
      rotate: `${Math.random() * 360}deg`,
      w: `${6 + Math.random() * 6}px`,
      h: `${4 + Math.random() * 8}px`,
    }));
  }, [count]);
}

function ConfettiLayer() {
  const pieces = useConfettiPieces(28);

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh)) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {pieces.map((piece, i) => (
          <div
            key={i}
            className={`absolute top-0 ${piece.bg} rounded-sm`}
            style={{
              left: piece.left,
              width: piece.w,
              height: piece.h,
              animation: `confettiFall ${piece.duration} ease-in ${piece.delay} forwards`,
              transform: `rotate(${piece.rotate})`,
            }}
          />
        ))}
      </div>
    </>
  );
}

export default function MilestoneModal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  badgeColor = 'from-social-warm-400 to-social-challenges-500',
  onShare,
}: MilestoneModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Confetti */}
            <ConfettiLayer />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors shadow-sm"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center px-6 pt-10 pb-6">
              {/* Badge with glow */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: 0.15,
                }}
                className="relative mb-5"
              >
                {/* Glow ring */}
                <div
                  className={`absolute -inset-3 rounded-full bg-gradient-to-br ${badgeColor} opacity-20 blur-xl animate-pulse-soft`}
                />
                <div
                  className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${badgeColor} flex items-center justify-center text-white shadow-lg`}
                >
                  {icon}
                </div>
              </motion.div>

              {/* Text */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-gray-900 mb-2"
              >
                {title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-gray-600 leading-relaxed mb-6 max-w-[260px]"
              >
                {description}
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 w-full"
              >
                {onShare && (
                  <button
                    onClick={onShare}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${badgeColor} text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-md`}
                  >
                    <Share2 className="w-4 h-4" />
                    Share to Feed
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`${onShare ? '' : 'flex-1'} inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors`}
                >
                  Close
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
