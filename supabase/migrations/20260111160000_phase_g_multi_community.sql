-- Phase G: Multi-Community Architecture Schema
-- Amazon-style isolated communities with hard boundaries
-- All community operations are audited and role-based

-- ============================================================
-- G1: Communities (First-Class Entity)
-- ============================================================

CREATE TABLE IF NOT EXISTS communities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name text NOT NULL,
    slug text NOT NULL UNIQUE,              -- URL-safe identifier
    description text,
    logo_url text,
    
    -- Type and classification
    community_type text NOT NULL DEFAULT 'organization',
    
    -- Status
    status text NOT NULL DEFAULT 'active',
    
    -- Settings
    settings jsonb DEFAULT '{
        "allow_public_discovery": false,
        "require_email_domain": null,
        "default_cross_community_policy": "none",
        "reliability_score_isolation": false
    }'::jsonb,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES profiles(id),
    
    -- Constraints
    CONSTRAINT valid_community_type CHECK (
        community_type IN ('employer', 'campus', 'warehouse', 'organization', 'neighborhood')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('active', 'suspended', 'archived')
    ),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities (slug);
CREATE INDEX IF NOT EXISTS idx_communities_status ON communities (status);

-- ============================================================
-- G2: Community Memberships
-- ============================================================

CREATE TABLE IF NOT EXISTS community_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Role within community
    role text NOT NULL DEFAULT 'member',
    
    -- Status
    status text NOT NULL DEFAULT 'active',
    
    -- Approval tracking
    invited_by uuid REFERENCES profiles(id),
    approved_by uuid REFERENCES profiles(id),
    approved_at timestamptz,
    
    -- Timestamps
    joined_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_role CHECK (
        role IN ('member', 'moderator', 'community_admin')
    ),
    CONSTRAINT valid_membership_status CHECK (
        status IN ('pending', 'active', 'suspended', 'removed')
    ),
    CONSTRAINT unique_user_community UNIQUE (user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON community_memberships (user_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_community ON community_memberships (community_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON community_memberships (community_id, role);

-- ============================================================
-- G3: Cross-Community Partnerships
-- ============================================================

CREATE TABLE IF NOT EXISTS community_partnerships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Partners
    community_a_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    community_b_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Policies (each direction can be different)
    a_to_b_policy text NOT NULL DEFAULT 'none',
    b_to_a_policy text NOT NULL DEFAULT 'none',
    
    -- Approval
    a_approved_by uuid REFERENCES profiles(id),
    a_approved_at timestamptz,
    b_approved_by uuid REFERENCES profiles(id),
    b_approved_at timestamptz,
    
    -- Status
    status text NOT NULL DEFAULT 'pending',
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_a_policy CHECK (
        a_to_b_policy IN ('none', 'visibility_only', 'approval_required', 'mutual_access')
    ),
    CONSTRAINT valid_b_policy CHECK (
        b_to_a_policy IN ('none', 'visibility_only', 'approval_required', 'mutual_access')
    ),
    CONSTRAINT valid_partnership_status CHECK (
        status IN ('pending', 'active', 'suspended', 'terminated')
    ),
    CONSTRAINT different_communities CHECK (community_a_id != community_b_id),
    CONSTRAINT unique_partnership UNIQUE (community_a_id, community_b_id)
);

-- ============================================================
-- G4: Community Audit Log
-- ============================================================

CREATE TABLE IF NOT EXISTS community_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
    actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role text,
    
    -- Action
    action text NOT NULL,
    target_type text,                       -- 'ride', 'booking', 'membership', 'community'
    target_id uuid,
    
    -- Details
    reason text,
    details jsonb DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at timestamptz DEFAULT now(),
    
    -- Index-friendly action categorization
    action_category text GENERATED ALWAYS AS (
        CASE 
            WHEN action LIKE 'membership_%' THEN 'membership'
            WHEN action LIKE 'ride_%' THEN 'content'
            WHEN action LIKE 'booking_%' THEN 'content'
            WHEN action LIKE 'partnership_%' THEN 'partnership'
            ELSE 'other'
        END
    ) STORED
);

CREATE INDEX IF NOT EXISTS idx_community_audit_community ON community_audit_log (community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_audit_actor ON community_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_audit_action ON community_audit_log (action_category, created_at DESC);

-- ============================================================
-- G5: Community Job Log (per-community job tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS community_job_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
    job_name text NOT NULL,
    status text NOT NULL,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    details jsonb DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_job_status CHECK (status IN ('running', 'success', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_community_job_log ON community_job_log (community_id, job_name, started_at DESC);

-- ============================================================
-- G6: Add community_id to Core Tables
-- ============================================================

-- Add community_id to rides (required for new rides)
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id);

-- Add index for community-scoped ride queries
CREATE INDEX IF NOT EXISTS idx_rides_community 
ON rides (community_id, status, departure_time);

-- For vehicles - they belong to users, not communities (user can use same car in multiple communities)
-- No change needed

-- For bookings - they inherit community from ride (no direct column needed)
-- Query via JOIN to rides

-- ============================================================
-- G7: RLS Policies for Multi-Community
-- ============================================================

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_job_log ENABLE ROW LEVEL SECURITY;

-- Communities: discoverable if public, viewable by members
CREATE POLICY "Public communities are discoverable"
ON communities FOR SELECT
TO authenticated
USING (
    (settings->>'allow_public_discovery')::boolean = true
    OR EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = communities.id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role = 'super_admin'
    )
);

-- Memberships: users see their own, admins see community
CREATE POLICY "Users see own memberships"
ON community_memberships FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = community_memberships.community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('moderator', 'community_admin')
          AND cm.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role = 'super_admin'
    )
);

-- Memberships: community admins can manage
CREATE POLICY "Community admins manage memberships"
ON community_memberships FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = community_memberships.community_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'community_admin'
          AND cm.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role = 'super_admin'
    )
);

