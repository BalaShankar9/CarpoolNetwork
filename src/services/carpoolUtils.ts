/**
 * Carpool Utility Functions
 * Core utilities for phone validation, WhatsApp, location, and contact rules
 */

import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  phone_e164?: string;
  whatsapp_before_acceptance?: boolean;
  calls_allowed?: boolean;
  home_city?: string;
  current_browsing_city?: string;
  location_mode?: 'gps' | 'manual';
}

export interface RideRequest {
  id: string;
  ride_id: string;
  rider_id: string;
  status: string;
  contact_unlocked_at?: string;
  whatsapp_unlocked?: boolean;
  pickup_location?: string;
  pickup_lat?: number;
  pickup_lng?: number;
}

/**
 * Phone Number Validation and Formatting
 */

/**
 * Validate E.164 phone format
 * Must start with + and contain 1-15 digits
 */
export function isValidE164(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Format phone number to E.164
 * Handles UK numbers: 07xxx becomes +447xxx
 */
export function formatToE164(phone: string, defaultCountryCode = '44'): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Already has country code
  if (phone.startsWith('+')) {
    return phone;
  }

  // UK mobile starting with 0
  if (digits.startsWith('0') && digits.length === 11) {
    return `+${defaultCountryCode}${digits.substring(1)}`;
  }

  // Already formatted without +
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Add default country code
  return `+${defaultCountryCode}${digits}`;
}

/**
 * Mask phone number for privacy
 * +447123456789 becomes +44••••••6789
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 8) return phone;

  const countryCode = phone.substring(0, 3);
  const lastDigits = phone.substring(phone.length - 4);
  const masked = '••••••';

  return `${countryCode}${masked}${lastDigits}`;
}

/**
 * WhatsApp Integration
 */

/**
 * Generate WhatsApp deep link
 * Opens WhatsApp chat with prefilled message
 */
export function getWhatsAppLink(
  phone: string,
  rideId?: string,
  departureTime?: string
): string {
  if (!isValidE164(phone)) {
    console.warn('Invalid E.164 phone number:', phone);
    return '';
  }

  // Remove + for WhatsApp API
  const phoneNumber = phone.replace('+', '');

  let message = 'Hi! I\'m interested in carpooling with you.';

  if (rideId && departureTime) {
    const date = new Date(departureTime).toLocaleDateString();
    message = `Hi! I'm interested in your carpool ride on ${date}. Ride ID: ${rideId}`;
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

/**
 * Contact Rules and Permissions
 */

/**
 * Check if WhatsApp contact is unlocked
 * Based on request status and user privacy settings
 */
export function isWhatsAppUnlocked(
  request: RideRequest,
  driverProfile: Profile,
  riderProfile: Profile,
  isDriver: boolean
): boolean {
  // After acceptance, always unlocked
  if (request.status === 'ACCEPTED_BY_DRIVER') {
    return true;
  }

  // Before acceptance, check privacy settings
  if (request.status === 'PENDING_DRIVER') {
    if (isDriver) {
      // Driver checking rider's WhatsApp
      return riderProfile.whatsapp_before_acceptance === true;
    } else {
      // Rider checking driver's WhatsApp
      return driverProfile.whatsapp_before_acceptance === true;
    }
  }

  return false;
}

/**
 * Check if in-app chat is available
 * Available as soon as request is created (even if pending)
 */
export function isChatAvailable(request: RideRequest): boolean {
  // Chat available for pending and accepted requests
  return ['PENDING_DRIVER', 'ACCEPTED_BY_DRIVER'].includes(request.status);
}

/**
 * Check if phone calls are allowed
 * Only after acceptance and if user enabled it
 */
export function areCallsAllowed(
  request: RideRequest,
  profile: Profile
): boolean {
  return (
    request.status === 'ACCEPTED_BY_DRIVER' &&
    profile.calls_allowed === true
  );
}

/**
 * Location and City Scope
 */

/**
 * Get current browsing city from profile or GPS
 */
export async function getCurrentBrowsingCity(
  userId: string
): Promise<{ city: string; mode: 'gps' | 'manual' }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_browsing_city, location_mode, home_city')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { city: 'Unknown', mode: 'manual' };
  }

  if (profile.location_mode === 'gps') {
    // Try to get GPS location (client-side should handle this)
    return {
      city: profile.current_browsing_city || profile.home_city || 'Unknown',
      mode: 'gps'
    };
  }

  return {
    city: profile.current_browsing_city || profile.home_city || 'Unknown',
    mode: 'manual'
  };
}

/**
 * Update user's browsing city
 */
export async function updateBrowsingCity(
  userId: string,
  city: string,
  mode: 'gps' | 'manual'
): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      current_browsing_city: city,
      location_mode: mode,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}

/**
 * Extract city from address string
 * Simple heuristic: look for known cities or last part before postcode
 */
