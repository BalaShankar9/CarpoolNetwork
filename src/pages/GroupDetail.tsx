import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Users, Globe, Lock, UserPlus, MessageCircle,
    Crown, Shield, User, Calendar, MapPin,
    MoreVertical, UserMinus, AlertTriangle, Loader2,
    ChevronDown, ChevronRight, Search,
    Eye, EyeOff, Hash, Car, X, Clock, Sparkles,
    BookOpen, Info,
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

/* ------------------------------------------------------------------ */
/*  Category-based gradient & accent maps                             */
/* ------------------------------------------------------------------ */
const CATEGORY_GRADIENTS: Record<string, string> = {
    General: 'from-slate-600 via-blue-700 to-indigo-800',
    Commuters: 'from-blue-600 via-cyan-600 to-teal-700',
    Students: 'from-violet-600 via-purple-600 to-fuchsia-700',
    Professionals: 'from-gray-700 via-slate-700 to-zinc-800',
    Families: 'from-rose-500 via-pink-600 to-fuchsia-600',
    'Weekend Travelers': 'from-orange-500 via-amber-500 to-yellow-600',
    'Long Distance': 'from-emerald-600 via-teal-600 to-cyan-700',
    Events: 'from-red-500 via-rose-600 to-pink-600',
    'Local Area': 'from-green-600 via-emerald-600 to-teal-600',
    'Eco-Friendly': 'from-lime-600 via-green-600 to-emerald-700',
};

