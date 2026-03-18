-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 006: Social Features and Community System
-- ============================================================================
-- Friends, blocks, mutes, social groups, communities, posts, comments,
-- votes, audit logs, presence, reactions, stories, and waves.
--
-- Depends on:
--   001_extensions_and_utils.sql  (friend_request_status ENUM,
--                                  update_updated_at_column(), is_admin())
--   002_core_profiles_and_auth.sql (profiles table)
-- ============================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. friend_requests
-- --------------------------------------------------------------------------
CREATE TABLE friend_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status          friend_request_status NOT NULL DEFAULT 'PENDING',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE (from_user_id, to_user_id),
    CHECK (from_user_id <> to_user_id)
);

-- --------------------------------------------------------------------------
-- 1b. friendships (ordered pairs — user_a < user_b)
-- --------------------------------------------------------------------------
CREATE TABLE friendships (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_b          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now(),
    UNIQUE (user_a, user_b),
    CHECK (user_a < user_b)
);

-- --------------------------------------------------------------------------
-- 1c. blocks
-- --------------------------------------------------------------------------
CREATE TABLE blocks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now(),
    UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- --------------------------------------------------------------------------
-- 1d. user_mutes
-- --------------------------------------------------------------------------
CREATE TABLE user_mutes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    muter_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    muted_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1e. social_groups
-- --------------------------------------------------------------------------
CREATE TABLE social_groups (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    description     text,
    avatar_url      text,
    created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    privacy         text NOT NULL DEFAULT 'public'
                        CHECK (privacy IN ('public', 'private', 'invite_only')),
    max_members     integer DEFAULT 50,
    member_count    integer DEFAULT 0,
    category        text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1f. social_group_members
-- --------------------------------------------------------------------------
CREATE TABLE social_group_members (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        uuid NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role            text NOT NULL DEFAULT 'member'
                        CHECK (role IN ('owner', 'admin', 'member')),
    joined_at       timestamptz DEFAULT now(),
    UNIQUE (group_id, user_id)
);

-- --------------------------------------------------------------------------
-- 1g. social_group_invites
-- --------------------------------------------------------------------------
CREATE TABLE social_group_invites (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        uuid NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
    invited_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invited_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status          text NOT NULL DEFAULT 'pending',
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1h. communities
-- --------------------------------------------------------------------------
CREATE TABLE communities (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    description     text,
    avatar_url      text,
    category        text,
    is_active       boolean DEFAULT true,
    member_count    integer DEFAULT 0,
    created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1i. community_memberships
-- --------------------------------------------------------------------------
CREATE TABLE community_memberships (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id    uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role            text NOT NULL DEFAULT 'member',
    joined_at       timestamptz DEFAULT now(),
    UNIQUE (community_id, user_id)
);

-- --------------------------------------------------------------------------
-- 1j. community_posts
-- --------------------------------------------------------------------------
CREATE TABLE community_posts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id    uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title           text,
    content         text NOT NULL,
    post_type       text,
    pinned          boolean DEFAULT false,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1k. community_comments
-- --------------------------------------------------------------------------
CREATE TABLE community_comments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content         text NOT NULL,
    parent_id       uuid REFERENCES community_comments(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1l. community_post_votes
-- --------------------------------------------------------------------------
CREATE TABLE community_post_votes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type       text NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at      timestamptz DEFAULT now(),
    UNIQUE (post_id, user_id)
);

-- --------------------------------------------------------------------------
-- 1m. community_audit_log
-- --------------------------------------------------------------------------
CREATE TABLE community_audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id    uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    action          text NOT NULL,
    performed_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    details         jsonb,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1n. user_presence
-- --------------------------------------------------------------------------
CREATE TABLE user_presence (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    status          text,
    last_seen_at    timestamptz DEFAULT now(),
    current_page    text
);

-- --------------------------------------------------------------------------
-- 1o. activity_reactions
-- --------------------------------------------------------------------------
CREATE TABLE activity_reactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id     uuid NOT NULL,
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji           text NOT NULL,
    created_at      timestamptz DEFAULT now(),
    UNIQUE (activity_id, user_id)
);

-- --------------------------------------------------------------------------
-- 1p. ride_stories
-- --------------------------------------------------------------------------
CREATE TABLE ride_stories (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ride_id         uuid NOT NULL,  -- FK to rides (created in 004)
    media_url       text,
    caption         text,
    expires_at      timestamptz,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1q. social_waves
-- --------------------------------------------------------------------------
CREATE TABLE social_waves (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message         text,
    created_at      timestamptz DEFAULT now()
);

-- ==========================================================================
-- 2. INDEXES
-- ==========================================================================

-- friend_requests
CREATE INDEX idx_friend_requests_from_user    ON friend_requests (from_user_id);
CREATE INDEX idx_friend_requests_to_user      ON friend_requests (to_user_id);
CREATE INDEX idx_friend_requests_status       ON friend_requests (status);

-- friendships
CREATE INDEX idx_friendships_user_a           ON friendships (user_a);
CREATE INDEX idx_friendships_user_b           ON friendships (user_b);

-- blocks
CREATE INDEX idx_blocks_blocker_id            ON blocks (blocker_id);
CREATE INDEX idx_blocks_blocked_id            ON blocks (blocked_id);

-- user_mutes
CREATE INDEX idx_user_mutes_muter_id          ON user_mutes (muter_id);
CREATE INDEX idx_user_mutes_muted_id          ON user_mutes (muted_id);

-- social_groups
CREATE INDEX idx_social_groups_created_by     ON social_groups (created_by);
CREATE INDEX idx_social_groups_privacy        ON social_groups (privacy);
CREATE INDEX idx_social_groups_category       ON social_groups (category);

-- social_group_members
CREATE INDEX idx_social_group_members_group   ON social_group_members (group_id);
CREATE INDEX idx_social_group_members_user    ON social_group_members (user_id);

-- social_group_invites
CREATE INDEX idx_social_group_invites_group   ON social_group_invites (group_id);
CREATE INDEX idx_social_group_invites_user    ON social_group_invites (invited_user_id);
CREATE INDEX idx_social_group_invites_status  ON social_group_invites (status);

-- communities
CREATE INDEX idx_communities_created_by       ON communities (created_by);
CREATE INDEX idx_communities_category         ON communities (category);
CREATE INDEX idx_communities_is_active        ON communities (is_active) WHERE is_active = true;

-- community_memberships
CREATE INDEX idx_community_memberships_community ON community_memberships (community_id);
CREATE INDEX idx_community_memberships_user      ON community_memberships (user_id);

-- community_posts
CREATE INDEX idx_community_posts_community    ON community_posts (community_id);
CREATE INDEX idx_community_posts_author       ON community_posts (author_id);
CREATE INDEX idx_community_posts_created_at   ON community_posts (created_at DESC);
CREATE INDEX idx_community_posts_pinned       ON community_posts (pinned) WHERE pinned = true;

-- community_comments
CREATE INDEX idx_community_comments_post      ON community_comments (post_id);
CREATE INDEX idx_community_comments_author    ON community_comments (author_id);
CREATE INDEX idx_community_comments_parent    ON community_comments (parent_id);

-- community_post_votes
CREATE INDEX idx_community_post_votes_post    ON community_post_votes (post_id);
CREATE INDEX idx_community_post_votes_user    ON community_post_votes (user_id);

-- community_audit_log
CREATE INDEX idx_community_audit_log_community ON community_audit_log (community_id);
CREATE INDEX idx_community_audit_log_created   ON community_audit_log (created_at DESC);

-- user_presence
CREATE INDEX idx_user_presence_status         ON user_presence (status);
CREATE INDEX idx_user_presence_last_seen      ON user_presence (last_seen_at);

-- activity_reactions
CREATE INDEX idx_activity_reactions_activity  ON activity_reactions (activity_id);
CREATE INDEX idx_activity_reactions_user      ON activity_reactions (user_id);

-- ride_stories
CREATE INDEX idx_ride_stories_user            ON ride_stories (user_id);
CREATE INDEX idx_ride_stories_ride            ON ride_stories (ride_id);
CREATE INDEX idx_ride_stories_expires         ON ride_stories (expires_at);

-- social_waves
CREATE INDEX idx_social_waves_from            ON social_waves (from_user_id);
CREATE INDEX idx_social_waves_to              ON social_waves (to_user_id);
CREATE INDEX idx_social_waves_created         ON social_waves (created_at DESC);

-- ==========================================================================
-- 3. TRIGGERS
-- ==========================================================================

CREATE TRIGGER trg_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_social_groups_updated_at
    BEFORE UPDATE ON social_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_communities_updated_at
    BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_community_posts_updated_at
    BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_community_comments_updated_at
    BEFORE UPDATE ON community_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- 4. HELPER FUNCTIONS
-- ==========================================================================

-- Check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_1 uuid, user_2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM friendships
        WHERE (user_a = LEAST(user_1, user_2) AND user_b = GREATEST(user_1, user_2))
    );
$$;

-- Check if a user is a member of a social group
CREATE OR REPLACE FUNCTION is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM social_group_members
        WHERE group_id = p_group_id AND user_id = p_user_id
    );
$$;

-- Check if a user is a member of a community
CREATE OR REPLACE FUNCTION is_community_member(p_community_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM community_memberships
        WHERE community_id = p_community_id AND user_id = p_user_id
    );
$$;

-- ==========================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE friend_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mutes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_group_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_group_invites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_votes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_audit_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_stories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_waves           ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 6. RLS POLICIES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- friend_requests
-- --------------------------------------------------------------------------
CREATE POLICY friend_requests_select_own
    ON friend_requests FOR SELECT TO authenticated
    USING (
        from_user_id = (SELECT auth.uid())
        OR to_user_id = (SELECT auth.uid())
    );

CREATE POLICY friend_requests_insert_own
    ON friend_requests FOR INSERT TO authenticated
    WITH CHECK (from_user_id = (SELECT auth.uid()));

CREATE POLICY friend_requests_update_own
    ON friend_requests FOR UPDATE TO authenticated
    USING (
        from_user_id = (SELECT auth.uid())
        OR to_user_id = (SELECT auth.uid())
    );

CREATE POLICY friend_requests_delete_own
    ON friend_requests FOR DELETE TO authenticated
    USING (from_user_id = (SELECT auth.uid()));

CREATE POLICY friend_requests_admin
    ON friend_requests FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- friendships
-- --------------------------------------------------------------------------
CREATE POLICY friendships_select_own
    ON friendships FOR SELECT TO authenticated
    USING (
        user_a = (SELECT auth.uid())
        OR user_b = (SELECT auth.uid())
    );

CREATE POLICY friendships_insert_authenticated
    ON friendships FOR INSERT TO authenticated
    WITH CHECK (
        user_a = (SELECT auth.uid())
        OR user_b = (SELECT auth.uid())
    );

CREATE POLICY friendships_delete_own
    ON friendships FOR DELETE TO authenticated
    USING (
        user_a = (SELECT auth.uid())
        OR user_b = (SELECT auth.uid())
    );

CREATE POLICY friendships_admin
    ON friendships FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- blocks
-- --------------------------------------------------------------------------
CREATE POLICY blocks_select_own
    ON blocks FOR SELECT TO authenticated
    USING (blocker_id = (SELECT auth.uid()));

CREATE POLICY blocks_insert_own
    ON blocks FOR INSERT TO authenticated
    WITH CHECK (blocker_id = (SELECT auth.uid()));

CREATE POLICY blocks_delete_own
    ON blocks FOR DELETE TO authenticated
    USING (blocker_id = (SELECT auth.uid()));

CREATE POLICY blocks_admin
    ON blocks FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- user_mutes
-- --------------------------------------------------------------------------
CREATE POLICY user_mutes_select_own
    ON user_mutes FOR SELECT TO authenticated
    USING (muter_id = (SELECT auth.uid()));

CREATE POLICY user_mutes_insert_own
    ON user_mutes FOR INSERT TO authenticated
    WITH CHECK (muter_id = (SELECT auth.uid()));

CREATE POLICY user_mutes_delete_own
    ON user_mutes FOR DELETE TO authenticated
    USING (muter_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- social_groups
-- --------------------------------------------------------------------------
CREATE POLICY social_groups_select_public
    ON social_groups FOR SELECT TO authenticated
    USING (
        privacy = 'public'
        OR is_group_member(id, (SELECT auth.uid()))
        OR is_admin()
    );

CREATE POLICY social_groups_insert_authenticated
    ON social_groups FOR INSERT TO authenticated
    WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY social_groups_update_owner_admin
    ON social_groups FOR UPDATE TO authenticated
    USING (
        created_by = (SELECT auth.uid())
        OR is_admin()
    );

CREATE POLICY social_groups_delete_owner_admin
    ON social_groups FOR DELETE TO authenticated
    USING (
        created_by = (SELECT auth.uid())
        OR is_admin()
    );

-- --------------------------------------------------------------------------
-- social_group_members
-- --------------------------------------------------------------------------
CREATE POLICY social_group_members_select_member
    ON social_group_members FOR SELECT TO authenticated
    USING (
        is_group_member(group_id, (SELECT auth.uid()))
        OR is_admin()
    );

CREATE POLICY social_group_members_insert_authenticated
    ON social_group_members FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()) OR is_admin());

