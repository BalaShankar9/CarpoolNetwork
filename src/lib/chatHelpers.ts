import { supabase } from './supabase';

export interface CreateConversationParams {
  type: 'RIDE_MATCH' | 'TRIP_MATCH' | 'FRIENDS_DM';
  rideId?: string;
  tripRequestId?: string;
  userId?: string;
  otherUserId?: string;
  driverId?: string;
  riderId?: string;
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
      'get_or_create_dm_conversation',
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
    if (params.type === 'FRIENDS_DM' && params.userId && params.otherUserId) {
      return await getOrCreateFriendsDM(params.userId, params.otherUserId);
    }

    if (params.type === 'RIDE_MATCH' && params.rideId && params.driverId && params.riderId) {
      return await getOrCreateRideConversation(params.rideId, params.driverId, params.riderId);
    }

    if (params.type === 'TRIP_MATCH' && params.tripRequestId && params.driverId && params.riderId) {
      return await getOrCreateTripConversation(params.tripRequestId, params.riderId, params.driverId);
    }

    return null;
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
      if (import.meta.env.DEV) {
        console.log('[DEV] getOrCreateRideConversation - Calling RPC:', {
          rpc: 'get_or_create_ride_conversation',
          params: { p_ride_id: rideId, p_driver_id: driverIdToUse, p_rider_id: riderId },
        });
      }
      const { data, error } = await supabase.rpc('get_or_create_ride_conversation', {
        p_ride_id: rideId,
        p_driver_id: driverIdToUse,
        p_rider_id: riderId,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[DEV] getOrCreateRideConversation - RPC Error:', {
            rpc: 'get_or_create_ride_conversation',
            code: (error as any)?.code,
            message: error.message,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            fullError: error,
          });
        }
        console.error('Error using get_or_create_ride_conversation:', error);
        return null;
      }

      const convId = normalizeConversationId(data);
      if (import.meta.env.DEV) {
        console.log('[DEV] getOrCreateRideConversation - Success, conversation ID:', convId);
      }
      return convId;
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

  return null;
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

    return null;
  } catch (error) {
    console.error('Error using get_or_create_trip_conversation:', error);
    return null;
  }
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
    if (import.meta.env.DEV) {
      console.log('[DEV] getOrCreateDmConversation - Calling RPC:', {
        rpc: 'get_or_create_dm_conversation',
        params: { target_user_id: userId2 },
      });
    }
    const { data: dmData, error: dmError } = await supabase.rpc('get_or_create_dm_conversation', {
      target_user_id: userId2,
    });

    if (!dmError) {
      const conversationId = normalizeConversationId(dmData);
      if (import.meta.env.DEV) {
        console.log('[DEV] getOrCreateDmConversation - Success, conversation ID:', conversationId);
      }
      if (conversationId) {
        return conversationId;
      }
    } else {
      if (import.meta.env.DEV) {
        console.error('[DEV] getOrCreateDmConversation - RPC Error:', {
          rpc: 'get_or_create_dm_conversation',
          code: (dmError as any)?.code,
          message: dmError.message,
          details: (dmError as any)?.details,
          hint: (dmError as any)?.hint,
          fullError: dmError,
        });
      }
      if ((dmError as any)?.code !== 'PGRST202') {
        return null;
      }
    }

    if (import.meta.env.DEV) {
      console.log('[DEV] getOrCreateFriendsDM - Calling RPC:', {
        rpc: 'get_or_create_friends_conversation',
        params: { p_user_id_1: userId1, p_user_id_2: userId2 },
      });
    }
    const { data: legacyData, error: legacyError } = await supabase.rpc('get_or_create_friends_conversation', {
      p_user_id_1: userId1,
      p_user_id_2: userId2,
    });

    if (legacyError) {
      if (import.meta.env.DEV) {
        console.error('[DEV] getOrCreateFriendsDM - RPC Error:', {
          rpc: 'get_or_create_friends_conversation',
          code: (legacyError as any)?.code,
          message: legacyError.message,
          details: (legacyError as any)?.details,
          hint: (legacyError as any)?.hint,
          fullError: legacyError,
        });
      }
      throw legacyError;
    }

    const conversationId = normalizeConversationId(legacyData);
    if (import.meta.env.DEV) {
      console.log('[DEV] getOrCreateFriendsDM - Success, conversation ID:', conversationId);
    }
    if (conversationId) {
      return conversationId;
    }
  } catch (error) {
    console.error('Error using get_or_create_friends_conversation:', error);
  }

  return null;
}
