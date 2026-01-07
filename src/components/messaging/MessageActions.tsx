import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smile, 
  Reply, 
  Forward, 
  Copy, 
  Trash2, 
  Clock, 
  Pin,
  MoreHorizontal,
  X
} from 'lucide-react';

interface MessageAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface MessageActionsMenuProps {
  messageId: string;
  isOwn: boolean;
  isPinned?: boolean;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onPin: () => void;
  onScheduleReminder: () => void;
  onReact: () => void;
}

export function MessageActionsMenu({
  messageId,
  isOwn,
  isPinned = false,
  onReply,
  onForward,
  onCopy,
  onDelete,
  onPin,
  onScheduleReminder,
  onReact
}: MessageActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions: MessageAction[] = [
    {
      id: 'react',
      label: 'React',
      icon: <Smile className="w-4 h-4" />,
      onClick: () => { onReact(); setIsOpen(false); }
    },
    {
      id: 'reply',
      label: 'Reply',
      icon: <Reply className="w-4 h-4" />,
      onClick: () => { onReply(); setIsOpen(false); }
    },
    {
      id: 'forward',
      label: 'Forward',
      icon: <Forward className="w-4 h-4" />,
      onClick: () => { onForward(); setIsOpen(false); }
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => { onCopy(); setIsOpen(false); }
    },
    {
      id: 'pin',
      label: isPinned ? 'Unpin' : 'Pin',
      icon: <Pin className="w-4 h-4" />,
      onClick: () => { onPin(); setIsOpen(false); }
    },
    {
      id: 'reminder',
      label: 'Remind me',
      icon: <Clock className="w-4 h-4" />,
      onClick: () => { onScheduleReminder(); setIsOpen(false); }
    },
    ...(isOwn ? [{
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => { onDelete(); setIsOpen(false); },
      destructive: true
    }] : [])
  ];

  // Quick actions shown inline
  const quickActions = actions.slice(0, 3);
  const moreActions = actions.slice(3);

  return (
    <div className="relative flex items-center gap-1">
      {/* Quick Actions */}
      {quickActions.map((action) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className={`p-1.5 rounded-lg transition-colors ${
            action.destructive
              ? 'hover:bg-red-500/20 text-red-400'
              : 'hover:bg-slate-600 text-slate-400'
          }`}
          title={action.label}
        >
          {action.icon}
        </motion.button>
      ))}

      {/* More Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-slate-600 rounded-lg text-slate-400 transition-colors"
        title="More actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 min-w-[150px] py-1"
            >
              {moreActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={`w-full px-3 py-2 flex items-center gap-3 text-sm transition-colors ${
                    action.destructive
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Reply preview component
interface ReplyPreviewProps {
  originalMessage: {
    senderName: string;
    content: string;
    isVoice?: boolean;
  };
  onClear: () => void;
}

export function ReplyPreview({ originalMessage, onClear }: ReplyPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 p-3 bg-slate-800/80 border-l-2 border-purple-500"
    >
      <Reply className="w-4 h-4 text-purple-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-purple-400 font-medium">{originalMessage.senderName}</p>
        <p className="text-sm text-slate-400 truncate">
          {originalMessage.isVoice ? '🎤 Voice message' : originalMessage.content}
        </p>
      </div>
      <button
        onClick={onClear}
        className="p-1 hover:bg-slate-700 rounded transition-colors"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </motion.div>
  );
}

// Forward message dialog
interface ForwardDialogProps {
  message: {
    content: string;
    isVoice?: boolean;
  };
  contacts: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  onForward: (contactIds: string[]) => void;
  onClose: () => void;
}

export function ForwardDialog({ message, contacts, onForward, onClose }: ForwardDialogProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleForward = () => {
    if (selectedContacts.length > 0) {
      onForward(selectedContacts);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-slate-800 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Forward className="w-5 h-5 text-purple-400" />
            <h3 className="font-medium text-white">Forward Message</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-3 bg-slate-900/50 border-b border-slate-700">
          <p className="text-sm text-slate-300 line-clamp-2">
            {message.isVoice ? '🎤 Voice message' : message.content}
          </p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Contact List */}
        <div className="max-h-64 overflow-y-auto">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => toggleContact(contact.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors"
            >
              <div className="relative">
                {contact.avatar ? (
                  <img 
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                    {contact.name[0]}
                  </div>
                )}
                {selectedContacts.includes(contact.id) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </div>
              <span className="text-white">{contact.name}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleForward}
            disabled={selectedContacts.length === 0}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Forward className="w-4 h-4" />
            Forward to {selectedContacts.length || 0} contact{selectedContacts.length !== 1 ? 's' : ''}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default MessageActionsMenu;
