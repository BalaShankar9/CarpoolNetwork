import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Users, TrendingUp, Calendar, MapPin, ArrowRight, MessageCircle, UserPlus, MessageSquare, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import SmartRecommendations from '../components/shared/SmartRecommendations';
import ClickableUserProfile from '../components/shared/ClickableUserProfile';
import { fetchPublicProfilesByIds, PublicProfile } from '../services/publicProfiles';

interface Stats {
  totalRidesOffered: number;
  totalRidesTaken: number;
  upcomingRides: number;
  activeRides: number;
  unreadMessages: number;
  friendsCount: number;
}

interface RecentRide {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  driver_id: string;
  driver: PublicProfile | null;
}

interface CommunityPost {
  id: string;
  title: string;
  author_name: string;
  category: string | null;
  comment_count: number;
  score: number;
  created_at: string;
}

interface OnlineFriend {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_online: boolean;
}

export default function Home() {
  const { profile } = useAuth();
  const { unreadMessagesCount } = useRealtime();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalRidesOffered: 0,
    totalRidesTaken: 0,
    upcomingRides: 0,
    activeRides: 0,
    unreadMessages: 0,
    friendsCount: 0,
  });
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    const ridesChannel = supabase
      .channel('home-rides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides'
        },
        () => {
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_bookings'
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ridesChannel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load active rides count
      const { data: activeRidesData } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('available_seats', 0);

      // Load recent rides
      const { data: recentRidesData } = await supabase
        .from('rides')
        .select(`
          id,
          origin,
          destination,
          departure_time,
          available_seats,
          driver_id
        `)
        .eq('status', 'active')
        .gt('available_seats', 0)
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(5);

      // Load friends count
      let friendsCount = 0;
      if (profile?.id) {
        const { count } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`);
        friendsCount = count || 0;
      }

      // Load recent community posts
      try {
        const { data: postsData } = await supabase
          .from('community_posts_with_stats')
          .select('id, title, author_name, category, comment_count, score, created_at')
          .order('created_at', { ascending: false })
          .limit(3);
        setCommunityPosts((postsData || []) as CommunityPost[]);
      } catch (err) {
        // Fallback if view doesn't exist
        console.warn('Could not load community posts:', err);
        setCommunityPosts([]);
      }

      // Load online friends
      if (profile?.id) {
        try {
          const { data: friendsData } = await supabase.rpc('get_friends_with_status');
          const online = ((friendsData || []) as OnlineFriend[])
            .filter(f => f.is_online)
            .slice(0, 5);
          setOnlineFriends(online);
        } catch (err) {
          // Fallback: load friends without online status
          const { data: friendships } = await supabase
            .from('friendships')
            .select('user_a, user_b')
            .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`)
            .limit(5);

          if (friendships && friendships.length > 0) {
            const friendIds = friendships.map(f =>
              f.user_a === profile.id ? f.user_b : f.user_a
            );
            const { data: friendProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, is_online')
              .in('id', friendIds);
            setOnlineFriends((friendProfiles || []).slice(0, 5) as OnlineFriend[]);
          } else {
            setOnlineFriends([]);
          }
        }
      }

      setStats({
        totalRidesOffered: profile?.total_rides_offered || 0,
        totalRidesTaken: profile?.total_rides_taken || 0,
        upcomingRides: activeRidesData?.length || 0,
        activeRides: activeRidesData?.length || 0,
        unreadMessages: unreadMessagesCount || 0,
        friendsCount,
      });

      const rides = (recentRidesData as RecentRide[]) || [];
      const driverIds = rides.map((ride) => ride.driver_id);
      const driversById = await fetchPublicProfilesByIds(driverIds);
      const filteredRides = rides
        .filter((ride) => ride.available_seats > 0)
        .map((ride) => ({
          ...ride,
          driver: driversById[ride.driver_id] || null,
        }));
      setRecentRides(filteredRides);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header with Clickable Avatar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          aria-label="Go to profile"
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200 overflow-hidden group-hover:border-blue-400 transition-colors">
            {profile?.profile_photo_url || profile?.avatar_url ? (
              <img 
                src={profile.profile_photo_url || profile.avatar_url} 
                alt={profile?.full_name || 'Profile'} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initials on image error
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-lg font-bold text-blue-600">
                {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          
          {/* Welcome Text */}
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-gray-600 text-sm">Here's your carpooling activity</p>
          </div>
        </button>
      </div>

      <SmartRecommendations />

      {/* Stats Grid - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => navigate('/my-rides')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all text-left"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalRidesOffered}</p>
          <p className="text-xs text-gray-600 mt-1">Rides Offered</p>
        </button>

        <button
          onClick={() => navigate('/my-rides')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-green-300 transition-all text-left"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalRidesTaken}</p>
          <p className="text-xs text-gray-600 mt-1">Rides Taken</p>
        </button>

        <button
          onClick={() => navigate('/find-rides')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-orange-300 transition-all text-left"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.upcomingRides}</p>
          <p className="text-xs text-gray-600 mt-1">Available Rides</p>
        </button>

        <button
          onClick={() => navigate('/messages')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-indigo-300 transition-all text-left relative"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
          </div>
          {(unreadMessagesCount || stats.unreadMessages) > 0 && (
            <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadMessagesCount || stats.unreadMessages}
            </span>
          )}
          <p className="text-2xl font-bold text-gray-900">{unreadMessagesCount || stats.unreadMessages}</p>
          <p className="text-xs text-gray-600 mt-1">Unread Messages</p>
        </button>

        <button
          onClick={() => navigate('/friends')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-pink-300 transition-all text-left"
        >
          <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-3">
            <UserPlus className="w-5 h-5 text-pink-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.friendsCount}</p>
          <p className="text-xs text-gray-600 mt-1">Friends</p>
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-purple-300 transition-all text-left"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <span className="text-lg">⭐</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(profile?.average_rating || 0).toFixed(1)}</p>
          <p className="text-xs text-gray-600 mt-1">Your Rating</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/find-rides')}
              className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Find a Ride</p>
                  <p className="text-sm text-gray-600">Search available rides</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/request-ride')}
              className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Request a Ride</p>
                  <p className="text-sm text-gray-600">Post where you need to go</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/post-ride')}
              className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Offer a Ride</p>
                  <p className="text-sm text-gray-600">Post your trip</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Available Rides</h2>
            <button
              onClick={() => navigate('/find-rides')}
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentRides.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming rides available</p>
            ) : (
              recentRides.filter(ride => ride.available_seats > 0).map((ride) => (
                <div
                  key={ride.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/rides/${ride.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/rides/${ride.id}`);
                    }
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <span className="font-medium">{ride.origin}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{ride.destination}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{formatDateTime(ride.departure_time)}</p>
                      {ride.driver && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ClickableUserProfile
                            user={{
                              id: ride.driver.id,
                              full_name: ride.driver.full_name,
                              avatar_url: ride.driver.avatar_url,
                              profile_photo_url: ride.driver.profile_photo_url
                            }}
                            size="sm"
                            rating={ride.driver.average_rating}
                            showNameRight={true}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-blue-600">
                        {ride.available_seats} {ride.available_seats === 1 ? 'seat' : 'seats'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Community Activity & Friends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Community Activity */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Community Activity</h2>
            </div>
            <button
              onClick={() => navigate('/community')}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {communityPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No recent posts</p>
                <button
                  onClick={() => navigate('/community')}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Start a discussion
                </button>
              </div>
            ) : (
              communityPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => navigate(`/community/${post.id}`)}
                  className="w-full p-3 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-blue-200 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{post.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{post.author_name}</span>
                        <span>•</span>
                        <span className="text-blue-600">{post.category || 'General'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {post.score}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {post.comment_count}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Friends Online */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-gray-900">Friends</h2>
              {onlineFriends.filter(f => f.is_online).length > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  {onlineFriends.filter(f => f.is_online).length} online
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/friends')}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {onlineFriends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No friends yet</p>
                <button
                  onClick={() => navigate('/friends')}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Find friends
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {onlineFriends.slice(0, 6).map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => navigate(`/user/${friend.id}`)}
                    className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-lg font-medium text-gray-500">
                            {friend.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {friend.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-medium text-gray-700 truncate max-w-full">
                      {friend.full_name.split(' ')[0]}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
