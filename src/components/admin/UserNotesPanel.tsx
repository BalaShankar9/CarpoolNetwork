import { useState } from 'react';
import {
    MessageSquare,
    Pin,
    Trash2,
    Plus,
    AlertTriangle,
    ThumbsUp,
    Search,
    HelpCircle,
    FileText
} from 'lucide-react';

// Helper function for relative time
const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export interface AdminNote {
    id: string;
    user_id: string;
    note: string;
    note_type: 'general' | 'warning' | 'positive' | 'investigation' | 'support';
    is_pinned: boolean;
    created_by: string;
    created_at: string;
    author: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

interface UserNotesPanelProps {
    notes: AdminNote[];
    onAddNote: (note: string, noteType: string, isPinned: boolean) => Promise<void>;
    onDeleteNote: (noteId: string) => Promise<void>;
    loading?: boolean;
}

const noteTypeConfig = {
    general: {
        icon: FileText,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: 'General Note'
    },
    warning: {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: 'Warning'
    },
    positive: {
        icon: ThumbsUp,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Positive'
    },
    investigation: {
        icon: Search,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Investigation'
    },
    support: {
        icon: HelpCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'Support'
    },
};

export function UserNotesPanel({ notes, onAddNote, onDeleteNote, loading }: UserNotesPanelProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState<string>('general');
    const [isPinned, setIsPinned] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setSubmitting(true);
        try {
            await onAddNote(newNote.trim(), noteType, isPinned);
            setNewNote('');
            setNoteType('general');
            setIsPinned(false);
            setShowAddForm(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Sort notes: pinned first, then by date
    const sortedNotes = [...notes].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Admin Notes</h3>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {notes.length}
                    </span>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Note
                </button>
            </div>

            {/* Add Note Form */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Note Type
                                </label>
                                <select
                                    value={noteType}
                                    onChange={(e) => setNoteType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                >
                                    {Object.entries(noteTypeConfig).map(([value, config]) => (
                                        <option key={value} value={value}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPinned}
                                        onChange={(e) => setIsPinned(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <Pin className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Pin</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Note Content
                            </label>
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Write your note here..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !newNote.trim()}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : 'Save Note'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Notes List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        Loading notes...
                    </div>
                ) : sortedNotes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No admin notes yet</p>
                        <p className="text-sm mt-1">Add a note to keep track of important information about this user.</p>
                    </div>
                ) : (
                    sortedNotes.map((note) => {
                        const config = noteTypeConfig[note.note_type] || noteTypeConfig.general;
                        const Icon = config.icon;

                        return (
                            <div key={note.id} className={`p-4 ${note.is_pinned ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div className={`p-2 rounded-full ${config.bgColor} ${config.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                                                {config.label}
                                            </span>
                                            {note.is_pinned && (
                                                <span className="flex items-center gap-1 text-xs text-yellow-600">
                                                    <Pin className="w-3 h-3" /> Pinned
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                                            {note.note}
                                        </p>

                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                            {note.author.avatar_url ? (
                                                <img
                                                    src={note.author.avatar_url}
                                                    alt={note.author.full_name}
                                                    className="w-4 h-4 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-gray-200" />
                                            )}
                                            <span>{note.author.full_name}</span>
                                            <span>•</span>
                                            <span>{formatTimeAgo(note.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => onDeleteNote(note.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete note"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
