/**
 * Shared test helpers for Messaging module tests.
 *
 * Provides factory functions for conversations, messages, members,
 * presence data, and a configurable Supabase client mock.
 */
import { vi } from 'vitest';
import type { ChatMessage, ConversationSummary, ConversationMember, MessageType, MessageStatus, MessageAttachment, MessagingDiagnostics } from '../../src/services/messagingUtils';
import type { ChatMessageLite, ConversationSummaryLite } from '../../src/lib/chatUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const FAKE_USER_ID = 'user-msg-001';
export const FAKE_OTHER_USER_ID = 'user-msg-002';
export const FAKE_CONVERSATION_ID = 'conv-001';
export const FAKE_MESSAGE_ID = 'msg-001';

// ---------------------------------------------------------------------------
// Fake data
// ---------------------------------------------------------------------------

export const FAKE_MEMBER: ConversationMember = {
  user_id: FAKE_USER_ID,
  role: 'member',
  last_seen_at: '2026-01-15T10:00:00Z',
  profile: {
    id: FAKE_USER_ID,
    full_name: 'Alice Test',
    avatar_url: 'https://example.com/alice.jpg',
    profile_photo_url: null,
  },
};

export const FAKE_OTHER_MEMBER: ConversationMember = {
  user_id: FAKE_OTHER_USER_ID,
  role: 'member',
  last_seen_at: '2026-01-15T09:45:00Z',
  profile: {
    id: FAKE_OTHER_USER_ID,
    full_name: 'Bob Test',
    avatar_url: 'https://example.com/bob.jpg',
    profile_photo_url: null,
  },
};

export const FAKE_CONVERSATION: ConversationSummary = {
  id: FAKE_CONVERSATION_ID,
  type: 'FRIENDS_DM',
  ride_id: null,
  trip_request_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  last_message_at: '2026-01-15T10:00:00Z',
  last_message_preview: 'Hey, are you free?',
  last_sender_id: FAKE_OTHER_USER_ID,
  pinned: false,
  muted: false,
  archived: false,
  unread_count: 2,
  members: [FAKE_MEMBER, FAKE_OTHER_MEMBER],
};

export const FAKE_MESSAGE: ChatMessage = {
  id: FAKE_MESSAGE_ID,
  conversation_id: FAKE_CONVERSATION_ID,
  sender_id: FAKE_OTHER_USER_ID,
  body: 'Hello there!',
  message_type: 'TEXT',
  created_at: '2026-01-15T10:00:00Z',
  reply_to_id: null,
  edited_at: null,
  deleted_at: null,
  client_generated_id: 'cg-001',
  attachments: [],
  metadata: {},
  sender: FAKE_OTHER_MEMBER.profile,
  status: 'delivered',
};

export const FAKE_ATTACHMENT: MessageAttachment = {
  url: 'https://storage.example.com/file.jpg',
  path: 'attachments/file.jpg',
  bucket: 'chat-attachments',
  mime: 'image/jpeg',
  size: 1024000,
  width: 800,
  height: 600,
  duration: undefined,
  thumbnail_url: 'https://storage.example.com/file_thumb.jpg',
  filename: 'photo.jpg',
};

export const HEALTHY_DIAGNOSTICS: MessagingDiagnostics = {
  schemaHealthy: true,
  conversationMembersLastSeenAt: true,
  conversationSettingsTable: true,
  messageReadsTable: true,
  conversationsLastMessageAt: true,
  rpcAvailable: true,
  realtimeConnected: true,
  lastError: null,
  checkedAt: '2026-01-15T12:00:00Z',
};

export const UNHEALTHY_DIAGNOSTICS: MessagingDiagnostics = {
  schemaHealthy: false,
  conversationMembersLastSeenAt: true,
  conversationSettingsTable: false,
  messageReadsTable: true,
  conversationsLastMessageAt: false,
  rpcAvailable: false,
  realtimeConnected: false,
  lastError: 'Schema check failed: Could not find the function',
  checkedAt: '2026-01-15T12:00:00Z',
};

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    ...FAKE_MESSAGE,
    id: `msg-${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

export function makeConversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    ...FAKE_CONVERSATION,
    id: `conv-${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

export function makeMember(overrides: Partial<ConversationMember> = {}): ConversationMember {
  const uid = overrides.user_id ?? `user-${Math.random().toString(36).substr(2, 9)}`;
  return {
    ...FAKE_MEMBER,
    user_id: uid,
    profile: {
      ...FAKE_MEMBER.profile,
      id: uid,
    },
    ...overrides,
  };
}

export function makeLiteMessage(overrides: Partial<ChatMessageLite> = {}): ChatMessageLite {
  return {
    id: `msg-${Math.random().toString(36).substr(2, 9)}`,
    conversation_id: FAKE_CONVERSATION_ID,
    client_generated_id: null,
    created_at: '2026-01-15T10:00:00Z',
    sender_id: FAKE_OTHER_USER_ID,
    body: 'Test message body',
    message_type: 'TEXT',
    deleted_at: null,
    attachments: [],
    ...overrides,
  };
}

export function makeLiteConversation(overrides: Partial<ConversationSummaryLite> = {}): ConversationSummaryLite {
  return {
    id: `conv-${Math.random().toString(36).substr(2, 9)}`,
    pinned: false,
    last_message_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    unread_count: 0,
    last_message_preview: null,
    last_sender_id: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Supabase mock builder (chainable query)
// ---------------------------------------------------------------------------

/** Build a chainable Supabase query mock that resolves to the given data */
export function makeQueryMock(result: { data: any; error: any; count?: number }) {
  const mock: Record<string, any> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'is', 'in', 'or', 'not',
    'order', 'limit', 'range', 'single', 'maybeSingle',
    'filter', 'match', 'textSearch', 'contains', 'containedBy',
    'overlaps', 'ilike', 'like',
  ];

  for (const method of chainMethods) {
    mock[method] = vi.fn().mockReturnValue(mock);
  }

  // Terminal methods resolve to the result
  mock.then = undefined;
  mock.single = vi.fn().mockResolvedValue(result);
  mock.maybeSingle = vi.fn().mockResolvedValue(result);

  // Make the mock itself thenable (for await on chained queries)
  const thenableResult = Promise.resolve(result);
  Object.defineProperty(mock, 'then', {
    value: thenableResult.then.bind(thenableResult),
    writable: true,
    configurable: true,
    enumerable: false,
  });

  return mock;
}

/** Build a mock Supabase channel */
export function makeChannelMock(overrides: Record<string, any> = {}) {
  const channel: Record<string, any> = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue(channel),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  // Make subscribe return the channel (for chaining)
  channel.subscribe = vi.fn().mockImplementation((cb?: Function) => {
    if (cb) cb('SUBSCRIBED');
    return channel;
  });
  return channel;
}

/** Build a minimal Supabase client mock */
export function makeSupabaseMock(overrides: Record<string, any> = {}) {
  const defaultQuery = makeQueryMock({ data: null, error: null });

  return {
    from: vi.fn(() => defaultQuery),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => makeChannelMock()),
    removeChannel: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
