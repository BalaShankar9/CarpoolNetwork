import { supabase } from '../lib/supabase';
import {
  AiClientContext,
  AiMessage,
  AiRouterResponse,
  UserRole,
} from '../lib/aiCapabilities';
import { logApiError } from './errorTracking';

const AI_ENDPOINT = '/.netlify/functions/ai-router';

export type AiRequestPayload = {
  message: string;
  threadId?: string | null;
  history?: AiMessage[];
  context: AiClientContext;
};

export class GeminiService {
  private static async getAccessToken(): Promise<string | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Failed to get session for AI request:', error);
      return null;
    }
    return data.session?.access_token || null;
  }

  static async chat(
    userMessage: string,
    history: AiMessage[],
    threadId: string | undefined,
    context: AiClientContext
  ): Promise<AiRouterResponse> {
    const token = await this.getAccessToken();
    if (!token) {
      return { reply: 'Please sign in to use the AI assistant.' };
    }

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          threadId,
          history,
          context,
        } satisfies AiRequestPayload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reply =
          typeof data?.reply === 'string'
            ? data.reply
            : 'Sorry, I encountered an error processing your request. Please try again later.';
        throw new Error(reply);
      }

      if (typeof data?.reply === 'string' && data.reply.trim()) {
        return {
          reply: data.reply,
          actions: Array.isArray(data?.actions) ? data.actions : [],
          debug: data?.debug,
        } as AiRouterResponse;
      }

      return { reply: 'Sorry, I could not understand the response from the assistant.', actions: [] };
    } catch (error) {
      await logApiError('ai-router-client', error, {
        role: (context.role as UserRole) || 'guest',
        route: context.currentRoute,
        userId: context.userId ?? null,
      });
      return { reply: 'Sorry, I encountered an error processing your request. Please try again later.', actions: [] };
    }
  }

  static async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_reason: reason || 'Cancelled by passenger',
      });

      if (error) {
        if (error.message.includes('already cancelled')) {
          return { success: false, message: 'This booking is already cancelled.' };
        }
        if (error.message.includes('not found')) {
          return { success: false, message: 'Booking not found or you do not have permission to cancel it.' };
        }
        throw error;
      }

      return {
        success: true,
        message: 'Booking cancelled successfully.',
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return { success: false, message: 'An error occurred while cancelling. Please try again.' };
    }
  }
}
