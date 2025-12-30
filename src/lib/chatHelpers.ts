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

const normalizeConversationId = (data: unknown): string | null => {
  if (!data) return null;
  if (typeof data === 'string') return data;

  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    return normalizeConversationId(data[0]);
  }

  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const candidates = [
      'id',
      'conversation_id',
      'get_or_create_ride_conversation',
      'get_or_create_trip_conversation',
      'get_or_create_friends_conversation',
    ];

    for (const key of candidates) {
      const value = record[key];
      if (typeof value === 'string') return value;
    }
  }

  return null;
};

const fetchRideDriverId = async (rideId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('driver_id')
      .eq('id', rideId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching ride driver:', error);
      return null;
    }

    return data?.driver_id ?? null;
  } catch (error) {
    console.error('Error fetching ride driver:', error);
    return null;
  }
};

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

    const { data: existingConvs, error: existingError } = await query;
    if (existingError) {
      throw existingError;
    }

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
  const attemptRpc = async (driverIdToUse: string) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_ride_conversation', {
        p_ride_id: rideId,
        p_driver_id: driverIdToUse,
        p_rider_id: riderId,
      });

      if (error) {
        console.error('Error using get_or_create_ride_conversation:', error);
        return null;
      }

      return normalizeConversationId(data);
    } catch (error) {
      console.error('Error using get_or_create_ride_conversation:', error);
      return null;
    }
  };

  let resolvedDriverId = driverId;
  let conversationId = await attemptRpc(resolvedDriverId);

  if (!conversationId) {
    const rideDriverId = await fetchRideDriverId(rideId);
    if (rideDriverId) {
      resolvedDriverId = rideDriverId;
      conversationId = await attemptRpc(resolvedDriverId);
    }
  }

  if (conversationId) {
    return conversationId;
  }

  return getOrCreateConversation({
    type: 'RIDE_MATCH',
    rideId,
    members: [
      { userId: resolvedDriverId, role: 'DRIVER' },
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
  try {
    const { data, error } = await supabase.rpc('get_or_create_trip_conversation', {
      p_trip_request_id: tripRequestId,
      p_rider_id: riderId,
      p_driver_id: driverId,
    });

    if (error) {
      throw error;
    }

    const conversationId = normalizeConversationId(data);
    if (conversationId) {
      return conversationId;
    }
  } catch (error) {
    console.error('Error using get_or_create_trip_conversation:', error);
  }

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
  if (userId1 === userId2) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('get_or_create_friends_conversation', {
      p_user_id_1: userId1,
      p_user_id_2: userId2,
    });

    if (error) {
      throw error;
    }

    const conversationId = normalizeConversationId(data);
    if (conversationId) {
      return conversationId;
    }
  } catch (error) {
    console.error('Error using get_or_create_friends_conversation:', error);
  }

  return getOrCreateConversation({
    type: 'FRIENDS_DM',
    members: [
      { userId: userId1, role: 'FRIEND' },
      { userId: userId2, role: 'FRIEND' },
    ],
  });
}
