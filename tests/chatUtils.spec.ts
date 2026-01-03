import { describe, it, expect } from 'vitest';
import { computeUnreadCount, dedupeMessages, formatMessagePreview } from '../src/lib/chatUtils';

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
});
