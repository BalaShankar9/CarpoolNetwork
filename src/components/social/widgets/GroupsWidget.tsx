import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, ChevronRight, Globe, Lock, UserPlus,
  MessageCircle, Loader2, X, Check, Clock, Mail,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../lib/toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SocialGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  category: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface MyGroup extends SocialGroup {
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  lastMessageAt: string | null;
  messagesToday: number;
}

interface GroupInvite {
  id: string;
  group_id: string;
  inviter_id: string;
  message: string | null;
  created_at: string;
  group: SocialGroup | null;
  inviter: { id: string; full_name: string; avatar_url: string | null } | null;
}

interface FriendOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

/* ------------------------------------------------------------------ */
/*  Category config                                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_CONFIG: Record<string, { emoji: string; gradient: string; border: string }> = {
  'General':           { emoji: '\u{1F4AC}', gradient: 'from-slate-500 to-slate-700',     border: 'border-l-slate-400' },
  'Commuters':         { emoji: '\u{1F697}', gradient: 'from-blue-500 to-blue-700',       border: 'border-l-blue-400' },
  'Students':          { emoji: '\u{1F4DA}', gradient: 'from-amber-500 to-orange-600',    border: 'border-l-amber-400' },
  'Professionals':     { emoji: '\u{1F4BC}', gradient: 'from-indigo-500 to-indigo-700',   border: 'border-l-indigo-400' },
  'Families':          { emoji: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}', gradient: 'from-pink-500 to-rose-600', border: 'border-l-pink-400' },
  'Weekend Travelers': { emoji: '\u2708\uFE0F', gradient: 'from-cyan-500 to-teal-600',    border: 'border-l-cyan-400' },
  'Long Distance':     { emoji: '\u{1F6E3}\uFE0F', gradient: 'from-violet-500 to-purple-700', border: 'border-l-violet-400' },
  'Events':            { emoji: '\u{1F389}', gradient: 'from-fuchsia-500 to-pink-600',    border: 'border-l-fuchsia-400' },
  'Local Area':        { emoji: '\u{1F4CD}', gradient: 'from-emerald-500 to-green-700',   border: 'border-l-emerald-400' },
  'Eco-Friendly':      { emoji: '\u{1F331}', gradient: 'from-green-500 to-emerald-600',   border: 'border-l-green-400' },
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_CONFIG);

const getCategoryConfig = (cat: string) =>
  CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['General'];

/* ------------------------------------------------------------------ */
/*  Role badges                                                        */
/* ------------------------------------------------------------------ */

const ROLE_BADGE: Record<string, { icon: string; label: string; color: string }> = {
  OWNER:     { icon: '\u{1F451}', label: 'Owner', color: 'text-amber-600 bg-amber-50' },
  ADMIN:     { icon: '\u{1F6E1}\uFE0F', label: 'Admin', color: 'text-blue-600 bg-blue-50' },
  MODERATOR: { icon: '\u2B50',   label: 'Mod',   color: 'text-purple-600 bg-purple-50' },
  MEMBER:    { icon: '',          label: '',       color: '' },
};

/* ------------------------------------------------------------------ */
/*  Visibility config                                                  */
/* ------------------------------------------------------------------ */

const VISIBILITY_OPTIONS: { value: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'; label: string; desc: string; Icon: typeof Globe }[] = [
  { value: 'PUBLIC',      label: 'Public',      desc: 'Anyone can find and join',      Icon: Globe },
  { value: 'PRIVATE',     label: 'Private',     desc: 'Visible but requires approval', Icon: Lock },
  { value: 'INVITE_ONLY', label: 'Invite Only', desc: 'Hidden, invite only',           Icon: UserPlus },
];

