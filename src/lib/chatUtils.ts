/**
 * Sanitize a URL for safe use in href attributes.
 * Only allows http: and https: protocols. Returns '#' for anything
 * dangerous (javascript:, data:, vbscript:, etc.).
 */
export const sanitizeUrl = (url: string | undefined | null): string => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (!trimmed) return '#';
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      return parsed.href;
    }
    return '#';
  } catch {
    // Relative URLs or malformed — reject to be safe
    return '#';
  }
};

/**
 * Maximum file upload size in bytes (10 MB).
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum number of files per message.
 */
export const MAX_FILE_COUNT = 5;

/**
 * Allowed MIME type prefixes / extensions for file uploads.
 * Used as the `accept` attribute value on file inputs.
 */
export const ALLOWED_FILE_ACCEPT =
  'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';

/**
 * Validate files selected for upload.
 * Returns an error string if validation fails, or null if all files are valid.
 */
export const validateFileUploads = (
  files: FileList | File[]
): string | null => {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) return 'No files selected.';
  if (fileArray.length > MAX_FILE_COUNT) {
    return `You can attach up to ${MAX_FILE_COUNT} files at a time.`;
  }
  for (const file of fileArray) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      return `"${file.name}" exceeds the ${sizeMB} MB size limit.`;
    }
  }
  return null;
};

export type ChatMessageLite = {
  id?: string;
  conversation_id?: string;
  client_generated_id?: string | null;
  created_at: string;
  sender_id: string;
  body?: string | null;
  message_type?: string | null;
  deleted_at?: string | null;
  attachments?: unknown[];
};

export type ConversationSummaryLite = {
  id: string;
  pinned?: boolean;
  last_message_at?: string | null;
  updated_at?: string | null;
  unread_count?: number;
  last_message_preview?: string | null;
  last_sender_id?: string | null;
};

export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const regex = /(https?:\/\/[^\s]+)/gim;
  const matches = text.match(regex);
  return matches ? Array.from(new Set(matches)) : [];
};

export const formatMessagePreview = (message: ChatMessageLite): string => {
  if (message.deleted_at) return 'Message removed';
  if (message.body && message.body.trim()) return message.body.trim().slice(0, 140);
  switch (message.message_type) {
    case 'IMAGE':
      return 'Photo';
    case 'VIDEO':
      return 'Video';
    case 'VOICE':
      return 'Voice note';
    case 'FILE': {
      const firstAttachment = message.attachments?.[0] as { filename?: string } | undefined;
      return firstAttachment?.filename || 'File';
    }
    case 'RIDE_CARD':
      return 'Ride shared';
    case 'BOOKING_CARD':
      return 'Booking shared';
    case 'SYSTEM':
      return 'System message';
    default:
      return 'New message';
  }
};

export const computeUnreadCount = (
  messages: ChatMessageLite[],
  lastReadAt: string | null,
  userId: string
): number => {
  if (!messages.length) return 0;
  if (!lastReadAt) {
    return messages.filter((msg) => msg.sender_id !== userId && !msg.deleted_at).length;
  }
  const last = new Date(lastReadAt).getTime();
  return messages.filter((msg) => {
    if (msg.sender_id === userId || msg.deleted_at) return false;
    return new Date(msg.created_at).getTime() > last;
  }).length;
};

export const dedupeMessages = <T extends ChatMessageLite>(messages: T[]): T[] => {
  const byId = new Map<string, T>();
  const byClientId = new Map<string, T>();

  for (const msg of messages) {
    if (msg.client_generated_id) {
      byClientId.set(msg.client_generated_id, msg);
    }
    if (msg.id) {
      byId.set(msg.id, msg);
    }
  }

  const merged: T[] = [];
  for (const msg of messages) {
    if (msg.id && byId.get(msg.id) !== msg) continue;
    if (msg.client_generated_id && byClientId.get(msg.client_generated_id) !== msg) continue;
    merged.push(msg);
  }
  return merged;
};

const getConversationTime = (value?: string | null): number => {
  if (!value) return 0;
  return new Date(value).getTime();
};

export const sortConversations = <T extends ConversationSummaryLite>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const aPinned = Boolean(a.pinned);
    const bPinned = Boolean(b.pinned);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    const aPrimary = getConversationTime(a.last_message_at) || getConversationTime(a.updated_at);
    const bPrimary = getConversationTime(b.last_message_at) || getConversationTime(b.updated_at);
    if (aPrimary !== bPrimary) return bPrimary - aPrimary;

    return getConversationTime(b.updated_at) - getConversationTime(a.updated_at);
  });
};

export const applyIncomingMessageToConversations = <T extends ConversationSummaryLite>(
  conversations: T[],
  message: ChatMessageLite,
  options: { incrementUnread?: boolean } = {}
): T[] => {
  const index = conversations.findIndex((conv) => conv.id === message.conversation_id);
  if (index === -1) return conversations;

  const current = conversations[index];
  const unreadCount = Number(current.unread_count || 0);
  const updated: T = {
    ...current,
    last_message_at: message.created_at,
    last_message_preview: formatMessagePreview(message),
    last_sender_id: message.sender_id,
    unread_count: options.incrementUnread ? unreadCount + 1 : unreadCount,
  };

  const next = [...conversations];
  next[index] = updated;
  return sortConversations(next);
};

export const markConversationRead = <T extends ConversationSummaryLite>(
  conversations: T[],
  conversationId: string
): T[] => {
  const index = conversations.findIndex((conv) => conv.id === conversationId);
  if (index === -1) return conversations;

  const next = [...conversations];
  next[index] = { ...next[index], unread_count: 0 };
  return next;
};