CREATE POLICY social_group_members_update_admin
    ON social_group_members FOR UPDATE TO authenticated
    USING (is_admin());

CREATE POLICY social_group_members_delete_own
    ON social_group_members FOR DELETE TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR is_admin()
    );

-- --------------------------------------------------------------------------
-- social_group_invites
-- --------------------------------------------------------------------------
CREATE POLICY social_group_invites_select_own
    ON social_group_invites FOR SELECT TO authenticated
    USING (
        invited_user_id = (SELECT auth.uid())
        OR invited_by = (SELECT auth.uid())
        OR is_admin()
    );

CREATE POLICY social_group_invites_insert_member
    ON social_group_invites FOR INSERT TO authenticated
    WITH CHECK (invited_by = (SELECT auth.uid()));

CREATE POLICY social_group_invites_update_invitee
    ON social_group_invites FOR UPDATE TO authenticated
    USING (invited_user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- communities (public read, member write)
-- --------------------------------------------------------------------------
CREATE POLICY communities_select_public
    ON communities FOR SELECT TO authenticated
    USING (true);

CREATE POLICY communities_insert_authenticated
    ON communities FOR INSERT TO authenticated
    WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY communities_update_owner_admin
    ON communities FOR UPDATE TO authenticated
    USING (
        created_by = (SELECT auth.uid())
        OR is_admin()
    );

CREATE POLICY communities_delete_admin
    ON communities FOR DELETE TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- community_memberships
-- --------------------------------------------------------------------------
CREATE POLICY community_memberships_select_public
    ON community_memberships FOR SELECT TO authenticated
    USING (true);

CREATE POLICY community_memberships_insert_own
    ON community_memberships FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY community_memberships_delete_own
    ON community_memberships FOR DELETE TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR is_admin()
    );

