import { supabase } from '../lib/supabase';
import { ChatbotActions } from './chatbotActions';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface BookingData {
  id: string;
  status: string;
  pickup_location: string;
  dropoff_location: string;
  seats_requested: number;
  created_at: string;
  ride: {
    origin: string;
    destination: string;
    departure_time: string;
    driver: {
      full_name: string;
    };
  };
}

interface RideData {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  status: string;
}

const GEMINI_PROXY_URL = '/.netlify/functions/gemini';

export class GeminiService {
  private static async fetchUserBookings(userId: string): Promise<BookingData[]> {
    const { data, error } = await supabase
      .from('ride_bookings')
      .select(`
        *,
        ride:rides(
          origin,
          destination,
          departure_time,
          driver:profiles!rides_driver_id_fkey(full_name)
        )
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }

    return data || [];
  }

  private static async fetchUserOfferedRides(userId: string): Promise<RideData[]> {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', userId)
      .order('departure_time', { ascending: false });

    if (error) {
      console.error('Error fetching rides:', error);
      return [];
    }

    return data || [];
  }

  private static formatBookingContext(bookings: BookingData[]): string {
    if (bookings.length === 0) {
      return 'The user has no bookings yet.';
    }

    const pending = bookings.filter(b => b.status === 'pending');
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const cancelled = bookings.filter(b => b.status === 'cancelled');

    let context = `The user has ${bookings.length} total booking(s):\n\n`;

    if (pending.length > 0) {
      context += `PENDING REQUESTS (${pending.length}):\n`;
      pending.forEach((b, i) => {
        context += `${i + 1}. Booking ID: ${b.id}\n`;
        context += `   Route: ${b.ride.origin} → ${b.ride.destination}\n`;
        context += `   Pickup: ${b.pickup_location}\n`;
        context += `   Dropoff: ${b.dropoff_location}\n`;
        context += `   Seats: ${b.seats_requested}\n`;
        context += `   Driver: ${b.ride.driver.full_name}\n`;
        context += `   Departure: ${new Date(b.ride.departure_time).toLocaleString()}\n`;
        context += `   Requested: ${new Date(b.created_at).toLocaleString()}\n\n`;
      });
    }

    if (confirmed.length > 0) {
      context += `CONFIRMED BOOKINGS (${confirmed.length}):\n`;
      confirmed.forEach((b, i) => {
        context += `${i + 1}. Booking ID: ${b.id}\n`;
        context += `   Route: ${b.ride.origin} → ${b.ride.destination}\n`;
        context += `   Pickup: ${b.pickup_location}\n`;
        context += `   Dropoff: ${b.dropoff_location}\n`;
        context += `   Seats: ${b.seats_requested}\n`;
        context += `   Driver: ${b.ride.driver.full_name}\n`;
        context += `   Departure: ${new Date(b.ride.departure_time).toLocaleString()}\n\n`;
      });
    }

    if (cancelled.length > 0) {
      context += `CANCELLED BOOKINGS (${cancelled.length}):\n`;
      cancelled.forEach((b, i) => {
        context += `${i + 1}. Route: ${b.ride.origin} → ${b.ride.destination}\n`;
        context += `   Cancelled on: ${new Date(b.created_at).toLocaleString()}\n\n`;
      });
    }

    return context;
  }

  private static formatRideContext(rides: RideData[]): string {
    if (rides.length === 0) {
      return 'The user has not offered any rides yet.';
    }

    const active = rides.filter(r => r.status === 'active' && new Date(r.departure_time) > new Date());
    const past = rides.filter(r => new Date(r.departure_time) <= new Date());

    let context = `The user has offered ${rides.length} ride(s):\n\n`;

    if (active.length > 0) {
      context += `ACTIVE RIDES (${active.length}):\n`;
      active.forEach((r, i) => {
        context += `${i + 1}. Ride ID: ${r.id}\n`;
        context += `   Route: ${r.origin} → ${r.destination}\n`;
        context += `   Departure: ${new Date(r.departure_time).toLocaleString()}\n`;
        context += `   Available Seats: ${r.available_seats}\n\n`;
      });
    }

    if (past.length > 0) {
      context += `PAST RIDES (${past.length}):\n`;
      past.forEach((r, i) => {
        context += `${i + 1}. ${r.origin} → ${r.destination} on ${new Date(r.departure_time).toLocaleDateString()}\n`;
      });
    }

    return context;
  }

  private static getSystemPrompt(bookingsContext: string, ridesContext: string, weatherInfo?: string, trafficInfo?: string): string {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toISOString();

    const additionalContext = weatherInfo || trafficInfo ? `

REAL-TIME TRIP CONDITIONS:
${weatherInfo || ''}
${trafficInfo || ''}
` : '';

    return `You are a helpful AI assistant for a carpooling platform called Carpool Network (carpoolnetwork.co.uk). Your role is to help users manage their rides and bookings with real-time insights.

CURRENT DATE AND TIME: ${currentTime} (${currentDate})

CURRENT USER'S BOOKINGS:
${bookingsContext}

CURRENT USER'S OFFERED RIDES:
${ridesContext}
${additionalContext}

Your capabilities:
1. Show users their current bookings and rides
2. Help users understand booking statuses (pending, confirmed, cancelled)
3. PERFORM ACTIONS: You can actually execute actions for users by responding with special action codes
4. POST RIDES: You can post rides if user provides: origin, destination, date/time, seats available
5. ADD VEHICLES: You can add vehicles if user provides: make, model, year, color, license plate, capacity
6. CANCEL bookings and rides
7. UPDATE user profile and preferences
8. Answer questions about the platform features
9. Explain platform policies and safety features
10. Provide real-time weather and traffic insights for trips
11. Suggest optimal departure times based on traffic patterns
12. Estimate trip costs and fuel consumption
13. Warn about adverse weather or air quality conditions

IMPORTANT - ACTION EXECUTION:
When a user asks you to perform an action, you can execute it by including a special action code in your response.
Available actions:

[ACTION:POST_RIDE:origin,originLat,originLng,destination,destinationLat,destinationLng,departureTime,availableSeats,notes] - Post a new ride
[ACTION:CANCEL_BOOKING:booking_id:reason] - Cancel a booking
[ACTION:CANCEL_RIDE:ride_id:reason] - Cancel a ride they're offering
[ACTION:UPDATE_PROFILE:field1=value1,field2=value2] - Update profile fields
[ACTION:UPDATE_PREFERENCES:field1=value1,field2=value2] - Update ride preferences
[ACTION:ADD_VEHICLE:make,model,year,color,license_plate,capacity,fuel_type,vehicle_type] - Add a vehicle

Examples:
- User: "Post a ride from London to Manchester tomorrow at 9am with 3 seats" → Include [ACTION:POST_RIDE:London,51.5074,-0.1278,Manchester,53.4808,-2.2426,2025-11-18T09:00:00,3,]
- User: "Cancel my booking abc-123" → Include [ACTION:CANCEL_BOOKING:abc-123:User requested] in response
- User: "Update my phone to 07123456789" → Include [ACTION:UPDATE_PROFILE:phone=07123456789]
- User: "Set my music preference to quiet" → Include [ACTION:UPDATE_PREFERENCES:music_preference=quiet]
- User: "Add my car, a 2020 red Toyota Corolla" → Include [ACTION:ADD_VEHICLE:Toyota,Corolla,2020,red,ABC123,4,petrol,sedan]

When including actions:
1. Put the action code on its own line
2. Explain what you're doing in natural language before/after the action
3. The action will be executed automatically
4. Always confirm what was done after the action
5. For POST_RIDE, you MUST get coordinates for origin and destination (use your knowledge or ask user for specific locations)
6. For POST_RIDE, dates should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
7. If user doesn't have a vehicle, inform them they need to add one first or suggest using ADD_VEHICLE action

When discussing trips:
- Consider weather conditions (temperature, rain, wind)
- Factor in traffic patterns and rush hours
- Provide cost estimates based on distance
- Suggest best departure times to avoid delays
- Warn about poor air quality or severe weather

When discussing cancellations:
- Pending requests can be cancelled anytime
- Confirmed bookings can be cancelled, but last-minute cancellations affect reliability score
- Be clear and helpful about the cancellation process

Important guidelines for POSTING RIDES:
- BEFORE posting a ride, you MUST collect ALL required information:
  * Origin location (city/town name)
  * Destination location (city/town name)
  * Departure date and time (be specific - "tomorrow 9am" needs to be converted to full ISO date)
  * Number of available seats
  * Optional: Notes about the trip
- You MUST use realistic coordinates for UK locations. Common examples:
  * London: 51.5074, -0.1278
  * Manchester: 53.4808, -2.2426
  * Birmingham: 52.4862, -1.8904
  * Leeds: 53.8008, -1.5491
  * Glasgow: 55.8642, -4.2518
  * Edinburgh: 55.9533, -3.1883
  * Liverpool: 53.4084, -2.9916
  * Bristol: 51.4545, -2.5879
- If user hasn't provided ALL information, ask for missing details
- ONLY execute POST_RIDE action when you have ALL required information
- Check if user has a vehicle first - if they don't, inform them to add one via Profile page or ask if they want you to add one
- Dates must be in future and in ISO format: YYYY-MM-DDTHH:mm:ss
- "Tomorrow at 9am" = calculate tomorrow's date + 09:00:00
- "Next Monday at 2pm" = calculate next Monday's date + 14:00:00

Important guidelines for general usage:
- Always use the booking/ride data provided above to give accurate, personalized responses
- Use real-time weather and traffic data when available
- If a user asks about trip conditions, provide detailed insights
- If a user wants to cancel, provide the booking ID and ask for confirmation
- Be conversational, friendly, and helpful
- Format responses clearly with proper spacing and bullet points when listing items
- Use proper date/time formatting when showing times
- Proactively mention weather warnings or traffic delays for upcoming trips
- When taking actions, be transparent about what you're doing
- NEVER claim to have done something unless you've included the action code

Remember: You can see their data AND real-time conditions, so be specific and reference actual booking IDs, routes, dates, weather, and traffic.`;
  }

  static async chat(
    userMessage: string,
    conversationHistory: Message[],
    userId: string,
    weatherInfo?: string,
    trafficInfo?: string
  ): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return 'Please sign in to use the AI assistant.';
      }

      const [bookings, rides] = await Promise.all([
        this.fetchUserBookings(userId),
        this.fetchUserOfferedRides(userId)
      ]);

      const bookingsContext = this.formatBookingContext(bookings);
      const ridesContext = this.formatRideContext(rides);
      const systemPrompt = this.getSystemPrompt(bookingsContext, ridesContext, weatherInfo, trafficInfo);

      const historyText = conversationHistory
        .map(msg => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`)
        .join('\n');
      const promptSections = [systemPrompt];

      if (historyText) {
        promptSections.push('', 'CONVERSATION HISTORY:', historyText);
      }

      promptSections.push('', `User: ${userMessage}`, 'Assistant:');
      const prompt = promptSections.join('\n');

      const response = await fetch(GEMINI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini proxy error:', response.status, errorData);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.text) {
        throw new Error('Invalid response format from Gemini proxy');
      }

      return data.text;

    } catch (error) {
      console.error('Error calling Gemini proxy:', error);
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }

