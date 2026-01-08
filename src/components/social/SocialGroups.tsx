import { useState, useEffect, useCallback } from 'react';
import {
    Users, Plus, Search, Globe, Lock, UserPlus,
    MessageCircle, Settings, ChevronRight, Crown,
    MapPin, Calendar, User, Loader2, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../shared/UserAvatar';

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
    is_member?: boolean;
    user_role?: string;
    owner?: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
}

interface GroupInvite {
    id: string;
    group_id: string;
    inviter_id: string;
    status: string;
    message: string | null;
    created_at: string;
    group?: SocialGroup;
    inviter?: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
}

const CATEGORY_OPTIONS = [
    'General', 'Commuters', 'Students', 'Professionals', 'Families',
    'Weekend Travelers', 'Long Distance', 'Events', 'Local Area', 'Eco-Friendly'
];

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Public', description: 'Anyone can find and join', icon: Globe },
    { value: 'PRIVATE', label: 'Private', description: 'Visible but requires approval', icon: Lock },
    { value: 'INVITE_ONLY', label: 'Invite Only', description: 'Hidden, invite only', icon: UserPlus },
];

export default function SocialGroups() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'discover' | 'my-groups' | 'invites'>('discover');
    const [groups, setGroups] = useState<SocialGroup[]>([]);
    const [myGroups, setMyGroups] = useState<SocialGroup[]>([]);
    const [invites, setInvites] = useState<GroupInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [processingGroup, setProcessingGroup] = useState<string | null>(null);

    // Create group form state
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupVisibility, setNewGroupVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'>('PUBLIC');
    const [newGroupCategory, setNewGroupCategory] = useState('General');
    const [newGroupLocation, setNewGroupLocation] = useState('');
    const [newGroupRules, setNewGroupRules] = useState('');
    const [creating, setCreating] = useState(false);

    const loadGroups = useCallback(async () => {
        if (!profile?.id) return;

        try {
            setLoading(true);

            // Load discover groups (public groups user is not a member of)
            const { data: publicGroups, error: publicError } = await supabase
                .from('social_groups')
                .select(`
          *,
          owner:profiles!social_groups_owner_id_fkey(id, full_name, avatar_url)
        `)
                .eq('visibility', 'PUBLIC')
                .eq('is_active', true)
                .order('member_count', { ascending: false })
                .limit(50);

            if (publicError) throw publicError;

            // Load user's group memberships
            const { data: memberships, error: memberError } = await supabase
                .from('social_group_members')
                .select('group_id, role')
                .eq('user_id', profile.id);

            if (memberError) throw memberError;

            const membershipMap = new Map(memberships?.map(m => [m.group_id, m.role]) || []);
            const memberGroupIds = Array.from(membershipMap.keys());

            // Mark which groups user is a member of
            const discoverGroups = (publicGroups || [])
                .filter(g => !memberGroupIds.includes(g.id))
                .map(g => ({
                    ...g,
                    owner: Array.isArray(g.owner) ? g.owner[0] : g.owner,
                    is_member: false
                }));

            // Load user's groups
            let userGroups: SocialGroup[] = [];
            if (memberGroupIds.length > 0) {
                const { data: myGroupsData, error: myGroupsError } = await supabase
                    .from('social_groups')
                    .select(`
            *,
            owner:profiles!social_groups_owner_id_fkey(id, full_name, avatar_url)
          `)
                    .in('id', memberGroupIds)
                    .eq('is_active', true);

                if (myGroupsError) throw myGroupsError;

                userGroups = (myGroupsData || []).map(g => ({
                    ...g,
                    owner: Array.isArray(g.owner) ? g.owner[0] : g.owner,
                    is_member: true,
                    user_role: membershipMap.get(g.id)
                }));
            }

            // Load pending invites
            const { data: pendingInvites, error: invitesError } = await supabase
                .from('social_group_invites')
                .select(`
          *,
          group:social_groups(*),
          inviter:profiles!social_group_invites_inviter_id_fkey(id, full_name, avatar_url)
        `)
                .eq('invitee_id', profile.id)
                .eq('status', 'PENDING');

            if (invitesError) throw invitesError;

            setGroups(discoverGroups);
            setMyGroups(userGroups);
            setInvites((pendingInvites || []).map(inv => ({
                ...inv,
                inviter: Array.isArray(inv.inviter) ? inv.inviter[0] : inv.inviter
            })));

        } catch (err) {
            console.error('Error loading groups:', err);
            toast.error('Failed to load groups');
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    const filteredGroups = groups.filter(group => {
        const matchesSearch = !searchQuery ||
            group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || group.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const createGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error('Group name is required');
            return;
        }

        try {
            setCreating(true);
            const { data, error } = await supabase.rpc('create_social_group', {
                p_name: newGroupName.trim(),
                p_description: newGroupDescription.trim() || null,
                p_visibility: newGroupVisibility,
                p_category: newGroupCategory,
                p_location: newGroupLocation.trim() || null,
                p_rules: newGroupRules.trim() || null
            });

            if (error) throw error;

            toast.success('Group created successfully!');
            setShowCreateModal(false);
            resetCreateForm();
            await loadGroups();

            // Navigate to the new group
            if (data) {
                navigate(`/social/groups/${data}`);
            }
        } catch (err) {
            console.error('Error creating group:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to create group';
            toast.error(errorMsg);
        } finally {
            setCreating(false);
        }
    };

    const joinGroup = async (groupId: string) => {
        try {
            setProcessingGroup(groupId);
            const { error } = await supabase.rpc('join_social_group', { p_group_id: groupId });

            if (error) throw error;

            toast.success('Joined group successfully!');
            await loadGroups();
        } catch (err) {
            console.error('Error joining group:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to join group';
            toast.error(errorMsg);
        } finally {
            setProcessingGroup(null);
        }
    };

    const leaveGroup = async (groupId: string) => {
        try {
            setProcessingGroup(groupId);
            const { error } = await supabase.rpc('leave_social_group', { p_group_id: groupId });

            if (error) throw error;

            toast.success('Left group successfully');
            await loadGroups();
        } catch (err) {
            console.error('Error leaving group:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to leave group';
            toast.error(errorMsg);
        } finally {
            setProcessingGroup(null);
        }
    };

    const respondToInvite = async (inviteId: string, accept: boolean) => {
        try {
            setProcessingGroup(inviteId);
            const { error } = await supabase.rpc('respond_to_group_invite', {
                p_invite_id: inviteId,
                p_accept: accept
            });

            if (error) throw error;

            toast.success(accept ? 'Invitation accepted!' : 'Invitation declined');
            await loadGroups();
        } catch (err) {
            console.error('Error responding to invite:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to respond to invitation';
            toast.error(errorMsg);
        } finally {
            setProcessingGroup(null);
        }
    };

    const resetCreateForm = () => {
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupVisibility('PUBLIC');
        setNewGroupCategory('General');
        setNewGroupLocation('');
        setNewGroupRules('');
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'PRIVATE': return <Lock className="w-4 h-4" />;
            case 'INVITE_ONLY': return <UserPlus className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Users className="w-6 h-6 text-gray-900" />
                        <h3 className="text-xl font-bold text-gray-900">Social Groups</h3>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Create Group
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'discover'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Discover
                    </button>
                    <button
                        onClick={() => setActiveTab('my-groups')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${activeTab === 'my-groups'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        My Groups ({myGroups.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('invites')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${activeTab === 'invites'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Invites
                        {invites.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                {invites.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Discover Tab */}
                {activeTab === 'discover' && (
                    <div>
                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search groups..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <select
                                value={selectedCategory || ''}
                                onChange={(e) => setSelectedCategory(e.target.value || null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Categories</option>
                                {CATEGORY_OPTIONS.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Groups Grid */}
                        {filteredGroups.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p className="font-medium">No groups found</p>
                                <p className="text-sm">Try a different search or create your own group</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => navigate(`/social/groups/${group.id}`)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                                    {group.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 line-clamp-1">{group.name}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        {getVisibilityIcon(group.visibility)}
                                                        <span>{group.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {group.description && (
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.description}</p>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <User className="w-4 h-4" />
                                                <span>{group.member_count} members</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    joinGroup(group.id);
                                                }}
                                                disabled={processingGroup === group.id}
                                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {processingGroup === group.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Plus className="w-4 h-4" />
                                                )}
                                                Join
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* My Groups Tab */}
                {activeTab === 'my-groups' && (
                    <div>
                        {myGroups.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p className="font-medium">You haven't joined any groups yet</p>
                                <p className="text-sm mb-4">Discover groups to connect with fellow carpoolers</p>
                                <button
                                    onClick={() => setActiveTab('discover')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Browse Groups
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/social/groups/${group.id}`)}
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-gray-900 truncate">{group.name}</h4>
                                                {group.user_role === 'OWNER' && (
                                                    <Crown className="w-4 h-4 text-yellow-500" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">{group.member_count} members • {group.category}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/messages?groupId=${group.id}`);
                                                }}
                                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                title="Group Chat"
                                            >
                                                <MessageCircle className="w-5 h-5" />
                                            </button>
                                            {group.user_role === 'OWNER' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/social/groups/${group.id}/settings`);
                                                    }}
                                                    className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                                    title="Group Settings"
                                                >
                                                    <Settings className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        leaveGroup(group.id);
                                                    }}
                                                    disabled={processingGroup === group.id}
                                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                                    title="Leave Group"
                                                >
                                                    {processingGroup === group.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <X className="w-5 h-5" />
                                                    )}
                                                </button>
                                            )}
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Invites Tab */}
                {activeTab === 'invites' && (
                    <div>
                        {invites.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p className="font-medium">No pending invitations</p>
                                <p className="text-sm">When you're invited to groups, they'll appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {invites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                {invite.group?.name?.charAt(0).toUpperCase() || 'G'}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-gray-900">{invite.group?.name}</h4>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    Invited by {invite.inviter?.full_name || 'Unknown'}
                                                </p>
                                                {invite.message && (
                                                    <p className="text-sm text-gray-500 italic mb-3">"{invite.message}"</p>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => respondToInvite(invite.id, true)}
                                                        disabled={processingGroup === invite.id}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {processingGroup === invite.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : null}
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => respondToInvite(invite.id, false)}
                                                        disabled={processingGroup === invite.id}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900">Create New Group</h3>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetCreateForm();
                                    }}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Group Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Group Name *
                                </label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Enter group name"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    maxLength={100}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newGroupDescription}
                                    onChange={(e) => setNewGroupDescription(e.target.value)}
                                    placeholder="What's this group about?"
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    maxLength={500}
                                />
                            </div>

                            {/* Visibility */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Visibility
                                </label>
                                <div className="space-y-2">
                                    {VISIBILITY_OPTIONS.map((option) => (
                                        <label
                                            key={option.value}
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newGroupVisibility === option.value
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value={option.value}
                                                checked={newGroupVisibility === option.value}
                                                onChange={(e) => setNewGroupVisibility(e.target.value as any)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <option.icon className="w-4 h-4 text-gray-600" />
                                                    <span className="font-medium text-gray-900">{option.label}</span>
                                                </div>
                                                <p className="text-sm text-gray-500">{option.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <select
                                    value={newGroupCategory}
                                    onChange={(e) => setNewGroupCategory(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {CATEGORY_OPTIONS.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Location (optional)
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={newGroupLocation}
                                        onChange={(e) => setNewGroupLocation(e.target.value)}
                                        placeholder="e.g., London, Manchester"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Rules */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Group Rules (optional)
                                </label>
                                <textarea
                                    value={newGroupRules}
                                    onChange={(e) => setNewGroupRules(e.target.value)}
                                    placeholder="Set some ground rules for members..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    maxLength={1000}
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetCreateForm();
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createGroup}
                                disabled={creating || !newGroupName.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Group'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