-- Partnerships: viewable by both community admins
CREATE POLICY "Community admins view partnerships"
ON community_partnerships FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE (cm.community_id = community_partnerships.community_a_id 
               OR cm.community_id = community_partnerships.community_b_id)
          AND cm.user_id = auth.uid()
          AND cm.role = 'community_admin'
          AND cm.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role = 'super_admin'
    )
);

-- Audit log: viewable by community admins
CREATE POLICY "Community admins view audit log"
ON community_audit_log FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = community_audit_log.community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('moderator', 'community_admin')
          AND cm.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role = 'super_admin'
    )
);

-- Job log: viewable by community admins
CREATE POLICY "Community admins view job log"
ON community_job_log FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = community_job_log.community_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'community_admin'
          AND cm.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role = 'super_admin'
    )
);

-- ============================================================
-- G8: Update Rides RLS for Community Scoping
-- ============================================================

-- Drop existing ride policies if they exist and recreate with community scope
DROP POLICY IF EXISTS "Users can view active rides" ON rides;
DROP POLICY IF EXISTS "Community members can view community rides" ON rides;

-- New policy: rides visible only to community members (or via partnership)
CREATE POLICY "Community members can view community rides"
ON rides FOR SELECT
TO authenticated
USING (
    -- Legacy rides without community (for migration)
    community_id IS NULL
    OR
    -- Direct community membership
    EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = rides.community_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
    )
    OR
    -- Cross-community visibility via partnership
    EXISTS (
        SELECT 1 FROM community_partnerships cp
        JOIN community_memberships cm ON (
            cm.community_id = cp.community_a_id OR cm.community_id = cp.community_b_id
        )
        WHERE cm.user_id = auth.uid()
          AND cm.status = 'active'
          AND cp.status = 'active'
          AND (
              (cp.community_a_id = rides.community_id AND cp.b_to_a_policy != 'none')
              OR (cp.community_b_id = rides.community_id AND cp.a_to_b_policy != 'none')
          )
    )
    OR
    -- Platform admin sees all
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND admin_role = 'super_admin'
    )
);

-- Users can only create rides in communities they belong to
DROP POLICY IF EXISTS "Authenticated users can create rides" ON rides;

CREATE POLICY "Members can create rides in their communities"
ON rides FOR INSERT
TO authenticated
WITH CHECK (
    -- Must specify community
    community_id IS NOT NULL
    AND
    -- Must be member of that community
    EXISTS (
        SELECT 1 FROM community_memberships cm
        WHERE cm.community_id = rides.community_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
    )
    AND
    -- Must be driver
    driver_id = auth.uid()
);

