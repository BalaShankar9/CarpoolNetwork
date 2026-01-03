export type ChatMessageLite = {
  id?: string;
  client_generated_id?: string | null;
  created_at: string;
  sender_id: string;
  body?: string | null;
  message_type?: string | null;
  deleted_at?: string | null;
  attachments?: Array<{ filename?: string }>;
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
    case 'FILE':
      return message.attachments?.[0]?.filename || 'File';
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
