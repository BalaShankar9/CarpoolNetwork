# Messaging Upgrade (Futuristic Chat)

## Overview
Carpool messaging is now fully powered by the conversation-based chat stack:
- `conversations`
- `conversation_members`
- `chat_messages`
- `message_reads`
- `message_reactions`
- `conversation_settings`
- `message_deletions`
- `blocks`

Legacy `messages` is deprecated and no longer written to.

## Architecture
- **UI**: `src/components/messaging/NewChatSystem.tsx`
- **Entry points**: `src/pages/Messages.tsx` (state includes `conversationId`, `rideId`, `driverId`, `userId`)
- **Realtime**:
  - Conversation channel (`chat:<conversationId>`) for inserts/updates, reactions, read receipts
  - Presence + typing via Realtime presence + broadcast
  - Overview channel (`chat-overview:<userId>`) updates conversation preview + unread
- **Global unread badge**: `src/contexts/RealtimeContext.tsx` uses RPC `get_total_unread_messages`
- **Idempotency + offline queue**: `client_generated_id` and `localStorage` queue (`chat_message_queue_v1`)

## Database Tables (Primary)
- `chat_messages`: message content + metadata + attachments + idempotency
- `message_reads`: per-conversation read state (last read)
- `message_reactions`: emoji reactions
- `conversation_settings`: pinned/muted/archived per user
- `message_deletions`: delete-for-me
- `blocks`: block list for safety

## Realtime Design
- **Messages**: `postgres_changes` on `chat_messages` (filtered by `conversation_id`)
- **Reactions**: `postgres_changes` on `message_reactions`
- **Read receipts**: `postgres_changes` on `message_reads`
- **Typing**: realtime `broadcast` events (no DB writes)
- **Presence**: realtime presence tracked per conversation

## Read/Unread Logic
- When user opens a conversation and is at bottom, update `message_reads` with latest message ID + timestamp.
- Unread count = messages created after `last_read_at` by other users.
- Global unread count from RPC `get_total_unread_messages`.

## Entry Points
Updated to create conversations via RPC helpers:
- `src/pages/RideDetails.tsx`
- `src/pages/BookingDetails.tsx`
- `src/pages/MyRides.tsx`
- `src/pages/PublicProfile.tsx`
- Notifications link to `/messages` with `{ conversationId }` state.

## Safety & Trust
- **Blocks** prevent new DMs and disable sending in UI.
- **Report** flow available from message menu (uses `safety_reports`).
- **Strict RLS** on new tables ensures conversation membership access only.
- **Rate limiting** on message sends (`check_rate_limit` RPC).

## Testing Plan
- **Playwright**: `tests/messages-futuristic.spec.ts`
  - sender instant message
  - true realtime across two contexts
  - unread badge increment + clear
  - typing indicator
  - reactions appear in realtime
  - attachment send (image)
- **Unit tests**: `tests/chatUtils.spec.ts`
  - dedupe logic
  - unread count calculation
  - message preview formatting

## Migrations
- `supabase/migrations/20260105120000_upgrade_messaging_system.sql`
  - schema changes, RLS, realtime publication, helper functions
