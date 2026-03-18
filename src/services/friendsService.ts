// =============================================================================
// Friends Service — extracted from FriendsManager.tsx
// =============================================================================
// Pure async functions (no React hooks). All friend-related data operations
// live here so they can be shared across components.
// =============================================================================

import { supabase } from '../lib/supabase';
import type {
  FriendProfile,
  Friendship,
  FriendRequest,
  BlockedUser,
  UserPresence,
} from '../types/social';

/** Columns fetched whenever we need a friend's profile. */
const PROFILE_SELECT =
  'id, full_name, avatar_url, profile_photo_url, bio, average_rating, trust_score, profile_verified, total_rides_offered, total_rides_taken';

// ---------------------------------------------------------------------------
// service
// ---------------------------------------------------------------------------

export const friendsService = {
  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  /**
   * Fetch the current user's confirmed friends, each enriched with its profile.
   */
  async getFriends(userId: string): Promise<Friendship[]> {
    try {
      // 1. Fetch raw friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (friendshipsError) throw friendshipsError;
      if (!friendships || friendships.length === 0) return [];

      // 2. Collect the friend IDs and fetch profiles in one go
      const friendIds = friendships.map((row) =>
        row.user_a === userId ? row.user_b : row.user_a,
      );

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map<string, FriendProfile>(
        (profiles ?? []).map((p) => [p.id, p as FriendProfile]),
      );

      // 3. Merge
      const result: Friendship[] = [];
      for (const row of friendships) {
        const friendId = row.user_a === userId ? row.user_b : row.user_a;
        const friend = profileMap.get(friendId);
        if (!friend) continue;
        result.push({
          id: row.id,
          user_a: row.user_a,
          user_b: row.user_b,
          created_at: row.created_at,
          friend_id: friendId,
          friend,
        });
      }
      return result;
    } catch (err) {
      console.error('[friendsService.getFriends]', err);
      return [];
    }
  },

  /**
   * Fetch pending friend requests — both incoming and outgoing.
   */
  async getPendingRequests(
    userId: string,
  ): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
    try {
      const [incomingRes, outgoingRes] = await Promise.allSettled([
        supabase
          .from('friend_requests')
          .select('id, from_user_id, to_user_id, status, created_at')
          .eq('to_user_id', userId)
          .eq('status', 'PENDING'),
        supabase
          .from('friend_requests')
          .select('id, from_user_id, to_user_id, status, created_at')
          .eq('from_user_id', userId)
          .eq('status', 'PENDING'),
      ]);

      const incomingRows =
        incomingRes.status === 'fulfilled' ? incomingRes.value.data ?? [] : [];
      const outgoingRows =
        outgoingRes.status === 'fulfilled' ? outgoingRes.value.data ?? [] : [];

      // Collect all profile IDs we need
      const profileIds = new Set<string>();
      incomingRows.forEach((r) => profileIds.add(r.from_user_id));
      outgoingRows.forEach((r) => profileIds.add(r.to_user_id));

      let profileMap = new Map<string, FriendProfile>();
      if (profileIds.size > 0) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .in('id', Array.from(profileIds));

        if (!error && profiles) {
          profileMap = new Map(profiles.map((p) => [p.id, p as FriendProfile]));
        }
      }

      const incoming: FriendRequest[] = [];
      for (const row of incomingRows) {
        const friend = profileMap.get(row.from_user_id);
        if (!friend) continue;
        incoming.push({ ...row, status: row.status as FriendRequest['status'], friend });
      }

      const outgoing: FriendRequest[] = [];
      for (const row of outgoingRows) {
        const friend = profileMap.get(row.to_user_id);
        if (!friend) continue;
        outgoing.push({ ...row, status: row.status as FriendRequest['status'], friend });
      }

      return { incoming, outgoing };
    } catch (err) {
      console.error('[friendsService.getPendingRequests]', err);
      return { incoming: [], outgoing: [] };
    }
  },

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /**
   * Send a friend request via the database RPC.
   * Returns the new request ID on success, or an empty string on failure.
   */
  async sendRequest(toUserId: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_to_user_id: toUserId,
      });
      if (error) throw error;
      return (data as string) ?? '';
    } catch (err) {
      console.error('[friendsService.sendRequest]', err);
      throw err;
    }
  },

  /**
   * Accept a pending friend request. Returns the new friendship ID.
   */
  async acceptRequest(requestId: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        p_request_id: requestId,
      });
      if (error) throw error;
      return (data as string) ?? '';
    } catch (err) {
      console.error('[friendsService.acceptRequest]', err);
      throw err;
    }
  },

  /**
   * Decline a pending friend request.
   */
  async declineRequest(requestId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('decline_friend_request', {
        p_request_id: requestId,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[friendsService.declineRequest]', err);
      throw err;
    }
  },

  /**
   * Cancel a friend request the current user sent (sets status to CANCELLED).
   */
  async cancelRequest(requestId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'CANCELLED' })
        .eq('id', requestId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[friendsService.cancelRequest]', err);
      throw err;
    }
  },

  /**
   * Remove an existing friendship via the `unfriend_user` RPC.
   * Falls back to a direct delete if the RPC is unavailable.
   */
  async unfriend(friendId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('unfriend_user', {
        p_friend_id: friendId,
      });

      if (error) {
        // Fallback: direct delete from friendships table
        console.warn('[friendsService.unfriend] RPC failed, using fallback:', error.message);
        const { error: deleteError } = await supabase
          .from('friendships')
          .delete()
          .or(
            `and(user_a.eq.${friendId}),and(user_b.eq.${friendId})`,
          );
        if (deleteError) throw deleteError;
      }

      return true;
    } catch (err) {
      console.error('[friendsService.unfriend]', err);
      throw err;
    }
  },

  // -------------------------------------------------------------------------
  // Blocking
  // -------------------------------------------------------------------------

  /**
   * Block a user. Inserts a row into the `blocks` table.
   */
  async blockUser(blockedId: string, blockerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('blocks')
        .insert({ blocker_id: blockerId, blocked_id: blockedId });
      if (error) throw error;
    } catch (err) {
      console.error('[friendsService.blockUser]', err);
      throw err;
    }
  },

  /**
   * Unblock a user via the `unblock_user` RPC.
   * Falls back to a direct delete if the RPC is unavailable.
   */
  async unblockUser(blockedId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('unblock_user', {
        p_blocked_id: blockedId,
      });

      if (error) {
        console.warn('[friendsService.unblockUser] RPC failed, using fallback:', error.message);
        const { error: deleteError } = await supabase
          .from('blocks')
          .delete()
          .eq('blocked_id', blockedId);
        if (deleteError) throw deleteError;
      }

      return true;
    } catch (err) {
      console.error('[friendsService.unblockUser]', err);
      throw err;
    }
  },

  /**
   * Get the list of users blocked by the given user.
   */
  async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
    try {
      // Try the RPC first
      const { data, error } = await supabase.rpc('get_blocked_users');

      if (!error && data) {
        return (data as BlockedUser[]) ?? [];
      }

      // Fallback: manual join
      console.warn('[friendsService.getBlockedUsers] RPC unavailable, using fallback');
      const { data: blocksData, error: blocksError } = await supabase
        .from('blocks')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', userId);

      if (blocksError) throw blocksError;
      if (!blocksData || blocksData.length === 0) return [];

      const blockedIds = blocksData.map((b) => b.blocked_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', blockedIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p]),
      );

      return blocksData.map((b) => {
        const p = profileMap.get(b.blocked_id);
        return {
          block_id: b.id,
          blocked_id: b.blocked_id,
          full_name: p?.full_name ?? 'Unknown User',
          avatar_url: p?.avatar_url ?? null,
          blocked_at: b.created_at,
        };
      });
    } catch (err) {
      console.error('[friendsService.getBlockedUsers]', err);
      return [];
    }
  },

  // -------------------------------------------------------------------------
  // Search / Discovery
  // -------------------------------------------------------------------------

  /**
   * Search for users by name, excluding the current user.
   */
  async searchUsers(query: string, currentUserId: string): Promise<FriendProfile[]> {
    if (!query.trim()) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .ilike('full_name', `%${query}%`)
        .neq('id', currentUserId)
        .limit(15);

      if (error) throw error;
      return (data ?? []) as FriendProfile[];
    } catch (err) {
      console.error('[friendsService.searchUsers]', err);
      return [];
    }
  },

  /**
   * Fetch friends together with their real-time presence information.
   */
  async getFriendsWithPresence(
    userId: string,
  ): Promise<(Friendship & { presence?: UserPresence })[]> {
    try {
      const friends = await friendsService.getFriends(userId);
      if (friends.length === 0) return [];

      const friendIds = friends.map((f) => f.friend_id);

      const { data: presenceData, error } = await supabase
        .from('user_presence')
        .select('user_id, status, last_seen_at')
        .in('user_id', friendIds);

      if (error) {
        // Presence table may not exist yet; degrade gracefully
        console.warn('[friendsService.getFriendsWithPresence] Presence query failed:', error.message);
        return friends.map((f) => ({ ...f, presence: undefined }));
      }

      const presenceMap = new Map<string, UserPresence>(
        (presenceData ?? []).map((p) => [p.user_id, p as UserPresence]),
      );

      return friends.map((f) => ({
        ...f,
        presence: presenceMap.get(f.friend_id),
      }));
    } catch (err) {
      console.error('[friendsService.getFriendsWithPresence]', err);
      return [];
    }
  },

  /**
   * Check whether two users are friends using the `are_friends` RPC.
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('are_friends', {
        p_user_id_1: userId1,
        p_user_id_2: userId2,
      });
      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error('[friendsService.areFriends]', err);
      return false;
    }
  },

  /**
   * Suggest friends based on mutual friends and shared groups.
   * Falls back to random non-friend profiles if no social graph data is available.
   */
  async getSuggestedFriends(userId: string): Promise<FriendProfile[]> {
    try {
      // 1. Current friend IDs (to exclude)
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_a, user_b')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      const existingFriendIds = new Set<string>([userId]);
      (friendships ?? []).forEach((f) => {
        existingFriendIds.add(f.user_a);
        existingFriendIds.add(f.user_b);
      });

      // 2. Blocked user IDs (to exclude)
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userId);

      (blocks ?? []).forEach((b) => existingFriendIds.add(b.blocked_id));

      // 3. Pending request user IDs (to exclude)
      const { data: pendingReqs } = await supabase
        .from('friend_requests')
        .select('from_user_id, to_user_id')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .eq('status', 'PENDING');

      (pendingReqs ?? []).forEach((r) => {
        existingFriendIds.add(r.from_user_id);
        existingFriendIds.add(r.to_user_id);
      });

      // 4. Users who share groups with the current user
      const { data: myGroupMemberships } = await supabase
        .from('social_group_members')
        .select('group_id')
        .eq('user_id', userId);

      const myGroupIds = (myGroupMemberships ?? []).map((m) => m.group_id);

      let groupMateIds: string[] = [];
      if (myGroupIds.length > 0) {
        const { data: groupMates } = await supabase
          .from('social_group_members')
          .select('user_id')
          .in('group_id', myGroupIds)
          .neq('user_id', userId)
          .limit(50);

        groupMateIds = (groupMates ?? [])
          .map((gm) => gm.user_id)
          .filter((id) => !existingFriendIds.has(id));
      }

      // 5. Friends-of-friends (mutual friends)
      const directFriendIds = Array.from(existingFriendIds).filter((id) => id !== userId);
      let mutualCandidateIds: string[] = [];
      if (directFriendIds.length > 0) {
        const { data: fof } = await supabase
          .from('friendships')
          .select('user_a, user_b')
          .or(
            directFriendIds
              .map((id) => `user_a.eq.${id},user_b.eq.${id}`)
              .join(','),
          )
          .limit(100);

        const fofIds = new Set<string>();
        (fof ?? []).forEach((row) => {
          fofIds.add(row.user_a);
          fofIds.add(row.user_b);
        });
        mutualCandidateIds = Array.from(fofIds).filter(
          (id) => !existingFriendIds.has(id),
        );
      }

      // 6. Merge candidate IDs, prioritising group mates and mutuals
      const candidateIds = Array.from(
        new Set([...groupMateIds, ...mutualCandidateIds]),
      ).slice(0, 20);

      // 7. Fetch profiles
      if (candidateIds.length > 0) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .in('id', candidateIds)
          .limit(10);

        if (!error && profiles && profiles.length > 0) {
          return profiles as FriendProfile[];
        }
      }

      // 8. Fallback: grab random non-friend profiles
      const excludeArr = Array.from(existingFriendIds);
      const { data: fallback, error: fallbackError } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .not('id', 'in', `(${excludeArr.join(',')})`)
        .limit(10);

      if (fallbackError) throw fallbackError;
      return (fallback ?? []) as FriendProfile[];
    } catch (err) {
      console.error('[friendsService.getSuggestedFriends]', err);
      return [];
    }
  },
};
