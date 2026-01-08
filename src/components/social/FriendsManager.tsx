import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Users, X, Search, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ClickableUserProfile from '../shared/ClickableUserProfile';
import { toast } from '../../lib/toast';

interface FriendProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  bio?: string;
  average_rating?: number;
  total_rides_offered?: number;
  total_rides_taken?: number;
  trust_score?: number;
  profile_verified?: boolean;
}

interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  friend_id: string;
  friend: FriendProfile;
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  friend: FriendProfile;
}

interface UserSearchResult {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  bio?: string;
  average_rating?: number;
  trust_score?: number;
  profile_verified?: boolean;
}

export default function FriendsManager() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');

  useEffect(() => {
    if (profile?.id) {
      loadFriends();
      return setupRealtimeSubscription(profile.id);
    }
    return undefined;
  }, [profile?.id]);

  const setupRealtimeSubscription = (userId: string) => {
    const channel = supabase
      .channel('friends')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_a=eq.${userId}`
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
          table: 'friendships',
          filter: `user_b=eq.${userId}`
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
          table: 'friend_requests',
          filter: `from_user_id=eq.${userId}`
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
          table: 'friend_requests',
          filter: `to_user_id=eq.${userId}`
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
    if (!profile?.id) {
      return;
    }

    try {
      setLoading(true);

      const profileSelect = 'id, full_name, avatar_url, profile_photo_url, bio, average_rating, trust_score, profile_verified, total_rides_offered, total_rides_taken';
      const userId = profile.id;

      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (friendsError) throw friendsError;

      const friendIds = (friendships || []).map((row) =>
        row.user_a === userId ? row.user_b : row.user_a
      );

      const { data: friendProfiles, error: friendProfilesError } = friendIds.length
        ? await supabase
          .from('profiles')
          .select(profileSelect)
          .in('id', friendIds)
        : { data: [], error: null };

      if (friendProfilesError) throw friendProfilesError;

      const friendProfileMap = new Map<string, FriendProfile>(
        (friendProfiles || []).map((friend): [string, FriendProfile] => [friend.id, friend as FriendProfile])
      );

      const formattedFriends: Friendship[] = [];
      (friendships || []).forEach((row) => {
        const friendId = row.user_a === userId ? row.user_b : row.user_a;
        const friend = friendProfileMap.get(friendId);
        if (!friend) {
          return;
        }
        formattedFriends.push({
          id: row.id,
          user_a: row.user_a,
          user_b: row.user_b,
          created_at: row.created_at,
          friend_id: friendId,
          friend
        });
      });

      const { data: receivedRequests, error: requestsError } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, to_user_id, status, created_at')
        .eq('to_user_id', userId)
        .eq('status', 'PENDING');

      if (requestsError) throw requestsError;

      const { data: sentRequests, error: sentError } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, to_user_id, status, created_at')
        .eq('from_user_id', userId)
        .eq('status', 'PENDING');

      if (sentError) throw sentError;

      const requestProfileIds = new Set<string>();
      (receivedRequests || []).forEach((request) => requestProfileIds.add(request.from_user_id));
      (sentRequests || []).forEach((request) => requestProfileIds.add(request.to_user_id));

      const { data: requestProfiles, error: requestProfilesError } = requestProfileIds.size
        ? await supabase
          .from('profiles')
          .select(profileSelect)
          .in('id', Array.from(requestProfileIds))
        : { data: [], error: null };

      if (requestProfilesError) throw requestProfilesError;

      const requestProfileMap = new Map<string, FriendProfile>(
        (requestProfiles || []).map((requestProfile): [string, FriendProfile] => [requestProfile.id, requestProfile as FriendProfile])
      );

      const formattedPendingRequests: FriendRequest[] = [];
      (receivedRequests || []).forEach((request) => {
        const friend = requestProfileMap.get(request.from_user_id);
        if (!friend) {
          return;
        }
        formattedPendingRequests.push({
          ...request,
          friend
        });
      });

      const formattedSentRequests: FriendRequest[] = [];
      (sentRequests || []).forEach((request) => {
        const friend = requestProfileMap.get(request.to_user_id);
        if (!friend) {
          return;
        }
        formattedSentRequests.push({
          ...request,
          friend
        });
      });

      setFriends(formattedFriends);
      setPendingRequests(formattedPendingRequests);
      setSentRequests(formattedSentRequests);
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
        .select('id, full_name, avatar_url, profile_photo_url, bio, average_rating, trust_score, profile_verified')
        .ilike('full_name', `%${query}%`)
        .neq('id', profile?.id)
        .limit(10);

      if (error) throw error;

      const existingFriendIds = new Set([
        ...friends.map((friendship) => friendship.friend.id),
        ...pendingRequests.map((request) => request.friend.id),
        ...sentRequests.map((request) => request.friend.id)
      ]);

      const filteredResults = (data || []).filter(
        user => !existingFriendIds.has(user.id)
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
      setProcessingRequest(friendId);
      const { error } = await supabase
        .rpc('send_friend_request', { p_to_user_id: friendId });

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
      toast.success('Friend request sent!');
    } catch (err) {
      console.error('Error sending friend request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send friend request';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
    }
  };

  const acceptFriendRequest = async (requestId: string, friendName: string) => {
    try {
      setProcessingRequest(requestId);
      const { data, error } = await supabase
        .rpc('accept_friend_request', { p_request_id: requestId });

      if (error) {
        console.error('Accept friend request error:', error);
        throw error;
      }

      console.log('Friend request accepted successfully:', data);
      await loadFriends();
      toast.success(`You are now friends with ${friendName}!`);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to accept friend request';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      const { error } = await supabase
        .rpc('decline_friend_request', { p_request_id: requestId });

      if (error) throw error;
      await loadFriends();
      toast.success('Friend request declined');
    } catch (err) {
      console.error('Error declining friend request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to decline friend request';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'CANCELLED' })
        .eq('id', requestId);

      if (error) throw error;
      await loadFriends();
      toast.success('Friend request cancelled');
    } catch (err) {
      console.error('Error canceling friend request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel friend request';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
    }
  };

  const removeFriend = async (friendshipId: string, friendName: string) => {
    try {
      setProcessingRequest(friendshipId);
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      await loadFriends();
      toast.success(`Removed ${friendName} from friends`);
    } catch (err) {
      console.error('Error removing friend:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove friend';
      toast.error(errorMsg);
    } finally {
      setProcessingRequest(null);
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
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'friends'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${activeTab === 'requests'
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
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'add'
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
                  <ClickableUserProfile
                    user={{
                      id: friendship.friend.id,
                      full_name: friendship.friend.full_name,
                      avatar_url: friendship.friend.avatar_url,
                      profile_photo_url: friendship.friend.profile_photo_url
                    }}
                    size="md"
                    rating={friendship.friend.average_rating}
                    verified={friendship.friend.profile_verified}
                    showNameRight={true}
                    additionalInfo={
                      friendship.friend.trust_score && (
                        <span className="text-sm text-gray-600">Trust: {friendship.friend.trust_score}/100</span>
                      )
                    }
                  />

                  <div className="flex-1 min-w-0"></div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/messages')}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Message"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removeFriend(friendship.id, friendship.friend.full_name)}
                      disabled={processingRequest === friendship.id}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      title="Remove friend"
                    >
                      {processingRequest === friendship.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
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
                          <ClickableUserProfile
                            user={{
                              id: request.friend.id,
                              full_name: request.friend.full_name,
                              avatar_url: request.friend.avatar_url,
                              profile_photo_url: request.friend.profile_photo_url
                            }}
                            size="md"
                            rating={request.friend.average_rating}
                            verified={request.friend.profile_verified}
                            showNameRight={true}
                            additionalInfo={
                              <p className="text-sm text-gray-600">{request.friend.bio || 'No bio'}</p>
                            }
                          />

                          <div className="flex-1"></div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptFriendRequest(request.id, request.friend.full_name)}
                              disabled={processingRequest === request.id}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                              {processingRequest === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : null}
                              Accept
                            </button>
                            <button
                              onClick={() => declineFriendRequest(request.id)}
                              disabled={processingRequest === request.id}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
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
                          <ClickableUserProfile
                            user={{
                              id: request.friend.id,
                              full_name: request.friend.full_name,
                              avatar_url: request.friend.avatar_url,
                              profile_photo_url: request.friend.profile_photo_url
                            }}
                            size="md"
                            showNameRight={true}
                            additionalInfo={
                              <p className="text-sm text-gray-500">Request pending...</p>
                            }
                          />

                          <div className="flex-1"></div>

                          <button
                            onClick={() => cancelFriendRequest(request.id)}
                            disabled={processingRequest === request.id}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                          >
                            {processingRequest === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : null}
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
                    <ClickableUserProfile
                      user={{
                        id: user.id,
                        full_name: user.full_name,
                        avatar_url: user.avatar_url,
                        profile_photo_url: user.profile_photo_url
                      }}
                      size="md"
                      rating={user.average_rating}
                      verified={user.profile_verified}
                      showNameRight={true}
                      additionalInfo={
                        user.trust_score && (
                          <span className="text-sm text-gray-600">Trust: {user.trust_score}/100</span>
                        )
                      }
                    />

                    <div className="flex-1"></div>

                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      disabled={processingRequest === user.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      {processingRequest === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
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
