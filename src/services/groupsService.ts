// =============================================================================
// Groups Service — extracted from SocialGroups.tsx
// =============================================================================
// Pure async functions (no React hooks). All social-group operations live
// here so they can be shared across components.
// =============================================================================

import { supabase } from '../lib/supabase';
import type {
  SocialGroup,
  GroupInvite,
  GroupMember,
  FriendProfile,
} from '../types/social';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Normalise a single-row or array join result into one object (or null). */
function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Columns fetched when we need a member profile. */
const PROFILE_SELECT =
  'id, full_name, avatar_url, profile_photo_url, bio, average_rating, trust_score, profile_verified, total_rides_offered, total_rides_taken';

// ---------------------------------------------------------------------------
// service
// ---------------------------------------------------------------------------

export const groupsService = {
  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  /**
   * Get all groups the user is a member of, enriched with the user's role
   * and the group owner's profile.
   */
  async getMyGroups(userId: string): Promise<SocialGroup[]> {
    try {
      // 1. Get memberships
      const { data: memberships, error: memError } = await supabase
        .from('social_group_members')
        .select('group_id, role')
        .eq('user_id', userId);

      if (memError) throw memError;
      if (!memberships || memberships.length === 0) return [];

      const membershipMap = new Map(
        memberships.map((m) => [m.group_id, m.role]),
      );
      const groupIds = Array.from(membershipMap.keys());

      // 2. Fetch full group details
      const { data: groups, error: groupsError } = await supabase
        .from('social_groups')
        .select(
          `*, owner:profiles!social_groups_owner_id_fkey(id, full_name, avatar_url)`,
        )
        .in('id', groupIds)
        .eq('is_active', true);

      if (groupsError) throw groupsError;

      return (groups ?? []).map((g) => ({
        ...g,
        owner: unwrap(g.owner) as SocialGroup['owner'],
        is_member: true,
        user_role: membershipMap.get(g.id),
      }));
    } catch (err) {
      console.error('[groupsService.getMyGroups]', err);
      return [];
    }
  },

  /**
   * Get public groups, optionally filtered by category and/or search term.
   */
  async getPublicGroups(
    options: { category?: string; search?: string } = {},
  ): Promise<SocialGroup[]> {
    try {
      let query = supabase
        .from('social_groups')
        .select(
          `*, owner:profiles!social_groups_owner_id_fkey(id, full_name, avatar_url)`,
        )
        .eq('visibility', 'PUBLIC')
        .eq('is_active', true)
        .order('member_count', { ascending: false })
        .limit(50);

      if (options.category) {
        query = query.eq('category', options.category);
      }
      if (options.search) {
        query = query.or(
          `name.ilike.%${options.search}%,description.ilike.%${options.search}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((g) => ({
        ...g,
        owner: unwrap(g.owner) as SocialGroup['owner'],
      }));
    } catch (err) {
      console.error('[groupsService.getPublicGroups]', err);
      return [];
    }
  },

  /**
   * Get detailed info about a specific group, including its member list.
   */
  async getGroupDetails(
    groupId: string,
    userId: string,
  ): Promise<(SocialGroup & { members: GroupMember[] }) | null> {
    try {
      // Group data
      const { data: group, error: groupError } = await supabase
        .from('social_groups')
        .select(
          `*, owner:profiles!social_groups_owner_id_fkey(id, full_name, avatar_url)`,
        )
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      if (!group) return null;

      // Membership info
      const { data: membersRaw, error: membersError } = await supabase
        .from('social_group_members')
        .select(`id, group_id, user_id, role, joined_at`)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;

      // Fetch profiles for all members
      const memberUserIds = (membersRaw ?? []).map((m) => m.user_id);
      let profileMap = new Map<string, FriendProfile>();

      if (memberUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .in('id', memberUserIds);

        if (!profilesError && profiles) {
          profileMap = new Map(
            profiles.map((p) => [p.id, p as FriendProfile]),
          );
        }
      }

      const members: GroupMember[] = (membersRaw ?? []).map((m) => ({
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        role: m.role as GroupMember['role'],
        joined_at: m.joined_at,
        profile: profileMap.get(m.user_id),
      }));

      // Is the current user a member?
      const currentMember = members.find((m) => m.user_id === userId);

      return {
        ...group,
        owner: unwrap(group.owner) as SocialGroup['owner'],
        is_member: !!currentMember,
        user_role: currentMember?.role,
        members,
      };
    } catch (err) {
      console.error('[groupsService.getGroupDetails]', err);
      return null;
    }
  },

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /**
   * Create a new social group via the database RPC.
   * Returns the new group ID.
   */
  async createGroup(data: {
    name: string;
    description?: string;
    visibility?: string;
    category?: string;
    location?: string;
    rules?: string;
    max_members?: number;
  }): Promise<string> {
    try {
      const { data: groupId, error } = await supabase.rpc(
        'create_social_group',
        {
          p_name: data.name.trim(),
          p_description: data.description?.trim() || null,
          p_visibility: data.visibility ?? 'PUBLIC',
          p_category: data.category ?? 'General',
          p_location: data.location?.trim() || null,
          p_rules: data.rules?.trim() || null,
          p_max_members: data.max_members ?? 100,
        },
      );

      if (error) throw error;
      return (groupId as string) ?? '';
    } catch (err) {
      console.error('[groupsService.createGroup]', err);
      throw err;
    }
  },

  /**
   * Join a public group (or an invite-only group if the user has an accepted invite).
   */
  async joinGroup(groupId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('join_social_group', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[groupsService.joinGroup]', err);
      throw err;
    }
  },

  /**
   * Leave a group. Owners cannot leave (they must transfer ownership or
   * delete the group).
   */
  async leaveGroup(groupId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('leave_social_group', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[groupsService.leaveGroup]', err);
      throw err;
    }
  },

  /**
   * Invite a user to a group. Only admins/moderators/owners can invite.
   * Returns the invite ID.
   */
  async inviteToGroup(
    groupId: string,
    inviteeId: string,
    message?: string,
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('invite_to_group', {
        p_group_id: groupId,
        p_invitee_id: inviteeId,
        p_message: message ?? null,
      });
      if (error) throw error;
      return (data as string) ?? '';
    } catch (err) {
      console.error('[groupsService.inviteToGroup]', err);
      throw err;
    }
  },

  /**
   * Accept or decline a group invite.
   */
  async respondToInvite(inviteId: string, accept: boolean): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('respond_to_group_invite', {
        p_invite_id: inviteId,
        p_accept: accept,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[groupsService.respondToInvite]', err);
      throw err;
    }
  },

  /**
   * Get pending group invites for the current user.
   */
  async getInvites(userId: string): Promise<GroupInvite[]> {
    try {
      const { data, error } = await supabase
        .from('social_group_invites')
        .select(
          `*,
           group:social_groups(*),
           inviter:profiles!social_group_invites_inviter_id_fkey(id, full_name, avatar_url)`,
        )
        .eq('invitee_id', userId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((inv) => ({
        ...inv,
        inviter: unwrap(inv.inviter) as GroupInvite['inviter'],
      }));
    } catch (err) {
      console.error('[groupsService.getInvites]', err);
      return [];
    }
  },

  /**
   * Update group settings. Only owners and admins can do this.
   */
  async updateGroup(
    groupId: string,
    updates: Partial<
      Pick<
        SocialGroup,
        'name' | 'description' | 'visibility' | 'category' | 'location' | 'rules' | 'max_members' | 'avatar_url' | 'cover_image_url'
      >
    >,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('social_groups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', groupId);

      if (error) throw error;
    } catch (err) {
      console.error('[groupsService.updateGroup]', err);
      throw err;
    }
  },

  /**
   * Get a lightweight activity summary for a group: message count, last
   * activity timestamp, and count of members currently online.
   */
  async getGroupActivity(
    groupId: string,
  ): Promise<{ messageCount: number; lastActive: string; onlineMembers: number }> {
    try {
      // Conversation associated with the group
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('group_id', groupId)
        .eq('type', 'GROUP_CHAT')
        .limit(1)
        .maybeSingle();

      let messageCount = 0;
      let lastActive = new Date(0).toISOString();

      if (conv) {
        // Count messages in the group chat
        const { count, error: countError } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        if (!countError && count != null) {
          messageCount = count;
        }

        // Last message timestamp
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMsg) {
          lastActive = lastMsg.created_at;
        }
      }

      // Online members (if presence table exists)
      let onlineMembers = 0;
      try {
        const { data: members } = await supabase
          .from('social_group_members')
          .select('user_id')
          .eq('group_id', groupId);

        if (members && members.length > 0) {
          const memberIds = members.map((m) => m.user_id);
          const { count: onlineCount } = await supabase
            .from('user_presence')
            .select('user_id', { count: 'exact', head: true })
            .in('user_id', memberIds)
            .eq('status', 'online');

          onlineMembers = onlineCount ?? 0;
        }
      } catch {
        // Presence table may not exist yet
      }

      return { messageCount, lastActive, onlineMembers };
    } catch (err) {
      console.error('[groupsService.getGroupActivity]', err);
      return {
        messageCount: 0,
        lastActive: new Date(0).toISOString(),
        onlineMembers: 0,
      };
    }
  },
};