const CATEGORY_ACCENTS: Record<string, { bg: string; text: string; border: string; light: string }> = {
    General: { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200', light: 'bg-indigo-50' },
    Commuters: { bg: 'bg-cyan-600', text: 'text-cyan-600', border: 'border-cyan-200', light: 'bg-cyan-50' },
    Students: { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-200', light: 'bg-purple-50' },
    Professionals: { bg: 'bg-slate-600', text: 'text-slate-600', border: 'border-slate-200', light: 'bg-slate-50' },
    Families: { bg: 'bg-pink-600', text: 'text-pink-600', border: 'border-pink-200', light: 'bg-pink-50' },
    'Weekend Travelers': { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-200', light: 'bg-amber-50' },
    'Long Distance': { bg: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-200', light: 'bg-teal-50' },
    Events: { bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-200', light: 'bg-rose-50' },
    'Local Area': { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200', light: 'bg-emerald-50' },
    'Eco-Friendly': { bg: 'bg-green-600', text: 'text-green-600', border: 'border-green-200', light: 'bg-green-50' },
};

const DEFAULT_ACCENT = { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-50' };

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                   */
/* ------------------------------------------------------------------ */
function GroupDetailSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Breadcrumb skeleton */}
            <div className="h-5 w-56 bg-gray-200 rounded mb-6" />

            {/* Hero banner skeleton */}
            <div className="rounded-2xl overflow-hidden border border-gray-200">
                <div className="h-52 sm:h-64 bg-gray-200" />
                <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row gap-5">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 rounded-2xl -mt-20 sm:-mt-22 border-4 border-white" />
                        <div className="flex-1 space-y-3 pt-1">
                            <div className="h-8 w-64 bg-gray-200 rounded-lg" />
                            <div className="flex gap-4">
                                <div className="h-5 w-24 bg-gray-200 rounded" />
                                <div className="h-5 w-20 bg-gray-200 rounded" />
                                <div className="h-5 w-28 bg-gray-200 rounded" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                            <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Left column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 bg-gray-200 rounded" />
                                    <div className="h-4 flex-1 bg-gray-200 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
                        <div className="space-y-2">
                            <div className="h-4 w-full bg-gray-200 rounded" />
                            <div className="h-4 w-3/4 bg-gray-200 rounded" />
                        </div>
                    </div>
                </div>
                {/* Right column */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="h-6 w-36 bg-gray-200 rounded mb-6" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-24 bg-gray-200 rounded" />
                                            <div className="h-3 w-16 bg-gray-200 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
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
    const [showRemoveConfirm, setShowRemoveConfirm] = useState<{ memberId: string; userName: string } | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteSearch, setInviteSearch] = useState('');
    const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
    const inviteSearchTimeoutRef = useRef<NodeJS.Timeout>();
    const memberActionsRef = useRef<HTMLDivElement>(null);

    // UI state
    const [rulesExpanded, setRulesExpanded] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    /* ---- data loading ---- */
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

    // Close member actions dropdown on click outside
    useEffect(() => {
        if (!showMemberActions) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (memberActionsRef.current && !memberActionsRef.current.contains(e.target as Node)) {
                setShowMemberActions(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMemberActions]);

    /* ---- actions ---- */
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
            setInvitedUserIds(prev => new Set(prev).add(userId));
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

            // Reload group data to get accurate member_count from the database
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

    /* ---- derived data ---- */
    const canManageMembers = userMembership?.role === 'OWNER' || userMembership?.role === 'ADMIN';

    const accent = group ? (CATEGORY_ACCENTS[group.category] || DEFAULT_ACCENT) : DEFAULT_ACCENT;
    const gradient = group ? (CATEGORY_GRADIENTS[group.category] || 'from-blue-600 via-indigo-700 to-purple-800') : '';

    const { ownerMembers, adminMembers, regularMembers } = useMemo(() => {
        const owners: GroupMember[] = [];
        const admins: GroupMember[] = [];
        const regulars: GroupMember[] = [];

        const query = memberSearch.toLowerCase().trim();

        members.forEach(m => {
            if (query && !m.user.full_name.toLowerCase().includes(query)) return;
            switch (m.role) {
                case 'OWNER': owners.push(m); break;
                case 'ADMIN': admins.push(m); break;
                default: regulars.push(m); break;
            }
        });

        return { ownerMembers: owners, adminMembers: admins, regularMembers: regulars };
    }, [members, memberSearch]);

    const totalFilteredMembers = ownerMembers.length + adminMembers.length + regularMembers.length;

    const memberCapacityPercent = group ? Math.min(100, Math.round((group.member_count / group.max_members) * 100)) : 0;

    /* ---- visibility helpers ---- */
    const getVisibilityLabel = (v: string) => {
        switch (v) {
            case 'PRIVATE': return 'Private';
            case 'INVITE_ONLY': return 'Invite Only';
            default: return 'Public';
        }
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'PRIVATE': return <Lock className="w-4 h-4" />;
            case 'INVITE_ONLY': return <EyeOff className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    };

    /* ================================================================== */
    /*  LOADING STATE                                                     */
    /* ================================================================== */
    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-6">
                <GroupDetailSkeleton />
            </div>
        );
    }

    /* ================================================================== */
    /*  ERROR / NOT FOUND                                                 */
    /* ================================================================== */
    if (!group) {
        return (
            <div className="max-w-lg mx-auto mt-20 text-center">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertTriangle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Group not found</h2>
                    <p className="text-gray-500 mb-6">
                        This group may have been removed or you don't have permission to view it.
                    </p>
                    <Link
                        to="/friends"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Social Hub
                    </Link>
                </div>
            </div>
        );
    }

    /* ================================================================== */
    /*  RENDER                                                            */
    /* ================================================================== */
    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

            {/* -------------------------------------------------------- */}
            {/*  BREADCRUMB                                              */}
            {/* -------------------------------------------------------- */}
            <nav className="flex items-center gap-1.5 text-sm">
                <button
                    onClick={() => navigate('/friends')}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Social Hub
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-gray-900 font-semibold truncate max-w-[200px]">
                    {group.name}
                </span>
            </nav>

            {/* -------------------------------------------------------- */}
            {/*  HERO HEADER                                             */}
            {/* -------------------------------------------------------- */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Banner */}
                <div className={`relative h-44 sm:h-56 bg-gradient-to-br ${gradient}`}>
                    {/* Decorative pattern overlay */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-6 left-8 w-32 h-32 border border-white/40 rounded-full" />
                        <div className="absolute bottom-4 right-12 w-48 h-48 border border-white/30 rounded-full" />
                        <div className="absolute top-12 right-1/3 w-20 h-20 border border-white/20 rounded-full" />
                    </div>
                    {/* Gradient fade at bottom for smooth text overlap */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                {/* Content below banner */}
                <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                    <div className="flex flex-col sm:flex-row gap-5">
                        {/* Group Avatar */}
                        <div className="-mt-14 sm:-mt-16 flex-shrink-0">
                            <div className={`w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br ${gradient} rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-3xl sm:text-4xl select-none`}>
                                {group.name.charAt(0).toUpperCase()}
                            </div>
                        </div>

                        {/* Group Info */}
                        <div className="flex-1 min-w-0 pt-1 sm:pt-2">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight truncate">
                                {group.name}
                            </h1>

                            {/* Stats row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5 font-medium text-gray-700">
                                    <Users className="w-4 h-4" />
                                    <span className="tabular-nums">{group.member_count}</span>
                                    <span className="text-gray-400">/ {group.max_members}</span>
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${accent.light} ${accent.text}`}>
                                    <Hash className="w-3 h-3" />
                                    {group.category}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    {getVisibilityIcon(group.visibility)}
                                    {getVisibilityLabel(group.visibility)}
                                </span>
                                {group.location && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4" />
                                        {group.location}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    Created {formatDate(group.created_at)}
                                </span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-start gap-2 pt-1 sm:pt-2 sm:flex-nowrap">
                            {userMembership ? (
                                <>
                                    <button
                                        onClick={() => navigate('/messages')}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all text-sm font-semibold shadow-sm"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Chat
                                    </button>
                                    {canManageMembers && (
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className={`flex items-center gap-2 px-4 py-2.5 ${accent.bg} text-white rounded-xl hover:opacity-90 transition-all text-sm font-semibold shadow-sm`}
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Invite
                                        </button>
                                    )}
                                    {userMembership.role !== 'OWNER' && (
                                        <button
                                            onClick={() => setShowLeaveModal(true)}
                                            className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all text-sm font-medium"
                                            title="Leave Group"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                            <span className="sm:hidden lg:inline">Leave</span>
                                        </button>
                                    )}
                                </>
                            ) : group.visibility === 'PUBLIC' ? (
                                <button
                                    onClick={joinGroup}
                                    disabled={processingAction === 'join'}
                                    className={`flex items-center gap-2 px-6 py-2.5 ${accent.bg} text-white rounded-xl hover:opacity-90 transition-all text-sm font-semibold shadow-sm disabled:opacity-50`}
                                >
                                    {processingAction === 'join' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <UserPlus className="w-4 h-4" />
                                    )}
                                    Join Group
                                </button>
                            ) : (
                                <span className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                                    <Lock className="w-4 h-4" />
                                    {group.visibility === 'INVITE_ONLY' ? 'Invite Only' : 'Private Group'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Member capacity bar */}
                    <div className="mt-5 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                    memberCapacityPercent > 90 ? 'bg-red-500' :
                                    memberCapacityPercent > 70 ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                }`}
                                style={{ width: `${memberCapacityPercent}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-400 font-medium tabular-nums flex-shrink-0">
                            {memberCapacityPercent}% full
                        </span>
                    </div>
                </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/*  MAIN CONTENT: sidebar + members                         */}
            {/* -------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ---- LEFT SIDEBAR ---- */}
                <div className="lg:col-span-1 space-y-5">

                    {/* About this group */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Info className="w-4 h-4 text-gray-400" />
                                About this group
                            </h3>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Visibility */}
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                                    {group.visibility === 'PUBLIC' ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">{getVisibilityLabel(group.visibility)}</p>
                                    <p className="text-xs text-gray-400">
                                        {group.visibility === 'PUBLIC'
                                            ? 'Anyone can find and join'
                                            : group.visibility === 'PRIVATE'
                                            ? 'Visible but requires approval'
                                            : 'Hidden, invite only'}
                                    </p>
                                </div>
                            </div>

                            {/* Category */}
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                                    <Hash className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">{group.category}</p>
                                    <p className="text-xs text-gray-400">Category</p>
                                </div>
                            </div>

                            {/* Capacity */}
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">{group.member_count} of {group.max_members} members</p>
                                    <p className="text-xs text-gray-400">Capacity</p>
                                </div>
                            </div>

                            {/* Location */}
                            {group.location && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">{group.location}</p>
                                        <p className="text-xs text-gray-400">Location</p>
                                    </div>
                                </div>
                            )}

                            {/* Owner */}
                            {group.owner && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                                        <Crown className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <Link
                                            to={`/profile/${group.owner.id}`}
                                            className="font-medium text-gray-700 hover:text-blue-600 transition-colors"
                                        >
                                            {group.owner.full_name}
                                        </Link>
                                        <p className="text-xs text-gray-400">Owner</p>
                                    </div>
                                </div>
                            )}

                            {/* Created date */}
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">{formatDate(group.created_at)}</p>
                                    <p className="text-xs text-gray-400">Created</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {group.description && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-gray-400" />
                                    Description
                                </h3>
                            </div>
                            <div className="p-5">
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {group.description}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Rules */}
                    {group.rules && (
                        <div className="bg-amber-50/60 rounded-2xl border border-amber-200/70 shadow-sm overflow-hidden">
                            <button
                                onClick={() => setRulesExpanded(!rulesExpanded)}
                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-amber-50 transition-colors"
                            >
                                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-amber-600" />
                                    Group Rules
                                </h3>
                                <ChevronDown
                                    className={`w-4 h-4 text-amber-500 transition-transform duration-200 ${
                                        rulesExpanded ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    rulesExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <div className="px-5 pb-5">
                                    <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-wrap">
                                        {group.rules}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activity preview */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-gray-400" />
                                Recent Activity
                            </h3>
                        </div>
                        <div className="p-5">
                            <div className="flex flex-col items-center text-center py-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                                    <Car className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-500">Share rides and connect</p>
                                <p className="text-xs text-gray-400 mt-0.5">with group members</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ---- RIGHT: MEMBERS ---- */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Members header */}
                        <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    Members
                                    <span className={`ml-1 inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full ${accent.light} ${accent.text}`}>
                                        {members.length}
                                    </span>
                                </h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        placeholder="Search members..."
                                        className="w-full sm:w-56 pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Members list */}
                        <div className="p-5 sm:p-6">
                            {totalFilteredMembers === 0 && memberSearch ? (
                                <div className="text-center py-8">
                                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No members matching "{memberSearch}"</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Owner section */}
                                    {ownerMembers.length > 0 && (
                                        <MemberSection
                                            title="Owner"
                                            members={ownerMembers}
                                            accent={accent}
                                            canManageMembers={canManageMembers}
                                            currentUserId={profile?.id}
                                            currentUserRole={userMembership?.role}
                                            showMemberActions={showMemberActions}
                                            setShowMemberActions={setShowMemberActions}
                                            memberActionsRef={memberActionsRef}
                                            processingAction={processingAction}
                                            updateMemberRole={updateMemberRole}
                                            setShowRemoveConfirm={setShowRemoveConfirm}
                                        />
                                    )}

                                    {/* Admins section */}
                                    {adminMembers.length > 0 && (
                                        <MemberSection
                                            title="Admins"
                                            members={adminMembers}
                                            accent={accent}
                                            canManageMembers={canManageMembers}
                                            currentUserId={profile?.id}
                                            currentUserRole={userMembership?.role}
                                            showMemberActions={showMemberActions}
                                            setShowMemberActions={setShowMemberActions}
                                            memberActionsRef={memberActionsRef}
                                            processingAction={processingAction}
                                            updateMemberRole={updateMemberRole}
                                            setShowRemoveConfirm={setShowRemoveConfirm}
                                        />
                                    )}

                                    {/* Regular members section */}
                                    {regularMembers.length > 0 && (
                                        <MemberSection
                                            title="Members"
                                            members={regularMembers}
                                            accent={accent}
                                            canManageMembers={canManageMembers}
                                            currentUserId={profile?.id}
                                            currentUserRole={userMembership?.role}
                                            showMemberActions={showMemberActions}
                                            setShowMemberActions={setShowMemberActions}
                                            memberActionsRef={memberActionsRef}
                                            processingAction={processingAction}
                                            updateMemberRole={updateMemberRole}
                                            setShowRemoveConfirm={setShowRemoveConfirm}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/*  MODALS                                                  */}
            {/* -------------------------------------------------------- */}

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

            {/* Remove Member Confirmation Modal */}
            <ConfirmModal
                isOpen={!!showRemoveConfirm}
                onClose={() => setShowRemoveConfirm(null)}
                onConfirm={() => {
                    if (showRemoveConfirm) {
                        removeMember(showRemoveConfirm.memberId, showRemoveConfirm.userName);
                        setShowRemoveConfirm(null);
                    }
                }}
                title="Remove Member"
                message={`Are you sure you want to remove ${showRemoveConfirm?.userName || 'this member'} from the group?`}
                confirmText="Remove"
                variant="danger"
                loading={!!processingAction}
            />

            {/* Invite Modal */}
            {showInviteModal && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowInviteModal(false);
                            setInviteSearch('');
                            setInviteSearchResults([]);
                            setInvitedUserIds(new Set());
                        }
                    }}
                >
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 sm:animate-in sm:fade-in sm:zoom-in-95 sm:duration-200">
                        {/* Modal header */}
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Invite Members</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Search and invite people to {group.name}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowInviteModal(false);
                                        setInviteSearch('');
                                        setInviteSearchResults([]);
                                        setInvitedUserIds(new Set());
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            {/* Search input */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                <input
                                    type="text"
                                    value={inviteSearch}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setInviteSearch(value);
                                        clearTimeout(inviteSearchTimeoutRef.current);
                                        inviteSearchTimeoutRef.current = setTimeout(() => {
                                            searchUsersToInvite(value);
                                        }, 300);
                                    }}
                                    placeholder="Search users by name..."
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {searchingUsers ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                                    <p className="text-xs text-gray-400">Searching...</p>
                                </div>
                            ) : inviteSearchResults.length > 0 ? (
                                <div className="space-y-2">
                                    {inviteSearchResults.map((user) => {
                                        const isInvited = invitedUserIds.has(user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                                                    isInvited
                                                        ? 'bg-green-50 border border-green-100'
                                                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <UserAvatar
                                                        user={{
                                                            id: user.id,
                                                            full_name: user.full_name,
                                                            avatar_url: user.avatar_url || user.profile_photo_url
                                                        }}
                                                        size="sm"
                                                    />
                                                    <span className="font-medium text-gray-900 text-sm truncate">
                                                        {user.full_name}
                                                    </span>
                                                </div>
                                                {isInvited ? (
                                                    <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg flex-shrink-0">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Invited
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => inviteUser(user.id)}
                                                        disabled={processingAction === user.id}
                                                        className={`px-3.5 py-1.5 ${accent.bg} text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex-shrink-0`}
                                                    >
                                                        {processingAction === user.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            'Invite'
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : inviteSearch.trim() ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                                        <Users className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium">No users found</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Try a different search term</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                                        <Search className="w-6 h-6 text-blue-300" />
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium">Search for users</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Type a name above to find people to invite</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ================================================================== */
/*  Member Section component                                          */
/* ================================================================== */
interface MemberSectionProps {
    title: string;
    members: GroupMember[];
    accent: { bg: string; text: string; border: string; light: string };
    canManageMembers: boolean;
    currentUserId?: string;
    currentUserRole?: string;
    showMemberActions: string | null;
    setShowMemberActions: (id: string | null) => void;
    memberActionsRef: React.RefObject<HTMLDivElement>;
    processingAction: string | null;
    updateMemberRole: (memberId: string, newRole: string) => void;
    setShowRemoveConfirm: (data: { memberId: string; userName: string } | null) => void;
}

function MemberSection({
    title,
    members,
    accent,
    canManageMembers,
    currentUserId,
    currentUserRole,
    showMemberActions,
    setShowMemberActions,
    memberActionsRef,
    processingAction,
    updateMemberRole,
    setShowRemoveConfirm,
}: MemberSectionProps) {
    return (
        <div>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</span>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300 font-medium tabular-nums">{members.length}</span>
            </div>

            {/* Members grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {members.map((member) => (
                    <MemberCard
                        key={member.id}
                        member={member}
                        accent={accent}
                        canManageMembers={canManageMembers}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        showMemberActions={showMemberActions}
                        setShowMemberActions={setShowMemberActions}
                        memberActionsRef={memberActionsRef}
                        processingAction={processingAction}
                        updateMemberRole={updateMemberRole}
                        setShowRemoveConfirm={setShowRemoveConfirm}
                    />
                ))}
            </div>
        </div>
    );
}

/* ================================================================== */
/*  Member Card component                                             */
/* ================================================================== */
interface MemberCardProps {
    member: GroupMember;
    accent: { bg: string; text: string; border: string; light: string };
    canManageMembers: boolean;
    currentUserId?: string;
    currentUserRole?: string;
    showMemberActions: string | null;
    setShowMemberActions: (id: string | null) => void;
    memberActionsRef: React.RefObject<HTMLDivElement>;
    processingAction: string | null;
    updateMemberRole: (memberId: string, newRole: string) => void;
    setShowRemoveConfirm: (data: { memberId: string; userName: string } | null) => void;
}

function MemberCard({
    member,
    accent,
    canManageMembers,
    currentUserId,
    currentUserRole,
    showMemberActions,
    setShowMemberActions,
    memberActionsRef,
    processingAction,
    updateMemberRole,
    setShowRemoveConfirm,
}: MemberCardProps) {
    const isOpen = showMemberActions === member.id;
    const showActions = canManageMembers && member.user_id !== currentUserId && member.role !== 'OWNER';

    return (
        <div className="group relative bg-gray-50/70 hover:bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm p-4 transition-all duration-200">
            <div className="flex items-start gap-3">
                {/* Avatar with role badge */}
                <Link to={`/profile/${member.user_id}`} className="relative flex-shrink-0">
                    <UserAvatar
                        user={{
                            id: member.user.id,
                            full_name: member.user.full_name,
                            avatar_url: member.user.avatar_url || member.user.profile_photo_url
                        }}
                        size="sm"
                        verified={member.user.profile_verified}
                    />
                    {/* Role badge overlay */}
                    {member.role === 'OWNER' && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                    {member.role === 'ADMIN' && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            <Shield className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </Link>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                    <Link
                        to={`/profile/${member.user_id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block"
                    >
                        {member.user.full_name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {member.role !== 'MEMBER' && (
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${
                                member.role === 'OWNER' ? 'text-amber-600' :
                                member.role === 'ADMIN' ? 'text-purple-600' :
                                'text-blue-600'
                            }`}>
                                {member.role === 'MODERATOR' ? 'Mod' : member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                            </span>
                        )}
                        {member.role !== 'MEMBER' && (
                            <span className="text-gray-200">|</span>
                        )}
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(member.joined_at)}
                        </span>
                    </div>
                </div>

                {/* 3-dot menu */}
                {showActions && (
                    <div className="relative" ref={isOpen ? memberActionsRef : undefined}>
                        <button
                            onClick={() => setShowMemberActions(isOpen ? null : member.id)}
                            className="p-1.5 text-gray-300 group-hover:text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {isOpen && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-150">
                                {currentUserRole === 'OWNER' && member.role === 'MEMBER' && (
                                    <button
                                        onClick={() => updateMemberRole(member.id, 'ADMIN')}
                                        className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                                    >
                                        <Shield className="w-4 h-4 text-purple-500" />
                                        Make Admin
                                    </button>
                                )}
                                {currentUserRole === 'OWNER' && member.role === 'ADMIN' && (
                                    <button
                                        onClick={() => updateMemberRole(member.id, 'MEMBER')}
                                        className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-gray-400" />
                                        Remove Admin
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowMemberActions(null);
                                        setShowRemoveConfirm({ memberId: member.id, userName: member.user.full_name });
                                    }}
                                    disabled={processingAction === member.id}
                                    className="w-full px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                                >
                                    {processingAction === member.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <UserMinus className="w-4 h-4" />
                                    )}
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
