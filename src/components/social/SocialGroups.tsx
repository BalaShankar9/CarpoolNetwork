import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Users, Plus, Search, Globe, Lock, UserPlus,
    MessageCircle, Settings, ChevronRight, Crown,
    MapPin, Calendar, User, Loader2, X,
    ChevronLeft, Sparkles, ArrowRight, LogOut,
    Shield, Star, Check, Eye, BookOpen
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

const CATEGORY_EMOJI: Record<string, string> = {
    'General': '\u{1F4AC}',
    'Commuters': '\u{1F697}',
    'Students': '\u{1F4DA}',
    'Professionals': '\u{1F4BC}',
    'Families': '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}',
    'Weekend Travelers': '\u2708\uFE0F',
    'Long Distance': '\u{1F6E3}\uFE0F',
    'Events': '\u{1F389}',
    'Local Area': '\u{1F4CD}',
    'Eco-Friendly': '\u{1F331}'
};

const CATEGORY_GRADIENT: Record<string, string> = {
    'General': 'from-slate-500 to-slate-700',
    'Commuters': 'from-blue-500 to-blue-700',
    'Students': 'from-amber-500 to-orange-600',
    'Professionals': 'from-indigo-500 to-indigo-700',
    'Families': 'from-pink-500 to-rose-600',
    'Weekend Travelers': 'from-cyan-500 to-teal-600',
    'Long Distance': 'from-violet-500 to-purple-700',
    'Events': 'from-fuchsia-500 to-pink-600',
    'Local Area': 'from-emerald-500 to-green-700',
    'Eco-Friendly': 'from-green-500 to-emerald-600'
};

const CATEGORY_BORDER_COLOR: Record<string, string> = {
    'General': 'border-slate-300',
    'Commuters': 'border-blue-300',
    'Students': 'border-amber-300',
    'Professionals': 'border-indigo-300',
    'Families': 'border-pink-300',
    'Weekend Travelers': 'border-cyan-300',
    'Long Distance': 'border-violet-300',
    'Events': 'border-fuchsia-300',
    'Local Area': 'border-emerald-300',
    'Eco-Friendly': 'border-green-300'
};

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Public', description: 'Anyone can find and join', icon: Globe },
    { value: 'PRIVATE', label: 'Private', description: 'Visible but requires approval', icon: Lock },
    { value: 'INVITE_ONLY', label: 'Invite Only', description: 'Hidden, invite only', icon: UserPlus },
];

