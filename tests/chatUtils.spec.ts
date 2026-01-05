import { describe, it, expect } from 'vitest';
import {
  applyIncomingMessageToConversations,
  computeUnreadCount,
  dedupeMessages,
  formatMessagePreview,
  markConversationRead,
} from '../src/lib/chatUtils';

describe('chatUtils', () => {
  it('dedupes messages by id or client_generated_id', () => {
    const messages = [
      { id: '1', client_generated_id: 'a', created_at: '2024-01-01T00:00:00Z', sender_id: 'u1' },
      { id: '1', client_generated_id: 'a', created_at: '2024-01-01T00:00:00Z', sender_id: 'u1' },
      { id: '2', client_generated_id: 'b', created_at: '2024-01-01T00:01:00Z', sender_id: 'u2' },
    ];
    const result = dedupeMessages(messages);
    expect(result.length).toBe(2);
  });

  it('computes unread count based on lastReadAt', () => {
    const messages = [
      { id: '1', created_at: '2024-01-01T00:00:00Z', sender_id: 'u2' },
      { id: '2', created_at: '2024-01-01T00:10:00Z', sender_id: 'u2' },
      { id: '3', created_at: '2024-01-01T00:20:00Z', sender_id: 'u1' },
    ];
    expect(computeUnreadCount(messages, '2024-01-01T00:05:00Z', 'u1')).toBe(1);
  });

  it('formats message preview for attachments', () => {
    const preview = formatMessagePreview({
      created_at: '2024-01-01T00:00:00Z',
      sender_id: 'u1',
      message_type: 'VOICE',
    });
    expect(preview).toBe('Voice note');
  });

  it('updates conversation ordering and unread count on incoming message', () => {
    const conversations = [
      {
        id: 'conv-1',
        pinned: false,
        last_message_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        unread_count: 0,
      },
      {
        id: 'conv-2',
        pinned: false,
        last_message_at: '2024-01-01T00:10:00Z',
        updated_at: '2024-01-01T00:10:00Z',
        unread_count: 0,
      },
    ];

    const message = {
      conversation_id: 'conv-1',
      created_at: '2024-01-01T00:20:00Z',
      sender_id: 'u2',
      body: 'hello',
    };

    const next = applyIncomingMessageToConversations(conversations, message, { incrementUnread: true });
    expect(next[0].id).toBe('conv-1');
    expect(next[0].unread_count).toBe(1);
  });

  it('resets unread count when marking conversation as read', () => {
    const conversations = [
      { id: 'conv-1', unread_count: 3 },
      { id: 'conv-2', unread_count: 1 },
    ];

    const next = markConversationRead(conversations, 'conv-1');
    expect(next.find((conv) => conv.id === 'conv-1')?.unread_count).toBe(0);
  });
});
