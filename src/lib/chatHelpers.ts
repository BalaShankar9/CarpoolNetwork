import { supabase } from './supabase';

export interface CreateConversationParams {
  type: 'RIDE_MATCH' | 'TRIP_MATCH' | 'FRIENDS_DM';
  rideId?: string;
  tripRequestId?: string;
  members: {
    userId: string;
    role: 'DRIVER' | 'RIDER' | 'FRIEND';
  }[];
}

/**
 * Get or create a conversation
 * Returns the conversation ID
 */
export async function getOrCreateConversation(
  params: CreateConversationParams
): Promise<string | null> {
  try {
    // Try to find existing conversation
    let query = supabase.from('conversations').select('id, members:conversation_members(user_id)');

    if (params.type === 'RIDE_MATCH' && params.rideId) {
      query = query.eq('type', 'RIDE_MATCH').eq('ride_id', params.rideId);
    } else if (params.type === 'TRIP_MATCH' && params.tripRequestId) {
      query = query.eq('type', 'TRIP_MATCH').eq('trip_request_id', params.tripRequestId);
    } else if (params.type === 'FRIENDS_DM') {
      query = query.eq('type', 'FRIENDS_DM');
    }

    const { data: existingConvs } = await query;

    // For FRIENDS_DM, check if conversation exists between these two users
    if (params.type === 'FRIENDS_DM' && existingConvs) {
      const memberIds = params.members.map((m) => m.userId).sort();

      for (const conv of existingConvs) {
        const convMemberIds = conv.members.map((m: any) => m.user_id).sort();
        if (
          convMemberIds.length === memberIds.length &&
          convMemberIds.every((id, idx) => id === memberIds[idx])
        ) {
          return conv.id;
        }
      }
    }

    // For ride/trip matches, just check if one exists for that ride/trip with all members
    if (params.type !== 'FRIENDS_DM' && existingConvs && existingConvs.length > 0) {
      const memberIds = params.members.map((m) => m.userId).sort();

      for (const conv of existingConvs) {
        const convMemberIds = conv.members.map((m: any) => m.user_id).sort();
        if (
          convMemberIds.length === memberIds.length &&
          convMemberIds.every((id, idx) => id === memberIds[idx])
        ) {
          return conv.id;
        }
      }
    }

    // Create new conversation
    const conversationData: any = {
      type: params.type,
    };

    if (params.rideId) {
      conversationData.ride_id = params.rideId;
    }

    if (params.tripRequestId) {
      conversationData.trip_request_id = params.tripRequestId;
    }

    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select('id')
      .single();

    if (convError) throw convError;

    // Add members
    const memberInserts = params.members.map((member) => ({
      conversation_id: newConv.id,
      user_id: member.userId,
      role: member.role,
    }));

    const { error: membersError } = await supabase
      .from('conversation_members')
      .insert(memberInserts);

    if (membersError) throw membersError;

    return newConv.id;
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    return null;
  }
}

/**
 * Create or get a ride match conversation
 */
export async function getOrCreateRideConversation(
  rideId: string,
  driverId: string,
  riderId: string
): Promise<string | null> {
  return getOrCreateConversation({
    type: 'RIDE_MATCH',
    rideId,
    members: [
      { userId: driverId, role: 'DRIVER' },
      { userId: riderId, role: 'RIDER' },
    ],
  });
}

/**
 * Create or get a trip match conversation
 */
export async function getOrCreateTripConversation(
  tripRequestId: string,
  riderId: string,
  driverId: string
): Promise<string | null> {
  return getOrCreateConversation({
    type: 'TRIP_MATCH',
    tripRequestId,
    members: [
      { userId: riderId, role: 'RIDER' },
      { userId: driverId, role: 'DRIVER' },
    ],
  });
}

/**
 * Create or get a friends DM conversation
 */
export async function getOrCreateFriendsDM(
  userId1: string,
  userId2: string
): Promise<string | null> {
  return getOrCreateConversation({
    type: 'FRIENDS_DM',
    members: [
      { userId: userId1, role: 'FRIEND' },
      { userId: userId2, role: 'FRIEND' },
    ],
  });
}
