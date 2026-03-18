-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 010: Admin, Moderation, and Platform Operations
-- ============================================================================
-- Admin action logs, audit logs, announcements, permissions, flags, notes,
-- bug reports, content moderation, feature flags, platform settings,
-- help articles, and bulk/scheduled operations.
--
-- Depends on:
--   001_extensions_and_utils.sql  (update_updated_at_column(), is_admin())
--   002_core_profiles_and_auth.sql (profiles table)
-- ============================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. admin_action_logs
-- --------------------------------------------------------------------------
CREATE TABLE admin_action_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type     text NOT NULL,
    target_type     text,
    target_id       uuid,
    description     text,
    metadata        jsonb,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1b. admin_audit_log
-- --------------------------------------------------------------------------
CREATE TABLE admin_audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action          text NOT NULL,
    details         jsonb,
    ip_address      inet,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1c. admin_announcements
-- --------------------------------------------------------------------------
CREATE TABLE admin_announcements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    content         text NOT NULL,
    priority        text,
    target_audience text,
    is_active       boolean DEFAULT true,
    start_date      timestamptz,
    end_date        timestamptz,
    created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1d. admin_permissions
-- --------------------------------------------------------------------------
CREATE TABLE admin_permissions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_type text NOT NULL,
    granted_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1e. admin_user_flags
-- --------------------------------------------------------------------------
CREATE TABLE admin_user_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    flag_type       text NOT NULL,
    reason          text,
    flagged_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1f. admin_user_notes
-- --------------------------------------------------------------------------
CREATE TABLE admin_user_notes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    note            text NOT NULL,
    created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1g. user_account_actions
-- --------------------------------------------------------------------------
CREATE TABLE user_account_actions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type     text NOT NULL,
    reason          text,
    performed_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1h. user_warnings
-- --------------------------------------------------------------------------
CREATE TABLE user_warnings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    warning_type    text NOT NULL,
    message         text,
    issued_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
    acknowledged    boolean DEFAULT false,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1i. bug_reports
