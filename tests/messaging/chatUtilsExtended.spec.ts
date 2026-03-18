/**
 * chatUtilsExtended.spec.ts — Enterprise-grade tests for src/lib/chatUtils.ts
 *
 * Covers: sanitizeUrl, extractUrls, validateFileUploads,
 * formatMessagePreview (all types), dedupeMessages (edge cases),
 * sortConversations, computeUnreadCount (edge cases),
 * applyIncomingMessageToConversations (edge cases),
 * markConversationRead (edge cases).
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeUrl,
  extractUrls,
  validateFileUploads,
  formatMessagePreview,
  dedupeMessages,
  sortConversations,
  computeUnreadCount,
  applyIncomingMessageToConversations,
  markConversationRead,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_COUNT,
  ALLOWED_FILE_ACCEPT,
} from '../../src/lib/chatUtils';
import { makeLiteMessage, makeLiteConversation, FAKE_USER_ID, FAKE_OTHER_USER_ID } from './helpers';

// ============================================================
// sanitizeUrl
// ============================================================

describe('sanitizeUrl', () => {
  it('should return a valid https URL unchanged', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('should return a valid http URL unchanged', () => {
    expect(sanitizeUrl('http://example.com/path?q=1')).toBe('http://example.com/path?q=1');
  });

  it('should block javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
  });

  it('should block data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<h1>Hi</h1>')).toBe('#');
  });

  it('should block vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox("hi")')).toBe('#');
  });

  it('should return "#" for null', () => {
    expect(sanitizeUrl(null)).toBe('#');
  });

  it('should return "#" for undefined', () => {
    expect(sanitizeUrl(undefined)).toBe('#');
  });

  it('should return "#" for empty string', () => {
    expect(sanitizeUrl('')).toBe('#');
  });

  it('should return "#" for whitespace-only string', () => {
    expect(sanitizeUrl('   ')).toBe('#');
  });

  it('should trim whitespace around valid URL', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com/');
  });

  it('should return "#" for malformed URL', () => {
    expect(sanitizeUrl('not a url')).toBe('#');
  });

  it('should return "#" for relative path', () => {
    expect(sanitizeUrl('/relative/path')).toBe('#');
  });

  it('should block ftp: protocol', () => {
    expect(sanitizeUrl('ftp://files.example.com')).toBe('#');
  });
});

// ============================================================
// extractUrls
// ============================================================

describe('extractUrls', () => {
  it('should extract a single URL from text', () => {
    const result = extractUrls('Check out https://example.com for more');
    expect(result).toEqual(['https://example.com']);
  });

  it('should extract multiple URLs', () => {
    const result = extractUrls('Visit https://a.com and http://b.com');
    expect(result).toHaveLength(2);
    expect(result).toContain('https://a.com');
    expect(result).toContain('http://b.com');
  });

  it('should deduplicate repeated URLs', () => {
    const result = extractUrls('https://a.com and https://a.com again');
    expect(result).toEqual(['https://a.com']);
  });

  it('should return empty array for text without URLs', () => {
    expect(extractUrls('No links here!')).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(extractUrls('')).toEqual([]);
  });

  it('should return empty array for falsy input', () => {
    expect(extractUrls(null as any)).toEqual([]);
    expect(extractUrls(undefined as any)).toEqual([]);
  });

  it('should extract URLs with paths and query strings', () => {
    const result = extractUrls('Go to https://example.com/path?q=1&r=2#anchor');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('example.com/path');
  });
});

// ============================================================
// validateFileUploads
// ============================================================

describe('validateFileUploads', () => {
  const makeFile = (name: string, size: number): File =>
    new File(['x'.repeat(Math.min(size, 100))], name, { type: 'image/jpeg' });

  it('should return null for valid files', () => {
    const files = [makeFile('photo.jpg', 1024)];
    expect(validateFileUploads(files)).toBeNull();
  });

  it('should reject empty file list', () => {
    expect(validateFileUploads([])).toBe('No files selected.');
  });

  it('should reject more than MAX_FILE_COUNT files', () => {
    const files = Array.from({ length: MAX_FILE_COUNT + 1 }, (_, i) =>
      makeFile(`file${i}.jpg`, 1024),
    );
    const result = validateFileUploads(files);
    expect(result).toContain(`${MAX_FILE_COUNT}`);
  });

  it('should reject files exceeding MAX_FILE_SIZE_BYTES', () => {
    // Create a file with reported size > 10MB
    const bigFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: MAX_FILE_SIZE_BYTES + 1 });

    const result = validateFileUploads([bigFile]);
    expect(result).toContain('big.jpg');
    expect(result).toContain('size limit');
  });

  it('should accept exactly MAX_FILE_COUNT files', () => {
    const files = Array.from({ length: MAX_FILE_COUNT }, (_, i) =>
      makeFile(`file${i}.jpg`, 1024),
    );
    expect(validateFileUploads(files)).toBeNull();
  });

  it('should accept file exactly at MAX_FILE_SIZE_BYTES', () => {
    const file = new File(['x'], 'exact.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE_BYTES });
    expect(validateFileUploads([file])).toBeNull();
  });

  it('should export expected constants', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_FILE_COUNT).toBe(5);
    expect(typeof ALLOWED_FILE_ACCEPT).toBe('string');
    expect(ALLOWED_FILE_ACCEPT).toContain('image/*');
  });
});

// ============================================================
// formatMessagePreview
// ============================================================

describe('formatMessagePreview', () => {
  it('should show "Message removed" for deleted messages', () => {
    const msg = makeLiteMessage({ deleted_at: '2026-01-15T10:00:00Z', body: 'secret' });
    expect(formatMessagePreview(msg)).toBe('Message removed');
  });

  it('should show body text for TEXT messages', () => {
    const msg = makeLiteMessage({ body: 'Hello World!', message_type: 'TEXT' });
    expect(formatMessagePreview(msg)).toBe('Hello World!');
  });

  it('should truncate body to 140 characters', () => {
    const longBody = 'A'.repeat(200);
    const msg = makeLiteMessage({ body: longBody, message_type: 'TEXT' });
    expect(formatMessagePreview(msg).length).toBe(140);
  });

  it('should trim whitespace from body', () => {
    const msg = makeLiteMessage({ body: '  Hello  ', message_type: 'TEXT' });
    expect(formatMessagePreview(msg)).toBe('Hello');
  });

  it('should show "Photo" for IMAGE type', () => {
    const msg = makeLiteMessage({ body: null, message_type: 'IMAGE' });
    expect(formatMessagePreview(msg)).toBe('Photo');
  });

  it('should show "Video" for VIDEO type', () => {
    const msg = makeLiteMessage({ body: null, message_type: 'VIDEO' });
    expect(formatMessagePreview(msg)).toBe('Video');
  });

  it('should show "Voice note" for VOICE type', () => {
    const msg = makeLiteMessage({ body: null, message_type: 'VOICE' });
    expect(formatMessagePreview(msg)).toBe('Voice note');
  });

  it('should show filename for FILE type when available', () => {
    const msg = makeLiteMessage({
      body: null,
      message_type: 'FILE',
      attachments: [{ filename: 'report.pdf' }],
    });
    expect(formatMessagePreview(msg)).toBe('report.pdf');
  });

  it('should show "File" for FILE type when no filename', () => {
    const msg = makeLiteMessage({ body: null, message_type: 'FILE', attachments: [] });
    expect(formatMessagePreview(msg)).toBe('File');
  });

  it('should show "Ride shared" for RIDE_CARD type', () => {
    const msg = makeLiteMessage({ body: null, message_type: 'RIDE_CARD' });
    expect(formatMessagePreview(msg)).toBe('Ride shared');
  });

  it('should show "Booking shared" for BOOKING_CARD type', () => {
    const msg = makeLiteMessage({ body: null, message_type: 'BOOKING_CARD' });
    expect(formatMessagePreview(msg)).toBe('Booking shared');
  });

  it('should show "System message" for SYSTEM type', () => {
    const msg = makeLiteMessage({ body: null, message_type: 'SYSTEM' });
    expect(formatMessagePreview(msg)).toBe('System message');
  });

  it('should show "New message" for unknown type with no body', () => {
    const msg = makeLiteMessage({ body: null, message_type: 'UNKNOWN_TYPE' });
    expect(formatMessagePreview(msg)).toBe('New message');
  });

  it('should prefer body text over type-based preview', () => {
    const msg = makeLiteMessage({ body: 'Custom caption', message_type: 'IMAGE' });
    expect(formatMessagePreview(msg)).toBe('Custom caption');
  });

  it('should handle null message_type with body', () => {
    const msg = makeLiteMessage({ body: 'Just text', message_type: null });
    expect(formatMessagePreview(msg)).toBe('Just text');
  });

  it('should handle whitespace-only body as empty', () => {
    const msg = makeLiteMessage({ body: '   ', message_type: 'TEXT' });
    // body.trim() is empty string (falsy), so falls through to switch
    expect(formatMessagePreview(msg)).toBe('New message');
  });
});

// ============================================================
// dedupeMessages
// ============================================================

describe('dedupeMessages', () => {
  it('should remove duplicates by id', () => {
    const messages = [
      makeLiteMessage({ id: 'msg-1' }),
      makeLiteMessage({ id: 'msg-1' }),
      makeLiteMessage({ id: 'msg-2' }),
    ];

    const result = dedupeMessages(messages);
    expect(result).toHaveLength(2);
  });

  it('should remove duplicates by client_generated_id', () => {
    const messages = [
      makeLiteMessage({ id: 'msg-1', client_generated_id: 'cg-1' }),
      makeLiteMessage({ id: 'msg-2', client_generated_id: 'cg-1' }),
    ];

    const result = dedupeMessages(messages);
    expect(result).toHaveLength(1);
  });

  it('should keep last occurrence when deduplicating', () => {
    const messages = [
      makeLiteMessage({ id: 'msg-1', client_generated_id: 'cg-1', body: 'first' }),
      makeLiteMessage({ id: 'msg-1', client_generated_id: 'cg-1', body: 'second' }),
    ];

    const result = dedupeMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe('second');
  });

  it('should handle messages without client_generated_id', () => {
    const messages = [
      makeLiteMessage({ id: 'msg-1', client_generated_id: null }),
      makeLiteMessage({ id: 'msg-2', client_generated_id: null }),
    ];

    const result = dedupeMessages(messages);
    expect(result).toHaveLength(2);
  });

  it('should handle empty array', () => {
    expect(dedupeMessages([])).toEqual([]);
  });

  it('should handle single message', () => {
    const messages = [makeLiteMessage()];
    expect(dedupeMessages(messages)).toHaveLength(1);
  });

  it('should prefer server-id message over optimistic one', () => {
    const optimistic = makeLiteMessage({ id: undefined as any, client_generated_id: 'cg-1', body: 'optimistic' });
    const server = makeLiteMessage({ id: 'msg-server-1', client_generated_id: 'cg-1', body: 'server' });

    const result = dedupeMessages([optimistic, server]);
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe('server');
  });
});

// ============================================================
// sortConversations
// ============================================================

describe('sortConversations', () => {
  it('should sort by last_message_at descending', () => {
    const convs = [
      makeLiteConversation({ id: 'old', last_message_at: '2026-01-01T00:00:00Z' }),
      makeLiteConversation({ id: 'new', last_message_at: '2026-01-15T00:00:00Z' }),
    ];

    const sorted = sortConversations(convs);
    expect(sorted[0].id).toBe('new');
    expect(sorted[1].id).toBe('old');
  });

  it('should put pinned conversations first', () => {
    const convs = [
      makeLiteConversation({ id: 'unpinned', pinned: false, last_message_at: '2026-01-15T00:00:00Z' }),
      makeLiteConversation({ id: 'pinned', pinned: true, last_message_at: '2026-01-01T00:00:00Z' }),
    ];

    const sorted = sortConversations(convs);
    expect(sorted[0].id).toBe('pinned');
  });

  it('should sort pinned conversations among themselves by time', () => {
    const convs = [
      makeLiteConversation({ id: 'pin-old', pinned: true, last_message_at: '2026-01-01T00:00:00Z' }),
      makeLiteConversation({ id: 'pin-new', pinned: true, last_message_at: '2026-01-15T00:00:00Z' }),
    ];

    const sorted = sortConversations(convs);
    expect(sorted[0].id).toBe('pin-new');
  });

  it('should fall back to updated_at when last_message_at is null', () => {
    const convs = [
      makeLiteConversation({ id: 'a', last_message_at: null, updated_at: '2026-01-01T00:00:00Z' }),
      makeLiteConversation({ id: 'b', last_message_at: null, updated_at: '2026-01-15T00:00:00Z' }),
    ];

    const sorted = sortConversations(convs);
    expect(sorted[0].id).toBe('b');
  });

  it('should handle empty array', () => {
    expect(sortConversations([])).toEqual([]);
  });

  it('should not mutate the original array', () => {
    const convs = [
      makeLiteConversation({ id: 'a' }),
      makeLiteConversation({ id: 'b' }),
    ];
    const original = [...convs];

    sortConversations(convs);

    expect(convs).toEqual(original);
  });
});

// ============================================================
// computeUnreadCount
// ============================================================

describe('computeUnreadCount', () => {
  it('should count messages from others after lastReadAt', () => {
    const messages = [
      makeLiteMessage({ created_at: '2026-01-15T10:00:00Z', sender_id: FAKE_OTHER_USER_ID }),
      makeLiteMessage({ created_at: '2026-01-15T10:05:00Z', sender_id: FAKE_OTHER_USER_ID }),
    ];

    expect(computeUnreadCount(messages, '2026-01-15T10:02:00Z', FAKE_USER_ID)).toBe(1);
  });

  it('should exclude own messages', () => {
    const messages = [
      makeLiteMessage({ created_at: '2026-01-15T10:05:00Z', sender_id: FAKE_USER_ID }),
    ];

    expect(computeUnreadCount(messages, '2026-01-15T10:00:00Z', FAKE_USER_ID)).toBe(0);
  });

  it('should count all others messages when lastReadAt is null', () => {
    const messages = [
      makeLiteMessage({ sender_id: FAKE_OTHER_USER_ID }),
      makeLiteMessage({ sender_id: FAKE_OTHER_USER_ID }),
      makeLiteMessage({ sender_id: FAKE_USER_ID }),
    ];

    expect(computeUnreadCount(messages, null, FAKE_USER_ID)).toBe(2);
  });

  it('should return 0 for empty messages', () => {
    expect(computeUnreadCount([], null, FAKE_USER_ID)).toBe(0);
  });

  it('should return 0 when all are read', () => {
    const messages = [
      makeLiteMessage({ created_at: '2026-01-15T10:00:00Z', sender_id: FAKE_OTHER_USER_ID }),
    ];

    expect(computeUnreadCount(messages, '2026-01-15T11:00:00Z', FAKE_USER_ID)).toBe(0);
  });

  it('should exclude deleted messages', () => {
    const messages = [
      makeLiteMessage({
        created_at: '2026-01-15T10:05:00Z',
        sender_id: FAKE_OTHER_USER_ID,
        deleted_at: '2026-01-15T10:06:00Z',
      }),
    ];

    expect(computeUnreadCount(messages, '2026-01-15T10:00:00Z', FAKE_USER_ID)).toBe(0);
  });
});

// ============================================================
// applyIncomingMessageToConversations
// ============================================================

describe('applyIncomingMessageToConversations', () => {
  it('should update last_message_at and preview', () => {
    const convs = [makeLiteConversation({ id: 'conv-1' })];
    const msg = makeLiteMessage({
      conversation_id: 'conv-1',
      body: 'New message',
      created_at: '2026-01-15T12:00:00Z',
    });

    const result = applyIncomingMessageToConversations(convs, msg);

    expect(result[0].last_message_at).toBe('2026-01-15T12:00:00Z');
    expect(result[0].last_message_preview).toBe('New message');
  });

  it('should increment unread when incrementUnread=true', () => {
    const convs = [makeLiteConversation({ id: 'conv-1', unread_count: 2 })];
    const msg = makeLiteMessage({ conversation_id: 'conv-1' });

    const result = applyIncomingMessageToConversations(convs, msg, { incrementUnread: true });

    expect(result[0].unread_count).toBe(3);
  });

  it('should not increment unread when incrementUnread is not set', () => {
    const convs = [makeLiteConversation({ id: 'conv-1', unread_count: 2 })];
    const msg = makeLiteMessage({ conversation_id: 'conv-1' });

    const result = applyIncomingMessageToConversations(convs, msg);

    expect(result[0].unread_count).toBe(2);
  });

  it('should return conversations unchanged for unknown conversation_id', () => {
    const convs = [makeLiteConversation({ id: 'conv-1' })];
    const msg = makeLiteMessage({ conversation_id: 'unknown-conv' });

    const result = applyIncomingMessageToConversations(convs, msg);

    expect(result).toEqual(convs);
  });

  it('should re-sort conversations after update (new message bumps to top)', () => {
    const convs = [
      makeLiteConversation({ id: 'conv-A', last_message_at: '2026-01-15T12:00:00Z' }),
      makeLiteConversation({ id: 'conv-B', last_message_at: '2026-01-15T10:00:00Z' }),
    ];
    const msg = makeLiteMessage({
      conversation_id: 'conv-B',
      created_at: '2026-01-15T13:00:00Z',
    });

    const result = applyIncomingMessageToConversations(convs, msg);

    expect(result[0].id).toBe('conv-B');
  });

  it('should set last_sender_id from message', () => {
    const convs = [makeLiteConversation({ id: 'conv-1' })];
    const msg = makeLiteMessage({ conversation_id: 'conv-1', sender_id: 'sender-xyz' });

    const result = applyIncomingMessageToConversations(convs, msg);

    expect(result[0].last_sender_id).toBe('sender-xyz');
  });

  it('should respect pinned sort order', () => {
    const convs = [
      makeLiteConversation({ id: 'pinned', pinned: true, last_message_at: '2026-01-15T08:00:00Z' }),
      makeLiteConversation({ id: 'normal', pinned: false, last_message_at: '2026-01-15T10:00:00Z' }),
    ];
    const msg = makeLiteMessage({
      conversation_id: 'normal',
      created_at: '2026-01-15T13:00:00Z',
    });

    const result = applyIncomingMessageToConversations(convs, msg);

    // Pinned should still be first despite older message
    expect(result[0].id).toBe('pinned');
  });
});

// ============================================================
// markConversationRead
// ============================================================

describe('markConversationRead', () => {
  it('should reset unread count to 0', () => {
    const convs = [
      makeLiteConversation({ id: 'conv-1', unread_count: 5 }),
      makeLiteConversation({ id: 'conv-2', unread_count: 3 }),
    ];

    const result = markConversationRead(convs, 'conv-1');

    expect(result.find(c => c.id === 'conv-1')!.unread_count).toBe(0);
    expect(result.find(c => c.id === 'conv-2')!.unread_count).toBe(3);
  });

  it('should return unchanged list for unknown conversation', () => {
    const convs = [makeLiteConversation({ id: 'conv-1', unread_count: 5 })];

    const result = markConversationRead(convs, 'nonexistent');

    expect(result).toEqual(convs);
  });

  it('should handle already-read conversation (unread_count=0)', () => {
    const convs = [makeLiteConversation({ id: 'conv-1', unread_count: 0 })];

    const result = markConversationRead(convs, 'conv-1');

    expect(result[0].unread_count).toBe(0);
  });

  it('should not mutate the original array', () => {
    const convs = [makeLiteConversation({ id: 'conv-1', unread_count: 5 })];
    const originalUnread = convs[0].unread_count;

    markConversationRead(convs, 'conv-1');

    expect(convs[0].unread_count).toBe(originalUnread);
  });
});