-- --------------------------------------------------------------------------
-- community_posts
-- --------------------------------------------------------------------------
CREATE POLICY community_posts_select_public
    ON community_posts FOR SELECT TO authenticated
    USING (true);

CREATE POLICY community_posts_insert_member
    ON community_posts FOR INSERT TO authenticated
    WITH CHECK (
        author_id = (SELECT auth.uid())
        AND is_community_member(community_id, (SELECT auth.uid()))
    );

CREATE POLICY community_posts_update_own
    ON community_posts FOR UPDATE TO authenticated
    USING (
        author_id = (SELECT auth.uid())
        OR is_admin()
    );

CREATE POLICY community_posts_delete_own_admin
    ON community_posts FOR DELETE TO authenticated
    USING (
        author_id = (SELECT auth.uid())
        OR is_admin()
    );

-- --------------------------------------------------------------------------
-- community_comments
-- --------------------------------------------------------------------------
CREATE POLICY community_comments_select_public
    ON community_comments FOR SELECT TO authenticated
    USING (true);

CREATE POLICY community_comments_insert_authenticated
    ON community_comments FOR INSERT TO authenticated
    WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY community_comments_update_own
    ON community_comments FOR UPDATE TO authenticated
    USING (
        author_id = (SELECT auth.uid())
        OR is_admin()
    );