-- ============================================================
-- G9: Core Functions for Multi-Community
-- ============================================================

-- Check if user is member of community
CREATE OR REPLACE FUNCTION is_community_member(
    p_user_id uuid,
    p_community_id uuid
) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM community_memberships
        WHERE user_id = p_user_id
          AND community_id = p_community_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has role in community
CREATE OR REPLACE FUNCTION has_community_role(
    p_user_id uuid,
    p_community_id uuid,
    p_min_role text
) RETURNS boolean AS $$
DECLARE
    v_user_role text;
    v_role_order int;
    v_min_order int;
BEGIN
    -- Get user's role
    SELECT role INTO v_user_role
    FROM community_memberships
    WHERE user_id = p_user_id
      AND community_id = p_community_id
      AND status = 'active';
    
    IF v_user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Role hierarchy: member < moderator < community_admin
    v_role_order := CASE v_user_role
        WHEN 'member' THEN 1
        WHEN 'moderator' THEN 2
        WHEN 'community_admin' THEN 3
        ELSE 0
    END;
    
    v_min_order := CASE p_min_role
        WHEN 'member' THEN 1
        WHEN 'moderator' THEN 2
        WHEN 'community_admin' THEN 3
        ELSE 0
    END;
    
    RETURN v_role_order >= v_min_order;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get user's communities
