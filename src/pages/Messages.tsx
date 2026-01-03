import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { checkRateLimit, recordRateLimitAction } from '../lib/rateLimiting';
import NewChatSystem from '../components/messaging/NewChatSystem';
import { getOrCreateFriendsDM, getOrCreateRideConversation } from '../lib/chatHelpers';

export default function Messages() {
  const location = useLocation();
  const { user } = useAuth();
  const state = (location.state as {
    conversationId?: string;
    userId?: string;
    rideId?: string;
    driverId?: string;
  }) || {};
  const searchParams = new URLSearchParams(location.search);
  const conversationId = state.conversationId || searchParams.get('conversationId') || undefined;
  const userId = state.userId;
  const rideId = state.rideId;
  const driverId = state.driverId;
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);

  const resolveRideDriverId = async () => {
    if (!rideId) return null;
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('driver_id')
        .eq('id', rideId)
        .maybeSingle();

      if (error) {
        console.error('Unable to load ride driver:', error);
        return null;
      }

      return data?.driver_id ?? null;
    } catch (error) {
      console.error('Unable to load ride driver:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeConversation = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setInitError(null);

      if (conversationId) {
        setActiveConversationId(conversationId);
        setLoading(false);
        return;
      }

      if (userId) {
        const rateLimitCheck = await checkRateLimit(user.id, 'conversation');
        if (!rateLimitCheck.allowed) {
          setInitError(rateLimitCheck.error || 'Too many new conversations. Please wait.');
          setLoading(false);
          return;
        }
        const convId = await getOrCreateFriendsDM(user.id, userId);
        if (convId) {
          setActiveConversationId(convId);
          await recordRateLimitAction(user.id, user.id, 'conversation');
        } else {
          setInitError('Unable to start this conversation. Please try again.');
        }

        setLoading(false);
        return;
      }

      if (rideId) {
        const rateLimitCheck = await checkRateLimit(user.id, 'conversation');
        if (!rateLimitCheck.allowed) {
          setInitError(rateLimitCheck.error || 'Too many new conversations. Please wait.');
          setLoading(false);
          return;
        }
        let resolvedDriverId = driverId;
        if (!resolvedDriverId) {
          resolvedDriverId = await resolveRideDriverId();
        }

        if (!resolvedDriverId) {
          setInitError('Unable to locate the driver for this ride.');
          setLoading(false);
          return;
        }

        const convId = await getOrCreateRideConversation(rideId, resolvedDriverId, user.id);
        if (convId) {
          setActiveConversationId(convId);
          await recordRateLimitAction(user.id, user.id, 'conversation');
        } else {
          setInitError('Unable to start this ride chat. Please try again.');
        }

        setLoading(false);
        return;
      }

      setLoading(false);
    };

    initializeConversation();
  }, [user, userId, rideId, driverId, conversationId, retryToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {initError && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {initError}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setRetryToken((prev) => prev + 1)}
              className="px-3 py-2 text-sm font-medium bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Retry
            </button>
            {rideId && (
              <button
                onClick={() => window.location.assign(`/rides/${rideId}`)}
                className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Ride
              </button>
            )}
          </div>
        </div>
      )}
      <NewChatSystem initialConversationId={activeConversationId} />
    </div>
  );
}
