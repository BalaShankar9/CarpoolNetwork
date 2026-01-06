import { useState, useEffect } from 'react';
import {
    Heart,
    Route,
    Plus,
    Zap,
    Search,
    Star,
    ArrowLeft,
    MapPin,
    Navigation,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FavoriteDriverCard } from '../components/favorites/FavoriteDriverCard';
import { SavedRouteCard } from '../components/favorites/SavedRouteCard';
import {
    getFavoriteDrivers,
    getSavedRoutes,
    createSavedRoute,
    FavoriteDriver,
    SavedRoute,
} from '../services/favoritesService';

type Tab = 'drivers' | 'routes';

export default function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('drivers');
    const [favoriteDrivers, setFavoriteDrivers] = useState<FavoriteDriver[]>([]);
    const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddRoute, setShowAddRoute] = useState(false);

    // New route form state
    const [routeName, setRouteName] = useState('');
    const [routeOrigin, setRouteOrigin] = useState('');
    const [routeDestination, setRouteDestination] = useState('');
    const [savingRoute, setSavingRoute] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const [drivers, routes] = await Promise.all([
                getFavoriteDrivers(user.id),
                getSavedRoutes(user.id),
            ]);
            setFavoriteDrivers(drivers);
            setSavedRoutes(routes);
        } catch (err) {
            console.error('Error loading favorites:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRoute = async () => {
        if (!user || !routeName.trim() || !routeOrigin.trim() || !routeDestination.trim()) {
            return;
        }

        setSavingRoute(true);
        try {
            await createSavedRoute(user.id, {
                name: routeName,
                origin: routeOrigin,
                destination: routeDestination,
                is_default: savedRoutes.length === 0, // First route is default
            });
            await loadData();
            setShowAddRoute(false);
            setRouteName('');
            setRouteOrigin('');
            setRouteDestination('');
        } catch (err: any) {
            alert(err.message || 'Failed to save route');
        } finally {
            setSavingRoute(false);
        }
    };

    const tabs = [
        {
            id: 'drivers' as Tab,
            label: 'Favorite Drivers',
            icon: Heart,
            count: favoriteDrivers.length,
        },
        {
            id: 'routes' as Tab,
            label: 'Saved Routes',
            icon: Route,
            count: savedRoutes.length,
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="flex items-center gap-4 h-16">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Heart className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <h1 className="font-semibold text-gray-900">Favorites</h1>
                                <p className="text-sm text-gray-500">Quick access to your preferred rides</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 pb-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                           transition-colors ${activeTab === tab.id
                                            ? 'bg-red-100 text-red-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id
                                                    ? 'bg-red-200 text-red-800'
                                                    : 'bg-gray-200 text-gray-600'
                                                }`}
                                        >
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                    </div>
                ) : (
                    <>
                        {/* Favorite Drivers Tab */}
                        {activeTab === 'drivers' && (
                            <div className="space-y-4">
                                {favoriteDrivers.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border">
                                        <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            No Favorite Drivers Yet
                                        </h3>
                                        <p className="text-gray-500 mb-4 max-w-md mx-auto">
                                            Save your favorite drivers to quickly find their rides and book with
                                            people you trust.
                                        </p>
                                        <button
                                            onClick={() => navigate('/find-rides')}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                               rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Search className="h-4 w-4" />
                                            Find Rides
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {favoriteDrivers.map(favorite => (
                                            <FavoriteDriverCard
                                                key={favorite.id}
                                                favorite={favorite}
                                                onRemove={loadData}
                                                onUpdate={loadData}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Saved Routes Tab */}
                        {activeTab === 'routes' && (
                            <div className="space-y-4">
                                {/* Add Route Button/Form */}
                                {!showAddRoute ? (
                                    <button
                                        onClick={() => setShowAddRoute(true)}
                                        disabled={savedRoutes.length >= 10}
                                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl
                             text-gray-500 hover:border-blue-400 hover:text-blue-600
                             transition-colors flex items-center justify-center gap-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus className="h-5 w-5" />
                                        Add Saved Route
                                        {savedRoutes.length >= 10 && (
                                            <span className="text-xs">(max 10)</span>
                                        )}
                                    </button>
                                ) : (
                                    <div className="bg-white rounded-xl border p-4 space-y-4">
                                        <h3 className="font-medium text-gray-900">Add New Route</h3>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Route Name
                                            </label>
                                            <input
                                                type="text"
                                                value={routeName}
                                                onChange={e => setRouteName(e.target.value)}
                                                placeholder="e.g., Daily Commute"
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                <MapPin className="h-4 w-4 inline mr-1" />
                                                From
                                            </label>
                                            <input
                                                type="text"
                                                value={routeOrigin}
                                                onChange={e => setRouteOrigin(e.target.value)}
                                                placeholder="Enter pickup location"
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                <Navigation className="h-4 w-4 inline mr-1" />
                                                To
                                            </label>
                                            <input
                                                type="text"
                                                value={routeDestination}
                                                onChange={e => setRouteDestination(e.target.value)}
                                                placeholder="Enter destination"
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => {
                                                    setShowAddRoute(false);
                                                    setRouteName('');
                                                    setRouteOrigin('');
                                                    setRouteDestination('');
                                                }}
                                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleAddRoute}
                                                disabled={
                                                    savingRoute ||
                                                    !routeName.trim() ||
                                                    !routeOrigin.trim() ||
                                                    !routeDestination.trim()
                                                }
                                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                 disabled:opacity-50"
                                            >
                                                {savingRoute ? 'Saving...' : 'Save Route'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {savedRoutes.length === 0 && !showAddRoute ? (
                                    <div className="text-center py-12 bg-white rounded-xl border">
                                        <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            No Saved Routes
                                        </h3>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Save your frequent routes for quick searches and one-tap booking.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {savedRoutes.map(route => (
                                            <SavedRouteCard
                                                key={route.id}
                                                route={route}
                                                onDelete={loadData}
                                                onUpdate={loadData}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Quick Tips */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quick Tips
                    </h3>
                    <ul className="space-y-1 text-sm text-blue-800">
                        <li>• Tap the heart icon on any driver's profile to add them to favorites</li>
                        <li>• Saved routes make searching for regular commutes much faster</li>
                        <li>• Set a default route to pre-fill your search instantly</li>
                        <li>• Favorite drivers get priority in search results</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
