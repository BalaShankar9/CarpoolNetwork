import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Plus,
    Search,
    Key,
    MapPin,
    RefreshCw,
    Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    getUserPools,
    searchPools,
    createPool,
    joinPool,
    joinPoolByCode,
    type CarpoolPool,
} from '../services/poolService';
import {
    PoolCard,
    PoolCardSkeleton,
    CreatePoolModal,
    JoinPoolModal,
} from '../components/pools';

type TabType = 'my-pools' | 'discover';

const Pools: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<TabType>('my-pools');
    const [myPools, setMyPools] = useState<CarpoolPool[]>([]);
    const [discoverPools, setDiscoverPools] = useState<CarpoolPool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchOrigin, setSearchOrigin] = useState('');
    const [searchDestination, setSearchDestination] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [selectedPool, setSelectedPool] = useState<CarpoolPool | null>(null);

    // Get user's pool IDs for checking membership
    const myPoolIds = new Set(myPools.map(p => p.id));

    // Load user's pools
    useEffect(() => {
        if (!user) return;

        const loadMyPools = async () => {
            setIsLoading(true);
            try {
                const pools = await getUserPools(user.id);
                setMyPools(pools);
            } catch (err) {
                console.error('Failed to load pools:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadMyPools();
    }, [user]);

    // Load discover pools
    useEffect(() => {
        if (activeTab !== 'discover') return;

        const loadDiscoverPools = async () => {
            setIsLoading(true);
            try {
                const pools = await searchPools(
                    searchOrigin || undefined,
                    searchDestination || undefined
                );
                setDiscoverPools(pools);
            } catch (err) {
                console.error('Failed to search pools:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadDiscoverPools();
    }, [activeTab, searchOrigin, searchDestination]);

    const handleCreatePool = async (
        poolData: Omit<CarpoolPool, 'id' | 'created_by' | 'created_at' | 'invite_code'>
    ) => {
        if (!user) return;
        const newPool = await createPool(user.id, poolData);
        setMyPools(prev => [newPool, ...prev]);
    };

    const handleJoinPool = async (poolId: string, isDriver: boolean) => {
        if (!user) return;
        await joinPool(poolId, user.id, undefined, isDriver);
        // Refresh pools
        const pools = await getUserPools(user.id);
        setMyPools(pools);
    };

    const handleJoinByCode = async (code: string, isDriver: boolean) => {
        if (!user) return;
        const { pool } = await joinPoolByCode(code, user.id, isDriver);
        setMyPools(prev => [pool, ...prev]);
    };

    const handleSearch = () => {
        // Search is triggered by useEffect when searchOrigin/searchDestination change
        // This is for the button click to do a manual refresh
        setIsLoading(true);
        searchPools(searchOrigin || undefined, searchDestination || undefined)
            .then(setDiscoverPools)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <p className="text-gray-500">Please sign in to view pools</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Users className="w-7 h-7" />
                                Carpool Pools
                            </h1>
                            <p className="text-white/80 mt-1">
                                Join or create recurring carpool groups
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Create Pool
                        </button>
                        <button
                            onClick={() => {
                                setSelectedPool(null);
                                setShowJoinModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
                        >
                            <Key className="w-5 h-5" />
                            Join with Code
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-4xl mx-auto px-4 -mt-4">
                <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('my-pools')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === 'my-pools'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        My Pools ({myPools.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === 'discover'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Sparkles className="w-4 h-4 inline mr-1" />
                        Discover
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Discover Search */}
                {activeTab === 'discover' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Origin Area
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                    <input
                                        type="text"
                                        value={searchOrigin}
                                        onChange={e => setSearchOrigin(e.target.value)}
                                        placeholder="e.g., North Side"
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Destination Area
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                    <input
                                        type="text"
                                        value={searchDestination}
                                        onChange={e => setSearchDestination(e.target.value)}
                                        placeholder="e.g., Downtown"
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleSearch}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                >
                                    <Search className="w-4 h-4" />
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pool List */}
                {isLoading ? (
                    <div className="space-y-4">
                        <PoolCardSkeleton count={3} />
                    </div>
                ) : activeTab === 'my-pools' ? (
                    myPools.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                No pools yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                Create a pool for your regular commute or join an existing one
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create Pool
                                </button>
                                <button
                                    onClick={() => setActiveTab('discover')}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Search className="w-5 h-5" />
                                    Discover
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myPools.map(pool => (
                                <PoolCard
                                    key={pool.id}
                                    pool={pool}
                                    isJoined={true}
                                />
                            ))}
                        </div>
                    )
                ) : (
                    discoverPools.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                No pools found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Try adjusting your search or create a new pool
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {discoverPools.map(pool => (
                                <PoolCard
                                    key={pool.id}
                                    pool={pool}
                                    isJoined={myPoolIds.has(pool.id)}
                                    onJoin={() => {
                                        setSelectedPool(pool);
                                        setShowJoinModal(true);
                                    }}
                                />
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Modals */}
            <CreatePoolModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreatePool}
            />

            <JoinPoolModal
                isOpen={showJoinModal}
                onClose={() => {
                    setShowJoinModal(false);
                    setSelectedPool(null);
                }}
                poolName={selectedPool?.name}
                isPrivate={selectedPool?.is_private}
                onJoinPublic={
                    selectedPool && !selectedPool.is_private
                        ? (isDriver) => handleJoinPool(selectedPool.id, isDriver)
                        : undefined
                }
                onJoinByCode={handleJoinByCode}
            />
        </div>
    );
};

export default Pools;