export function extractCityFromAddress(address: string): string {
  const knownCities = [
    'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Sheffield',
    'Edinburgh', 'Liverpool', 'Bristol', 'Cardiff', 'Leicester', 'Coventry',
    'Bradford', 'Belfast', 'Nottingham', 'Newcastle', 'Brighton', 'Hull',
    'Plymouth', 'Stoke', 'Wolverhampton', 'Derby', 'Swansea', 'Southampton',
    'Reading', 'Dudley', 'Northampton', 'Luton', 'Portsmouth', 'Preston'
  ];

  for (const city of knownCities) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }

  // Fallback: extract part before postcode
  const postcodeMatch = address.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i);
  if (postcodeMatch) {
    const parts = address.substring(0, postcodeMatch.index).split(',');
    const cityPart = parts[parts.length - 1]?.trim();
    if (cityPart && cityPart.length > 2) {
      return cityPart;
    }
  }

  return 'Unknown';
}

/**
 * Overlap Detection for Ride Requests
 */

/**
 * Calculate overlap window for a ride
 * Window is departure time ± buffer
 */
export function calculateOverlapWindow(
  departureTime: string,
  bufferHours = 2
): { start: string; end: string } {
  const departure = new Date(departureTime);
  const start = new Date(departure.getTime() - bufferHours * 60 * 60 * 1000);
  const end = new Date(departure.getTime() + (bufferHours * 2) * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

/**
 * Check if rider has overlapping accepted bookings
 */
export async function hasOverlappingBookings(
  riderId: string,
  overlapStart: string,
  overlapEnd: string,
  excludeRequestId?: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ride_requests')
    .select('id, overlap_window_start, overlap_window_end')
    .eq('rider_id', riderId)
    .eq('status', 'ACCEPTED_BY_DRIVER')
    .not('id', 'eq', excludeRequestId || '00000000-0000-0000-0000-000000000000');

  if (error || !data) return false;

  // Check for overlaps
  for (const booking of data) {
    if (!booking.overlap_window_start || !booking.overlap_window_end) continue;

    const bookingStart = new Date(booking.overlap_window_start);
    const bookingEnd = new Date(booking.overlap_window_end);
    const requestStart = new Date(overlapStart);
    const requestEnd = new Date(overlapEnd);

    // Check if windows overlap
    if (bookingStart < requestEnd && bookingEnd > requestStart) {
      return true;
    }
  }

  return false;
}

/**
 * Atomic Seat Acceptance
 */

/**
 * Accept a ride request using the atomic function
 * Ensures no overbooking and proper validation
 */
export async function acceptRideRequest(
  requestId: string,
  driverId: string
): Promise<{
  success: boolean;
  error?: string;
  ride_id?: string;
  rider_id?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('accept_ride_request', {
      request_id: requestId,
      accepting_driver_id: driverId
    });

    if (error) throw error;

    return data as any;
  } catch (error: any) {
    console.error('Failed to accept ride request:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept request'
    };
  }
}

/**
 * Profile Completion Checks
 */

/**
 * Check if profile is complete for posting/requesting rides
 */
export interface ProfileCompletionStatus {
  isComplete: boolean;
  missing: string[];
}

export async function checkProfileCompletion(
  userId: string
): Promise<ProfileCompletionStatus> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone_e164, profile_photo_url, home_city')
    .eq('id', userId)
    .single();

  const missing: string[] = [];

  if (!profile) {
    return { isComplete: false, missing: ['Profile not found'] };
  }

  if (!profile.full_name || profile.full_name.trim() === '') {
    missing.push('Full name');
  }

  if (!profile.phone_e164 || !isValidE164(profile.phone_e164)) {
    missing.push('Valid phone number (E.164 format)');
  }

  if (!profile.profile_photo_url) {
    missing.push('Profile picture');
  }

  if (!profile.home_city) {
    missing.push('Home city');
  }

  return {
    isComplete: missing.length === 0,
    missing
  };
}

/**
 * Helper to ensure pickup point is set before acceptance
 */
export async function validatePickupPoint(requestId: string): Promise<boolean> {
  const { data } = await supabase
    .from('ride_requests')
    .select('pickup_location, pickup_lat, pickup_lng')
    .eq('id', requestId)
    .single();

  return !!(
    data &&
    data.pickup_location &&
    data.pickup_lat &&
    data.pickup_lng
  );
}

/**
 * Error Messages
 */

export const ERROR_MESSAGES = {
  PHONE_REQUIRED: 'Phone number is required for carpooling',
  PHONE_INVALID: 'Please enter a valid phone number with country code (e.g., +447123456789)',
  PROFILE_INCOMPLETE: 'Please complete your profile before posting or requesting rides',
  PICKUP_REQUIRED: 'Pickup location is required before requesting a ride',
  SEATS_UNAVAILABLE: 'Not enough seats available',
  RIDE_CLOSED: 'This ride is no longer accepting requests',
  OVERLAP_EXISTS: 'You already have an accepted ride at this time',
  REQUEST_PROCESSED: 'This request has already been processed'
};