/* ------------------------------------------------------------------ */
/*  Stacked avatar placeholders for member previews                    */
/* ------------------------------------------------------------------ */
function MemberAvatarStack({ count }: { count: number }) {
    const show = Math.min(count, 4);
    const colors = [
        'bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'
    ];
    return (
        <div className="flex items-center -space-x-2">
            {Array.from({ length: show }).map((_, i) => (
                <div
                    key={i}
                    className={`w-7 h-7 rounded-full ${colors[i]} border-2 border-white flex items-center justify-center`}
                >
                    <User className="w-3.5 h-3.5 text-white" />
                </div>
            ))}
            {count > 4 && (
                <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-600">+{count - 4}</span>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Visibility badge                                                   */
/* ------------------------------------------------------------------ */
function VisibilityBadge({ visibility }: { visibility: string }) {
    const config: Record<string, { icon: typeof Globe; label: string; cls: string }> = {
        PUBLIC: { icon: Globe, label: 'Public', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        PRIVATE: { icon: Lock, label: 'Private', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        INVITE_ONLY: { icon: Shield, label: 'Invite Only', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    };
    const c = config[visibility] || config.PUBLIC;
    const Icon = c.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.cls}`}>
            <Icon className="w-3 h-3" />
            {c.label}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  Time-ago helper                                                    */
/* ------------------------------------------------------------------ */
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
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

    // Wizard step for create modal
    const [wizardStep, setWizardStep] = useState(1);

    // Featured carousel
    const [heroIndex, setHeroIndex] = useState(0);
    const carouselInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Category pills scroll ref
    const pillsRef = useRef<HTMLDivElement>(null);

    /* -------------------------------------------------------------- */
    /*  Data loading (unchanged logic)                                 */
    /* -------------------------------------------------------------- */
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

    /* Featured groups = top 3 by member count */
    const featuredGroups = [...groups].sort((a, b) => b.member_count - a.member_count).slice(0, 3);

    /* Auto-rotate carousel */
    useEffect(() => {
        if (featuredGroups.length <= 1) return;
        carouselInterval.current = setInterval(() => {
            setHeroIndex(prev => (prev + 1) % featuredGroups.length);
        }, 5000);
        return () => {
            if (carouselInterval.current) clearInterval(carouselInterval.current);
        };
    }, [featuredGroups.length]);

    /* -------------------------------------------------------------- */
    /*  Actions (unchanged logic)                                      */
    /* -------------------------------------------------------------- */
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
        setWizardStep(1);
    };

    /* -------------------------------------------------------------- */
    /*  LOADING STATE                                                  */
    /* -------------------------------------------------------------- */
    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Loading groups...</p>
                </div>
            </div>
        );
    }

    /* -------------------------------------------------------------- */
    /*  RENDER                                                         */
    /* -------------------------------------------------------------- */
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* ===== HEADER ===== */}
            <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5">
                {/* Decorative dots */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                </div>

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Social Groups</h3>
                            <p className="text-xs text-blue-100">Connect with fellow carpoolers</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 rounded-xl hover:bg-blue-50 transition-all font-semibold text-sm shadow-lg shadow-indigo-900/20 hover:shadow-xl hover:shadow-indigo-900/30 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Plus className="w-4 h-4" />
                        Create Group
                    </button>
                </div>

                {/* ===== TABS ===== */}
                <div className="relative mt-5 flex gap-1 bg-white/10 rounded-xl p-1 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'discover'
                                ? 'bg-white text-indigo-700 shadow-md'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <span className="flex items-center justify-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            Discover
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('my-groups')}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'my-groups'
                                ? 'bg-white text-indigo-700 shadow-md'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <span className="flex items-center justify-center gap-1.5">
                            <Users className="w-4 h-4" />
                            My Groups
                            {myGroups.length > 0 && (
                                <span className={`ml-0.5 min-w-[20px] h-5 px-1.5 rounded-full text-xs flex items-center justify-center font-bold ${
                                    activeTab === 'my-groups'
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'bg-white/20 text-white'
                                }`}>
                                    {myGroups.length}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('invites')}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                            activeTab === 'invites'
                                ? 'bg-white text-indigo-700 shadow-md'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <span className="flex items-center justify-center gap-1.5">
                            <UserPlus className="w-4 h-4" />
                            Invites
                        </span>
                        {invites.length > 0 && (
                            <span className="absolute -top-1.5 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-indigo-600 animate-pulse">
                                {invites.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ===== TAB CONTENT ===== */}
            <div className="p-6">

                {/* ========================================================= */}
                {/*  DISCOVER TAB                                              */}
                {/* ========================================================= */}
                {activeTab === 'discover' && (
                    <div className="space-y-6">

                        {/* --- Featured Carousel --- */}
                        {featuredGroups.length > 0 && !searchQuery && !selectedCategory && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Featured Groups</h4>
                                </div>
                                <div className="relative rounded-2xl overflow-hidden group/carousel">
                                    {/* Slides */}
                                    {featuredGroups.map((fg, idx) => {
                                        const grad = CATEGORY_GRADIENT[fg.category] || 'from-blue-500 to-indigo-700';
                                        return (
                                            <div
                                                key={fg.id}
                                                className={`transition-all duration-700 ease-in-out ${
                                                    idx === heroIndex
                                                        ? 'opacity-100 translate-x-0 relative'
                                                        : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'
                                                }`}
                                            >
                                                <div
                                                    className={`bg-gradient-to-br ${grad} rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow`}
                                                    onClick={() => navigate(`/social/groups/${fg.id}`)}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-lg">{CATEGORY_EMOJI[fg.category] || '\u{1F4AC}'}</span>
                                                                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{fg.category}</span>
                                                            </div>
                                                            <h3 className="text-xl font-bold text-white mb-1 truncate">{fg.name}</h3>
                                                            {fg.description && (
                                                                <p className="text-sm text-white/80 line-clamp-2 mb-4 max-w-md">{fg.description}</p>
                                                            )}
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <MemberAvatarStack count={fg.member_count} />
                                                                    <span className="text-sm font-medium text-white/90">
                                                                        {fg.member_count} {fg.member_count === 1 ? 'member' : 'members'}
                                                                    </span>
                                                                </div>
                                                                {fg.location && (
                                                                    <span className="flex items-center gap-1 text-sm text-white/70">
                                                                        <MapPin className="w-3.5 h-3.5" />
                                                                        {fg.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 ml-4">
                                                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold">
                                                                {fg.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                                                        <VisibilityBadge visibility={fg.visibility} />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                joinGroup(fg.id);
                                                            }}
                                                            disabled={processingGroup === fg.id}
                                                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-white/90 transition-all disabled:opacity-50 shadow-lg"
                                                        >
                                                            {processingGroup === fg.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Plus className="w-4 h-4" />
                                                            )}
                                                            Join Group
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Carousel dots */}
                                    {featuredGroups.length > 1 && (
                                        <div className="flex items-center justify-center gap-2 mt-3">
                                            {featuredGroups.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setHeroIndex(i)}
                                                    className={`transition-all duration-300 rounded-full ${
                                                        i === heroIndex
                                                            ? 'w-6 h-2 bg-indigo-600'
                                                            : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                                                    }`}
                                                    aria-label={`Show featured group ${i + 1}`}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Prev / Next arrows */}
                                    {featuredGroups.length > 1 && (
                                        <>
                                            <button
                                                onClick={() => setHeroIndex((heroIndex - 1 + featuredGroups.length) % featuredGroups.length)}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-md hover:bg-white"
                                                aria-label="Previous featured group"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setHeroIndex((heroIndex + 1) % featuredGroups.length)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-md hover:bg-white"
                                                aria-label="Next featured group"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- Search bar --- */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search groups by name or description..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* --- Category pills --- */}
                        <div className="relative -mx-6 px-6">
                            <div
                                ref={pillsRef}
                                className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                                        selectedCategory === null
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    All
                                </button>
                                {CATEGORY_OPTIONS.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                                            selectedCategory === cat
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>{CATEGORY_EMOJI[cat]}</span>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* --- Group cards grid --- */}
                        {filteredGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                    <Search className="w-8 h-8 text-gray-300" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">No groups found</h4>
                                <p className="text-sm text-gray-500 max-w-xs mb-6">
                                    {searchQuery || selectedCategory
                                        ? 'Try adjusting your search or clearing the filters'
                                        : 'Be the first to create a group and start connecting!'
                                    }
                                </p>
                                {(searchQuery || selectedCategory) && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory(null);
                                        }}
                                        className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                                    >
                                        Clear all filters
                                    </button>
                                )}
                                {!searchQuery && !selectedCategory && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                                    >
                                        Create a Group
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredGroups.map((group) => {
                                    const grad = CATEGORY_GRADIENT[group.category] || 'from-blue-500 to-indigo-700';
                                    return (
                                        <div
                                            key={group.id}
                                            className="group/card bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer flex flex-col"
                                            onClick={() => navigate(`/social/groups/${group.id}`)}
                                        >
                                            {/* Gradient stripe */}
                                            <div className={`h-2 bg-gradient-to-r ${grad}`} />

                                            <div className="p-4 flex flex-col flex-1">
                                                {/* Top row: avatar + name */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md`}>
                                                        {group.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1 group-hover/card:text-indigo-700 transition-colors">
                                                            {group.name}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-xs text-gray-400">{CATEGORY_EMOJI[group.category]}</span>
                                                            <span className="text-xs text-gray-500">{group.category}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                {group.description && (
                                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
                                                        {group.description}
                                                    </p>
                                                )}
                                                {!group.description && <div className="flex-1" />}

                                                {/* Badges row */}
                                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                    <VisibilityBadge visibility={group.visibility} />
                                                    {group.location && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            <MapPin className="w-3 h-3" />
                                                            {group.location}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <MemberAvatarStack count={group.member_count} />
                                                        <span className="text-xs font-medium text-gray-500">
                                                            {group.member_count}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            joinGroup(group.id);
                                                        }}
                                                        disabled={processingGroup === group.id}
                                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md hover:shadow-indigo-200 active:scale-95"
                                                    >
                                                        {processingGroup === group.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Plus className="w-3.5 h-3.5" />
                                                        )}
                                                        Join
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/*  MY GROUPS TAB                                             */}
                {/* ========================================================= */}
                {activeTab === 'my-groups' && (
                    <div>
                        {myGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-5">
                                    <Users className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">Create your first group</h4>
                                <p className="text-sm text-gray-500 max-w-xs mb-6">
                                    Join existing groups or start your own community of carpoolers
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setActiveTab('discover')}
                                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Browse Groups
                                    </button>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Group
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myGroups.map((group) => {
                                    const grad = CATEGORY_GRADIENT[group.category] || 'from-blue-500 to-indigo-700';
                                    const borderColor = CATEGORY_BORDER_COLOR[group.category] || 'border-gray-200';
                                    return (
                                        <div
                                            key={group.id}
                                            className={`group/mycard flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white rounded-xl border ${borderColor} hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 cursor-pointer`}
                                            onClick={() => navigate(`/social/groups/${group.id}`)}
                                        >
                                            {/* Left: Avatar + info */}
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md relative`}>
                                                    {group.name.charAt(0).toUpperCase()}
                                                    {group.user_role === 'OWNER' && (
                                                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center ring-2 ring-white">
                                                            <Crown className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h4 className="font-semibold text-gray-900 truncate group-hover/mycard:text-indigo-700 transition-colors">
                                                            {group.name}
                                                        </h4>
                                                        {group.user_role === 'OWNER' && (
                                                            <span className="flex-shrink-0 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded-full border border-amber-200">
                                                                Owner
                                                            </span>
                                                        )}
                                                        {group.user_role === 'ADMIN' && (
                                                            <span className="flex-shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-full border border-blue-200">
                                                                Admin
                                                            </span>
                                                        )}
                                                        {group.user_role === 'MEMBER' && (
                                                            <span className="flex-shrink-0 px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase rounded-full border border-gray-200">
                                                                Member
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3.5 h-3.5" />
                                                            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                                        </span>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="flex items-center gap-1">
                                                            {CATEGORY_EMOJI[group.category]} {group.category}
                                                        </span>
                                                        {group.location && (
                                                            <>
                                                                <span className="text-gray-300">|</span>
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="w-3.5 h-3.5" />
                                                                    {group.location}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>Created {timeAgo(group.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Actions */}
                                            <div className="flex items-center gap-2 sm:flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => navigate(`/messages?groupId=${group.id}`)}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-semibold"
                                                    title="Group Chat"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Chat</span>
                                                </button>
                                                {group.user_role === 'OWNER' && (
                                                    <button
                                                        onClick={() => navigate(`/social/groups/${group.id}/settings`)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-semibold"
                                                        title="Group Settings"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Settings</span>
                                                    </button>
                                                )}
                                                {group.user_role !== 'OWNER' && (
                                                    <button
                                                        onClick={() => leaveGroup(group.id)}
                                                        disabled={processingGroup === group.id}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-semibold disabled:opacity-50"
                                                        title="Leave Group"
                                                    >
                                                        {processingGroup === group.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <LogOut className="w-4 h-4" />
                                                        )}
                                                        <span className="hidden sm:inline">Leave</span>
                                                    </button>
                                                )}
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover/mycard:bg-indigo-50 transition-colors">
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover/mycard:text-indigo-600 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/*  INVITES TAB                                               */}
                {/* ========================================================= */}
                {activeTab === 'invites' && (
                    <div>
                        {invites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-5">
                                    <UserPlus className="w-10 h-10 text-violet-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">No pending invitations</h4>
                                <p className="text-sm text-gray-500 max-w-xs">
                                    When someone invites you to their group, it will show up here
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {invites.map((invite, idx) => {
                                    const grad = CATEGORY_GRADIENT[invite.group?.category || 'General'] || 'from-blue-500 to-indigo-700';
                                    return (
                                        <div
                                            key={invite.id}
                                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
                                            style={{
                                                animation: `slideInUp 0.4s ease-out ${idx * 0.1}s both`
                                            }}
                                        >
                                            {/* Gradient accent bar */}
                                            <div className={`h-1.5 bg-gradient-to-r ${grad}`} />

                                            <div className="p-5">
                                                <div className="flex items-start gap-4">
                                                    {/* Group avatar */}
                                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md`}>
                                                        {invite.group?.name?.charAt(0).toUpperCase() || 'G'}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        {/* Group name + info */}
                                                        <h4 className="font-semibold text-gray-900 text-base mb-1">
                                                            {invite.group?.name}
                                                        </h4>

                                                        {/* Inviter row */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {invite.inviter && (
                                                                <UserAvatar
                                                                    user={{ full_name: invite.inviter.full_name, avatar_url: invite.inviter.avatar_url }}
                                                                    size="xs"
                                                                />
                                                            )}
                                                            <span className="text-sm text-gray-600">
                                                                Invited by <span className="font-medium text-gray-800">{invite.inviter?.full_name || 'Unknown'}</span>
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {timeAgo(invite.created_at)}
                                                            </span>
                                                        </div>

                                                        {/* Invite message */}
                                                        {invite.message && (
                                                            <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg border-l-2 border-indigo-300">
                                                                <p className="text-sm text-gray-600 italic">"{invite.message}"</p>
                                                            </div>
                                                        )}

                                                        {/* Group meta row */}
                                                        {invite.group && (
                                                            <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3.5 h-3.5" />
                                                                    {invite.group.member_count} members
                                                                </span>
                                                                <VisibilityBadge visibility={invite.group.visibility} />
                                                            </div>
                                                        )}

                                                        {/* Action buttons */}
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => respondToInvite(invite.id, true)}
                                                                disabled={processingGroup === invite.id}
                                                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all font-semibold text-sm disabled:opacity-50 shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 active:scale-[0.98]"
                                                            >
                                                                {processingGroup === invite.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="w-4 h-4" />
                                                                )}
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => respondToInvite(invite.id, false)}
                                                                disabled={processingGroup === invite.id}
                                                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold text-sm disabled:opacity-50 active:scale-[0.98]"
                                                            >
                                                                <X className="w-4 h-4" />
                                                                Decline
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/*  CREATE GROUP MODAL  --  Multi-step wizard                  */}
            {/* ========================================================= */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
                    <div
                        className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ animation: 'modalSlideIn 0.3s ease-out' }}
                    >
                        {/* Modal header */}
                        <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                            </div>
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Create New Group</h3>
                                    <p className="text-xs text-indigo-200 mt-0.5">
                                        Step {wizardStep} of 3 &mdash;{' '}
                                        {wizardStep === 1 && 'Name & Description'}
                                        {wizardStep === 2 && 'Visibility & Category'}
                                        {wizardStep === 3 && 'Location & Rules'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                                    className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4 flex gap-2">
                                {[1, 2, 3].map(step => (
                                    <div key={step} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/20">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                step <= wizardStep ? 'bg-white w-full' : 'bg-transparent w-0'
                                            }`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="flex">
                                {/* ===== STEP 1: Name & Description ===== */}
                                <div
                                    className="w-full flex-shrink-0 p-6 space-y-5 transition-all duration-300"
                                    style={{
                                        marginLeft: `-${(wizardStep - 1) * 100}%`,
                                        opacity: wizardStep === 1 ? 1 : 0,
                                        pointerEvents: wizardStep === 1 ? 'auto' : 'none',
                                    }}
                                >
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Group Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="e.g., London Morning Commuters"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                                            maxLength={100}
                                            autoFocus
                                        />
                                        <p className="text-xs text-gray-400 mt-1.5">{newGroupName.length}/100 characters</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={newGroupDescription}
                                            onChange={(e) => setNewGroupDescription(e.target.value)}
                                            placeholder="Tell people what your group is about..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all resize-none placeholder:text-gray-400"
                                            maxLength={500}
                                        />
                                        <p className="text-xs text-gray-400 mt-1.5">{newGroupDescription.length}/500 characters</p>
                                    </div>
                                </div>

                                {/* ===== STEP 2: Visibility & Category ===== */}
                                <div
                                    className="w-full flex-shrink-0 p-6 space-y-5 transition-all duration-300"
                                    style={{
                                        opacity: wizardStep === 2 ? 1 : 0,
                                        pointerEvents: wizardStep === 2 ? 'auto' : 'none',
                                    }}
                                >
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Visibility
                                        </label>
                                        <div className="space-y-2">
                                            {VISIBILITY_OPTIONS.map((option) => {
                                                const isSelected = newGroupVisibility === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => setNewGroupVisibility(option.value as any)}
                                                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                                                            isSelected
                                                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 shadow-sm'
                                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                            isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            <option.icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-semibold ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                                                                {option.label}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{option.description}</p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                            isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Category
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CATEGORY_OPTIONS.map(cat => {
                                                const isSelected = newGroupCategory === cat;
                                                return (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setNewGroupCategory(cat)}
                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                                                            isSelected
                                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <span>{CATEGORY_EMOJI[cat]}</span>
                                                        <span className="truncate">{cat}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* ===== STEP 3: Location, Rules & Preview ===== */}
                                <div
                                    className="w-full flex-shrink-0 p-6 space-y-5 transition-all duration-300"
                                    style={{
                                        opacity: wizardStep === 3 ? 1 : 0,
                                        pointerEvents: wizardStep === 3 ? 'auto' : 'none',
                                    }}
                                >
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Location <span className="text-gray-400 font-normal">(optional)</span>
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={newGroupLocation}
                                                onChange={(e) => setNewGroupLocation(e.target.value)}
                                                placeholder="e.g., London, Manchester"
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Group Rules <span className="text-gray-400 font-normal">(optional)</span>
                                        </label>
                                        <div className="relative">
                                            <textarea
                                                value={newGroupRules}
                                                onChange={(e) => setNewGroupRules(e.target.value)}
                                                placeholder="Set some ground rules for members..."
                                                rows={3}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all resize-none placeholder:text-gray-400"
                                                maxLength={1000}
                                            />
                                        </div>
                                    </div>

                                    {/* Preview card */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Preview
                                        </label>
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                            <div className={`h-2 bg-gradient-to-r ${CATEGORY_GRADIENT[newGroupCategory] || 'from-blue-500 to-indigo-700'}`} />
                                            <div className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${CATEGORY_GRADIENT[newGroupCategory] || 'from-blue-500 to-indigo-700'} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                                                        {newGroupName.trim() ? newGroupName.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                                                            {newGroupName.trim() || 'Your Group Name'}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                            {newGroupDescription.trim() || 'Group description will appear here'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <VisibilityBadge visibility={newGroupVisibility} />
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                        {CATEGORY_EMOJI[newGroupCategory]} {newGroupCategory}
                                                    </span>
                                                    {newGroupLocation.trim() && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            <MapPin className="w-3 h-3" />
                                                            {newGroupLocation}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal footer with navigation */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
                            {wizardStep > 1 ? (
                                <button
                                    onClick={() => setWizardStep(wizardStep - 1)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                                    className="px-4 py-2.5 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}

                            {wizardStep < 3 ? (
                                <button
                                    onClick={() => setWizardStep(wizardStep + 1)}
                                    disabled={wizardStep === 1 && !newGroupName.trim()}
                                    className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                                >
                                    Continue
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={createGroup}
                                    disabled={creating || !newGroupName.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300"
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Create Group
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Keyframe animations */}
            <style>{`
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