/* ------------------------------------------------------------------ */
/*  Time-ago helper                                                    */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'No activity';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function GroupSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse-soft">
          <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
          </div>
          <div className="w-14 h-7 rounded-lg bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function GroupsWidget() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  /* ---- data state ---- */
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---- interaction state ---- */
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  /* ---- create form state ---- */
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'>('PUBLIC');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creating, setCreating] = useState(false);

  const userId = user?.id;

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  const loadData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // 1. Fetch user's group memberships
      const { data: memberships, error: memberError } = await supabase
        .from('social_group_members')
        .select('group_id, role')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      const memberGroupIds = (memberships ?? []).map((m) => m.group_id);
      const roleMap = new Map(
        (memberships ?? []).map((m) => [m.group_id, m.role as MyGroup['role']])
      );

      // 2. Fetch group details for user's groups
      let groupsData: SocialGroup[] = [];
      if (memberGroupIds.length > 0) {
        const { data, error } = await supabase
          .from('social_groups')
          .select('id, name, description, avatar_url, owner_id, visibility, category, member_count, created_at, updated_at')
          .in('id', memberGroupIds)
          .eq('is_active', true);

        if (error) throw error;
        groupsData = data ?? [];
      }

      // 3. Fetch activity metrics per group (messages today + last message timestamp)
      //    Uses conversation table linked by group_id -> chat_messages
      const activityMap = new Map<string, { messagesToday: number; lastMessageAt: string | null }>();

      if (memberGroupIds.length > 0) {
        // Get conversations linked to these groups
        const { data: convos } = await supabase
          .from('conversations')
          .select('id, group_id')
          .in('group_id', memberGroupIds)
          .eq('type', 'GROUP_CHAT');

        if (convos && convos.length > 0) {
          const convoIds = convos.map((c) => c.id);
          const convoToGroup = new Map(convos.map((c) => [c.id, c.group_id]));

          // Fetch last message per conversation and today's count
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const [lastMsgRes, countRes] = await Promise.allSettled([
            supabase
              .from('chat_messages')
              .select('conversation_id, created_at')
              .in('conversation_id', convoIds)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(convoIds.length),
            supabase
              .from('chat_messages')
              .select('conversation_id')
              .in('conversation_id', convoIds)
              .is('deleted_at', null)
              .gte('created_at', todayStart.toISOString()),
          ]);

          // Build last-message map (take the first occurrence per conversation)
          const lastMsgMap = new Map<string, string>();
          if (lastMsgRes.status === 'fulfilled' && lastMsgRes.value.data) {
            for (const row of lastMsgRes.value.data) {
              if (!lastMsgMap.has(row.conversation_id)) {
                lastMsgMap.set(row.conversation_id, row.created_at);
              }
            }
          }

          // Count today's messages per group
          const todayCountMap = new Map<string, number>();
          if (countRes.status === 'fulfilled' && countRes.value.data) {
            for (const row of countRes.value.data) {
              const gid = convoToGroup.get(row.conversation_id);
              if (gid) {
                todayCountMap.set(gid, (todayCountMap.get(gid) ?? 0) + 1);
              }
            }
          }

          // Merge into activity map
          for (const convo of convos) {
            const gid = convo.group_id as string;
            activityMap.set(gid, {
              messagesToday: todayCountMap.get(gid) ?? 0,
              lastMessageAt: lastMsgMap.get(convo.id) ?? null,
            });
          }
        }
      }

      // 4. Build MyGroup list sorted by recent activity
      const enrichedGroups: MyGroup[] = groupsData.map((g) => {
        const activity = activityMap.get(g.id);
        return {
          ...g,
          role: roleMap.get(g.id) ?? 'MEMBER',
          lastMessageAt: activity?.lastMessageAt ?? g.updated_at,
          messagesToday: activity?.messagesToday ?? 0,
        };
      });

      enrichedGroups.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

      setMyGroups(enrichedGroups);

      // 5. Fetch pending invites
      const { data: pendingInvites, error: invitesError } = await supabase
        .from('social_group_invites')
        .select(`
          id, group_id, inviter_id, message, created_at,
          group:social_groups(id, name, description, avatar_url, owner_id, visibility, category, member_count, created_at, updated_at),
          inviter:profiles!social_group_invites_inviter_id_fkey(id, full_name, avatar_url)
        `)
        .eq('invitee_id', userId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      setInvites(
        (pendingInvites ?? []).map((inv) => ({
          ...inv,
          group: Array.isArray(inv.group) ? inv.group[0] ?? null : inv.group,
          inviter: Array.isArray(inv.inviter) ? inv.inviter[0] ?? null : inv.inviter,
        }))
      );
    } catch (err) {
      console.error('[GroupsWidget] loadData error:', err);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------------------------------------------------------------- */
  /*  Invite response (accept / decline) with optimistic UI            */
  /* ---------------------------------------------------------------- */

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    // Optimistic removal
    const prevInvites = invites;
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setProcessingInvite(inviteId);

    try {
      const { error } = await supabase.rpc('respond_to_group_invite', {
        p_invite_id: inviteId,
        p_accept: accept,
      });

      if (error) throw error;

      toast.success(accept ? 'Invitation accepted!' : 'Invitation declined');

      // Refresh groups if accepted (new group appears)
      if (accept) {
        await loadData();
      }
    } catch (err) {
      console.error('[GroupsWidget] respondToInvite error:', err);
      toast.error('Failed to respond to invitation');
      // Revert optimistic update
      setInvites(prevInvites);
    } finally {
      setProcessingInvite(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Create group modal logic                                         */
  /* ---------------------------------------------------------------- */

  const resetCreateForm = () => {
    setCreateStep(1);
    setNewName('');
    setNewCategory('General');
    setNewVisibility('PUBLIC');
    setSelectedFriends(new Set());
    setFriends([]);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetCreateForm();
  };

  const loadFriends = useCallback(async () => {
    if (!userId) return;
    setLoadingFriends(true);

    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('id, user_a, user_b')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (error) throw error;

      const friendIds = (friendships ?? []).map((row) =>
        row.user_a === userId ? row.user_b : row.user_a
      );

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      setFriends(profiles ?? []);
    } catch (err) {
      console.error('[GroupsWidget] loadFriends error:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, [userId]);

  const goToStep2 = () => {
    if (!newName.trim()) {
      toast.warning('Please enter a group name');
      return;
    }
    setCreateStep(2);
    loadFriends();
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const createGroup = async () => {
    if (!newName.trim()) {
      toast.warning('Please enter a group name');
      return;
    }

    setCreating(true);

    try {
      const { data: groupId, error } = await supabase.rpc('create_social_group', {
        p_name: newName.trim(),
        p_visibility: newVisibility,
        p_category: newCategory,
      });

      if (error) throw error;

      // Invite selected friends
      if (groupId && selectedFriends.size > 0) {
        const invitePromises = Array.from(selectedFriends).map((friendId) =>
          supabase.rpc('invite_to_group', {
            p_group_id: groupId,
            p_invitee_id: friendId,
          })
        );

        const results = await Promise.allSettled(invitePromises);
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          console.warn('[GroupsWidget] Some invites failed:', failures);
        }
      }

      toast.success('Group created successfully!');
      closeCreateModal();

      // Refresh data and navigate
      await loadData();
      if (groupId) {
        navigate(`/social/groups/${groupId}`);
      }
    } catch (err) {
      console.error('[GroupsWidget] createGroup error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to create group';
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                    */
  /* ---------------------------------------------------------------- */

  const displayGroups = myGroups.slice(0, 4);
  const hasInvites = invites.length > 0;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-social-groups-400 to-social-groups-600">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 truncate">Groups</h3>
            {hasInvites && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-social-groups-500 rounded-full">
                {invites.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="w-7 h-7 rounded-lg bg-social-groups-50 flex items-center justify-center hover:bg-social-groups-100 transition-colors"
              aria-label="Create new group"
            >
              <Plus className="w-4 h-4 text-social-groups-600" />
            </button>
            <Link
              to="/social/groups"
              className="flex items-center gap-0.5 text-xs font-medium text-social-groups-600 hover:text-social-groups-700 transition-colors whitespace-nowrap"
            >
              See all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ---- Body ---- */}
        <div className="px-4 pb-4">
          {loading ? (
            <GroupSkeleton />
          ) : (
            <>
              {/* ---- Pending Invites ---- */}
              <AnimatePresence mode="popLayout">
                {invites.map((invite) => (
                  <motion.div
                    key={invite.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-3 p-3 rounded-xl bg-social-groups-50 border border-social-groups-100">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-social-groups-100 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-social-groups-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-social-groups-800 truncate">
                            {invite.group?.name ?? 'Unknown Group'}
                          </p>
                          <p className="text-[11px] text-social-groups-600 truncate">
                            {invite.inviter?.full_name ?? 'Someone'} invited you
                            {invite.message ? ` \u2014 "${invite.message}"` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2.5 ml-[42px]">
                        <button
                          onClick={() => respondToInvite(invite.id, true)}
                          disabled={processingInvite === invite.id}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold text-white bg-social-groups-500 hover:bg-social-groups-600 transition-colors disabled:opacity-50"
                        >
                          {processingInvite === invite.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Accept
                        </button>
                        <button
                          onClick={() => respondToInvite(invite.id, false)}
                          disabled={processingInvite === invite.id}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          Decline
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* ---- My Groups List ---- */}
              {displayGroups.length > 0 ? (
                <div className="space-y-1">
                  {displayGroups.map((group) => {
                    const cat = getCategoryConfig(group.category);
                    const badge = ROLE_BADGE[group.role] ?? ROLE_BADGE.MEMBER;

                    return (
                      <button
                        key={group.id}
                        onClick={() => navigate(`/social/groups/${group.id}`)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-l-[3px] ${cat.border} hover:bg-gray-50 transition-colors group/card`}
                      >
                        {/* Category avatar */}
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center shrink-0 text-base`}>
                          <span role="img" aria-label={group.category}>
                            {cat.emoji}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {group.name}
                            </span>
                            {badge.label && (
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
                                {badge.icon && <span>{badge.icon}</span>}
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                            <span className="flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              {group.member_count}
                            </span>
                            {group.messagesToday > 0 ? (
                              <span className="flex items-center gap-0.5 text-social-groups-600 font-medium">
                                <MessageCircle className="w-3 h-3" />
                                {group.messagesToday} today
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {timeAgo(group.lastMessageAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* View arrow */}
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover/card:text-social-groups-500 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : !hasInvites ? (
                /* ---- Empty state ---- */
                <div className="py-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-social-groups-50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-social-groups-400" />
                  </div>
                  <p className="text-sm text-gray-500">No groups yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Create one or{' '}
                    <Link to="/social/groups" className="text-social-groups-600 hover:underline font-medium">
                      explore public groups
                    </Link>
                  </p>
                </div>
              ) : null}

              {/* ---- Create New Group button ---- */}
              <button
                onClick={openCreateModal}
                className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-social-groups-200 text-xs font-semibold text-social-groups-600 hover:bg-social-groups-50 hover:border-social-groups-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Group
              </button>
            </>
          )}
        </div>

        {/* ---- Footer see-all (mobile) ---- */}
        <Link
          to="/social/groups"
          className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-social-groups-600 hover:text-social-groups-700 hover:bg-social-groups-50 border-t border-gray-100 transition-colors sm:hidden"
        >
          See all groups
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ============================================================ */}
      {/*  Create Group Modal                                           */}
      {/* ============================================================ */}

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCreateModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-social-groups-400 to-social-groups-600 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {createStep === 1 ? 'Create Group' : 'Invite Friends'}
                  </h3>
                </div>
                <button
                  onClick={closeCreateModal}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 px-5 pt-4">
                <div className={`h-1 flex-1 rounded-full ${createStep >= 1 ? 'bg-social-groups-500' : 'bg-gray-200'}`} />
                <div className={`h-1 flex-1 rounded-full ${createStep >= 2 ? 'bg-social-groups-500' : 'bg-gray-200'}`} />
              </div>

              {/* Modal body */}
              <div className="px-5 py-4">
                <AnimatePresence mode="wait">
                  {createStep === 1 ? (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {/* Name */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Group Name
                        </label>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Morning Commuters"
                          maxLength={60}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-social-groups-500/30 focus:border-social-groups-400 placeholder:text-gray-400 transition-colors"
                          autoFocus
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Category
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                          {CATEGORY_OPTIONS.map((cat) => {
                            const cfg = getCategoryConfig(cat);
                            const selected = newCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setNewCategory(cat)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                  selected
                                    ? 'bg-social-groups-50 border-social-groups-300 border text-social-groups-700 ring-1 ring-social-groups-200'
                                    : 'border border-gray-150 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <span>{cfg.emoji}</span>
                                <span className="truncate">{cat}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Visibility */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Visibility
                        </label>
                        <div className="space-y-1.5">
                          {VISIBILITY_OPTIONS.map(({ value, label, desc, Icon }) => {
                            const selected = newVisibility === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setNewVisibility(value)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                  selected
                                    ? 'bg-social-groups-50 border-social-groups-300 border ring-1 ring-social-groups-200'
                                    : 'border border-gray-150 hover:bg-gray-50'
                                }`}
                              >
                                <Icon className={`w-4 h-4 shrink-0 ${selected ? 'text-social-groups-600' : 'text-gray-400'}`} />
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold ${selected ? 'text-social-groups-700' : 'text-gray-700'}`}>
                                    {label}
                                  </p>
                                  <p className="text-[11px] text-gray-400">{desc}</p>
                                </div>
                                {selected && (
                                  <Check className="w-4 h-4 text-social-groups-500 ml-auto shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <p className="text-xs text-gray-500">
                        Invite friends to join your new group (optional).
                      </p>

                      {loadingFriends ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-social-groups-400" />
                        </div>
                      ) : friends.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-xs">
                          <UserPlus className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p>No friends to invite yet.</p>
                          <p className="mt-1">You can invite people later from the group page.</p>
                        </div>
                      ) : (
                        <div className="max-h-[260px] overflow-y-auto -mx-1 px-1 space-y-1">
                          {friends.map((friend) => {
                            const isSelected = selectedFriends.has(friend.id);
                            return (
                              <button
                                key={friend.id}
                                type="button"
                                onClick={() => toggleFriend(friend.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                  isSelected
                                    ? 'bg-social-groups-50 border border-social-groups-200'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-social-groups-100 flex items-center justify-center shrink-0 overflow-hidden">
                                  {friend.avatar_url ? (
                                    <img
                                      src={friend.avatar_url}
                                      alt={friend.full_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs font-semibold text-social-groups-600">
                                      {getInitials(friend.full_name)}
                                    </span>
                                  )}
                                </div>

                                <span className="text-sm text-gray-800 font-medium truncate flex-1 text-left">
                                  {friend.full_name}
                                </span>

                                {/* Checkbox */}
                                <div
                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-social-groups-500 border-social-groups-500'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {selectedFriends.size > 0 && (
                        <p className="text-[11px] text-social-groups-600 font-medium">
                          {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                {createStep === 2 ? (
                  <button
                    onClick={() => setCreateStep(1)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={closeCreateModal}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>

                  {createStep === 1 ? (
                    <button
                      onClick={goToStep2}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-social-groups-500 hover:bg-social-groups-600 transition-colors"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={createGroup}
                      disabled={creating}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-social-groups-500 hover:bg-social-groups-600 transition-colors disabled:opacity-50"
                    >
                      {creating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Create Group
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
