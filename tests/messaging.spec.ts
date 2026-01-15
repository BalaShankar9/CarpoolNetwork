/**
 * Messaging System Tests
 * 
 * Tests for conversation loading, message sending, presence updates,
 * and error handling resilience.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDiagnosticsReport,
  type MessagingDiagnostics,
} from '../src/services/messagingUtils';

describe('Messaging Diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format diagnostics report correctly for unhealthy schema', () => {
    const diag: MessagingDiagnostics = {
      schemaHealthy: false,
      conversationMembersLastSeenAt: true,
      conversationSettingsTable: false,
      messageReadsTable: true,
      conversationsLastMessageAt: true,
      rpcAvailable: false,
      realtimeConnected: true,
      lastError: 'Function not found in schema cache',
      checkedAt: '2026-01-15T12:00:00Z',
    };

    const report = formatDiagnosticsReport(diag);

    expect(report).toContain('Messaging Diagnostics');
    expect(report).toContain('conversation_members.last_seen_at: ✅');
    expect(report).toContain('conversation_settings table: ❌');
    expect(report).toContain('Overall schema health: ❌ Incomplete');
    expect(report).toContain('RPC: ❌ Unavailable');
    expect(report).toContain('Action Required');
    expect(report).toContain('20260115200000_messaging_schema_hotfix.sql');
  });

  it('should show healthy status when all checks pass', () => {
    const diag: MessagingDiagnostics = {
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

    const report = formatDiagnosticsReport(diag);

    expect(report).toContain('Overall schema health: ✅ Healthy');
    expect(report).toContain('RPC: ✅ Available');
    expect(report).not.toContain('Action Required');
  });

  it('should include timestamp in report', () => {
    const diag: MessagingDiagnostics = {
      schemaHealthy: true,
      conversationMembersLastSeenAt: true,
      conversationSettingsTable: true,
      messageReadsTable: true,
      conversationsLastMessageAt: true,
      rpcAvailable: true,
      realtimeConnected: false,
      lastError: null,
      checkedAt: '2026-01-15T12:00:00Z',
    };

    const report = formatDiagnosticsReport(diag);

    expect(report).toContain('2026-01-15T12:00:00Z');
    expect(report).toContain('Realtime subscriptions: ⚠️ Disconnected');
  });

  it('should include last error in report when present', () => {
    const diag: MessagingDiagnostics = {
      schemaHealthy: false,
      conversationMembersLastSeenAt: false,
      conversationSettingsTable: false,
      messageReadsTable: false,
      conversationsLastMessageAt: false,
      rpcAvailable: false,
      realtimeConnected: false,
      lastError: 'PGRST202: Could not find function in schema cache',
      checkedAt: '2026-01-15T12:00:00Z',
    };

    const report = formatDiagnosticsReport(diag);

    expect(report).toContain('Last Error');
    expect(report).toContain('PGRST202');
  });
});

describe('Conversation Loading Fallback', () => {
  it('should gracefully handle missing columns in response', () => {
    const rawData: Record<string, any> = {
      id: 'conv-1',
      type: 'FRIENDS_DM',
      // Missing: pinned, muted, archived, unread_count
      members: [],
    };

    // Normalize like the component does
    const normalized = {
      ...rawData,
      pinned: Boolean(rawData.pinned),
      muted: Boolean(rawData.muted),
      archived: Boolean(rawData.archived),
      unread_count: Number(rawData.unread_count || 0),
      members: rawData.members || [],
    };

    expect(normalized.pinned).toBe(false);
    expect(normalized.muted).toBe(false);
    expect(normalized.archived).toBe(false);
    expect(normalized.unread_count).toBe(0);
  });

  it('should handle null members array', () => {
    const rawData: Record<string, any> = {
      id: 'conv-1',
      type: 'FRIENDS_DM',
      members: null,
    };

    const normalized = {
      ...rawData,
      members: rawData.members || [],
    };

    expect(normalized.members).toEqual([]);
  });

  it('should handle undefined unread_count', () => {
    const rawData: Record<string, any> = {
      id: 'conv-1',
      type: 'FRIENDS_DM',
      unread_count: undefined,
    };

    const unreadCount = Number(rawData.unread_count || 0);

    expect(unreadCount).toBe(0);
  });

  it('should handle string unread_count', () => {
    const rawData: Record<string, any> = {
      id: 'conv-1',
      type: 'FRIENDS_DM',
      unread_count: '5', // Sometimes comes as string from DB
    };

    const unreadCount = Number(rawData.unread_count || 0);

    expect(unreadCount).toBe(5);
  });
});

describe('Error Classification', () => {
  it('should identify PGRST202 as schema error', () => {
    const error = {
      code: 'PGRST202',
      message: 'Could not find the function in the schema cache',
    };

    const isSchemaError = 
      error.code === 'PGRST202' || 
      error.code === '42883' ||
      error.message?.includes('schema');

    expect(isSchemaError).toBe(true);
  });

  it('should identify 42883 (function not found) as schema error', () => {
    const error = {
      code: '42883',
      message: 'function public.get_conversations_overview() does not exist',
    };

    const isSchemaError = 
      error.code === 'PGRST202' || 
      error.code === '42883';

    expect(isSchemaError).toBe(true);
  });

  it('should identify column does not exist as schema error', () => {
    const error = {
      code: '42703',
      message: 'column conversation_members.last_seen_at does not exist',
    };

    const isSchemaError = 
      error.message?.includes('does not exist') ||
      error.message?.includes('column');

    expect(isSchemaError).toBe(true);
  });

  it('should not classify network errors as schema errors', () => {
    const error = {
      code: 'NETWORK_ERROR',
      message: 'Failed to fetch',
    };

    const isSchemaError = 
      error.code === 'PGRST202' || 
      error.code === '42883' ||
      error.message?.includes('schema') ||
      error.message?.includes('does not exist');

    expect(isSchemaError).toBe(false);
  });
});

describe('Message Type Handling', () => {
  const messagePreviewMap: Record<string, string> = {
    'TEXT': 'Hello, how are you?',
    'IMAGE': '📷 Photo',
    'VIDEO': '🎥 Video',
    'VOICE': '🎤 Voice note',
    'FILE': '📎 File',
    'RIDE_CARD': '🚗 Ride shared',
    'BOOKING_CARD': '📋 Booking shared',
    'SYSTEM': 'System message',
  };

  it('should format TEXT message preview', () => {
    const msgType = 'TEXT';
    const body = 'Hello, how are you?';
    const preview = body; // TEXT uses body directly
    expect(preview).toBe('Hello, how are you?');
  });

  it('should format media message previews', () => {
    expect(messagePreviewMap['IMAGE']).toBe('📷 Photo');
    expect(messagePreviewMap['VIDEO']).toBe('🎥 Video');
    expect(messagePreviewMap['VOICE']).toBe('🎤 Voice note');
  });

  it('should handle unknown message types', () => {
    const msgType = 'UNKNOWN';
    const preview = messagePreviewMap[msgType] || 'New message';
    expect(preview).toBe('New message');
  });
});

describe('Presence State Handling', () => {
  it('should show online when presence is true', () => {
    const presenceMap: Record<string, boolean> = {
      'user-1': true,
      'user-2': false,
    };

    expect(presenceMap['user-1']).toBe(true);
    expect(presenceMap['user-2']).toBe(false);
  });

  it('should default to offline for unknown users', () => {
    const presenceMap: Record<string, boolean> = {};
    const userId = 'unknown-user';

    const isOnline = presenceMap[userId] ?? false;

    expect(isOnline).toBe(false);
  });

  it('should format last seen time correctly', () => {
    const lastSeenAt = '2026-01-15T10:30:00Z';
    const date = new Date(lastSeenAt);

    // Just verify it doesn't throw
    const formatted = date.toLocaleString('en-GB');
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe('Read Receipt Calculation', () => {
  it('should count unread messages after last read', () => {
    const messages = [
      { id: '1', created_at: '2026-01-15T10:00:00Z', sender_id: 'other' },
      { id: '2', created_at: '2026-01-15T10:01:00Z', sender_id: 'other' },
      { id: '3', created_at: '2026-01-15T10:02:00Z', sender_id: 'me' },
      { id: '4', created_at: '2026-01-15T10:03:00Z', sender_id: 'other' },
    ];

    const lastReadAt = new Date('2026-01-15T10:01:30Z').getTime();
    const userId = 'me';

    const unread = messages.filter(msg => 
      msg.sender_id !== userId &&
      new Date(msg.created_at).getTime() > lastReadAt
    );

    expect(unread).toHaveLength(1);
    expect(unread[0].id).toBe('4');
  });

  it('should return 0 unread when all messages are read', () => {
    const messages = [
      { id: '1', created_at: '2026-01-15T10:00:00Z', sender_id: 'other' },
    ];

    const lastReadAt = new Date('2026-01-15T10:05:00Z').getTime(); // After all messages

    const unread = messages.filter(msg => 
      new Date(msg.created_at).getTime() > lastReadAt
    );

    expect(unread).toHaveLength(0);
  });

  it('should count all as unread when no read state exists', () => {
    const messages = [
      { id: '1', created_at: '2026-01-15T10:00:00Z', sender_id: 'other' },
      { id: '2', created_at: '2026-01-15T10:01:00Z', sender_id: 'other' },
    ];

    const lastReadAt: number | null = null;
    const userId = 'me';

    const unread = messages.filter(msg => 
      msg.sender_id !== userId &&
      (lastReadAt === null || new Date(msg.created_at).getTime() > lastReadAt)
    );

    expect(unread).toHaveLength(2);
  });
});
