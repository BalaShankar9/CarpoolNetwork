import { supabase } from '../lib/supabase';

const AI_ENDPOINT = '/.netlify/functions/ai-router';

export type AiRequestPayload = {
  message: string;
  conversationId?: string;
  userContext: {
    userId: string | null;
    displayName: string | null;
    role: 'user' | 'admin' | 'guest';
    currentRoute: string;
    vehicleCount?: number;
    upcomingRidesCount?: number;
    unreadNotificationsCount?: number;
  };
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
    _conversationHistory: Message[],
    _userId: string,
    conversationId: string | undefined,
    userContext: AiRequestPayload['userContext']
  ): Promise<string> {
    const token = await this.getAccessToken();
    if (!token) {
      return 'Please sign in to use the AI assistant.';
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
          conversationId,
          userContext,
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
        return data.reply;
      }

      return 'Sorry, I could not understand the response from the assistant.';
    } catch (error) {
      console.error('Error calling AI assistant:', error);
      return 'Sorry, I encountered an error processing your request. Please try again later.';
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
