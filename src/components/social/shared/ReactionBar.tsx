import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

const EMOJI_MAP: Record<string, string> = {
  celebrate: '\uD83C\uDF89',
  love: '\u2764\uFE0F',
  fire: '\uD83D\uDD25',
  car: '\uD83D\uDE97',
  leaf: '\uD83C\uDF3F',
};

export interface ReactionUser {
  name: string;
  avatar?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: ReactionUser[];
}

export interface ReactionBarProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  compact?: boolean;
}

function ReactionTooltip({ users }: { users: ReactionUser[] }) {
  if (users.length === 0) return null;

  const displayNames = users.slice(0, 5).map((u) => u.name);
  const remaining = users.length - displayNames.length;

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
      <div className="flex flex-col gap-0.5">
        {displayNames.map((name) => (
          <span key={name}>{name}</span>
        ))}
        {remaining > 0 && (
          <span className="text-gray-400">
            and {remaining} more
          </span>
        )}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
        <div className="w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}

function AvatarStack({ users }: { users: ReactionUser[] }) {
  const displayUsers = users.slice(0, 3);
  if (displayUsers.length === 0) return null;

  return (
    <div className="flex -space-x-1.5 ml-1">
      {displayUsers.map((user, i) => (
        <div
          key={user.name + i}
          className="w-4 h-4 rounded-full ring-1 ring-white overflow-hidden bg-gray-200 flex-shrink-0"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-social-warm-200 flex items-center justify-center text-[7px] font-bold text-social-warm-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ReactionBar({
  reactions,
  onReact,
  onRemoveReaction,
  compact = false,
}: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
      setPickerOpen(false);
    }
  }, []);

  useEffect(() => {
    if (pickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [pickerOpen, handleClickOutside]);

  const handleReactionClick = (emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      onRemoveReaction(emoji);
    } else {
      onReact(emoji);
    }
  };

  const handlePickerSelect = (emoji: string) => {
    onReact(emoji);
    setPickerOpen(false);
  };

  // Existing emojis already shown in the bar
  const existingEmojiKeys = new Set(reactions.map((r) => r.emoji));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => {
          const emojiChar = EMOJI_MAP[reaction.emoji] || reaction.emoji;
          return (
            <motion.button
              key={reaction.emoji}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() =>
                handleReactionClick(reaction.emoji, reaction.hasReacted)
              }
              onMouseEnter={() => setHoveredEmoji(reaction.emoji)}
              onMouseLeave={() => setHoveredEmoji(null)}
              className={`
                relative inline-flex items-center gap-1 rounded-full border
                transition-colors duration-150
                ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
                ${
                  reaction.hasReacted
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }
              `}
              aria-label={`${reaction.hasReacted ? 'Remove' : 'Add'} ${reaction.emoji} reaction`}
            >
              <span role="img" aria-hidden="true">
                {emojiChar}
              </span>
              <span className="font-medium tabular-nums">
                {reaction.count}
              </span>
              {!compact && reaction.count >= 3 && (
                <AvatarStack users={reaction.users} />
              )}
              {hoveredEmoji === reaction.emoji && reaction.users.length > 0 && (
                <ReactionTooltip users={reaction.users} />
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* Add reaction button */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen((prev) => !prev)}
          className={`
            inline-flex items-center justify-center rounded-full border border-dashed border-gray-300
            text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-50
            transition-colors duration-150
            ${compact ? 'w-6 h-6' : 'w-8 h-8'}
          `}
          aria-label="Add reaction"
        >
          <Plus className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>

        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 z-50"
            >
              {Object.entries(EMOJI_MAP).map(([key, emoji]) => (
                <button
                  key={key}
                  onClick={() => handlePickerSelect(key)}
                  className={`
                    w-8 h-8 flex items-center justify-center rounded-lg text-lg
                    hover:bg-gray-100 transition-colors duration-100
                    ${existingEmojiKeys.has(key) ? 'opacity-40 cursor-default' : ''}
                  `}
                  disabled={existingEmojiKeys.has(key)}
                  aria-label={`React with ${key}`}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
