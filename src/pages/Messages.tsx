import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NewChatSystem from '../components/messaging/NewChatSystem';
import { getOrCreateFriendsDM, getOrCreateRideConversation } from '../lib/chatHelpers';

export default function Messages() {
  const location = useLocation();
  const { user } = useAuth();
  const { userId, rideId, driverId } = (location.state as {
    userId?: string;
    rideId?: string;
    driverId?: string;
  }) || {};
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeConversation = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // If userId provided, create/get DM conversation
      if (userId) {
        const convId = await getOrCreateFriendsDM(user.id, userId);
        if (convId) {
          setConversationId(convId);
        }
      }
      // If rideId and driverId provided, create/get ride conversation
      else if (rideId && driverId) {
        const convId = await getOrCreateRideConversation(rideId, driverId, user.id);
        if (convId) {
          setConversationId(convId);
        }
      }

      setLoading(false);
    };

    initializeConversation();
  }, [user, userId, rideId, driverId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <NewChatSystem initialConversationId={conversationId} />
    </div>
  );
}