CREATE OR REPLACE FUNCTION get_user_communities(p_user_id uuid)
RETURNS TABLE (
    community_id uuid,
    community_name text,
    community_slug text,
    user_role text,
    member_count int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        cm.role,
        (SELECT COUNT(*)::int FROM community_memberships 
         WHERE community_id = c.id AND status = 'active')
    FROM communities c
    JOIN community_memberships cm ON cm.community_id = c.id
    WHERE cm.user_id = p_user_id
      AND cm.status = 'active'
      AND c.status = 'active'
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Join community
CREATE OR REPLACE FUNCTION join_community(
    p_community_id uuid,
    p_invite_code text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_community RECORD;
    v_existing RECORD;
BEGIN
    -- Get community
    SELECT * INTO v_community
    FROM communities
    WHERE id = p_community_id AND status = 'active';
    
    IF v_community IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Community not found');
    END IF;
    
    -- Check existing membership
    SELECT * INTO v_existing
    FROM community_memberships
    WHERE user_id = auth.uid() AND community_id = p_community_id;
    
    IF v_existing IS NOT NULL THEN
        IF v_existing.status = 'active' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Already a member');
        ELSIF v_existing.status = 'suspended' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Membership suspended');
        ELSIF v_existing.status = 'removed' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Previously removed from community');
        END IF;
    END IF;
    
    -- Create membership (pending if approval required)
    INSERT INTO community_memberships (user_id, community_id, status)
    VALUES (
        auth.uid(),
        p_community_id,
        CASE 
            WHEN (v_community.settings->>'allow_public_discovery')::boolean THEN 'active'
            ELSE 'pending'
        END
    );
    
    -- Audit log
    INSERT INTO community_audit_log (community_id, actor_id, action, target_type, target_id)
    VALUES (p_community_id, auth.uid(), 'membership_requested', 'user', auth.uid());
    
    RETURN jsonb_build_object(
        'success', true,
        'status', CASE 
            WHEN (v_community.settings->>'allow_public_discovery')::boolean THEN 'active'
            ELSE 'pending'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve membership (for community admins)
CREATE OR REPLACE FUNCTION approve_membership(
    p_membership_id uuid
) RETURNS jsonb AS $$
DECLARE
    v_membership RECORD;
BEGIN
    -- Get membership
    SELECT * INTO v_membership
    FROM community_memberships
    WHERE id = p_membership_id;
    
    IF v_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Membership not found');
    END IF;
    
    -- Check caller is community admin
    IF NOT has_community_role(auth.uid(), v_membership.community_id, 'community_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
    END IF;
    
    -- Update membership
    UPDATE community_memberships
    SET status = 'active',
        approved_by = auth.uid(),
        approved_at = now(),
        updated_at = now()
    WHERE id = p_membership_id;
    
    -- Audit log
    INSERT INTO community_audit_log (
        community_id, actor_id, actor_role, action, target_type, target_id
    )
    VALUES (
        v_membership.community_id, 
        auth.uid(), 
        'community_admin',
        'membership_approved', 
        'user', 
        v_membership.user_id
    );
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get community health summary
CREATE OR REPLACE FUNCTION get_community_health(p_community_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Verify caller has access
    IF NOT has_community_role(auth.uid(), p_community_id, 'moderator') THEN
        RETURN jsonb_build_object('error', 'Not authorized');
    END IF;
    
    SELECT jsonb_build_object(
        'community_id', p_community_id,
        'active_members', (
            SELECT COUNT(*) FROM community_memberships
            WHERE community_id = p_community_id AND status = 'active'
        ),
        'pending_members', (
            SELECT COUNT(*) FROM community_memberships
            WHERE community_id = p_community_id AND status = 'pending'
        ),
        'active_rides', (
            SELECT COUNT(*) FROM rides
            WHERE community_id = p_community_id AND status = 'active'
        ),
        'rides_today', (
            SELECT COUNT(*) FROM rides
            WHERE community_id = p_community_id 
              AND departure_time::date = CURRENT_DATE
        ),
        'bookings_this_week', (
            SELECT COUNT(*) FROM ride_bookings rb
            JOIN rides r ON r.id = rb.ride_id
            WHERE r.community_id = p_community_id
              AND rb.created_at > now() - interval '7 days'
        ),
        'recent_cancellations', (
            SELECT COUNT(*) FROM ride_bookings rb
            JOIN rides r ON r.id = rb.ride_id
            WHERE r.community_id = p_community_id
              AND rb.status = 'cancelled'
              AND rb.cancelled_at > now() - interval '7 days'
        ),
        'active_partnerships', (
            SELECT COUNT(*) FROM community_partnerships
            WHERE (community_a_id = p_community_id OR community_b_id = p_community_id)
              AND status = 'active'
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Per-community expire_rides
CREATE OR REPLACE FUNCTION expire_rides_for_community(p_community_id uuid)
RETURNS int AS $$
DECLARE
    v_expired int := 0;
BEGIN
    -- Expire rides for this community only
    WITH expired AS (
        UPDATE rides
        SET status = 'completed',
            updated_at = now()
        WHERE community_id = p_community_id
          AND status = 'active'
          AND departure_time < now() - interval '2 hours'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_expired FROM expired;
    
    -- Also transition bookings
    UPDATE ride_bookings
    SET status = 'completed',
        updated_at = now()
    WHERE ride_id IN (
        SELECT id FROM rides
        WHERE community_id = p_community_id
          AND status = 'completed'
    )
    AND status IN ('pending', 'confirmed');
    
    -- Log
    INSERT INTO community_job_log (community_id, job_name, status, completed_at, details)
    VALUES (p_community_id, 'expire_rides', 'success', now(), 
        jsonb_build_object('expired_count', v_expired));
    
    RETURN v_expired;
END;
$$ LANGUAGE plpgsql;

-- Run expire_rides for all communities
CREATE OR REPLACE FUNCTION expire_rides_all_communities()
RETURNS TABLE (community_id uuid, expired_count int) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        expire_rides_for_community(c.id)
    FROM communities c
    WHERE c.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- G10: Feature Flags for Multi-Community
-- ============================================================

INSERT INTO feature_flags (flag_name, is_enabled, metadata)
VALUES 
    ('multi_community', true, '{
        "default_policy": "none",
        "allow_cross_community_booking": false,
        "require_community_for_rides": true
    }'::jsonb),
    ('cross_community_visibility', false, '{
        "enabled_partnerships": [],
        "require_approval": true
    }'::jsonb)
ON CONFLICT (flag_name) DO UPDATE
SET metadata = EXCLUDED.metadata,
    updated_at = now();

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON TABLE communities IS 'First-class organizational units that own rides and memberships';
COMMENT ON TABLE community_memberships IS 'User-community relationships with per-community roles';
COMMENT ON TABLE community_partnerships IS 'Explicit cross-community access policies';
COMMENT ON TABLE community_audit_log IS 'Immutable log of all community admin/mod actions';
COMMENT ON FUNCTION is_community_member IS 'Check if user is active member of community';
COMMENT ON FUNCTION has_community_role IS 'Check if user has minimum role in community';
COMMENT ON FUNCTION expire_rides_for_community IS 'Community-scoped ride expiration job';