  static async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_reason: reason || 'Cancelled by passenger'
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
        message: 'Booking cancelled successfully.'
      };

    } catch (error) {
      console.error('Error cancelling booking:', error);
      return { success: false, message: 'An error occurred while cancelling. Please try again.' };
    }
  }

  static async parseAndExecuteActions(response: string, userId: string): Promise<{ modifiedResponse: string; actionsExecuted: number }> {
    const actionRegex = /\[ACTION:([A-Z_]+):([^\]]+)\]/g;
    let modifiedResponse = response;
    let actionsExecuted = 0;
    const matches = [...response.matchAll(actionRegex)];

    for (const match of matches) {
      const [fullMatch, actionType, params] = match;
      const parts = params.split(':');

      try {
        let result;

        switch (actionType) {
          case 'CANCEL_BOOKING': {
            const [bookingId, reason] = parts;
            result = await ChatbotActions.cancelBooking(userId, bookingId, reason);
            break;
          }

          case 'CANCEL_RIDE': {
            const [rideId, reason] = parts;
            result = await ChatbotActions.cancelRide(userId, rideId, reason);
            break;
          }

          case 'UPDATE_PROFILE': {
            const updates: any = {};
            parts[0].split(',').forEach((pair: string) => {
              const [key, value] = pair.split('=');
              updates[key.trim()] = value.trim();
            });
            result = await ChatbotActions.updateProfile(userId, updates);
            break;
          }

          case 'UPDATE_PREFERENCES': {
            const preferences: any = {};
            parts[0].split(',').forEach((pair: string) => {
              const [key, value] = pair.split('=');
              let parsedValue: any = value.trim();
              if (parsedValue === 'true') parsedValue = true;
              if (parsedValue === 'false') parsedValue = false;
              if (!isNaN(Number(parsedValue))) parsedValue = Number(parsedValue);
              preferences[key.trim()] = parsedValue;
            });
            result = await ChatbotActions.updatePreferences(userId, preferences);
            break;
          }

          case 'POST_RIDE': {
            const [origin, originLat, originLng, destination, destinationLat, destinationLng, departureTime, availableSeats, notes] = parts[0].split(',');
            result = await ChatbotActions.postRide(userId, {
              origin: origin.trim(),
              originLat: parseFloat(originLat.trim()),
              originLng: parseFloat(originLng.trim()),
              destination: destination.trim(),
              destinationLat: parseFloat(destinationLat.trim()),
              destinationLng: parseFloat(destinationLng.trim()),
              departureTime: departureTime.trim(),
              availableSeats: parseInt(availableSeats.trim()),
              notes: notes?.trim() || undefined
            });
            break;
          }

          case 'ADD_VEHICLE': {
            const [make, model, year, color, license_plate, capacity, fuel_type, vehicle_type] = parts[0].split(',');
            result = await ChatbotActions.addVehicle(userId, {
              make: make.trim(),
              model: model.trim(),
              year: parseInt(year.trim()),
              color: color.trim(),
              license_plate: license_plate.trim(),
              capacity: parseInt(capacity.trim()),
              fuel_type: fuel_type?.trim() || undefined,
              vehicle_type: vehicle_type?.trim() || undefined
            });
            break;
          }

          default:
            console.log(`Unknown action type: ${actionType}`);
            continue;
        }

        if (result) {
          modifiedResponse = modifiedResponse.replace(
            fullMatch,
            `\n\n✅ ${result.message}\n`
          );
          actionsExecuted++;
        }
      } catch (error) {
        console.error(`Error executing action ${actionType}:`, error);
        modifiedResponse = modifiedResponse.replace(
          fullMatch,
          `\n\n❌ Failed to execute action. Please try again.\n`
        );
      }
    }

    return { modifiedResponse, actionsExecuted };
  }
}