CREATE POLICY community_comments_delete_own_admin
    ON community_comments FOR DELETE TO authenticated
    USING (
        author_id = (SELECT auth.uid())
        OR is_admin()
    );

-- --------------------------------------------------------------------------
-- community_post_votes
-- --------------------------------------------------------------------------
CREATE POLICY community_post_votes_select_public
    ON community_post_votes FOR SELECT TO authenticated
    USING (true);

CREATE POLICY community_post_votes_insert_own
    ON community_post_votes FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY community_post_votes_delete_own
    ON community_post_votes FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- community_audit_log
-- --------------------------------------------------------------------------
CREATE POLICY community_audit_log_select_admin
    ON community_audit_log FOR SELECT TO authenticated
    USING (is_admin());

CREATE POLICY community_audit_log_insert_authenticated
    ON community_audit_log FOR INSERT TO authenticated
    WITH CHECK (performed_by = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- user_presence
-- --------------------------------------------------------------------------
CREATE POLICY user_presence_select_authenticated
    ON user_presence FOR SELECT TO authenticated
    USING (true);

CREATE POLICY user_presence_insert_own
    ON user_presence FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_presence_update_own
    ON user_presence FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_presence_delete_own
    ON user_presence FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- activity_reactions
-- --------------------------------------------------------------------------
CREATE POLICY activity_reactions_select_authenticated
    ON activity_reactions FOR SELECT TO authenticated
    USING (true);

CREATE POLICY activity_reactions_insert_own
    ON activity_reactions FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY activity_reactions_delete_own
    ON activity_reactions FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- ride_stories
-- --------------------------------------------------------------------------
CREATE POLICY ride_stories_select_authenticated
    ON ride_stories FOR SELECT TO authenticated
    USING (true);

CREATE POLICY ride_stories_insert_own
    ON ride_stories FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY ride_stories_delete_own
    ON ride_stories FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- social_waves
-- --------------------------------------------------------------------------
CREATE POLICY social_waves_select_own
    ON social_waves FOR SELECT TO authenticated
    USING (
        from_user_id = (SELECT auth.uid())
        OR to_user_id = (SELECT auth.uid())
    );

CREATE POLICY social_waves_insert_own
    ON social_waves FOR INSERT TO authenticated
    WITH CHECK (from_user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- End of 006_social_and_community.sql
-- --------------------------------------------------------------------------
