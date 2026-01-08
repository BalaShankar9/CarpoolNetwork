import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Users, Globe, Lock, UserPlus, MessageCircle, 
  Settings, Crown, Shield, User, Calendar, MapPin,
  MoreVertical, UserMinus, AlertTriangle, Loader2, 
  Share2, Bell, BellOff, ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import UserAvatar from '../components/shared/UserAvatar';
import ConfirmModal from '../components/shared/ConfirmModal';

interface GroupMember {
  id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joined_at: string;
  notification_preference: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    profile_photo_url: string | null;
    profile_verified: boolean;
  };
}

interface SocialGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  owner_id: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  category: string;
  location: string | null;
  member_count: number;
  max_members: number;
  rules: string | null;
  created_at: string;
  owner?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [group, setGroup] = useState<SocialGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMembership, setUserMembership] = useState<GroupMember | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showMemberActions, setShowMemberActions] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;

    try {
      setLoading(true);

      // Load group details
      const { data: groupData, error: groupError } = await supabase
        .from('social_groups')
        .select(`
          *,
          owner:profiles!social_groups_owner_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      setGroup({
        ...groupData,
        owner: Array.isArray(groupData.owner) ? groupData.owner[0] : groupData.owner
      });

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('social_group_members')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, profile_photo_url, profile_verified)
        `)
        .eq('group_id', groupId)
        .order('role', { ascending: true });

      if (membersError) throw membersError;

      const formattedMembers = (membersData || []).map(m => ({
        ...m,
        user: Array.isArray(m.user) ? m.user[0] : m.user
      }));

      setMembers(formattedMembers);

      // Find current user's membership
      if (profile?.id) {
        const userMember = formattedMembers.find(m => m.user_id === profile.id);
        setUserMembership(userMember || null);
      }

    } catch (err) {
      console.error('Error loading group:', err);
      toast.error('Failed to load group');
      navigate('/friends');
    } finally {
      setLoading(false);
    }
  }, [groupId, profile?.id, navigate]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const joinGroup = async () => {
    if (!groupId) return;

    try {
      setProcessingAction('join');
      const { error } = await supabase.rpc('join_social_group', { p_group_id: groupId });
      
      if (error) throw error;

      toast.success('Joined group successfully!');
      await loadGroup();
    } catch (err) {
      console.error('Error joining group:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to join group';
      toast.error(errorMsg);
    } finally {
      setProcessingAction(null);
    }
  };

  const leaveGroup = async () => {
    if (!groupId) return;

    try {
      setProcessingAction('leave');
      const { error } = await supabase.rpc('leave_social_group', { p_group_id: groupId });
      
      if (error) throw error;

      toast.success('Left group successfully');
      setShowLeaveModal(false);
      navigate('/friends');
    } catch (err) {
      console.error('Error leaving group:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to leave group';
      toast.error(errorMsg);
    } finally {
      setProcessingAction(null);
    }
  };

  const searchUsersToInvite = async (query: string) => {
    if (!query.trim()) {
      setInviteSearchResults([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_photo_url')
        .ilike('full_name', `%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out existing members
      const memberIds = new Set(members.map(m => m.user_id));
      const filtered = (data || []).filter(u => !memberIds.has(u.id) && u.id !== profile?.id);
      
      setInviteSearchResults(filtered);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const inviteUser = async (userId: string) => {
    if (!groupId) return;

    try {
      setProcessingAction(userId);
      const { error } = await supabase.rpc('invite_to_group', { 
        p_group_id: groupId, 
        p_invitee_id: userId 
      });
      
      if (error) throw error;

      toast.success('Invitation sent!');
      setInviteSearchResults(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error inviting user:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send invitation';
      toast.error(errorMsg);
    } finally {
      setProcessingAction(null);
    }
  };

  const removeMember = async (memberId: string, userName: string) => {
    try {
      setProcessingAction(memberId);
      
      const { error } = await supabase
        .from('social_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Update member count
      await supabase
        .from('social_groups')
        .update({ member_count: (group?.member_count || 1) - 1 })
        .eq('id', groupId);

      toast.success(`Removed ${userName} from group`);
      await loadGroup();
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Failed to remove member');
    } finally {
      setProcessingAction(null);
      setShowMemberActions(null);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      setProcessingAction(memberId);
      
      const { error } = await supabase
        .from('social_group_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Role updated');
      await loadGroup();
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Failed to update role');
    } finally {
      setProcessingAction(null);
      setShowMemberActions(null);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PRIVATE': return <Lock className="w-4 h-4" />;
      case 'INVITE_ONLY': return <UserPlus className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            <Crown className="w-3 h-3" /> Owner
          </span>
        );
      case 'ADMIN':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case 'MODERATOR':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
            Moderator
          </span>
        );
      default:
        return null;
    }
  };

  const canManageMembers = userMembership?.role === 'OWNER' || userMembership?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Group not found</h2>
        <Link to="/friends" className="text-blue-600 hover:underline">
          Back to Social Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/friends')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Social Hub
      </button>

      {/* Group Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Cover Image Placeholder */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600" />
        
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Group Avatar */}
            <div className="-mt-16 sm:-mt-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl border-4 border-white flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                {group.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Group Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  {getVisibilityIcon(group.visibility)}
                  {group.visibility.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {group.member_count} members
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {group.category}
                </span>
                {group.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {group.location}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {userMembership ? (
                <>
                  <button
                    onClick={() => navigate('/messages')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat
                  </button>
                  {canManageMembers && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <UserPlus className="w-5 h-5" />
                      Invite
                    </button>
                  )}
                  {userMembership.role !== 'OWNER' && (
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Leave Group"
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={joinGroup}
                  disabled={processingAction === 'join'}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {processingAction === 'join' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                  Join Group
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          {group.description && (
            <p className="mt-4 text-gray-600">{group.description}</p>
          )}

          {/* Rules */}
          {group.rules && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-semibold text-amber-800 mb-2">Group Rules</h4>
              <p className="text-sm text-amber-700 whitespace-pre-wrap">{group.rules}</p>
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Members ({members.length})</h2>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <Link to={`/profile/${member.user_id}`}>
                <UserAvatar
                  user={{
                    id: member.user.id,
                    full_name: member.user.full_name,
                    avatar_url: member.user.avatar_url || member.user.profile_photo_url
                  }}
                  size="md"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${member.user_id}`}
                  className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {member.user.full_name}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  {getRoleBadge(member.role)}
                  <span className="text-sm text-gray-500">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Member Actions (for admins) */}
              {canManageMembers && member.user_id !== profile?.id && member.role !== 'OWNER' && (
                <div className="relative">
                  <button
                    onClick={() => setShowMemberActions(showMemberActions === member.id ? null : member.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showMemberActions === member.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      {userMembership?.role === 'OWNER' && member.role === 'MEMBER' && (
                        <button
                          onClick={() => updateMemberRole(member.id, 'ADMIN')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Make Admin
                        </button>
                      )}
                      {userMembership?.role === 'OWNER' && member.role === 'ADMIN' && (
                        <button
                          onClick={() => updateMemberRole(member.id, 'MEMBER')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          Remove Admin
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(member.id, member.user.full_name)}
                        disabled={processingAction === member.id}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        {processingAction === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                        Remove from Group
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leave Group Modal */}
      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={leaveGroup}
        title="Leave Group"
        message={`Are you sure you want to leave "${group.name}"? You'll need to rejoin or be invited again to access the group.`}
        confirmText="Leave Group"
        variant="danger"
        loading={processingAction === 'leave'}
      />

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Invite Members</h3>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteSearch('');
                    setInviteSearchResults([]);
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <input
                type="text"
                value={inviteSearch}
                onChange={(e) => {
                  setInviteSearch(e.target.value);
                  searchUsersToInvite(e.target.value);
                }}
                placeholder="Search users by name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />

              {searchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : inviteSearchResults.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {inviteSearchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          user={{
                            id: user.id,
                            full_name: user.full_name,
                            avatar_url: user.avatar_url || user.profile_photo_url
                          }}
                          size="sm"
                        />
                        <span className="font-medium text-gray-900">{user.full_name}</span>
                      </div>
                      <button
                        onClick={() => inviteUser(user.id)}
                        disabled={processingAction === user.id}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {processingAction === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Invite'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : inviteSearch.trim() ? (
                <p className="text-center text-gray-500 py-8">No users found</p>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Search for users to invite to this group
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
