import { supabase } from './supabase';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  signup: { maxRequests: 5, windowMinutes: 60 },
  message: { maxRequests: 30, windowMinutes: 1 },
  feedback: { maxRequests: 10, windowMinutes: 60 },
};

export async function checkRateLimit(
  identifier: string,
  actionType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; error?: string }> {
  const config = RATE_LIMITS[actionType];
  if (!config) {
    return { allowed: true };
  }

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: actionType,
      p_max_requests: config.maxRequests,
      p_window_minutes: config.windowMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true };
    }

    if (!data) {
      return {
        allowed: false,
        error: `Too many requests. Please wait before trying again.`
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    return { allowed: true };
  }
}

export async function recordRateLimitAction(
  userId: string | null,
  identifier: string,
  actionType: string
): Promise<void> {
  try {
    await supabase.rpc('record_rate_limit_action', {
      p_user_id: userId,
      p_identifier: identifier,
      p_action_type: actionType,
    });
  } catch (err) {
    console.error('Failed to record rate limit action:', err);
  }
}
