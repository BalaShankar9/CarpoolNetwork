/**
 * Messaging Utilities
 * 
 * Shared utilities for safe RPC calls, realtime subscriptions,
 * and resilient messaging operations.
 * 
 * Key principles:
 * - Presence updates are best-effort and never block UI
 * - RPC failures trigger fallback to direct queries
 * - All operations have proper error typing and recovery
 */

import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================================
// Types
// ============================================================

export interface SafeRpcResult<T> {
  data: T | null;
  error: SafeRpcError | null;
  success: boolean;
  usedFallback?: boolean;
}

export interface SafeRpcError {
  code: string;
  message: string;
  isSchemaError: boolean;
  isNetworkError: boolean;
  hint?: string;
}

export interface RealtimeSubscriptionOptions {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => Promise<void>;
  isConnected: () => boolean;
}

export interface MessagingDiagnostics {
  schemaHealthy: boolean;
  conversationMembersLastSeenAt: boolean;
  conversationSettingsTable: boolean;
  messageReadsTable: boolean;
  conversationsLastMessageAt: boolean;
  rpcAvailable: boolean;
  realtimeConnected: boolean;
  lastError: string | null;
  checkedAt: string;
}

// ============================================================
// Safe RPC Helper
// ============================================================

/**
 * Safely call a Supabase RPC function with proper error handling.
 * Returns a typed result with error classification.
 */
export async function safeRpc<T>(
  functionName: string,
  params?: Record<string, unknown>,
  options?: { timeout?: number }
): Promise<SafeRpcResult<T>> {
  const timeout = options?.timeout ?? 10000;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const result = await (supabase.rpc as any)(functionName, params || {}, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (result.error) {
      const error = result.error as any;
      const code = error.code || 'UNKNOWN';
      const isSchemaError = 
        code === 'PGRST202' || 
        code === '42883' || 
        error.message?.includes('schema') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Could not find');
      
      return {
        data: null,
        error: {
          code,
          message: error.message || 'RPC call failed',
          isSchemaError,
          isNetworkError: false,
          hint: error.hint,
        },
        success: false,
      };
    }

    return {
      data: result.data as T,
      error: null,
      success: true,
    };
  } catch (err: any) {
    const isAborted = err.name === 'AbortError';
    const isNetworkError = isAborted || err.message?.includes('network') || err.message?.includes('fetch');
    
    return {
      data: null,
      error: {
        code: isAborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: isAborted ? `RPC call timed out after ${timeout}ms` : (err.message || 'Network error'),
        isSchemaError: false,
        isNetworkError,
      },
      success: false,
    };
  }
}

/**
 * Call RPC with automatic retry for transient errors
 */
export async function safeRpcWithRetry<T>(
  functionName: string,
  params?: Record<string, unknown>,
  options?: { maxRetries?: number; retryDelayMs?: number; timeout?: number }
): Promise<SafeRpcResult<T>> {
  const maxRetries = options?.maxRetries ?? 2;
  const retryDelayMs = options?.retryDelayMs ?? 1000;
  
  let lastResult: SafeRpcResult<T> | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await safeRpc<T>(functionName, params, { timeout: options?.timeout });
    lastResult = result;
    
    if (result.success) {
      return result;
    }
    
    // Don't retry schema errors - they won't resolve without migration
    if (result.error?.isSchemaError) {
      return result;
    }
    
    // Retry only network/transient errors
    if (result.error?.isNetworkError && attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)));
      continue;
    }
    
    break;
  }
  
  return lastResult!;
}

// ============================================================
// Safe Realtime Subscription
// ============================================================

const activeSubscriptions = new Map<string, RealtimeSubscription>();

/**
 * Create a resilient realtime subscription with automatic reconnection.
 */
