-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 005: Messaging System (Conversations, Chat, Reactions, Reports, Legacy)
-- ============================================================================
-- Consolidated messaging schema supporting ride-match conversations,
-- trip-match conversations, friend DMs, community chat, reactions,
-- read tracking, message flagging/reporting, and backward-compatible
-- legacy messages.
--
-- Depends on: 001_extensions_and_utils.sql (conversation_type, message_type ENUMs,
--             update_updated_at_column())
--             002_core_profiles_and_auth.sql (profiles table)
-- ============================================================================

-- ==========================================================================
-- TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. conversations
-- --------------------------------------------------------------------------

CREATE TABLE conversations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type                conversation_type NOT NULL,
    ride_id             uuid,           -- FK to rides (created in a later migration)
    trip_request_id     uuid,           -- FK to trip_requests (created in a later migration)
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

COMMENT ON COLUMN conversations.ride_id IS 'References rides(id) — FK added in rides migration';
COMMENT ON COLUMN conversations.trip_request_id IS 'References trip_requests(id) — FK added in rides migration';

-- --------------------------------------------------------------------------
-- 2. conversation_members
-- --------------------------------------------------------------------------

CREATE TABLE conversation_members (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role                text NOT NULL CHECK (role IN ('DRIVER', 'RIDER', 'FRIEND')),
    joined_at           timestamptz DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);

-- --------------------------------------------------------------------------
-- 3. chat_messages
-- --------------------------------------------------------------------------

CREATE TABLE chat_messages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body                text NOT NULL,
    type                message_type NOT NULL DEFAULT 'TEXT',
    created_at          timestamptz DEFAULT now(),
    edited_at           timestamptz,
    deleted_at          timestamptz
);

-- --------------------------------------------------------------------------
-- 4. message_reads
-- --------------------------------------------------------------------------

CREATE TABLE message_reads (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at             timestamptz DEFAULT now(),
    UNIQUE (message_id, user_id)
);

-- --------------------------------------------------------------------------
-- 5. conversation_read_markers
-- --------------------------------------------------------------------------

CREATE TABLE conversation_read_markers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_read_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at        timestamptz DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);

-- --------------------------------------------------------------------------
-- 6. conversation_settings
-- --------------------------------------------------------------------------

CREATE TABLE conversation_settings (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    muted               boolean DEFAULT false,
    pinned              boolean DEFAULT false,
    archived            boolean DEFAULT false,
    UNIQUE (conversation_id, user_id)
);

-- --------------------------------------------------------------------------
-- 7. message_reactions
-- --------------------------------------------------------------------------

CREATE TABLE message_reactions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji               text NOT NULL,
    created_at          timestamptz DEFAULT now(),
    UNIQUE (message_id, user_id, emoji)
);

-- --------------------------------------------------------------------------
-- 8. message_deletions (soft-delete tracking)
-- --------------------------------------------------------------------------

CREATE TABLE message_deletions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    deleted_by          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    deleted_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 9. message_flags (spam / abuse reports — lightweight)
-- --------------------------------------------------------------------------

