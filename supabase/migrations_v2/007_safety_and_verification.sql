-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 007: Safety, Verification, and Privacy Controls
-- ============================================================================
-- Safety reports, incidents, suspensions, warnings, evidence, 2FA,
-- verification documents, and privacy controls.
--
-- Depends on:
--   001_extensions_and_utils.sql  (safety_severity, safety_report_status ENUMs,
--                                  update_updated_at_column(), is_admin())
--   002_core_profiles_and_auth.sql (profiles table)
-- ============================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. safety_reports
-- --------------------------------------------------------------------------
CREATE TABLE safety_reports (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
    ride_id             uuid,  -- FK to rides (created in 004)
    incident_type       text,
    description         text,
    severity            safety_severity NOT NULL DEFAULT 'low',
    status              safety_report_status NOT NULL DEFAULT 'pending',
    reporter_anonymous  boolean DEFAULT false,
    category            text,
    title               text,
    incident_location   text,
    incident_date       timestamptz,
    assigned_to         uuid REFERENCES profiles(id) ON DELETE SET NULL,
    priority            integer,
    resolution_notes    text,
    resolved_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at         timestamptz,
    booking_id          uuid,  -- FK to ride_bookings (created in 004)
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1b. safety_incidents
-- --------------------------------------------------------------------------
CREATE TABLE safety_incidents (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number             text UNIQUE NOT NULL,
    title                       text NOT NULL,
    description                 text,
    severity                    safety_severity NOT NULL DEFAULT 'low',
    category                    text,
    status                      text NOT NULL DEFAULT 'open'
                                    CHECK (status IN ('open', 'investigating', 'action_taken', 'resolved', 'closed', 'reopened')),
    reported_user_id            uuid REFERENCES profiles(id) ON DELETE SET NULL,
    affected_user_ids           uuid[],
    investigator_id             uuid REFERENCES profiles(id) ON DELETE SET NULL,
    investigation_notes         text,
    investigation_started_at    timestamptz,
    investigation_completed_at  timestamptz,
    resolution_summary          text,
    action_taken                text,
    resolved_by                 uuid REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at                 timestamptz,
    related_report_ids          uuid[],
    related_ride_ids            uuid[],
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1c. user_suspensions
-- --------------------------------------------------------------------------
CREATE TABLE user_suspensions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    suspension_type     text NOT NULL
                            CHECK (suspension_type IN ('temporary', 'permanent', 'pending_review')),
    reason              text,
    admin_notes         text,
    start_date          timestamptz DEFAULT now(),
    end_date            timestamptz,
    is_active           boolean DEFAULT true,
    incident_id         uuid REFERENCES safety_incidents(id) ON DELETE SET NULL,
    restrictions        jsonb,
    suspended_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
    lifted_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
    lifted_at           timestamptz,
    lift_reason         text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1d. safety_warnings
-- --------------------------------------------------------------------------
CREATE TABLE safety_warnings (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    warning_level       integer NOT NULL CHECK (warning_level >= 1 AND warning_level <= 3),
    warning_type        text,
    message             text,
    report_id           uuid REFERENCES safety_reports(id) ON DELETE SET NULL,
    incident_id         uuid REFERENCES safety_incidents(id) ON DELETE SET NULL,
    acknowledged        boolean DEFAULT false,
    acknowledged_at     timestamptz,
    issued_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
    escalated           boolean DEFAULT false,
    created_at          timestamptz DEFAULT now(),
    expires_at          timestamptz
);

-- --------------------------------------------------------------------------
-- 1e. incident_evidence
-- --------------------------------------------------------------------------
CREATE TABLE incident_evidence (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id         uuid REFERENCES safety_incidents(id) ON DELETE CASCADE,
    report_id           uuid REFERENCES safety_reports(id) ON DELETE CASCADE,
    evidence_type       text NOT NULL
                            CHECK (evidence_type IN ('screenshot', 'photo', 'video', 'audio', 'document', 'log', 'text', 'other')),
    description         text,
    file_path           text,
    file_size           bigint,
    mime_type           text,
    uploaded_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1f. safety_actions_log
-- --------------------------------------------------------------------------
CREATE TABLE safety_actions_log (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type         text NOT NULL
                            CHECK (action_type IN ('report_created', 'report_assigned', 'report_resolved', 'report_dismissed',
                                                   'incident_created', 'incident_updated', 'incident_resolved',
                                                   'warning_issued', 'suspension_created', 'suspension_lifted',
                                                   'evidence_added', 'note_added', 'escalated', 'other')),
    action_description  text,
    report_id           uuid REFERENCES safety_reports(id) ON DELETE SET NULL,
    incident_id         uuid REFERENCES safety_incidents(id) ON DELETE SET NULL,
    user_id             uuid REFERENCES profiles(id) ON DELETE SET NULL,
    suspension_id       uuid REFERENCES user_suspensions(id) ON DELETE SET NULL,
    performed_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
    performed_by_name   text,
    details             jsonb,
    created_at          timestamptz DEFAULT now(),
    ip_address          inet,
    user_agent          text
);

-- --------------------------------------------------------------------------
-- 1g. two_factor_auth
-- --------------------------------------------------------------------------
CREATE TABLE two_factor_auth (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    secret                  text NOT NULL,
    enabled                 boolean DEFAULT false,
    method                  text DEFAULT 'totp',
    backup_codes_generated  boolean DEFAULT false,
    failed_attempts         integer DEFAULT 0,
    locked_until            timestamptz,
    last_used_at            timestamptz,
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1h. two_factor_recovery_codes
-- --------------------------------------------------------------------------
CREATE TABLE two_factor_recovery_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    two_factor_id   uuid NOT NULL REFERENCES two_factor_auth(id) ON DELETE CASCADE,
    code_hash       text NOT NULL,
    used            boolean DEFAULT false,
    used_at         timestamptz,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1i. two_factor_audit_log
-- --------------------------------------------------------------------------
CREATE TABLE two_factor_audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action          text NOT NULL,
    success         boolean NOT NULL,
    ip_address      text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1j. verification_documents
-- --------------------------------------------------------------------------
CREATE TABLE verification_documents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_type   text NOT NULL,
    file_path       text NOT NULL,
    status          text DEFAULT 'pending',
    verified_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at     timestamptz,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1k. privacy_controls
-- --------------------------------------------------------------------------
CREATE TABLE privacy_controls (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    show_email              boolean DEFAULT false,
    show_phone              boolean DEFAULT false,
    show_location           boolean DEFAULT true,
    allow_friend_requests   boolean DEFAULT true,
    allow_messages_from     text DEFAULT 'everyone',
    profile_visibility      text DEFAULT 'public',
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- ==========================================================================
-- 2. INDEXES
-- ==========================================================================

-- safety_reports
CREATE INDEX idx_safety_reports_reporter       ON safety_reports (reporter_id);
CREATE INDEX idx_safety_reports_reported_user   ON safety_reports (reported_user_id);
CREATE INDEX idx_safety_reports_ride            ON safety_reports (ride_id);
CREATE INDEX idx_safety_reports_status          ON safety_reports (status);
CREATE INDEX idx_safety_reports_severity        ON safety_reports (severity);
CREATE INDEX idx_safety_reports_assigned_to     ON safety_reports (assigned_to);
CREATE INDEX idx_safety_reports_created_at      ON safety_reports (created_at DESC);

-- safety_incidents
CREATE INDEX idx_safety_incidents_status        ON safety_incidents (status);
CREATE INDEX idx_safety_incidents_severity      ON safety_incidents (severity);
CREATE INDEX idx_safety_incidents_reported_user ON safety_incidents (reported_user_id);
CREATE INDEX idx_safety_incidents_investigator  ON safety_incidents (investigator_id);
CREATE INDEX idx_safety_incidents_created_at    ON safety_incidents (created_at DESC);

-- user_suspensions
CREATE INDEX idx_user_suspensions_user          ON user_suspensions (user_id);
CREATE INDEX idx_user_suspensions_active        ON user_suspensions (is_active) WHERE is_active = true;
CREATE INDEX idx_user_suspensions_incident      ON user_suspensions (incident_id);

-- safety_warnings
CREATE INDEX idx_safety_warnings_user           ON safety_warnings (user_id);
CREATE INDEX idx_safety_warnings_report         ON safety_warnings (report_id);
CREATE INDEX idx_safety_warnings_incident       ON safety_warnings (incident_id);
CREATE INDEX idx_safety_warnings_acknowledged   ON safety_warnings (acknowledged) WHERE acknowledged = false;

-- incident_evidence
CREATE INDEX idx_incident_evidence_incident     ON incident_evidence (incident_id);
CREATE INDEX idx_incident_evidence_report       ON incident_evidence (report_id);

-- safety_actions_log
CREATE INDEX idx_safety_actions_log_report      ON safety_actions_log (report_id);
CREATE INDEX idx_safety_actions_log_incident    ON safety_actions_log (incident_id);
CREATE INDEX idx_safety_actions_log_user        ON safety_actions_log (user_id);
CREATE INDEX idx_safety_actions_log_performed   ON safety_actions_log (performed_by);
CREATE INDEX idx_safety_actions_log_created     ON safety_actions_log (created_at DESC);

-- two_factor_auth
CREATE INDEX idx_two_factor_auth_user           ON two_factor_auth (user_id);

-- two_factor_recovery_codes
CREATE INDEX idx_two_factor_recovery_codes_2fa  ON two_factor_recovery_codes (two_factor_id);

-- two_factor_audit_log
CREATE INDEX idx_two_factor_audit_log_user      ON two_factor_audit_log (user_id);
CREATE INDEX idx_two_factor_audit_log_created   ON two_factor_audit_log (created_at DESC);

-- verification_documents
CREATE INDEX idx_verification_documents_user    ON verification_documents (user_id);
CREATE INDEX idx_verification_documents_status  ON verification_documents (status);

-- privacy_controls
CREATE INDEX idx_privacy_controls_user          ON privacy_controls (user_id);

-- ==========================================================================
-- 3. TRIGGERS
-- ==========================================================================

CREATE TRIGGER trg_safety_reports_updated_at
    BEFORE UPDATE ON safety_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_safety_incidents_updated_at
    BEFORE UPDATE ON safety_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_suspensions_updated_at
    BEFORE UPDATE ON user_suspensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_two_factor_auth_updated_at
    BEFORE UPDATE ON two_factor_auth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_privacy_controls_updated_at
    BEFORE UPDATE ON privacy_controls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- 4. FUNCTIONS
-- ==========================================================================

-- Check if a user has 2FA enabled
CREATE OR REPLACE FUNCTION user_has_2fa_enabled(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM two_factor_auth
        WHERE user_id = p_user_id AND enabled = true
    );
END;
$$;

-- Increment 2FA failed attempts
CREATE OR REPLACE FUNCTION increment_2fa_failed_attempts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE two_factor_auth
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE
            WHEN failed_attempts + 1 >= 5
            THEN now() + INTERVAL '15 minutes'
            ELSE locked_until
        END,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Reset 2FA failed attempts
CREATE OR REPLACE FUNCTION reset_2fa_failed_attempts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE two_factor_auth
    SET failed_attempts = 0,
        locked_until = NULL,
        last_used_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Check if 2FA is locked
CREATE OR REPLACE FUNCTION is_2fa_locked(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_locked_until timestamptz;
BEGIN
    SELECT locked_until INTO v_locked_until
    FROM two_factor_auth
    WHERE user_id = p_user_id;

    IF v_locked_until IS NULL THEN
        RETURN false;
    END IF;

    RETURN v_locked_until > now();
END;
$$;

-- ==========================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE safety_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_warnings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_actions_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth             ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_recovery_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_controls            ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 6. RLS POLICIES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- safety_reports — users can create, admins manage
-- --------------------------------------------------------------------------
CREATE POLICY safety_reports_insert_authenticated
    ON safety_reports FOR INSERT TO authenticated
    WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY safety_reports_select_own
    ON safety_reports FOR SELECT TO authenticated
    USING (reporter_id = (SELECT auth.uid()));

CREATE POLICY safety_reports_admin
    ON safety_reports FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY safety_reports_service_role
    ON safety_reports FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- safety_incidents — admin only
-- --------------------------------------------------------------------------
CREATE POLICY safety_incidents_admin
    ON safety_incidents FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY safety_incidents_service_role
    ON safety_incidents FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- user_suspensions — admin only
-- --------------------------------------------------------------------------
CREATE POLICY user_suspensions_admin
    ON user_suspensions FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY user_suspensions_service_role
    ON user_suspensions FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- safety_warnings — users see own, admin manages
-- --------------------------------------------------------------------------
CREATE POLICY safety_warnings_select_own
    ON safety_warnings FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY safety_warnings_update_own_ack
    ON safety_warnings FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY safety_warnings_admin
    ON safety_warnings FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY safety_warnings_service_role
    ON safety_warnings FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- incident_evidence — admin only
-- --------------------------------------------------------------------------
CREATE POLICY incident_evidence_admin
    ON incident_evidence FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY incident_evidence_service_role
    ON incident_evidence FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- safety_actions_log — admin only
-- --------------------------------------------------------------------------
CREATE POLICY safety_actions_log_admin
    ON safety_actions_log FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY safety_actions_log_service_role
    ON safety_actions_log FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- two_factor_auth — own only
-- --------------------------------------------------------------------------
CREATE POLICY two_factor_auth_select_own
    ON two_factor_auth FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY two_factor_auth_insert_own
    ON two_factor_auth FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY two_factor_auth_update_own
    ON two_factor_auth FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY two_factor_auth_delete_own
    ON two_factor_auth FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY two_factor_auth_service_role
    ON two_factor_auth FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- two_factor_recovery_codes — own only (via join)
-- --------------------------------------------------------------------------
CREATE POLICY two_factor_recovery_codes_select_own
    ON two_factor_recovery_codes FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM two_factor_auth tfa
            WHERE tfa.id = two_factor_recovery_codes.two_factor_id
              AND tfa.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY two_factor_recovery_codes_insert_own
    ON two_factor_recovery_codes FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM two_factor_auth tfa
            WHERE tfa.id = two_factor_recovery_codes.two_factor_id
              AND tfa.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY two_factor_recovery_codes_update_own
    ON two_factor_recovery_codes FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM two_factor_auth tfa
            WHERE tfa.id = two_factor_recovery_codes.two_factor_id
              AND tfa.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY two_factor_recovery_codes_service_role
    ON two_factor_recovery_codes FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- two_factor_audit_log — own only
-- --------------------------------------------------------------------------
CREATE POLICY two_factor_audit_log_select_own
    ON two_factor_audit_log FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY two_factor_audit_log_insert_own
    ON two_factor_audit_log FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY two_factor_audit_log_service_role
    ON two_factor_audit_log FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- verification_documents — own only + admin
-- --------------------------------------------------------------------------
CREATE POLICY verification_documents_select_own
    ON verification_documents FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY verification_documents_insert_own
    ON verification_documents FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY verification_documents_admin
    ON verification_documents FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY verification_documents_service_role
    ON verification_documents FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- privacy_controls — own only
-- --------------------------------------------------------------------------
CREATE POLICY privacy_controls_select_own
    ON privacy_controls FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY privacy_controls_insert_own
    ON privacy_controls FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY privacy_controls_update_own
    ON privacy_controls FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY privacy_controls_delete_own
    ON privacy_controls FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- End of 007_safety_and_verification.sql
-- --------------------------------------------------------------------------