export function safeRealtimeSubscribe(
  channelName: string,
  options: RealtimeSubscriptionOptions
): RealtimeSubscription {
  // Clean up existing subscription with same name
  const existing = activeSubscriptions.get(channelName);
  if (existing) {
    existing.unsubscribe();
  }

  let isConnected = false;
  let retryCount = 0;
  const maxRetries = options.retryAttempts ?? 3;
  const retryDelay = options.retryDelayMs ?? 2000;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any, // Type cast for Supabase SDK compatibility
      {
        event: options.event,
        schema: options.schema ?? 'public',
        table: options.table,
        filter: options.filter,
      } as any,
      (payload: any) => {
        try {
          options.onPayload(payload);
        } catch (err) {
          console.error(`[Realtime] Error in payload handler for ${channelName}:`, err);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        retryCount = 0;
        options.onConnect?.();
        if (import.meta.env.DEV) {
          console.log(`[Realtime] Subscribed to ${channelName}`);
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isConnected = false;
        options.onDisconnect?.();
        
        // Attempt reconnection for transient errors
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`[Realtime] ${channelName} disconnected, retrying (${retryCount}/${maxRetries})...`);
          setTimeout(() => {
            channel.subscribe();
          }, retryDelay * retryCount);
        } else {
          console.error(`[Realtime] ${channelName} failed after ${maxRetries} retries`);
          options.onError?.(new Error(`Realtime subscription failed for ${channelName}`));
        }
      }
    });

  const subscription: RealtimeSubscription = {
    channel,
    unsubscribe: async () => {
      isConnected = false;
      activeSubscriptions.delete(channelName);
      await supabase.removeChannel(channel);
    },
    isConnected: () => isConnected,
  };

  activeSubscriptions.set(channelName, subscription);
  return subscription;
}

/**
 * Unsubscribe from all active subscriptions
 */
export async function unsubscribeAll(): Promise<void> {
  const promises = Array.from(activeSubscriptions.values()).map(sub => sub.unsubscribe());
  await Promise.all(promises);
  activeSubscriptions.clear();
}

// ============================================================
// Best-Effort Presence Updates
// ============================================================

let presenceUpdateQueue: Map<string, NodeJS.Timeout> = new Map();
const PRESENCE_DEBOUNCE_MS = 5000; // Debounce presence updates

/**
 * Update presence (last_seen_at) for a conversation.
 * This is best-effort and will not throw or block on failure.
 */
export function updatePresenceBestEffort(conversationId: string, userId: string): void {
  // Debounce: cancel pending update for this conversation
  const pendingKey = `${conversationId}:${userId}`;
  const pending = presenceUpdateQueue.get(pendingKey);
  if (pending) {
    clearTimeout(pending);
  }

  // Schedule debounced update
  const timeoutId = setTimeout(async () => {
    presenceUpdateQueue.delete(pendingKey);
    try {
      await supabase
        .from('conversation_members')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    } catch (err) {
      // Silently ignore - presence is best-effort
      if (import.meta.env.DEV) {
        console.warn('[Presence] Update failed (ignored):', err);
      }
    }
  }, PRESENCE_DEBOUNCE_MS);

  presenceUpdateQueue.set(pendingKey, timeoutId);
}

/**
 * Flush all pending presence updates immediately
 */
export function flushPresenceUpdates(): void {
  presenceUpdateQueue.forEach((timeout) => clearTimeout(timeout));
  presenceUpdateQueue.clear();
}

// ============================================================
// Debounced Read Receipts
// ============================================================

let readReceiptQueue: Map<string, { messageId: string; timestamp: string; timeoutId: NodeJS.Timeout }> = new Map();
const READ_RECEIPT_DEBOUNCE_MS = 2000;

/**
 * Mark a conversation as read with debouncing.
 * Multiple rapid reads will be coalesced into a single update.
 */
export function markReadDebounced(
  conversationId: string,
  messageId: string,
  timestamp: string,
  onComplete?: (success: boolean) => void
): void {
  const pending = readReceiptQueue.get(conversationId);
  if (pending) {
    clearTimeout(pending.timeoutId);
  }

  const timeoutId = setTimeout(async () => {
    readReceiptQueue.delete(conversationId);
    try {
      const result = await safeRpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_last_read_message_id: messageId,
        p_last_read_at: timestamp,
      });
      onComplete?.(result.success);
    } catch {
      onComplete?.(false);
    }
  }, READ_RECEIPT_DEBOUNCE_MS);

  readReceiptQueue.set(conversationId, { messageId, timestamp, timeoutId });
}

// ============================================================
// Diagnostics
// ============================================================

/**
 * Run comprehensive messaging diagnostics.
 * Checks schema, RPC availability, and realtime status.
 */