CREATE TABLE message_flags (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    reporter_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason              text,
    status              text DEFAULT 'pending',
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 10. message_reports (formal moderation reports)
-- --------------------------------------------------------------------------

CREATE TABLE message_reports (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    reporter_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason              text,
    status              text DEFAULT 'pending',
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 11. Legacy messages table (backward compatibility)
-- --------------------------------------------------------------------------

CREATE TABLE messages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ride_id             uuid,           -- FK to rides (created in a later migration)
    content             text NOT NULL,
    is_read             boolean DEFAULT false,
    created_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE messages IS 'Legacy 1-to-1 messages table kept for backward compatibility. New code should use chat_messages + conversations.';

-- --------------------------------------------------------------------------
-- 12. community_chat_messages
-- --------------------------------------------------------------------------

CREATE TABLE community_chat_messages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id        uuid NOT NULL,  -- FK to communities (created in a later migration)
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content             text NOT NULL,
    message_type        text DEFAULT 'TEXT',
    reply_to            uuid REFERENCES community_chat_messages(id) ON DELETE SET NULL,
    created_at          timestamptz DEFAULT now()
);

-- ==========================================================================
-- INDEXES
-- ==========================================================================

-- conversations
CREATE INDEX idx_conversations_ride_id
    ON conversations (ride_id)
    WHERE ride_id IS NOT NULL;

CREATE INDEX idx_conversations_trip_request_id
    ON conversations (trip_request_id)
    WHERE trip_request_id IS NOT NULL;

CREATE INDEX idx_conversations_type
    ON conversations (type);

-- conversation_members
CREATE INDEX idx_conversation_members_conversation_id
    ON conversation_members (conversation_id);

CREATE INDEX idx_conversation_members_user_id
    ON conversation_members (user_id);

-- chat_messages
CREATE INDEX idx_chat_messages_conversation_id
    ON chat_messages (conversation_id);

CREATE INDEX idx_chat_messages_sender_id
    ON chat_messages (sender_id);

CREATE INDEX idx_chat_messages_created_at
    ON chat_messages (created_at DESC);

CREATE INDEX idx_chat_messages_conversation_created
    ON chat_messages (conversation_id, created_at DESC);

-- message_reads
CREATE INDEX idx_message_reads_message_id
    ON message_reads (message_id);

CREATE INDEX idx_message_reads_user_id
    ON message_reads (user_id);

-- conversation_read_markers
CREATE INDEX idx_conversation_read_markers_conversation_id
    ON conversation_read_markers (conversation_id);

CREATE INDEX idx_conversation_read_markers_user_id
    ON conversation_read_markers (user_id);

-- legacy messages
CREATE INDEX idx_messages_sender_id
    ON messages (sender_id);

CREATE INDEX idx_messages_recipient_id
    ON messages (recipient_id);

CREATE INDEX idx_messages_created_at
    ON messages (created_at DESC);

-- community_chat_messages
CREATE INDEX idx_community_chat_messages_community_id
    ON community_chat_messages (community_id);

CREATE INDEX idx_community_chat_messages_created_at
    ON community_chat_messages (created_at DESC);

-- ==========================================================================
-- TRIGGERS
-- ==========================================================================

-- Auto-update updated_at on conversations
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Bump conversation.updated_at when a new chat_message is inserted
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    UPDATE conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_messages_update_conversation
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();

-- ==========================================================================
-- FUNCTIONS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- get_or_create_ride_conversation
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_or_create_ride_conversation(
    p_ride_id    uuid,
    p_driver_id  uuid,
    p_rider_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conversation_id uuid;
BEGIN
    -- Look for an existing RIDE_MATCH conversation for this ride
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    WHERE c.ride_id = p_ride_id
      AND c.type = 'RIDE_MATCH'
      AND EXISTS (
          SELECT 1 FROM conversation_members cm
          WHERE cm.conversation_id = c.id AND cm.user_id = p_driver_id
      )
      AND EXISTS (
          SELECT 1 FROM conversation_members cm
          WHERE cm.conversation_id = c.id AND cm.user_id = p_rider_id
      )
    LIMIT 1;

    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;

    -- Create new conversation
    INSERT INTO conversations (type, ride_id)
    VALUES ('RIDE_MATCH', p_ride_id)
    RETURNING id INTO v_conversation_id;

    -- Add members
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES
        (v_conversation_id, p_driver_id, 'DRIVER'),
        (v_conversation_id, p_rider_id,  'RIDER');

    RETURN v_conversation_id;
END;
$$;

-- --------------------------------------------------------------------------
-- get_or_create_trip_conversation
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_or_create_trip_conversation(
    p_trip_request_id  uuid,
    p_rider_id         uuid,
    p_driver_id        uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conversation_id uuid;
BEGIN
    -- Look for an existing TRIP_MATCH conversation for this trip request
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    WHERE c.trip_request_id = p_trip_request_id
      AND c.type = 'TRIP_MATCH'
      AND EXISTS (
          SELECT 1 FROM conversation_members cm
          WHERE cm.conversation_id = c.id AND cm.user_id = p_rider_id
      )
      AND EXISTS (
          SELECT 1 FROM conversation_members cm
          WHERE cm.conversation_id = c.id AND cm.user_id = p_driver_id
      )
    LIMIT 1;

    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;

    -- Create new conversation
    INSERT INTO conversations (type, trip_request_id)
    VALUES ('TRIP_MATCH', p_trip_request_id)
    RETURNING id INTO v_conversation_id;

    -- Add members
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES
        (v_conversation_id, p_rider_id,  'RIDER'),
        (v_conversation_id, p_driver_id, 'DRIVER');

    RETURN v_conversation_id;
END;
$$;

-- --------------------------------------------------------------------------
-- get_or_create_dm_conversation
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(
    p_user_a  uuid,
    p_user_b  uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conversation_id uuid;
BEGIN
    -- Look for an existing FRIENDS_DM between the two users
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    WHERE c.type = 'FRIENDS_DM'
      AND EXISTS (
          SELECT 1 FROM conversation_members cm
          WHERE cm.conversation_id = c.id AND cm.user_id = p_user_a
      )
      AND EXISTS (
          SELECT 1 FROM conversation_members cm
          WHERE cm.conversation_id = c.id AND cm.user_id = p_user_b
      )
    LIMIT 1;

    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;

    -- Create new conversation
    INSERT INTO conversations (type)
    VALUES ('FRIENDS_DM')
    RETURNING id INTO v_conversation_id;

    -- Add members
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES
        (v_conversation_id, p_user_a, 'FRIEND'),
        (v_conversation_id, p_user_b, 'FRIEND');

    RETURN v_conversation_id;
END;
$$;

-- --------------------------------------------------------------------------
-- get_messaging_overview (inbox query)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_messaging_overview(p_user_id uuid)
RETURNS TABLE (
    conversation_id     uuid,
    conversation_type   conversation_type,
    ride_id             uuid,
    trip_request_id     uuid,
    last_message_body   text,
    last_message_at     timestamptz,
    last_sender_id      uuid,
    unread_count        bigint,
    other_user_id       uuid,
    other_user_name     text,
    other_user_avatar   text,
    is_muted            boolean,
    is_pinned           boolean,
    is_archived         boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id                    AS conversation_id,
        c.type                  AS conversation_type,
        c.ride_id,
        c.trip_request_id,
        lm.body                 AS last_message_body,
        lm.created_at           AS last_message_at,
        lm.sender_id            AS last_sender_id,
        COALESCE(unread.cnt, 0) AS unread_count,
        other_member.user_id    AS other_user_id,
        p.full_name             AS other_user_name,
        p.avatar_url            AS other_user_avatar,
        COALESCE(cs.muted, false)   AS is_muted,
        COALESCE(cs.pinned, false)  AS is_pinned,
        COALESCE(cs.archived, false) AS is_archived
    FROM conversations c
    -- Ensure the calling user is a member
    INNER JOIN conversation_members my_membership
        ON my_membership.conversation_id = c.id
        AND my_membership.user_id = p_user_id
    -- Get the other member (for 1-to-1 conversations)
    LEFT JOIN LATERAL (
        SELECT cm.user_id
        FROM conversation_members cm
        WHERE cm.conversation_id = c.id
          AND cm.user_id <> p_user_id
        LIMIT 1
    ) other_member ON true
    -- Other member's profile
    LEFT JOIN profiles p ON p.id = other_member.user_id
    -- Latest message
    LEFT JOIN LATERAL (
        SELECT m.body, m.created_at, m.sender_id
        FROM chat_messages m
        WHERE m.conversation_id = c.id
          AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT 1
    ) lm ON true
    -- Unread count (messages after the user's last read marker)
    LEFT JOIN LATERAL (
        SELECT count(*) AS cnt
        FROM chat_messages m
        WHERE m.conversation_id = c.id
          AND m.deleted_at IS NULL
          AND m.sender_id <> p_user_id
          AND m.created_at > COALESCE(
              (SELECT crm.last_read_at
               FROM conversation_read_markers crm
               WHERE crm.conversation_id = c.id
                 AND crm.user_id = p_user_id),
              '1970-01-01'::timestamptz
          )
    ) unread ON true
    -- User's conversation settings
    LEFT JOIN conversation_settings cs
        ON cs.conversation_id = c.id
        AND cs.user_id = p_user_id
    ORDER BY
        COALESCE(cs.pinned, false) DESC,
        COALESCE(lm.created_at, c.created_at) DESC;
END;
$$;

-- ==========================================================================
-- REVOKE / GRANT on functions
-- ==========================================================================

REVOKE ALL ON FUNCTION get_or_create_ride_conversation(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_ride_conversation(uuid, uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION get_or_create_trip_conversation(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_trip_conversation(uuid, uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION get_or_create_dm_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_dm_conversation(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION get_messaging_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_messaging_overview(uuid) TO authenticated;

-- ==========================================================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE conversations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_read_markers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deletions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_flags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_chat_messages    ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- RLS POLICIES
-- ==========================================================================
-- All policies use (SELECT auth.uid()) so the planner evaluates the
-- sub-select once per statement, not once per row.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- conversations
-- --------------------------------------------------------------------------

CREATE POLICY conversations_select_member
    ON conversations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = id
              AND cm.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY conversations_insert_authenticated
    ON conversations FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- --------------------------------------------------------------------------
-- conversation_members
-- --------------------------------------------------------------------------

CREATE POLICY conversation_members_select_co_member
    ON conversation_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = conversation_members.conversation_id
              AND cm.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY conversation_members_insert_authenticated
    ON conversation_members FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- --------------------------------------------------------------------------
-- chat_messages
-- --------------------------------------------------------------------------

CREATE POLICY chat_messages_select_member
    ON chat_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = chat_messages.conversation_id
              AND cm.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY chat_messages_insert_sender_member
    ON chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = chat_messages.conversation_id
              AND cm.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY chat_messages_update_own
    ON chat_messages FOR UPDATE
    TO authenticated
    USING (sender_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- message_reads
-- --------------------------------------------------------------------------

CREATE POLICY message_reads_select_member
    ON message_reads FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            INNER JOIN chat_messages m ON m.conversation_id = cm.conversation_id
            WHERE m.id = message_reads.message_id
              AND cm.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY message_reads_insert_own
    ON message_reads FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- conversation_read_markers
-- --------------------------------------------------------------------------

CREATE POLICY conversation_read_markers_select_own
    ON conversation_read_markers FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY conversation_read_markers_insert_own
    ON conversation_read_markers FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY conversation_read_markers_update_own
    ON conversation_read_markers FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- conversation_settings
-- --------------------------------------------------------------------------

CREATE POLICY conversation_settings_select_own
    ON conversation_settings FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY conversation_settings_insert_own
    ON conversation_settings FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY conversation_settings_update_own
    ON conversation_settings FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- message_reactions
-- --------------------------------------------------------------------------

CREATE POLICY message_reactions_select_member
    ON message_reactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm
            INNER JOIN chat_messages m ON m.conversation_id = cm.conversation_id
            WHERE m.id = message_reactions.message_id
              AND cm.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY message_reactions_insert_own
    ON message_reactions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY message_reactions_delete_own
    ON message_reactions FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- message_reports
-- --------------------------------------------------------------------------

CREATE POLICY message_reports_insert_own
    ON message_reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY message_reports_select_own
    ON message_reports FOR SELECT
    TO authenticated
    USING (reporter_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- legacy messages
-- --------------------------------------------------------------------------

CREATE POLICY messages_select_participant
    ON messages FOR SELECT
    TO authenticated
    USING (
        sender_id = (SELECT auth.uid())
        OR recipient_id = (SELECT auth.uid())
    );

CREATE POLICY messages_insert_sender
    ON messages FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY messages_update_recipient
    ON messages FOR UPDATE
    TO authenticated
    USING (recipient_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- community_chat_messages
-- --------------------------------------------------------------------------

CREATE POLICY community_chat_messages_select_authenticated
    ON community_chat_messages FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY community_chat_messages_insert_authenticated
    ON community_chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==========================================================================
-- REALTIME
-- ==========================================================================
-- The following tables should be added to Supabase Realtime publication
-- via the Supabase Dashboard or CLI:
--
--   * chat_messages
--   * conversation_members
--   * message_reads
--
-- Example (run manually or via Supabase Dashboard):
--   ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
--   ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
--   ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
-- ==========================================================================

-- --------------------------------------------------------------------------
-- End of 005_messaging.sql
-- --------------------------------------------------------------------------