-- --------------------------------------------------------------------------
CREATE TABLE bug_reports (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
    page            text,
    description     text NOT NULL,
    severity        text,
    browser         text,
    screenshot_url  text,
    status          text DEFAULT 'open',
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1j. banned_words
-- --------------------------------------------------------------------------
CREATE TABLE banned_words (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    word            text NOT NULL UNIQUE,
    category        text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1k. content_warnings
-- --------------------------------------------------------------------------
CREATE TABLE content_warnings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type    text NOT NULL,
    content_id      uuid NOT NULL,
    reason          text,
    created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1l. comment_flags
-- --------------------------------------------------------------------------
CREATE TABLE comment_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id      uuid NOT NULL,
    reporter_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason          text,
    status          text DEFAULT 'pending',
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1m. post_flags
-- --------------------------------------------------------------------------
CREATE TABLE post_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL,
    reporter_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason          text,
    status          text DEFAULT 'pending',
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1n. ride_flags
-- --------------------------------------------------------------------------
CREATE TABLE ride_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id         uuid NOT NULL,
    reporter_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason          text,
    status          text DEFAULT 'pending',
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1o. feature_flags
-- --------------------------------------------------------------------------
CREATE TABLE feature_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL UNIQUE,
    enabled         boolean DEFAULT false,
    description     text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1p. platform_settings (singleton row)
-- --------------------------------------------------------------------------
CREATE TABLE platform_settings (
    id              integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    settings        jsonb DEFAULT '{}'::jsonb,
    updated_at      timestamptz DEFAULT now()
);

-- Seed the singleton row
INSERT INTO platform_settings (id, settings) VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 1q. help_articles
-- --------------------------------------------------------------------------
CREATE TABLE help_articles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    content         text NOT NULL,
    category        text,
    order_index     integer DEFAULT 0,
    is_published    boolean DEFAULT false,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1r. bulk_operations
-- --------------------------------------------------------------------------
CREATE TABLE bulk_operations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type      text NOT NULL,
    operation_name      text NOT NULL,
    description         text,
    initiated_by        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status              text NOT NULL DEFAULT 'pending',
    target_count        integer DEFAULT 0,
    processed_count     integer DEFAULT 0,
    success_count       integer DEFAULT 0,
    failed_count        integer DEFAULT 0,
    skipped_count       integer DEFAULT 0,
    parameters          jsonb,
    results             jsonb,
    error_log           jsonb,
    started_at          timestamptz,
    completed_at        timestamptz,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1s. bulk_operation_items
-- --------------------------------------------------------------------------
CREATE TABLE bulk_operation_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id    uuid NOT NULL REFERENCES bulk_operations(id) ON DELETE CASCADE,
    target_type     text NOT NULL,
    target_id       uuid NOT NULL,
    status          text DEFAULT 'pending',
    result          jsonb,
    error_message   text,
    processed_at    timestamptz,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1t. scheduled_operations
-- --------------------------------------------------------------------------
CREATE TABLE scheduled_operations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type      text NOT NULL,
    operation_name      text NOT NULL,
    description         text,
    scheduled_by        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scheduled_for       timestamptz NOT NULL,
    recurrence_rule     text,
    parameters          jsonb,
    status              text NOT NULL DEFAULT 'scheduled',
    last_run_at         timestamptz,
    next_run_at         timestamptz,
    created_at          timestamptz DEFAULT now()
);

-- ==========================================================================
-- 2. INDEXES
-- ==========================================================================

-- admin_action_logs
CREATE INDEX idx_admin_action_logs_admin       ON admin_action_logs (admin_id);
CREATE INDEX idx_admin_action_logs_target      ON admin_action_logs (target_type, target_id);
CREATE INDEX idx_admin_action_logs_created     ON admin_action_logs (created_at DESC);

-- admin_audit_log
CREATE INDEX idx_admin_audit_log_admin         ON admin_audit_log (admin_id);
CREATE INDEX idx_admin_audit_log_created       ON admin_audit_log (created_at DESC);

-- admin_announcements
CREATE INDEX idx_admin_announcements_active    ON admin_announcements (is_active) WHERE is_active = true;
CREATE INDEX idx_admin_announcements_dates     ON admin_announcements (start_date, end_date);

-- admin_permissions
CREATE INDEX idx_admin_permissions_user        ON admin_permissions (user_id);
CREATE INDEX idx_admin_permissions_type        ON admin_permissions (permission_type);

-- admin_user_flags
CREATE INDEX idx_admin_user_flags_user         ON admin_user_flags (user_id);

-- admin_user_notes
CREATE INDEX idx_admin_user_notes_user         ON admin_user_notes (user_id);

-- user_account_actions
CREATE INDEX idx_user_account_actions_user     ON user_account_actions (user_id);
CREATE INDEX idx_user_account_actions_created  ON user_account_actions (created_at DESC);

-- user_warnings
CREATE INDEX idx_user_warnings_user            ON user_warnings (user_id);
CREATE INDEX idx_user_warnings_acknowledged    ON user_warnings (acknowledged) WHERE acknowledged = false;

-- bug_reports
CREATE INDEX idx_bug_reports_user              ON bug_reports (user_id);
CREATE INDEX idx_bug_reports_status            ON bug_reports (status);
CREATE INDEX idx_bug_reports_created           ON bug_reports (created_at DESC);

-- banned_words
CREATE INDEX idx_banned_words_category         ON banned_words (category);

-- content_warnings
CREATE INDEX idx_content_warnings_content      ON content_warnings (content_type, content_id);

-- comment_flags
CREATE INDEX idx_comment_flags_comment         ON comment_flags (comment_id);
CREATE INDEX idx_comment_flags_status          ON comment_flags (status);

-- post_flags
CREATE INDEX idx_post_flags_post               ON post_flags (post_id);
CREATE INDEX idx_post_flags_status             ON post_flags (status);

-- ride_flags
CREATE INDEX idx_ride_flags_ride               ON ride_flags (ride_id);
CREATE INDEX idx_ride_flags_status             ON ride_flags (status);

-- feature_flags
CREATE INDEX idx_feature_flags_name            ON feature_flags (name);
CREATE INDEX idx_feature_flags_enabled         ON feature_flags (enabled) WHERE enabled = true;

-- help_articles
CREATE INDEX idx_help_articles_category        ON help_articles (category);
CREATE INDEX idx_help_articles_published       ON help_articles (is_published) WHERE is_published = true;

-- bulk_operations
CREATE INDEX idx_bulk_operations_initiated_by  ON bulk_operations (initiated_by);
CREATE INDEX idx_bulk_operations_status        ON bulk_operations (status);
CREATE INDEX idx_bulk_operations_created       ON bulk_operations (created_at DESC);

-- bulk_operation_items
CREATE INDEX idx_bulk_operation_items_operation ON bulk_operation_items (operation_id);
CREATE INDEX idx_bulk_operation_items_status    ON bulk_operation_items (status);

-- scheduled_operations
CREATE INDEX idx_scheduled_operations_status   ON scheduled_operations (status);
CREATE INDEX idx_scheduled_operations_next_run ON scheduled_operations (next_run_at);

-- ==========================================================================
-- 3. TRIGGERS
-- ==========================================================================

CREATE TRIGGER trg_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_help_articles_updated_at
    BEFORE UPDATE ON help_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- 4. FUNCTIONS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- create_bulk_operation — initializes a bulk operation record
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_bulk_operation(
    p_operation_type text,
    p_operation_name text,
    p_description text,
    p_target_count integer,
    p_parameters jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_operation_id uuid;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can create bulk operations';
    END IF;

    INSERT INTO bulk_operations (
        operation_type, operation_name, description,
        initiated_by, target_count, parameters
    )
    VALUES (
        p_operation_type, p_operation_name, p_description,
        (SELECT auth.uid()), p_target_count, p_parameters
    )
    RETURNING id INTO v_operation_id;

    RETURN v_operation_id;
END;
$$;

-- --------------------------------------------------------------------------
-- execute_bulk_user_action — applies an action to users in a bulk operation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execute_bulk_user_action(
    p_operation_id uuid,
    p_action_type text,
    p_user_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can execute bulk user actions';
    END IF;

    -- Mark operation as in progress
    UPDATE bulk_operations
    SET status = 'in_progress', started_at = now()
    WHERE id = p_operation_id;

    -- Create operation items for each user
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO bulk_operation_items (
            operation_id, target_type, target_id, status
        )
        VALUES (p_operation_id, 'user', v_user_id, 'pending');
    END LOOP;

    -- Update target count
    UPDATE bulk_operations
    SET target_count = array_length(p_user_ids, 1)
    WHERE id = p_operation_id;
END;
$$;

-- --------------------------------------------------------------------------
-- execute_bulk_ride_action — applies an action to rides in a bulk operation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION execute_bulk_ride_action(
    p_operation_id uuid,
    p_action_type text,
    p_ride_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ride_id uuid;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can execute bulk ride actions';
    END IF;

    -- Mark operation as in progress
    UPDATE bulk_operations
    SET status = 'in_progress', started_at = now()
    WHERE id = p_operation_id;

    -- Create operation items for each ride
    FOREACH v_ride_id IN ARRAY p_ride_ids
    LOOP
        INSERT INTO bulk_operation_items (
            operation_id, target_type, target_id, status
        )
        VALUES (p_operation_id, 'ride', v_ride_id, 'pending');
    END LOOP;

    -- Update target count
    UPDATE bulk_operations
    SET target_count = array_length(p_ride_ids, 1)
    WHERE id = p_operation_id;
END;
$$;

-- --------------------------------------------------------------------------
-- get_operation_status — returns current state of a bulk operation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_operation_status(p_operation_id uuid)
RETURNS TABLE (
    operation_id        uuid,
    operation_type      text,
    operation_name      text,
    status              text,
    target_count        integer,
    processed_count     integer,
    success_count       integer,
    failed_count        integer,
    skipped_count       integer,
    started_at          timestamptz,
    completed_at        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can view operation status';
    END IF;

    RETURN QUERY
    SELECT
        bo.id               AS operation_id,
        bo.operation_type,
        bo.operation_name,
        bo.status,
        bo.target_count,
        bo.processed_count,
        bo.success_count,
        bo.failed_count,
        bo.skipped_count,
        bo.started_at,
        bo.completed_at
    FROM bulk_operations bo
    WHERE bo.id = p_operation_id;
END;
$$;

-- ==========================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE admin_action_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_announcements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_flags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_actions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warnings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_words            ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_warnings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_flags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_flags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_flags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_operations    ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 6. RLS POLICIES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Admin-only tables (all operations require is_admin())
-- --------------------------------------------------------------------------

-- admin_action_logs
CREATE POLICY admin_action_logs_admin
    ON admin_action_logs FOR ALL TO authenticated
    USING (is_admin());

-- admin_audit_log
CREATE POLICY admin_audit_log_admin
    ON admin_audit_log FOR ALL TO authenticated
    USING (is_admin());

-- admin_announcements
CREATE POLICY admin_announcements_admin
    ON admin_announcements FOR ALL TO authenticated
    USING (is_admin());

-- admin_permissions
CREATE POLICY admin_permissions_admin
    ON admin_permissions FOR ALL TO authenticated
    USING (is_admin());

-- admin_user_flags
CREATE POLICY admin_user_flags_admin
    ON admin_user_flags FOR ALL TO authenticated
    USING (is_admin());

-- admin_user_notes
CREATE POLICY admin_user_notes_admin
    ON admin_user_notes FOR ALL TO authenticated
    USING (is_admin());

-- user_account_actions
CREATE POLICY user_account_actions_admin
    ON user_account_actions FOR ALL TO authenticated
    USING (is_admin());

-- user_warnings — admin manages, user sees own
CREATE POLICY user_warnings_admin
    ON user_warnings FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY user_warnings_select_own
    ON user_warnings FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- bug_reports — all authenticated can INSERT, admin can SELECT/DELETE
-- --------------------------------------------------------------------------
CREATE POLICY bug_reports_insert_authenticated
    ON bug_reports FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY bug_reports_select_admin
    ON bug_reports FOR SELECT TO authenticated
    USING (is_admin());

CREATE POLICY bug_reports_select_own
    ON bug_reports FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY bug_reports_delete_admin
    ON bug_reports FOR DELETE TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- banned_words — admin only
-- --------------------------------------------------------------------------
CREATE POLICY banned_words_admin
    ON banned_words FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- content_warnings — admin only
-- --------------------------------------------------------------------------
CREATE POLICY content_warnings_admin
    ON content_warnings FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- comment_flags / post_flags / ride_flags — authenticated INSERT, admin manage
-- --------------------------------------------------------------------------
CREATE POLICY comment_flags_insert_authenticated
    ON comment_flags FOR INSERT TO authenticated
    WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY comment_flags_admin
    ON comment_flags FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY post_flags_insert_authenticated
    ON post_flags FOR INSERT TO authenticated
    WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY post_flags_admin
    ON post_flags FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY ride_flags_insert_authenticated
    ON ride_flags FOR INSERT TO authenticated
    WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY ride_flags_admin
    ON ride_flags FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- feature_flags — all authenticated SELECT, admin write
-- --------------------------------------------------------------------------
CREATE POLICY feature_flags_select_authenticated
    ON feature_flags FOR SELECT TO authenticated
    USING (true);

CREATE POLICY feature_flags_admin
    ON feature_flags FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- platform_settings — admin only
-- --------------------------------------------------------------------------
CREATE POLICY platform_settings_admin
    ON platform_settings FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- help_articles — public read for published, admin full
-- --------------------------------------------------------------------------
CREATE POLICY help_articles_select_published
    ON help_articles FOR SELECT TO authenticated
    USING (is_published = true);

CREATE POLICY help_articles_admin
    ON help_articles FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- bulk_operations — admin only
-- --------------------------------------------------------------------------
CREATE POLICY bulk_operations_admin
    ON bulk_operations FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- bulk_operation_items — admin only
-- --------------------------------------------------------------------------
CREATE POLICY bulk_operation_items_admin
    ON bulk_operation_items FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- scheduled_operations — admin only
-- --------------------------------------------------------------------------
CREATE POLICY scheduled_operations_admin
    ON scheduled_operations FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- End of 010_admin_and_moderation.sql
-- --------------------------------------------------------------------------