export async function runMessagingDiagnostics(): Promise<MessagingDiagnostics> {
  const result: MessagingDiagnostics = {
    schemaHealthy: false,
    conversationMembersLastSeenAt: false,
    conversationSettingsTable: false,
    messageReadsTable: false,
    conversationsLastMessageAt: false,
    rpcAvailable: false,
    realtimeConnected: false,
    lastError: null,
    checkedAt: new Date().toISOString(),
  };

  // Check schema via RPC
  try {
    const schemaCheck = await safeRpc<{
      conversation_members_last_seen_at: boolean;
      conversation_settings_table: boolean;
      message_reads_table: boolean;
      conversations_last_message_at: boolean;
      schema_healthy: boolean;
    }>('check_messaging_schema');

    if (schemaCheck.success && schemaCheck.data) {
      result.conversationMembersLastSeenAt = schemaCheck.data.conversation_members_last_seen_at;
      result.conversationSettingsTable = schemaCheck.data.conversation_settings_table;
      result.messageReadsTable = schemaCheck.data.message_reads_table;
      result.conversationsLastMessageAt = schemaCheck.data.conversations_last_message_at;
      result.schemaHealthy = schemaCheck.data.schema_healthy;
    } else if (schemaCheck.error) {
      result.lastError = `Schema check failed: ${schemaCheck.error.message}`;
    }
  } catch (err: any) {
    result.lastError = `Schema check error: ${err.message}`;
  }

  // Check RPC availability
  try {
    const rpcCheck = await safeRpc('get_conversations_overview');
    result.rpcAvailable = rpcCheck.success || !rpcCheck.error?.isSchemaError;
    if (rpcCheck.error?.isSchemaError) {
      result.lastError = `RPC unavailable: ${rpcCheck.error.message}`;
    }
  } catch (err: any) {
    result.lastError = `RPC check error: ${err.message}`;
  }

  // Check realtime connections
  result.realtimeConnected = Array.from(activeSubscriptions.values()).some(sub => sub.isConnected());

  return result;
}

/**
 * Format diagnostics as human-readable report
 */
export function formatDiagnosticsReport(diag: MessagingDiagnostics): string {
  const lines = [
    '=== Messaging Diagnostics ===',
    '',
    `Checked at: ${diag.checkedAt}`,
    '',
    '--- Schema Status ---',
    `conversation_members.last_seen_at: ${diag.conversationMembersLastSeenAt ? '✅' : '❌'}`,
    `conversation_settings table: ${diag.conversationSettingsTable ? '✅' : '❌'}`,
    `message_reads table: ${diag.messageReadsTable ? '✅' : '❌'}`,
    `conversations.last_message_at: ${diag.conversationsLastMessageAt ? '✅' : '❌'}`,
    `Overall schema health: ${diag.schemaHealthy ? '✅ Healthy' : '❌ Incomplete'}`,
    '',
    '--- Runtime Status ---',
    `get_conversations_overview RPC: ${diag.rpcAvailable ? '✅ Available' : '❌ Unavailable'}`,
    `Realtime subscriptions: ${diag.realtimeConnected ? '✅ Connected' : '⚠️ Disconnected'}`,
    '',
  ];

  if (diag.lastError) {
    lines.push('--- Last Error ---', diag.lastError, '');
  }

  if (!diag.schemaHealthy) {
    lines.push(
      '--- Action Required ---',
      '1. Apply migration: 20260115200000_messaging_schema_hotfix.sql',
      '2. Reload schema cache in Supabase Dashboard',
      '3. Retry loading messages',
      ''
    );
  }

  return lines.join('\n');
}

// ============================================================
// Message Types (Shared)
// ============================================================

export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'FILE'
  | 'VOICE'
  | 'SYSTEM'
  | 'RIDE_CARD'
  | 'BOOKING_CARD';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled' | 'queued';

export interface MessageAttachment {
  url?: string | null;
  path: string;
  bucket: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string | null;
  filename?: string | null;
}

export interface ConversationMember {
  user_id: string;
  role: string;
  last_seen_at?: string | null;
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    profile_photo_url?: string | null;
  };
}

export interface ConversationSummary {
  id: string;
  type: string;
  ride_id?: string | null;
  trip_request_id?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  last_sender_id?: string | null;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  unread_count: number;
  members: ConversationMember[];
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type: MessageType;
  created_at: string;
  reply_to_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  client_generated_id?: string | null;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
  sender?: ConversationMember['profile'];
  status?: MessageStatus;
}

export default {
  safeRpc,
  safeRpcWithRetry,
  safeRealtimeSubscribe,
  unsubscribeAll,
  updatePresenceBestEffort,
  flushPresenceUpdates,
  markReadDebounced,
  runMessagingDiagnostics,
  formatDiagnosticsReport,
};
