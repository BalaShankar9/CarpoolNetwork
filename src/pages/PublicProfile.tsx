import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Star, Calendar, Share2, Flag, UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notify } from '../lib/toast';
import { checkRateLimit, recordRateLimitAction } from '../lib/rateLimiting';
import { supabase } from '../lib/supabase';
import { fetchPublicProfileById, PublicProfile as PublicProfileRow } from '../services/publicProfiles';
import { getOrCreateFriendsDM } from '../lib/chatHelpers';
import UserAvatar from '../components/shared/UserAvatar';
import VerificationBadges from '../components/profile/VerificationBadges';
import ReportUserModal from '../components/shared/ReportUserModal';
import { NotificationsService } from '../services/notificationsService';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  ride_type: 'driver' | 'passenger';
}

interface Stats {
  ridesOffered: number;
  ridesTaken: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  reliabilityScore: number;
}

type FriendStatus = 'none' | 'sent' | 'received' | 'friends';

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'driver' | 'passenger'>('all');
  const [error, setError] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    if (userId === user?.id) {
      navigate('/profile');
      return;
    }

    loadProfileData();
  }, [userId, user]);

  useEffect(() => {
    if (!userId || !user?.id) return;
    if (userId === user.id) return;
    loadFriendStatus();
  }, [userId, user?.id]);

  const loadProfileData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const profileData = await fetchPublicProfileById(userId);

      if (!profileData) {
        setError('User not found');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:reviewer_id(id, full_name, avatar_url)
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setReviews((reviewsData || []) as any);

      const { count: driverRideCount } = await supabase
        .from('rides')
        .select('id', { count: 'exact', head: true })
        .eq('driver_id', userId);

      const { count: passengerBookingCount } = await supabase
        .from('ride_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('passenger_id', userId)
        .eq('status', 'confirmed');

      const reviewRatings = (reviewsData || []).map((r: any) => r.rating);
      const avgRating = reviewRatings.length > 0
        ? reviewRatings.reduce((a: number, b: number) => a + b, 0) / reviewRatings.length
        : 0;

      setStats({
        ridesOffered: driverRideCount ?? 0,
        ridesTaken: passengerBookingCount ?? 0,
        averageRating: avgRating,
        totalReviews: reviewsData?.length || 0,
        responseRate: 95,
        reliabilityScore: profileData.reliability_score || 0
      });

    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadFriendStatus = async () => {
    if (!userId || !user?.id) return;

    try {
      const { data: friendsData, error: friendsError } = await supabase
        .rpc('are_friends', { p_user_id_1: user.id, p_user_id_2: userId });

      if (friendsError) throw friendsError;

      if (friendsData) {
        setFriendStatus('friends');
        setFriendRequestId(null);
        return;
      }

      const { data: pendingRequests, error: pendingError } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, to_user_id, status')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${userId},status.eq.PENDING),and(from_user_id.eq.${userId},to_user_id.eq.${user.id},status.eq.PENDING)`);

      if (pendingError) throw pendingError;

      const pending = (pendingRequests || [])[0];
      if (!pending) {
        setFriendStatus('none');
        setFriendRequestId(null);
        return;
      }

      if (pending.from_user_id === user.id) {
        setFriendStatus('sent');
      } else {
        setFriendStatus('received');
      }
      setFriendRequestId(pending.id);
    } catch (err) {
      console.error('Error loading friend status:', err);
    }
  };

  const sendFriendRequest = async () => {
    if (!userId) return;
    try {
      setFriendActionLoading(true);
      const { error } = await supabase
        .rpc('send_friend_request', { p_to_user_id: userId });

      if (error) throw error;

      // Create notification for the recipient
      try {
        await NotificationsService.createNotification(
          userId,
          'FRIEND_REQUEST',
          {
            sender_name: user?.user_metadata?.full_name || profile?.full_name || 'Someone'
          }
        );
      } catch (notifError) {
        console.error('Error creating friend request notification:', notifError);
      }

      await loadFriendStatus();
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Unable to send friend request. Please try again.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!friendRequestId) return;
    try {
      setFriendActionLoading(true);

      // Get the friend request details to know who sent it
      const { data: requestData, error: requestError } = await supabase
        .from('friend_requests')
        .select('from_user_id, profiles!friend_requests_from_user_id_fkey(full_name)')
        .eq('id', friendRequestId)
        .single();

      if (requestError) throw requestError;

      const { error } = await supabase
        .rpc('accept_friend_request', { p_request_id: friendRequestId });

      if (error) throw error;

      // Create notification for the original requester
      try {
        await NotificationsService.createNotification(
          requestData.from_user_id,
          'FRIEND_REQUEST_ACCEPTED',
          {
            sender_name: profile?.full_name || 'Someone'
          }
        );
      } catch (notifError) {
        console.error('Error creating friend accepted notification:', notifError);
      }

      await loadFriendStatus();
    } catch (err) {
      console.error('Error accepting friend request:', err);
      alert('Unable to accept friend request. Please try again.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const declineFriendRequest = async () => {
    if (!friendRequestId) return;
    try {
      setFriendActionLoading(true);
      const { error } = await supabase
        .rpc('decline_friend_request', { p_request_id: friendRequestId });

      if (error) throw error;
      await loadFriendStatus();
    } catch (err) {
      console.error('Error declining friend request:', err);
      alert('Unable to decline friend request. Please try again.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const cancelFriendRequest = async () => {
    if (!friendRequestId) return;
    try {
      setFriendActionLoading(true);
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'CANCELLED' })
        .eq('id', friendRequestId);

      if (error) throw error;
      await loadFriendStatus();
    } catch (err) {
      console.error('Error canceling friend request:', err);
      alert('Unable to cancel friend request. Please try again.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleMessageUser = async () => {
    if (!profile || !userId || !user?.id) return;

    const canMessageInApp = profile.allow_inhouse_chat !== false
      && (
        profile.preferred_contact_method === 'in_app'
        || profile.preferred_contact_method === 'both'
        || !profile.preferred_contact_method
      );

    if (!canMessageInApp) {
      alert('This user is not accepting in-app messages.');
      return;
    }

    try {
      const rateLimitCheck = await checkRateLimit(user.id, 'conversation');
      if (!rateLimitCheck.allowed) {
        notify(rateLimitCheck.error || 'Too many new conversations. Please wait.', 'warning');
        return;
      }
      const conversationId = await getOrCreateFriendsDM(user.id, userId);
      if (!conversationId) {
        notify('Unable to start this conversation. The user may have blocked messages.', 'error');
        return;
      }
      await recordRateLimitAction(user.id, user.id, 'conversation');
      navigate(`/messages?c=${conversationId}`, { state: { conversationId } });
    } catch (error) {
      console.error('Unable to start conversation:', error);
      notify('Unable to start this conversation. The user may have blocked messages.', 'error');
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/user/${userId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleReport = () => {
    if (!user) {
      notify('Please sign in to report a user.', 'warning');
      return;
    }
    setIsReportOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The user you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const filteredReviews = reviewFilter === 'all'
    ? reviews
    : reviews.filter(r => r.ride_type === reviewFilter);

  const canMessageInApp = profile.allow_inhouse_chat !== false
    && (
      profile.preferred_contact_method === 'in_app'
      || profile.preferred_contact_method === 'both'
      || !profile.preferred_contact_method
    );

  const renderFriendActions = () => {
    if (!user || user.id === profile.id) return null;

    if (friendStatus === 'friends') {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
          <UserCheck className="w-5 h-5" />
          Friends
        </div>
      );
    }

    if (friendStatus === 'sent') {
      return (
        <button
          onClick={cancelFriendRequest}
          disabled={friendActionLoading}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel Request
        </button>
      );
    }

    if (friendStatus === 'received') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={acceptFriendRequest}
            disabled={friendActionLoading}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={declineFriendRequest}
            disabled={friendActionLoading}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={sendFriendRequest}
        disabled={friendActionLoading}
        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        <UserPlus className="w-5 h-5" />
        Add Friend
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start gap-6">
            <UserAvatar user={profile} size="2xl" verified={profile.photo_verified} />

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <VerificationBadges
                profileId={profile.id}
                photoVerified={profile.photo_verified}
                idVerified={profile.id_verified}
                phoneVerified={profile.phone_verified}
                emailVerified={profile.email_verified}
                includeDocuments={false}
                readOnly
              />

              {stats && stats.averageRating > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= stats.averageRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {stats.averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-600">
                    ({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleMessageUser}
              disabled={!canMessageInApp}
              className="flex-1 min-w-[180px] bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-5 h-5" />
              Message
            </button>
            {renderFriendActions()}
            <button
              onClick={handleShare}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Share profile"
            >
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleReport}
              disabled={!user}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Report user"
            >
              <Flag className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-2xl font-bold text-gray-900">{stats.ridesOffered}</p>
              <p className="text-sm text-gray-600">Rides Offered</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-2xl font-bold text-gray-900">{stats.ridesTaken}</p>
              <p className="text-sm text-gray-600">Rides Taken</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Average Rating</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-2xl font-bold text-gray-900">{stats.reliabilityScore}%</p>
              <p className="text-sm text-gray-600">Reliability</p>
            </div>
          </div>
        )}

        {profile.bio && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">About</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Reviews</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${reviewFilter === 'all'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setReviewFilter('driver')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${reviewFilter === 'driver'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                As Driver
              </button>
              <button
                onClick={() => setReviewFilter('passenger')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${reviewFilter === 'passenger'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                As Passenger
              </button>
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <UserAvatar user={review.reviewer} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900">{review.reviewer.full_name}</p>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                              }`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ReportUserModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reportedUser={{ id: profile.id, full_name: profile.full_name }}
      />
    </div>
  );
}
