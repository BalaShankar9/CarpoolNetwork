import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Users, X, Search, MessageCircle, Star, Car, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend: {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    average_rating?: number;
    total_rides_offered?: number;
    total_rides_taken?: number;
    trust_score?: number;
    profile_verified?: boolean;
  };
}

interface UserSearchResult {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  average_rating?: number;
  trust_score?: number;
  profile_verified?: boolean;
}

export default function FriendsManager() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');

  useEffect(() => {
    if (profile?.id) {
      loadFriends();
      setupRealtimeSubscription();
    }
  }, [profile?.id]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('friends')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${profile?.id}`
        },
        () => {
          loadFriends();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `friend_id=eq.${profile?.id}`
        },
        () => {
          loadFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadFriends = async () => {
    try {
      setLoading(true);

      const { data: myFriends, error: friendsError } = await supabase
        .from('friends')
        .select(`
          *,
          friend:profiles!friends_friend_id_fkey(*)
        `)
        .eq('user_id', profile?.id)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;

      const { data: receivedRequests, error: requestsError } = await supabase
        .from('friends')
        .select(`
          *,
          friend:profiles!friends_user_id_fkey(*)
        `)
        .eq('friend_id', profile?.id)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      const { data: sentRequests, error: sentError } = await supabase
        .from('friends')
        .select(`
          *,
          friend:profiles!friends_friend_id_fkey(*)
        `)
        .eq('user_id', profile?.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      setFriends(myFriends || []);
      setPendingRequests(receivedRequests || []);
      setSentRequests(sentRequests || []);
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, average_rating, trust_score, profile_verified')
        .ilike('full_name', `%${query}%`)
        .neq('id', profile?.id)
        .limit(10);

      if (error) throw error;

      const existingFriendIds = [
        ...friends.map(f => f.friend_id),
        ...pendingRequests.map(r => r.user_id),
        ...sentRequests.map(r => r.friend_id)
      ];

      const filteredResults = (data || []).filter(
        user => !existingFriendIds.includes(user.id)
      );

      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: profile?.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;

      await supabase
        .from('notifications')
        .insert({
          user_id: friendId,
          type: 'friend-request',
          title: 'New Friend Request',
          message: `${profile?.full_name} wants to connect with you`,
          data: { userId: profile?.id }
        });

      setSearchResults(prev => prev.filter(u => u.id !== friendId));
      await loadFriends();
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  const acceptFriendRequest = async (requestId: string, friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      const { error: reciprocalError } = await supabase
        .from('friends')
        .insert({
          user_id: profile?.id,
          friend_id: friendId,
          status: 'accepted'
        });

      if (reciprocalError) throw reciprocalError;

      await supabase
        .from('notifications')
        .insert({
          user_id: friendId,
          type: 'friend-accepted',
          title: 'Friend Request Accepted',
          message: `${profile?.full_name} accepted your friend request`,
          data: { userId: profile?.id }
        });

      await loadFriends();
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      await loadFriends();
    } catch (err) {
      console.error('Error rejecting friend request:', err);
    }
  };

  const removeFriend = async (friendshipId: string, friendId: string) => {
    try {
      await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', profile?.id);

      await loadFriends();
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-gray-900" />
          <h3 className="text-xl font-bold text-gray-900">Friends & Connections</h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Requests ({pendingRequests.length})
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'add'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Add Friends
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No friends yet</p>
                <p className="text-sm">Add friends to ride together easily</p>
              </div>
            ) : (
              friends.map((friendship) => (
                <div key={friendship.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {friendship.friend.full_name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {friendship.friend.full_name}
                      </p>
                      {friendship.friend.profile_verified && (
                        <Shield className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      {friendship.friend.average_rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-current" />
                          {friendship.friend.average_rating.toFixed(1)}
                        </span>
                      )}
                      {friendship.friend.trust_score && (
                        <span>Trust: {friendship.friend.trust_score}/100</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/messages')}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Message"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removeFriend(friendship.id, friendship.friend_id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Remove friend"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            {pendingRequests.length === 0 && sentRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No pending requests</p>
              </div>
            ) : (
              <>
                {pendingRequests.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Received Requests</h4>
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                            {request.friend.full_name.charAt(0)}
                          </div>

                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{request.friend.full_name}</p>
                            <p className="text-sm text-gray-600">{request.friend.bio || 'No bio'}</p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptFriendRequest(request.id, request.user_id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => rejectFriendRequest(request.id)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Sent Requests</h4>
                    <div className="space-y-3">
                      {sentRequests.map((request) => (
                        <div key={request.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-12 h-12 bg-gray-600 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                            {request.friend.full_name.charAt(0)}
                          </div>

                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{request.friend.full_name}</p>
                            <p className="text-sm text-gray-500">Request pending...</p>
                          </div>

                          <button
                            onClick={() => rejectFriendRequest(request.id)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Search users by name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {searching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {user.full_name.charAt(0)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{user.full_name}</p>
                        {user.profile_verified && (
                          <Shield className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        {user.average_rating && (
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-500 fill-current" />
                            {user.average_rating.toFixed(1)}
                          </span>
                        )}
                        {user.trust_score && (
                          <span>Trust: {user.trust_score}/100</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No users found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">Search for users</p>
                <p className="text-sm">Enter a name to find friends</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
